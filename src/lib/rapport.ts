/**
 * Uyum (rapport) analizi – kademeli bilgi paylaşımı.
 *
 * Sanal ebeveyn, öğrencinin iletişim davranışına göre klinik bilgiyi kademeli
 * açar (OARS: Open questions, Affirmations, Reflections, Summaries).
 * Seviye, öğrenci mesajlarından KODLA hesaplanır; LLM'in "ne kadar açılacağı"
 * kararına bırakılmaz. Seviyenin izin vermediği olgular prompt'a hiç konmaz,
 * bu yüzden model onları sızdıramaz.
 */
import type { ClinicalCase, DisclosureFact, RapportMetrics, TranscriptMessage } from '@/types';
import { normalizeTr, splitIntoClauses } from './text';

const OPEN_QUESTION_CUE =
  /\b(?:nasil|neden|niye|ne zaman|neler|nelerdir|hangi|anlat\w*|paylas\w*|bahset\w*|biraz|hakkinda|nelere)\b/;
const EMPATHY_CUE =
  /\banliyorum\b|\banlayabiliyorum\b|\bcok zor\b|\bzor (?:bir|olmali|olmus)\b|\bzorlan\w*|\bendise\w*|\bhaklisiniz\b|\buzgunum\b|\bgecmis olsun\b|\bemeginiz\w*|\byalniz degilsiniz\b|\byardimci olacagim\b|\bbirlikte (?:cozecegiz|calisacagiz|bakacagiz)\b|\bcok normal\b|\bdogal bir\b|\bgayret\w*/;
const REFLECTION_CUE =
  /\byani\b|\bdemek ki\b|\bsoyle anladim\b|\banladigim kadariyla\b|\bdogru anladiysam\b|\bozetlersek\b|\bsoyluyorsunuz\b|\bbahsettiginiz\b|\bdediginize gore\b/;

export function analyzeRapport(transcript: TranscriptMessage[]): RapportMetrics {
  let openQuestions = 0;
  let closedQuestions = 0;
  let empathyStatements = 0;
  let reflections = 0;
  let studentTurns = 0;

  for (const msg of transcript) {
    if (msg.role !== 'student') continue;
    studentTurns += 1;
    const normalized = normalizeTr(msg.content);
    if (EMPATHY_CUE.test(normalized)) empathyStatements += 1;
    if (REFLECTION_CUE.test(normalized)) reflections += 1;

    const seen = new Set<string>();
    for (const clause of splitIntoClauses(msg.content)) {
      if (!clause.isQuestion || seen.has(clause.sentence)) continue;
      seen.add(clause.sentence);
      if (OPEN_QUESTION_CUE.test(normalizeTr(clause.sentence))) openQuestions += 1;
      else closedQuestions += 1;
    }
  }

  let disclosureLevel: 0 | 1 | 2 = 0;
  if (openQuestions >= 1 || empathyStatements >= 1) disclosureLevel = 1;
  if (openQuestions >= 2 && (empathyStatements >= 1 || reflections >= 1) && studentTurns >= 4) disclosureLevel = 2;

  return { openQuestions, closedQuestions, empathyStatements, reflections, studentTurns, disclosureLevel };
}

/** Seviye 0 → yalnızca tier 1; seviye 1 → tier ≤ 2; seviye 2 → tier ≤ 3. */
export function allowedFacts(clinicalCase: ClinicalCase, level: 0 | 1 | 2): DisclosureFact[] {
  const maxTier = level + 1;
  return clinicalCase.disclosureFacts.filter((f) => f.tier <= maxTier);
}
