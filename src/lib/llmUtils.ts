/**
 * LLM yardımcıları – SDK'dan bağımsız (hem sunucuda hem tarayıcıda çalışır).
 */
import type { TranscriptMessage } from '@/types';

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

/** Bir metin üretici: sunucuda Anthropic SDK, tarayıcıda doğrudan fetch. */
export type Generate = (opts: GenerateOptions) => Promise<string>;

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
