/**
 * Türkçe metin ön işleme yardımcıları.
 *
 * Guardrail ve uyum (rapport) analizi, öğrencinin serbest yazdığı metni
 * deterministik olarak tarar. Bunun için metin önce "ASCII'ye katlanmış"
 * küçük harfe çevrilir (ç→c, ğ→g, ı→i, ö→o, ş→s, ü→u) ve cümle/yan cümle
 * (clause) düzeyinde bölünür. Böylece "İnek sütü VERMEYİN" ile
 * "inek sutu vermeyin" aynı biçimde değerlendirilir.
 */

/** Küçük harf + aksan kaldırma + kesme işaretlerini boşluğa çevirme. */
export function normalizeTr(input: string): string {
  return input
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/ı/g, 'i')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’'`´]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface Clause {
  /** Normalize edilmiş yan cümle metni. */
  text: string;
  /** Yan cümlenin ait olduğu cümle soru mu? */
  isQuestion: boolean;
  /** Cümlenin özgün (normalize edilmemiş) hâli. */
  sentence: string;
}

/** Soru kipi eki (mi/mı/mu/mü) normalize metinde "mi" veya "mu" olarak görünür. */
const QUESTION_PARTICLE = /\bm[iu](?:yiz|yim|siniz|sin|yim|dir|dur)?\b/;

/** Yan cümleleri ayıran karşıtlık bağlaçları. */
const ADVERSATIVE = /\b(?:ama|fakat|ancak|lakin|oysa|yalniz)\b/;

/**
 * Metni cümlelere, ardından karşıtlık bağlaçlarına göre yan cümlelere böler.
 * Virgülle bölünmez: "inek sütü, bal vermeyin" tek yan cümle olarak kalır ki
 * olumsuzluk her iki öğeyi de kapsasın.
 */
export function splitIntoClauses(text: string): Clause[] {
  // "1. gün", "100." gibi sayı sonrası noktaları cümle sonu sayma.
  const protectedText = text.replace(/(\d)\.(?=\s*\S)/g, '$1\u0001');
  const sentences = protectedText.match(/[^.!?;\n]+[.!?;\n]*/g) ?? [];
  const clauses: Clause[] = [];

  for (const raw of sentences) {
    const sentence = raw.replace(/\u0001/g, '.').trim();
    if (!sentence) continue;
    const normalized = normalizeTr(sentence);
    if (!normalized) continue;
    const isQuestion = /\?/.test(sentence) || QUESTION_PARTICLE.test(normalized);
    for (const part of normalized.split(ADVERSATIVE)) {
      const t = part.trim();
      if (t) clauses.push({ text: t, isQuestion, sentence });
    }
  }
  return clauses;
}
