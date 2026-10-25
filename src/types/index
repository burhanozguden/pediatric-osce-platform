/**
 * Pediatrik Klinik Beslenme YZ OSCE Platformu – ortak tip tanımları.
 * Tüm veri dosyaları (cases.json, personas.json), guardrail, prompt ve API
 * katmanları bu arayüzleri kullanır.
 */

/* ------------------------------------------------------------------ */
/* Ortak                                                               */
/* ------------------------------------------------------------------ */

export type Sex = 'female' | 'male' | 'unspecified';

export interface NumericRange {
  min: number;
  max: number;
}

/** Hesapta hangi kilo esas alındı: OGA (olması gereken ağırlık), SA (şu anki), DA (doğum). */
export type WeightBasis = 'OGA' | 'SA' | 'DA';

/* ------------------------------------------------------------------ */
/* Vaka modeli                                                         */
/* ------------------------------------------------------------------ */

export type ConditionCode =
  | 'healthy_complementary'
  | 'premature'
  | 'marasmus'
  | 'kwashiorkor'
  | 'cystic_fibrosis'
  | 'ckd'
  | 'type1_diabetes'
  | 'cow_milk_allergy'
  | 'celiac'
  | 'gastroenteritis';

export type CaseDomain =
  | 'complementary_feeding'
  | 'neonatal'
  | 'malnutrition'
  | 'malabsorption'
  | 'renal'
  | 'endocrine'
  | 'allergy_intolerance'
  | 'gastrointestinal';

export interface TargetBasis {
  weightBasis: WeightBasis;
  basisWeightKg: number;
}

export interface EnergyTarget extends TargetBasis {
  /** kcal/kg/gün aralığı (sabit toplam hedefli vakalarda hesaplanmış karşılık). */
  perKg: NumericRange | null;
  totalKcal: NumericRange;
  formula: string;
}

export interface ProteinTarget extends TargetBasis {
  perKg: NumericRange | null;
  totalG: NumericRange;
  formula: string;
}

export interface FluidTarget extends TargetBasis {
  perKg: NumericRange | null;
  totalMl: NumericRange;
  formula: string;
}

export interface MacroTargets {
  choPercent?: NumericRange;
  choG?: NumericRange;
  proteinPercent?: NumericRange;
  fatPercent?: NumericRange;
  fatG?: NumericRange;
  /** Ana ve ara öğün enerji dağılımı (ör. T1DM). */
  mealKcal?: { main: number; snack: number; note: string };
}

export interface RenalLimits {
  proteinGPerKg: NumericRange;
  potassiumMgPerKgMax: number;
  phosphorusMgPerKgMax: number;
  potassiumMgMax: number;
  phosphorusMgMax: number;
  note: string;
}

export interface RehydrationPlan {
  dehydration: 'hafif' | 'orta' | 'ağır';
  orsMlPerKg: NumericRange;
  hours: NumericRange;
  totalOrsMl: NumericRange;
  afterEachLooseStoolMl?: NumericRange;
  escalation: string;
}

export interface RefeedingPhase {
  label: string;
  weightKg: number;
  energyPerKg: NumericRange;
  energyTotalKcal: NumericRange;
  proteinGPerKg: NumericRange;
  proteinTotalG: NumericRange;
  fluidPerKg: NumericRange | null;
  fluidTotalMl: NumericRange | null;
  referencePlan: string;
}

export interface InfantFormula {
  productName: string;
  scoopsPerBatch: number;
  batchWaterMl: number;
  servingsPerDay: number;
  mlPerServing: number;
  additives: string[];
  preparationSteps: string;
  scenarioNote?: string;
}

export type HistoryTopic =
  | 'chief_complaint'
  | 'feeding'
  | 'growth'
  | 'medical'
  | 'family_social'
  | 'beliefs';

/** Ebeveynin hangi uyum (rapport) seviyesinde paylaşacağı bilgi. */
export type DisclosureTier = 1 | 2 | 3;

export interface DisclosureFact {
  id: string;
  tier: DisclosureTier;
  topic: HistoryTopic;
  text: string;
  /** false ise defterde yer almayan, simülasyon için kurgulanmış ayrıntı. */
  notebookDerived: boolean;
}

export type CriticalErrorId =
  | 'INFANT_COW_MILK'
  | 'INFANT_HONEY'
  | 'KWASHIORKOR_OGA_OVERFEEDING'
  | 'DIARRHEA_FAT_RESTRICTION';

export interface PatientProfile {
  ageLabel: string;
  /** Ondalıklı ay (ör. 8.5). 12 ay üzeri için yaş × 12. */
  ageMonths: number;
  ageDays?: number;
  gestationalWeekAtBirth?: number;
  sex: Sex;
  /** Ebeveynin çocuğa atıf biçimi ("bebeğim", "çocuğum"). */
  parentRef: string;
  birthWeightG: number | null;
  currentWeightKg: number;
  heightCm: number | null;
}

export interface GrowthProfile {
  idealWeightKg: number | null;
  idealWeightFormula: string;
  /** Kwashiorkor ve prematürede false: OGA hesaplanmaz. */
  ogaApplicable: boolean;
  ogaNote: string;
  weightLossPercent: number | null;
}

export interface ClinicalCase {
  id: string;
  title: string;
  domain: CaseDomain;
  condition: ConditionCode;
  /** Öğrencinin istasyon kartında gördüğü bilgi (hedefleri içermez). */
  stationBrief: string;
  patient: PatientProfile;
  growth: GrowthProfile;
  energy: EnergyTarget;
  protein: ProteinTarget;
  fluid: FluidTarget | null;
  macroTargets?: MacroTargets;
  renalLimits?: RenalLimits;
  rehydration?: RehydrationPlan;
  refeedingPhases?: RefeedingPhase[];
  formula: InfantFormula | null;
  sampleMenu: string[];
  mustInclude: string[];
  mustAvoid: string[];
  keyClinicalPoints: string[];
  criticalRuleIds: CriticalErrorId[];
  disclosureFacts: DisclosureFact[];
  sourceNote: string;
  /** Defter okuması/kaynak tutarsızlığı nedeniyle diyetisyen doğrulaması gereken noktalar. */
  verificationFlags: string[];
}

export interface CasesFile {
  meta: {
    version: string;
    generatedBy: string;
    reviewStatus: 'draft_requires_dietitian_review';
    notes: string[];
  };
  cases: ClinicalCase[];
}

/* ------------------------------------------------------------------ */
/* Persona modeli (Ajan 1)                                             */
/* ------------------------------------------------------------------ */

export interface ResistancePoint {
  id: string;
  description: string;
  /** Bu direnç hangi öğrenci davranışıyla tetiklenir. */
  trigger: string;
  /** Tetiklenince ebeveynin vereceği tipik tepki (örnek, birebir okunmaz). */
  exampleReaction: string;
}

export interface FolkBelief {
  id: string;
  belief: string;
  /** Hangi konu açılınca ebeveyn bu inancı kendiliğinden dile getirir. */
  surfacesWhen: string;
}

export interface Persona {
  id: 'anxious-mother' | 'neglectful-grandmother' | 'cooperative-parent';
  displayName: string;
  role: string;
  ageYears: number;
  education: string;
  emotionalBaseline: string;
  speechStyle: string;
  openingLine: string;
  resistancePoints: ResistancePoint[];
  folkBeliefs: FolkBelief[];
  warmsUpWhen: string[];
  shutsDownWhen: string[];
  dialogueRules: string[];
  forbiddenBehaviors: string[];
}

export interface PersonasFile {
  personas: Persona[];
}

/* ------------------------------------------------------------------ */
/* Transkript                                                          */
/* ------------------------------------------------------------------ */

export type TranscriptRole = 'student' | 'parent';

export interface TranscriptMessage {
  role: TranscriptRole;
  content: string;
  /** ISO 8601 */
  timestamp?: string;
}

export interface RapportMetrics {
  openQuestions: number;
  closedQuestions: number;
  empathyStatements: number;
  reflections: number;
  studentTurns: number;
  /** 0: yalnızca tier 1, 1: tier 1-2, 2: tier 1-3 */
  disclosureLevel: 0 | 1 | 2;
}

/* ------------------------------------------------------------------ */
/* Guardrail                                                           */
/* ------------------------------------------------------------------ */

export type GuardrailWarningId =
  | 'GASTRO_NO_ORS'
  | 'CKD_NO_POTASSIUM_PHOSPHORUS'
  | 'CMPA_LACTOSE_FREE_FORMULA';

export interface CriticalErrorFinding {
  id: CriticalErrorId;
  title: string;
  description: string;
  source: 'deterministic' | 'llm_verified';
  evidence: {
    messageIndex: number;
    /** Normalize edilmiş (küçük harf, ASCII katlanmış) cümle parçası. */
    normalizedExcerpt: string;
    /** Öğrenci mesajının ilk 200 karakteri (özgün yazım). */
    studentText: string;
  };
}

export interface GuardrailWarning {
  id: GuardrailWarningId;
  message: string;
}

export interface GuardrailReport {
  fatalErrors: CriticalErrorFinding[];
  warnings: GuardrailWarning[];
  capApplied: boolean;
  scoreCeiling: number | null;
}

/* ------------------------------------------------------------------ */
/* Rubrik ve karne                                                     */
/* ------------------------------------------------------------------ */

export type RubricCategoryId =
  | 'anamnesis'
  | 'clinical_decision_tbt'
  | 'communication'
  | 'process';

export interface RubricCriterion {
  id: string;
  title: string;
  maxPoints: number;
  descriptors: { level: string; description: string }[];
}

export interface RubricCategory {
  id: RubricCategoryId;
  title: string;
  maxPoints: number;
  criteria: RubricCriterion[];
}

/** Değerlendirici LLM'in döndürmesi gereken ham yapı. */
export interface EvaluatorCriterionScore {
  id: string;
  score: number;
  justification: string;
  evidenceQuote: string | null;
}

export interface EvaluatorCategoryScore {
  id: RubricCategoryId;
  criteria: EvaluatorCriterionScore[];
}

export interface EvaluatorCriticalFlag {
  id: CriticalErrorId;
  evidenceQuote: string;
  reasoning: string;
}

export interface EvaluatorRawOutput {
  categories: EvaluatorCategoryScore[];
  criticalErrorFlags: EvaluatorCriticalFlag[];
  strengths: string[];
  improvements: string[];
  summary: string;
}

export interface CategoryResult {
  id: RubricCategoryId;
  title: string;
  score: number;
  maxPoints: number;
  criteria: (EvaluatorCriterionScore & { title: string; maxPoints: number })[];
}

export interface ScorecardDraft {
  categories: CategoryResult[];
  strengths: string[];
  improvements: string[];
  summary: string;
}

export type ScorecardSeal = 'PASSED' | 'FAILED' | 'RED_ALERT';

export interface Scorecard extends ScorecardDraft {
  caseId: string;
  personaId: string;
  evaluatedAt: string;
  /** Tavan uygulanmadan önceki toplam. */
  uncappedScore: number;
  overallScore: number;
  passed: boolean;
  seal: ScorecardSeal;
  redAlert: { title: string; messages: string[] } | null;
  fatalErrors: CriticalErrorFinding[];
  warnings: GuardrailWarning[];
  passThreshold: number;
}

/* ------------------------------------------------------------------ */
/* API sözleşmeleri                                                    */
/* ------------------------------------------------------------------ */

export interface ChatRequestBody {
  caseId: string;
  personaId: Persona['id'];
  messages: TranscriptMessage[];
}

export interface ChatResponseBody {
  reply: string;
  disclosureLevel: 0 | 1 | 2;
  rapport: RapportMetrics;
}

export interface EvaluateRequestBody {
  caseId: string;
  personaId: Persona['id'];
  transcript: TranscriptMessage[];
}

export interface EvaluateResponseBody {
  scorecard: Scorecard;
}

export interface ApiErrorBody {
  error: string;
  details?: string;
}
