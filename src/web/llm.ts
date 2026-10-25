/**
 * Tarayıcıdan doğrudan Anthropic Messages API çağrısı (sunucusuz mod).
 * Anahtar yalnızca bu tarayıcıda durur; hiçbir sunucuya uğramaz.
 */
import type { GenerateOptions } from '@/lib/llmUtils';
import { HttpError } from '@/lib/validate';

export interface BrowserConfig {
  apiKey: string;
  model: string;
}

interface AnthropicResponse {
  content?: { type: string; text?: string }[];
  error?: { type?: string; message?: string };
}

export function createBrowserGenerate(cfg: BrowserConfig) {
  return async (opts: GenerateOptions): Promise<string> => {
    let res: Response;
    try {
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': cfg.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: cfg.model,
          max_tokens: opts.maxTokens,
          system: opts.system,
          messages: opts.messages,
        }),
      });
    } catch {
      throw new HttpError(0, 'Anthropic sunucusuna ulaşılamadı. İnternet bağlantınızı kontrol edin.');
    }
    let data: AnthropicResponse = {};
    try {
      data = (await res.json()) as AnthropicResponse;
    } catch {
      /* gövde JSON değil */
    }
    if (!res.ok) {
      if (res.status === 401) throw new HttpError(401, 'API anahtarı geçersiz. Ayarlardan anahtarı kontrol edin.');
      if (res.status === 404) throw new HttpError(404, `Model bulunamadı: ${cfg.model}. Ayarlardan model adını kontrol edin.`);
      if (res.status === 429) throw new HttpError(429, 'İstek sınırına ulaşıldı. Biraz bekleyip yeniden deneyin.');
      throw new HttpError(res.status, data.error?.message ?? `Model çağrısı başarısız (HTTP ${res.status}).`);
    }
    const text = (data.content ?? []).map((b) => (b.type === 'text' ? (b.text ?? '') : '')).join('').trim();
    if (!text) throw new HttpError(502, 'Model boş yanıt döndürdü.');
    return text;
  };
}
