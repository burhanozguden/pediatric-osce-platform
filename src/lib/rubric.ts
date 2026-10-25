/**
 * BDB-UÇEP 2025 uyumlu analitik rubrik.
 *
 * Kaynak: Rubrik Hazırlama Kılavuzu (analitik rubrik: kriter × performans
 * düzeyi) ve BDB-UÇEP 2025 makalesi (performansa dayalı biçimlendirici
 * ölçme). Toplam 100 puan: Anamnez 25 + Klinik Karar & TBT 35 +
 * İletişim 20 + Süreç 20.
 *
 * Puanlar sunucuda YENİDEN hesaplanır: LLM'in verdiği her kriter puanı
 * [0, maxPoints] aralığına sıkıştırılır ve toplam kodla toplanır.
 */
import type {
  CategoryResult,
  EvaluatorCriterionScore,
  EvaluatorCriticalFlag,
  EvaluatorRawOutput,
  RubricCategory,
  RubricCategoryId,
  RubricCriterion,
  ScorecardDraft,
} from '@/types';

function crit(id: string, title: string, maxPoints: number, full: string, partial: string, none: string): RubricCriterion {
  return {
    id,
    title,
    maxPoints,
    descriptors: [
      { level: 'Yeterli (%80-100)', description: full },
      { level: 'Kısmen yeterli (%40-79)', description: partial },
      { level: 'Yetersiz (%0-39)', description: none },
    ],
  };
}

export const RUBRIC: readonly RubricCategory[] = [
  {
    id: 'anamnesis',
    title: 'Anamnez ve Veri Toplama',
    maxPoints: 25,
    criteria: [
      crit('an-1', 'Başvuru nedeni ve büyüme öyküsü', 6,
        'Başvuru nedenini açık uçlu soruyla alır; kilo/boy gelişimini ve değişimini sorgular.',
        'Başvuru nedenini alır ancak büyüme öyküsünü eksik bırakır.',
        'Başvuru nedeni ve büyüme öyküsü alınmaz.'),
      crit('an-2', 'Beslenme öyküsü (anne sütü/formül, ek gıda, 24 saatlik hatırlatma)', 9,
        'Süt/formül türü ve hazırlama, ek gıda başlangıcı, öğün sayısı, porsiyon ve 24 saatlik tüketimi sistematik sorgular.',
        'Beslenme öyküsünün yalnızca bir kısmını (ör. sadece süt türü) sorgular.',
        'Beslenme öyküsü alınmaz veya yüzeysel kalır.'),
      crit('an-3', 'Tıbbi, ailesel ve sosyal öykü', 6,
        'Hastalık/ilaç/alerji, ishal-kusma, bakım veren ve ekonomik/kültürel koşulları sorgular.',
        'Bu başlıklardan yalnızca bir veya ikisini sorgular.',
        'Tıbbi ve sosyal öykü sorgulanmaz.'),
      crit('an-4', 'Antropometrik verilerin alınması ve yorumlanması', 4,
        'Doğum ve mevcut ağırlık/boyu alır, olması gereken ağırlıkla karşılaştırır veya yorumlar.',
        'Ağırlığı alır ancak yorumlamaz veya yalnızca tek ölçümle yetinir.',
        'Antropometrik veri alınmaz.'),
    ],
  },
  {
    id: 'clinical_decision_tbt',
    title: 'Klinik Karar ve Tıbbi Beslenme Tedavisi (TBT)',
    maxPoints: 35,
    criteria: [
      crit('cd-1', 'Enerji hedefinin doğru hesaplanması', 9,
        'Doğru ağırlık temelini (OGA/SA/DA) seçer ve vaka referans aralığına uygun enerji hedefini belirtir.',
        'Doğru yöntemi kullanır ancak ağırlık temeli veya aritmetikte hata yapar ya da aralığı tam vermez.',
        'Enerji hedefi belirtilmez veya klinik olarak uygunsuzdur.'),
      crit('cd-2', 'Protein ve sıvı hedefleri', 6,
        'Protein (g/kg) ve uygunsa sıvı (ml/kg) hedeflerini vaka referansına uygun belirtir.',
        'Yalnızca birini belirtir veya sınırların dışında/yanlış ağırlıkla hesaplar.',
        'Protein ve sıvı hedefi belirtilmez.'),
      crit('cd-3', 'Duruma özgü tıbbi beslenme kararı', 10,
        'Tanıya özgü kararı doğru verir (ör. gastroenteritte ORS ve yağ kısıtı yok; KBY\'de protein/potasyum/fosfor sınırı; malnütrisyonda basamaklı yeniden besleme; alerjide uygun hidrolizat formül; çölyakta glutensiz plan).',
        'Tanıya özgü kararı kısmen verir veya gerekçesi eksiktir.',
        'Tanıya özgü karar yoktur veya yanlıştır.'),
      crit('cd-4', 'Besin/ürün seçimi, porsiyon ve hazırlama', 6,
        'Besin grupları, porsiyon, kıvam ve (varsa) formül hazırlamayı ölçüleriyle uygulanabilir biçimde açıklar.',
        'Besin önerir ancak porsiyon/hazırlama ayrıntısı eksiktir.',
        'Somut besin/ürün önerisi yoktur.'),
      crit('cd-5', 'Güvenlik ve kontrendikasyonlar', 4,
        'Yaşa/tanıya göre kaçınılacakları (ör. 1 yaş altı inek sütü ve bal) açıkça belirtir.',
        'Kaçınılacakların yalnızca bir kısmını belirtir.',
        'Güvenlik uyarısı yoktur veya riskli öneri vardır.'),
    ],
  },
  {
    id: 'communication',
    title: 'İletişim Becerileri',
    maxPoints: 20,
    criteria: [
      crit('co-1', 'Açılış ve ilişki kurma', 4,
        'Kendini tanıtır, ebeveyni selamlar, görüşmenin amacını ve süreci açıklar.',
        'Yalnızca selamlar veya amacı belirtmez.',
        'Doğrudan sorgulamaya başlar.'),
      crit('co-2', 'Açık uçlu soru ve aktif dinleme', 6,
        'Açık uçlu sorular sorar, özetler/yansıtır, kesmez.',
        'Açık uçlu soru sınırlıdır; çoğunlukla kapalı uçlu sorar.',
        'Yalnızca kapalı uçlu sorular sorar veya dinlemez.'),
      crit('co-3', 'Empati ve duygusal destek (OARS)', 5,
        'Duyguyu adlandırır, onaylar, çabayı takdir eder; yargılamaz.',
        'Sınırlı empati gösterir.',
        'Empati yoktur veya yargılayıcı/suçlayıcı dil vardır.'),
      crit('co-4', 'Sade dil ve anlaşılırlık (teach-back)', 5,
        'Tıbbi jargon kullanmaz, adım adım açıklar, anlayıp anlamadığını kontrol eder.',
        'Açıklamalar anlaşılır ancak kontrol edilmez veya bazı jargon vardır.',
        'Jargonlu, karmaşık veya anlaşılmaz anlatım.'),
    ],
  },
  {
    id: 'process',
    title: 'Süreç Yönetimi',
    maxPoints: 20,
    criteria: [
      crit('pr-1', 'Yapılandırılmış görüşme akışı', 6,
        'Anamnez → değerlendirme → plan → kapanış sırasını mantıklı izler.',
        'Akış kısmen düzenlidir; geri dönüşler vardır.',
        'Akış dağınıktır.'),
      crit('pr-2', 'Önceliklendirme ve zaman yönetimi', 4,
        'Önce tehlikeli/öncelikli sorunları ele alır, istasyon süresine uygun kalır.',
        'Önceliklendirme kısmen yapılır.',
        'Öncelikli sorunlar atlanır.'),
      crit('pr-3', 'Özet ve planın ebeveynle paylaşılması', 5,
        'Bulguları ve planı özetler, ebeveynle birlikte karar verir.',
        'Özet veya ortak karar eksiktir.',
        'Özet ve ortak karar yoktur.'),
      crit('pr-4', 'Kapanış, takip ve geri bildirim', 5,
        'Soru var mı diye sorar, takip randevusu/izlem planı ve ne zaman başvurulacağını belirtir.',
        'Kapanış kısmen yapılır.',
        'Kapanış yoktur.'),
    ],
  },
] as const;

export const RUBRIC_TOTAL: number = RUBRIC.reduce((s, c) => s + c.maxPoints, 0);

const CATEGORY_IDS: readonly RubricCategoryId[] = RUBRIC.map((c) => c.id);

export function isRubricCategoryId(v: unknown): v is RubricCategoryId {
  return typeof v === 'string' && (CATEGORY_IDS as readonly string[]).includes(v);
}

/** Prompt içine gömülecek, yalnızca kimlik/başlık/puan/seviye içeren sade rubrik metni. */
export function rubricToPromptText(): string {
  return RUBRIC.map((cat) => {
    const crits = cat.criteria
      .map((c) => {
        const levels = c.descriptors.map((d) => `    - ${d.level}: ${d.description}`).join('\n');
        return `  * [${c.id}] ${c.title} (maks ${c.maxPoints} puan)\n${levels}`;
      })
      .join('\n');
    return `${cat.title} [${cat.id}] – toplam ${cat.maxPoints} puan\n${crits}`;
  }).join('\n\n');
}

/* ------------------------------------------------------------------ */
/* Değerlendirici çıktısının doğrulanması                              */
/* ------------------------------------------------------------------ */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

/**
 * Ham JSON'u EvaluatorRawOutput'a doğrular. Şemaya uymazsa hata fırlatır
 * (çağıran taraf bir kez yeniden dener).
 */
export function validateEvaluatorOutput(value: unknown): EvaluatorRawOutput {
  if (!isRecord(value)) throw new Error('Değerlendirici çıktısı bir nesne değil.');
  if (!Array.isArray(value.categories)) throw new Error('"categories" dizisi eksik.');

  const categories = value.categories.map((c, ci) => {
    if (!isRecord(c) || !isRubricCategoryId(c.id)) throw new Error(`categories[${ci}].id geçersiz.`);
    if (!Array.isArray(c.criteria)) throw new Error(`categories[${ci}].criteria eksik.`);
    const criteria: EvaluatorCriterionScore[] = c.criteria.map((k, ki) => {
      if (!isRecord(k) || typeof k.id !== 'string') throw new Error(`categories[${ci}].criteria[${ki}].id geçersiz.`);
      const score = typeof k.score === 'number' && Number.isFinite(k.score) ? k.score : Number(k.score);
      if (!Number.isFinite(score)) throw new Error(`criteria "${k.id}" puanı sayı değil.`);
      return {
        id: k.id,
        score,
        justification: typeof k.justification === 'string' ? k.justification : '',
        evidenceQuote: typeof k.evidenceQuote === 'string' ? k.evidenceQuote : null,
      };
    });
    return { id: c.id, criteria };
  });

  const flagsRaw = Array.isArray(value.criticalErrorFlags) ? value.criticalErrorFlags : [];
  const criticalErrorFlags = flagsRaw.flatMap((f): EvaluatorCriticalFlag[] => {
    if (!isRecord(f)) return [];
    const id = f.id;
    if (
      id !== 'INFANT_COW_MILK' &&
      id !== 'INFANT_HONEY' &&
      id !== 'KWASHIORKOR_OGA_OVERFEEDING' &&
      id !== 'DIARRHEA_FAT_RESTRICTION'
    ) {
      return [];
    }
    return [
      {
        id,
        evidenceQuote: typeof f.evidenceQuote === 'string' ? f.evidenceQuote : '',
        reasoning: typeof f.reasoning === 'string' ? f.reasoning : '',
      },
    ];
  });

  return {
    categories,
    criticalErrorFlags,
    strengths: asStringArray(value.strengths),
    improvements: asStringArray(value.improvements),
    summary: typeof value.summary === 'string' ? value.summary : '',
  };
}

/**
 * LLM puanlarını rubriğe oturtur: eksik kriter 0 alır, fazla puan kırpılır,
 * kategori toplamları KODLA hesaplanır (LLM'in verdiği toplamlara güvenilmez).
 */
export function normalizeEvaluatorOutput(raw: EvaluatorRawOutput): ScorecardDraft {
  const categories: CategoryResult[] = RUBRIC.map((cat) => {
    const rawCat = raw.categories.find((c) => c.id === cat.id);
    const criteria = cat.criteria.map((k) => {
      const rawK = rawCat?.criteria.find((x) => x.id === k.id);
      const clamped = rawK ? Math.min(k.maxPoints, Math.max(0, Math.round(rawK.score))) : 0;
      return {
        id: k.id,
        title: k.title,
        maxPoints: k.maxPoints,
        score: clamped,
        justification: rawK?.justification || 'Değerlendirici bu kriteri puanlamadı.',
        evidenceQuote: rawK?.evidenceQuote ?? null,
      };
    });
    return {
      id: cat.id,
      title: cat.title,
      maxPoints: cat.maxPoints,
      score: criteria.reduce((s, k) => s + k.score, 0),
      criteria,
    };
  });

  return {
    categories,
    strengths: raw.strengths.slice(0, 8),
    improvements: raw.improvements.slice(0, 8),
    summary: raw.summary,
  };
}
