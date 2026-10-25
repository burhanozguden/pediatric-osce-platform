/**
 * Anthropic SDK sarmalayıcısı.
 * Model adı ANTHROPIC_MODEL ortam değişkeninden okunur (varsayılan: claude-sonnet-5-5).
 */
import Anthropic from '@anthropic-ai/sdk';
import type { TranscriptMessage } from '@/types';
import { HttpError } from './validate';

export const DEFAULT_MODEL = 'claude-sonnet-5-5';

export function getModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
}

let client: Anthropic | null = null;

export function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new HttpError(500, 'Sunucu yapılandırması eksik: ANTHROPIC_API_KEY tanımlı değil.');
  }
  client ??= new Anthropic({ apiKey });
  return client;
}

export interface LlmMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface GenerateOptions {
  system: string;
  messages: LlmMessage[];
  maxTokens: number;
  temperature?: number;
}

export async function generateText(opts: GenerateOptions): Promise<string> {
  try {
    const res = await getClient().messages.create({
      model: getModel(),
      max_tokens: opts.maxTokens,
      system: opts.system,
      messages: opts.messages,
      ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
    });
    const text = res.content
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('')
      .trim();
    if (!text) throw new HttpError(502, 'Model boş yanıt döndürdü.');
    return text;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    const message = err instanceof Error ? err.message : 'bilinmeyen hata';
    throw new HttpError(502, 'Model çağrısı başarısız oldu.', message);
  }
}

/**
 * Transkripti Anthropic mesaj formatına çevirir:
 * öğrenci → user, ebeveyn → assistant; ardışık aynı roller birleştirilir;
 * ilk mesaj her zaman user olmalıdır (gerekirse sahne başlangıcı eklenir).
 */
export function toLlmMessages(transcript: TranscriptMessage[]): LlmMessage[] {
  const out: LlmMessage[] = [];
  for (const m of transcript) {
    const role: LlmMessage['role'] = m.role === 'student' ? 'user' : 'assistant';
    const last = out[out.length - 1];
    if (last && last.role === role) last.content += `\n${m.content}`;
    else out.push({ role, content: m.content });
  }
  if (out[0]?.role !== 'user') {
    out.unshift({ role: 'user', content: '(Görüşme başladı; öğrenci odaya girdi.)' });
  }
  return out;
}

/** Model metninden JSON nesnesini ayıklar (kod bloğu veya ön/son metin toleransı). */
export function extractJson(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('Yanıtta JSON nesnesi bulunamadı.');
  return JSON.parse(candidate.slice(start, end + 1));
}
