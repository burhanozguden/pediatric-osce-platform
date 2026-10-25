/**
 * Deterministik klinik güvenlik katmanı ("Guardrail").
 *
 * Amaç: LLM değerlendiricisinin ne puan verdiğinden BAĞIMSIZ olarak, öğrencinin
 * transkriptinde hayati klinik hataları kural tabanlı yakalamak ve bunlar
 * varsa toplam puana KATI BARAJ (≤ 59, başarısız) uygulamak.
 *
 * Hayati hatalar (CriticalErrorId):
 *  - INFANT_COW_MILK               : 1 yaş altına inek sütü önermek
 *  - INFANT_HONEY                  : 1 yaş altına bal önermek (bebek botulizmi)
 *  - KWASHIORKOR_OGA_OVERFEEDING   : ödemli kwashiorkorda OGA ile aşırı enerji vermek
 *  - DIARRHEA_FAT_RESTRICTION      : ishalde yağ kısıtlaması önermek
 *
 * Hangi kuralın bir vakada geçerli olduğu vakanın `criticalRuleIds` alanından gelir.
 *
 * Tasarım ilkeleri:
 *  1. Yalnızca ÖĞRENCİ mesajları taranır (ebeveynin söyledikleri öğrenci hatası değildir).
 *  2. Tarama yan cümle düzeyindedir; soru cümleleri, olumsuzlama ("vermeyin",
 *     "verilmez") ve erteleme ("1 yaşından sonra") yan cümleleri hata sayılmaz.
 *  3. LLM'in bulduğu hatalar yalnızca öğrenci mesajında BİREBİR geçen bir alıntıyla
 *     ve aynı güvenlik filtrelerinden geçerse kabul edilir (halüsinasyon koruması).
 *  4. LLM bir hatayı "yok" dese bile deterministik bulgu geçerlidir; tersine,
 *     deterministik bulguyu hiçbir LLM çıktısı kaldıramaz.
 */
import type {
  ClinicalCase,
  CriticalErrorFinding,
  CriticalErrorId,
  EvaluatorCriticalFlag,
  GuardrailReport,
  GuardrailWarning,
  TranscriptMessage,
} from '@/types';
import { type Clause, normalizeTr, splitIntoClauses } from './text';

/** Hayati hata durumunda uygulanan en yüksek toplam puan. */
export const FATAL_SCORE_CEILING = 59;

/* ------------------------------------------------------------------ */
/* Ortak desenler (metin normalize edilmiş: küçük harf, ASCII)          */
/* ------------------------------------------------------------------ */

/**
 * Türkçe olumsuzluk: -mAyIn/-mAyInIz/-mAyAlIm/-mAyAcAk, -mAmAlI, -mAz, -mAsIn,
 * -mIyor, ayrıca sık kullanılan kaçınma/yasak sözcükleri.
 */
const NEGATION =
  /\b\w*(?:m[ae]y(?:in|iniz|elim|alim|iz|ecek|ecegi\w*|acak|acag\w*|um|im)|m[ae]m[ae]l[i]\w*|m[ae]m[ae]s[i]\w*|(?<!pek)m[ae]z|m[ae]sin|m[ae]sini|miyor\w*|muyor\w*)\b|\b(?:kacin\w*|birakin\w*|yasak\w*|zararli|uygun degil|uygun olmaz|riskli|tehlikeli|gereksiz|gerekmez|olmaz|botulizm\w*|botulinum)\b/;

/** "1 yaşından sonra", "12 ay dolunca" gibi erteleme ifadeleri. */
const DEFERRAL =
  /\b(?:1|bir)\s+yas\w*\s+(?:sonra|doldur\w*|bitir\w*)|\b12\s+ay\w*\s+(?:sonra|doldur\w*|bitir\w*)|\byasini\s+(?:doldur|bitir)\w*/;

/** Öneri/uygulama sözcükleri (bir şeyi "yapılması gereken" olarak sunma). */
const RECOMMENDATION =
  /\b(?:verin|verir|verirsiniz|verebil\w*|verelim|verilir|verilebil\w*|veriniz|versin|verseniz|veriyor(?:uz|sunuz)|vereceksiniz|icir\w*|icebil\w*|icecek|baslay\w*|baslat\w*|ekle\w*|karistir\w*|katin|kullan\w*|oner\w*|tavsiye\w*|besle\w*|yedir\w*|iyi gelir|faydali|saglikli|bardak|ml|cc|kase|ogun)\b|\bgunde\s+\d/;

/* ------------------------------------------------------------------ */
/* Kural tanımları                                                      */
/* ------------------------------------------------------------------ */

interface CriticalRule {
  id: CriticalErrorId;
  title: string;
  description: string;
  /** Yan cümlenin kuralın konusuna ait olup olmadığı (LLM alıntı doğrulaması için de kullanılır). */
  topical: (text: string) => boolean;
  /** Yan cümle hata mı? */
  detect: (clause: Clause) => boolean;
}

/** Açık "inek/çiğ/taze… süt" ifadeleri. */
const COW_MILK_EXPLICIT =
  /\b(?:inek|cig|taze|keci|pastorize|uht|gunluk|sade)\s+sut\w*|\btam\s+yagli\s+sut\w*|\byarim\s+yagli\s+sut\w*/;

/**
 * Yalın "süt" (anne sütü, devam sütü, formül sütü vb. değilse). Bu ön eklerden
 * biri hemen öncesinde ise anne sütü/mama kastedilmiş sayılır.
 */
const COW_MILK_GENERIC =
  /(?<!anne |devam |bebek |formul |mama |kuru |hazir |laktozsuz |bitkisel |badem |pirinc |yulaf |soya |prematur |insan |bebelac |aptamil |similac |alimentum |peptijunior |neocate )\bsut(?:u|ten|e|un|te|le|ler|leri|unu|une|unden|uyle|unuz)?\b(?!\s+(?:urun|grub|alerji|protein|seker|intolerans|bagis|toz|asit))/;

function isCowMilkTopic(text: string): boolean {
  return COW_MILK_EXPLICIT.test(text) || COW_MILK_GENERIC.test(text);
}

/** "bal" (bal kabağı hariç), çiçek/petek balı. */
const HONEY =
  /\b(?:cicek |petek |orman |salgi )?bal(?:i|a|da|dan|la|in|lar|lari|ini|ina)?\b(?!\s+kabag)/;

function isRecommendingClause(c: Clause): boolean {
  return !c.isQuestion && !NEGATION.test(c.text) && !DEFERRAL.test(c.text) && RECOMMENDATION.test(c.text);
}

/* Kwashiorkor: OGA ile enerji hesabı ya da > 100 kcal/kg başlangıç. */
const OGA_REFERENCE =
  /\boga\b|olmasi gereken (?:agirlik|kilo)|ideal (?:kilo|agirlik)|beklenen (?:kilo|agirlik)|gereken (?:kilo|agirlik)/;
const ENERGY_WORD = /\bkcal\b|\bkalori\w*|\benerji\w*/;
const KCAL_PER_KG_A = /(\d{2,3})(?:\s*[-–]\s*(\d{2,3}))?\s*kcal\s*(?:\/|\s*basina\s*)?\s*kg/;
const KCAL_PER_KG_B = /kg\s*basina\s*(\d{2,3})(?:\s*[-–]\s*(\d{2,3}))?\s*kcal/;
/** 4. gün ve sonrası, ödem gerilemesi, iyileşme evresi → yüksek enerji meşru olabilir. */
const KWASHIORKOR_LATER_PHASE =
  /\b(?:[4-9]|[1-9]\d)\.?\s*gun|\bsonra\w*|\bilerleyen|\bsonraki|\bstabil\w*|\biyilesme\w*|\btoparlanma|\brehabilitasyon|\bodem\w*\s+(?:coz|duzel|gerile|azal|gec)\w*|\b(?:2|3|ikinci|ucuncu)\.?\s*faz/;

function maxKcalPerKg(text: string): number {
  let max = 0;
  for (const re of [KCAL_PER_KG_A, KCAL_PER_KG_B]) {
    const m = re.exec(text);
    if (m) {
      const a = Number(m[1]);
      const b = m[2] ? Number(m[2]) : 0;
      max = Math.max(max, a, b);
    }
  }
  return max;
}

/* İshalde yağ kısıtı. */
const FAT_RESTRICTION =
  /\byagsiz\s+(?:yemek|beslen|diyet|gida|corba|besin|ver|yiyecek)\w*|\byagli\s+\w*\s*\w*\s*(?:vermey|yemesin|verilmez|yenmez|kacin|yemeyin|yedirmey|yasak)\w*|\byag(?:dan|i)?\s+(?:kacin|uzak|kes|cikar|azalt|kisit|sakin)\w*|\byag\s+(?:kisit|azalt|vermey)\w*|\baz\s+yagli|\byagi\s+az\b/;
/** "Yağı kısıtlamayın", "yağsız yemek vermeyin" gibi DOĞRU öneriler. */
const FAT_RESTRICTION_ALLOWED =
  /(?:kisitlamay|kesmey|cikarmay|azaltmay|kacinmay|kisitlanmaz|kisitlama(?:si)?\s+(?:yapmay|gerekmez|onerilmez|yanlis|dogru degil)|yagsiz\s+\w*\s*\w*\s*(?:vermey|verilmez|onerilmez|gerekmez|dogru degil|yanlis)|yagsiz\s+beslemey|yagi?\s+(?:ver|ekle)\w*)/;

const RULES: Record<CriticalErrorId, CriticalRule> = {
  INFANT_COW_MILK: {
    id: 'INFANT_COW_MILK',
    title: '1 yaş altına inek sütü önerisi',
    description:
      '12 aydan küçük bebeğe inek sütü önerilmez (demir eksikliği anemisi, gizli GİS kanaması, yüksek renal solüt yükü ve alerji riski). Anne sütü/uygun formül sürdürülmelidir.',
    topical: isCowMilkTopic,
    detect: (c) => isCowMilkTopic(c.text) && isRecommendingClause(c),
  },
  INFANT_HONEY: {
    id: 'INFANT_HONEY',
    title: '1 yaş altına bal önerisi',
    description:
      '12 aydan küçük bebeğe bal verilmez (Clostridium botulinum sporları nedeniyle bebek botulizmi riski).',
    topical: (t) => HONEY.test(t),
    detect: (c) => HONEY.test(c.text) && isRecommendingClause(c),
  },
  KWASHIORKOR_OGA_OVERFEEDING: {
    id: 'KWASHIORKOR_OGA_OVERFEEDING',
    title: 'Kwashiorkorda OGA ile aşırı besleme',
    description:
      'Ödemli kwashiorkorda olması gereken ağırlık (OGA) hesaplanmaz; başlangıç enerjisi 70-80 kcal/kg/gün olmalıdır. OGA üzerinden veya >100 kcal/kg ile başlamak yeniden besleme (refeeding) komplikasyonu riski taşır.',
    topical: (t) => OGA_REFERENCE.test(t) || maxKcalPerKg(t) > 0,
    detect: (c) => {
      if (c.isQuestion || NEGATION.test(c.text) || KWASHIORKOR_LATER_PHASE.test(c.text)) return false;
      const ogaBasedEnergy = OGA_REFERENCE.test(c.text) && ENERGY_WORD.test(c.text);
      const tooHigh = maxKcalPerKg(c.text) > 100;
      return ogaBasedEnergy || tooHigh;
    },
  },
  DIARRHEA_FAT_RESTRICTION: {
    id: 'DIARRHEA_FAT_RESTRICTION',
    title: 'İshalde yağ kısıtlaması önerisi',
    description:
      'Gastroenteritte yağ kısıtlanmaz; yağsız beslenme enerji yetersizliğine ve iyileşmenin gecikmesine yol açar. Beslenmeye devam edilir.',
    topical: (t) => /\byag/.test(t),
    detect: (c) =>
      !c.isQuestion && FAT_RESTRICTION.test(c.text) && !FAT_RESTRICTION_ALLOWED.test(c.text),
  },
};

/* ------------------------------------------------------------------ */
/* Deterministik tarama                                                 */
/* ------------------------------------------------------------------ */

function studentMessages(transcript: TranscriptMessage[]): { index: number; msg: TranscriptMessage }[] {
  const out: { index: number; msg: TranscriptMessage }[] = [];
  transcript.forEach((msg, index) => {
    if (msg.role === 'student') out.push({ index, msg });
  });
  return out;
}

function makeFinding(
  rule: CriticalRule,
  source: CriticalErrorFinding['source'],
  index: number,
  excerpt: string,
  studentText: string,
): CriticalErrorFinding {
  return {
    id: rule.id,
    title: rule.title,
    description: rule.description,
    source,
    evidence: {
      messageIndex: index,
      normalizedExcerpt: excerpt,
      studentText: studentText.slice(0, 200),
    },
  };
}

/** Vakada geçerli hayati hataları transkriptte arar (her kural için ilk bulgu). */
export function scanFatalErrors(clinicalCase: ClinicalCase, transcript: TranscriptMessage[]): CriticalErrorFinding[] {
  const findings: CriticalErrorFinding[] = [];
  const students = studentMessages(transcript);

  for (const ruleId of clinicalCase.criticalRuleIds) {
    const rule = RULES[ruleId];
    let found: CriticalErrorFinding | null = null;
    for (const { index, msg } of students) {
      for (const clause of splitIntoClauses(msg.content)) {
        if (rule.detect(clause)) {
          found = makeFinding(rule, 'deterministic', index, clause.text, msg.content);
          break;
        }
      }
      if (found) break;
    }
    if (found) findings.push(found);
  }
  return findings;
}

/* ------------------------------------------------------------------ */
/* Uyarılar (puan tavanı uygulamayan klinik eksikler)                   */
/* ------------------------------------------------------------------ */

function anyStudentText(transcript: TranscriptMessage[], re: RegExp): boolean {
  return studentMessages(transcript).some(({ msg }) => re.test(normalizeTr(msg.content)));
}

export function collectWarnings(clinicalCase: ClinicalCase, transcript: TranscriptMessage[]): GuardrailWarning[] {
  const warnings: GuardrailWarning[] = [];

  if (clinicalCase.condition === 'gastroenteritis') {
    const mentionsOrs = anyStudentText(
      transcript,
      /\bors\b|oral rehidrat\w*|rehidratasyon|oral sivi|sivi (?:tedavi|destegi|replasman)\w*|elektrolit\w*|sivi kaybi/,
    );
    if (!mentionsOrs) {
      warnings.push({
        id: 'GASTRO_NO_ORS',
        message: 'Gastroenterit vakasında oral rehidratasyon (ORS) protokolü hiç anılmadı.',
      });
    }
  }

  if (clinicalCase.condition === 'ckd') {
    if (!anyStudentText(transcript, /potasyum|fosfor/)) {
      warnings.push({
        id: 'CKD_NO_POTASSIUM_PHOSPHORUS',
        message: 'KBY vakasında potasyum ve fosfor kısıtı hiç ele alınmadı (potasyum <40 mg/kg, fosfor <20 mg/kg).',
      });
    }
  }

  if (clinicalCase.condition === 'cow_milk_allergy') {
    const lactoseFree = studentMessages(transcript).some(({ msg }) =>
      splitIntoClauses(msg.content).some(
        (c) =>
          /\blaktozsuz\b|\blaktoz icermeyen|\bbebelac lf\b|\blf mama|\blf formul/.test(c.text) &&
          isRecommendingClause(c),
      ),
    );
    if (lactoseFree) {
      warnings.push({
        id: 'CMPA_LACTOSE_FREE_FORMULA',
        message:
          'İnek sütü alerjisinde laktozsuz (LF) formül uygun değildir; inek sütü proteini içerir. Hidrolizat/amino asit formül gerekir.',
      });
    }
  }

  return warnings;
}

/* ------------------------------------------------------------------ */
/* LLM bulgularının doğrulanması                                        */
/* ------------------------------------------------------------------ */

/**
 * LLM değerlendiricisinin işaretlediği hayati hata iddialarını doğrular.
 * Kabul koşulları:
 *  - Kural bu vakada geçerli olmalı,
 *  - Alıntı bir ÖĞRENCİ mesajında birebir (normalize) geçmeli,
 *  - İlgili yan cümleler soru/olumsuzlama/erteleme olmamalı ve konu uygun olmalı.
 */
export function verifyLlmFlags(
  clinicalCase: ClinicalCase,
  transcript: TranscriptMessage[],
  flags: EvaluatorCriticalFlag[],
): CriticalErrorFinding[] {
  const accepted: CriticalErrorFinding[] = [];
  const students = studentMessages(transcript);

  for (const flag of flags) {
    if (!clinicalCase.criticalRuleIds.includes(flag.id)) continue;
    const quote = normalizeTr(flag.evidenceQuote);
    if (quote.length < 6) continue;
    const rule = RULES[flag.id];

    for (const { index, msg } of students) {
      const normalizedMessage = normalizeTr(msg.content);
      if (!normalizedMessage.includes(quote)) continue;

      const related = splitIntoClauses(msg.content).filter(
        (c) => c.text.includes(quote) || quote.includes(c.text),
      );
      const clauses: Clause[] =
        related.length > 0 ? related : [{ text: normalizedMessage, isQuestion: false, sentence: msg.content }];

      const safe = clauses.some((c) => c.isQuestion || NEGATION.test(c.text) || DEFERRAL.test(c.text));
      const topical = rule.topical(quote) || clauses.some((c) => rule.topical(c.text));
      if (safe || !topical) continue;

      accepted.push(makeFinding(rule, 'llm_verified', index, quote, msg.content));
      break;
    }
  }
  return accepted;
}

/* ------------------------------------------------------------------ */
/* Rapor birleştirme                                                    */
/* ------------------------------------------------------------------ */

export function buildGuardrailReport(
  clinicalCase: ClinicalCase,
  transcript: TranscriptMessage[],
  llmFlags: EvaluatorCriticalFlag[] = [],
): GuardrailReport {
  const deterministic = scanFatalErrors(clinicalCase, transcript);
  const verified = verifyLlmFlags(clinicalCase, transcript, llmFlags);

  const byId = new Map<CriticalErrorId, CriticalErrorFinding>();
  for (const f of [...deterministic, ...verified]) {
    if (!byId.has(f.id)) byId.set(f.id, f);
  }
  const fatalErrors = [...byId.values()];

  return {
    fatalErrors,
    warnings: collectWarnings(clinicalCase, transcript),
    capApplied: fatalErrors.length > 0,
    scoreCeiling: fatalErrors.length > 0 ? FATAL_SCORE_CEILING : null,
  };
}

/** Tavanı uygular: hayati hata varsa puan en çok 59 olur. */
export function applyScoreCeiling(uncappedScore: number, report: GuardrailReport): number {
  const rounded = Math.round(uncappedScore);
  return report.scoreCeiling === null ? rounded : Math.min(rounded, report.scoreCeiling);
}
