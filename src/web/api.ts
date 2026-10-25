/**
 * Model çağrıları iki modda çalışır:
 *  - Sunucu modu: docs/config.js içinde OSCE_API_BASE doluysa istekler sunucuya (Vercel vb.) gider; anahtar tarayıcıda yoktur.
 *  - Doğrudan mod (şimdilik): OSCE_API_BASE boşsa anahtar bu tarayıcıdaki ayarlardan okunur ve Anthropic'e doğrudan gidilir.
 */
import { getCase, getPersona } from '@/lib/data';
import { evaluateTranscript, replyAsParent } from '@/lib/evaluation';
import type { ApiErrorBody, ChatRequestBody, ChatResponseBody, EvaluateRequestBody, EvaluateResponseBody } from '@/types';
import { createBrowserGenerate } from './llm';
import { getSettings } from './settings';

function base(): string {
  return (window as unknown as { OSCE_API_BASE?: string }).OSCE_API_BASE?.trim().replace(/\/$/, '') ?? '';
}

export const serverMode = (): boolean => base() !== '';

async function post<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${base()}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  } catch {
    throw new Error('Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edip yeniden deneyin.');
  }
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* gövde JSON değil */
  }
  if (!res.ok) throw new Error((data as ApiErrorBody | null)?.error ?? `İstek başarısız oldu (HTTP ${res.status}).`);
  return data as T;
}

export async function chatApi(body: ChatRequestBody): Promise<ChatResponseBody> {
  if (serverMode()) return post('/api/chat', body);
  const s = getSettings();
  const clinicalCase = getCase(body.caseId);
  const persona = getPersona(body.personaId);
  if (!clinicalCase || !persona) throw new Error('Vaka veya ebeveyn bulunamadı.');
  return replyAsParent({
    clinicalCase,
    persona,
    messages: body.messages,
    generate: createBrowserGenerate({ apiKey: s.apiKey, model: s.chatModel }),
  });
}

export async function evaluateApi(body: EvaluateRequestBody): Promise<EvaluateResponseBody> {
  if (serverMode()) {
    const res = await post<EvaluateResponseBody>('/api/evaluate', body);
    if (!res?.scorecard) throw new Error('Sunucudan geçerli bir karne gelmedi. Yeniden deneyin.');
    return res;
  }
  const s = getSettings();
  const clinicalCase = getCase(body.caseId);
  if (!clinicalCase) throw new Error('Vaka bulunamadı.');
  const scorecard = await evaluateTranscript({
    clinicalCase,
    personaId: body.personaId,
    transcript: body.transcript,
    generate: createBrowserGenerate({ apiKey: s.apiKey, model: s.evalModel }),
  });
  return { scorecard };
}
