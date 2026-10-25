/**
 * POST /api/chat – Ajan 1: Sanal Ebeveyn.
 *
 * Akış:
 *  1. Gövdeyi doğrula (vaka, persona, transkript).
 *  2. Öğrenci mesajlarından uyum (rapport) metriklerini KODLA hesapla.
 *  3. Seviyenin izin verdiği olgularla sistem komutunu kur (izin verilmeyen
 *     olgular komuta hiç girmez → sızma olmaz).
 *  4. Claude'dan ebeveyn yanıtını al ve döndür.
 *
 * Boş transkriptte API çağrısı yapılmaz; personanın açılış cümlesi döner.
 */
import { NextResponse } from 'next/server';
import type { ChatRequestBody, ChatResponseBody, ApiErrorBody } from '@/types';
import { generateText } from '@/lib/anthropic';
import { corsHeaders, guardRequest } from '@/lib/guard';
import { getCase, getPersona } from '@/lib/data';
import { replyAsParent } from '@/lib/evaluation';
import { HttpError, errorBody, isPersonaId, parseTranscript, readJsonBody } from '@/lib/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseBody(raw: Record<string, unknown>): ChatRequestBody {
  if (typeof raw.caseId !== 'string') throw new HttpError(400, '"caseId" metin olmalı.');
  if (!isPersonaId(raw.personaId)) throw new HttpError(400, '"personaId" geçersiz.');
  const messages = parseTranscript(raw.messages ?? [], 'messages');
  return { caseId: raw.caseId, personaId: raw.personaId, messages };
}

export async function POST(req: Request): Promise<NextResponse<ChatResponseBody | ApiErrorBody>> {
  try {
    guardRequest(req);
    const body = parseBody(await readJsonBody(req));

    const clinicalCase = getCase(body.caseId);
    if (!clinicalCase) throw new HttpError(404, `Vaka bulunamadı: ${body.caseId}`);
    const persona = getPersona(body.personaId);
    if (!persona) throw new HttpError(404, `Persona bulunamadı: ${body.personaId}`);

    const result = await replyAsParent({
      clinicalCase,
      persona,
      messages: body.messages,
      generate: generateText,
    });
    return NextResponse.json(result, { headers: corsHeaders(req) });
  } catch (err) {
    const { status, body } = errorBody(err);
    return NextResponse.json(body, { status, headers: corsHeaders(req) });
  }
}

export function OPTIONS(req: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}
