/**
 * POST /api/evaluate – Ajan 2: Akademik Değerlendirici + klinik guardrail.
 *
 * Akış:
 *  1. Gövdeyi doğrula; en az bir öğrenci mesajı şart.
 *  2. Deterministik guardrail taramasını çalıştır (LLM'den bağımsız).
 *  3. Claude'dan rubrik tabanlı katı JSON al (geçersizse bir kez yeniden dene).
 *  4. LLM'in hayati hata iddialarını birebir alıntıyla doğrula, raporu birleştir.
 *  5. Kriter puanlarını kırp, toplamı KODLA hesapla, hayati hata varsa ≤ 59 tavanı,
 *     başarısız ve kırmızı uyarılı mühür uygula.
 */
import { NextResponse } from 'next/server';
import type { ApiErrorBody, EvaluateRequestBody, EvaluateResponseBody } from '@/types';
import { generateEvalText } from '@/lib/anthropic';
import { corsHeaders, guardRequest } from '@/lib/guard';
import { getCase, getPersona } from '@/lib/data';
import { evaluateTranscript } from '@/lib/evaluation';
import { HttpError, errorBody, isPersonaId, parseTranscript, readJsonBody } from '@/lib/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function parseBody(raw: Record<string, unknown>): EvaluateRequestBody {
  if (typeof raw.caseId !== 'string') throw new HttpError(400, '"caseId" metin olmalı.');
  if (!isPersonaId(raw.personaId)) throw new HttpError(400, '"personaId" geçersiz.');
  const transcript = parseTranscript(raw.transcript, 'transcript');
  if (!transcript.some((m) => m.role === 'student')) {
    throw new HttpError(400, 'Değerlendirme için en az bir öğrenci mesajı gerekli.');
  }
  return { caseId: raw.caseId, personaId: raw.personaId, transcript };
}

export async function POST(req: Request): Promise<NextResponse<EvaluateResponseBody | ApiErrorBody>> {
  try {
    guardRequest(req);
    const body = parseBody(await readJsonBody(req));

    const clinicalCase = getCase(body.caseId);
    if (!clinicalCase) throw new HttpError(404, `Vaka bulunamadı: ${body.caseId}`);
    if (!getPersona(body.personaId)) throw new HttpError(404, `Persona bulunamadı: ${body.personaId}`);

    const scorecard = await evaluateTranscript({
      clinicalCase,
      personaId: body.personaId,
      transcript: body.transcript,
      generate: generateEvalText,
    });
    return NextResponse.json({ scorecard }, { headers: corsHeaders(req) });
  } catch (err) {
    const { status, body } = errorBody(err);
    return NextResponse.json(body, { status, headers: corsHeaders(req) });
  }
}

export function OPTIONS(req: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}
