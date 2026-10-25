/**
 * Anthropic SDK sarmalayıcısı (yalnızca sunucu tarafı).
 * Model adı ANTHROPIC_MODEL ortam değişkeninden okunur (varsayılan: claude-sonnet-5-5).
 */
import Anthropic from '@anthropic-ai/sdk';
import type { GenerateOptions } from './llmUtils';
import { HttpError } from './validate';

export { extractJson, toLlmMessages } from './llmUtils';
export type { GenerateOptions, LlmMessage } from './llmUtils';

export const DEFAULT_MODEL = 'claude-sonnet-5-5';

export function getModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
}

/** Karne modeli: ANTHROPIC_EVAL_MODEL yoksa ANTHROPIC_MODEL kullanılır. */
export function getEvalModel(): string {
  return process.env.ANTHROPIC_EVAL_MODEL?.trim() || getModel();
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

export function generateText(opts: GenerateOptions): Promise<string> {
  return generateWith(getModel(), opts);
}

export function generateEvalText(opts: GenerateOptions): Promise<string> {
  return generateWith(getEvalModel(), opts);
}

async function generateWith(model: string, opts: GenerateOptions): Promise<string> {
  try {
    const res = await getClient().messages.create({
      model,
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
