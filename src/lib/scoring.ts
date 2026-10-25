/**
 * Karne (scorecard) oluşturma: LLM taslağı + deterministik guardrail raporu.
 * Nihai puan, mühür ve geçti/kaldı kararı YALNIZCA burada, kodla belirlenir.
 */
import type { ClinicalCase, GuardrailReport, Scorecard, ScorecardDraft } from '@/types';
import { applyScoreCeiling } from './clinicalGuardrails';

export const PASS_THRESHOLD = 60;

export function buildScorecard(args: {
  clinicalCase: ClinicalCase;
  personaId: string;
  draft: ScorecardDraft;
  report: GuardrailReport;
  now?: Date;
}): Scorecard {
  const { clinicalCase, personaId, draft, report } = args;
  const uncappedScore = draft.categories.reduce((s, c) => s + c.score, 0);
  const overallScore = applyScoreCeiling(uncappedScore, report);
  const hasFatal = report.fatalErrors.length > 0;
  const passed = !hasFatal && overallScore >= PASS_THRESHOLD;

  return {
    ...draft,
    caseId: clinicalCase.id,
    personaId,
    evaluatedAt: (args.now ?? new Date()).toISOString(),
    uncappedScore,
    overallScore,
    passed,
    seal: hasFatal ? 'RED_ALERT' : passed ? 'PASSED' : 'FAILED',
    redAlert: hasFatal
      ? {
          title: 'KIRMIZI UYARI – HAYATİ KLİNİK HATA',
          messages: report.fatalErrors.map((f) => `${f.title}: ${f.description}`),
        }
      : null,
    fatalErrors: report.fatalErrors,
    warnings: report.warnings,
    passThreshold: PASS_THRESHOLD,
  };
}
