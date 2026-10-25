/**
 * İstek doğrulama yardımcıları ve HTTP hata sınıfı.
 * Dış girdi (JSON gövde) asla doğrudan güvenilmez; tüm alanlar burada daraltılır.
 */
import type { ApiErrorBody, Persona, TranscriptMessage } from '@/types';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const LIMITS = {
  maxMessages: 80,
  maxMessageChars: 2000,
  maxBodyBytes: 200_000,
} as const;

const PERSONA_IDS: readonly Persona['id'][] = ['anxious-mother', 'neglectful-grandmother', 'cooperative-parent'];

export function isPersonaId(v: unknown): v is Persona['id'] {
  return typeof v === 'string' && (PERSONA_IDS as readonly string[]).includes(v);
}

export async function readJsonBody(req: Request): Promise<Record<string, unknown>> {
  const raw = await req.text();
  if (raw.length > LIMITS.maxBodyBytes) throw new HttpError(413, 'İstek gövdesi çok büyük.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new HttpError(400, 'Geçersiz JSON.');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new HttpError(400, 'İstek gövdesi bir JSON nesnesi olmalı.');
  }
  return parsed as Record<string, unknown>;
}

export function parseTranscript(value: unknown, field: string): TranscriptMessage[] {
  if (!Array.isArray(value)) throw new HttpError(400, `"${field}" bir dizi olmalı.`);
  if (value.length > LIMITS.maxMessages) throw new HttpError(400, `"${field}" en çok ${LIMITS.maxMessages} mesaj içerebilir.`);
  return value.map((m, i) => {
    if (typeof m !== 'object' || m === null) throw new HttpError(400, `${field}[${i}] geçersiz.`);
    const rec = m as Record<string, unknown>;
    if (rec.role !== 'student' && rec.role !== 'parent') {
      throw new HttpError(400, `${field}[${i}].role "student" veya "parent" olmalı.`);
    }
    if (typeof rec.content !== 'string' || rec.content.trim() === '') {
      throw new HttpError(400, `${field}[${i}].content boş olmayan metin olmalı.`);
    }
    if (rec.content.length > LIMITS.maxMessageChars) {
      throw new HttpError(400, `${field}[${i}].content en çok ${LIMITS.maxMessageChars} karakter olabilir.`);
    }
    const msg: TranscriptMessage = { role: rec.role, content: rec.content };
    if (typeof rec.timestamp === 'string') msg.timestamp = rec.timestamp;
    return msg;
  });
}

export function errorBody(err: unknown): { status: number; body: ApiErrorBody } {
  if (err instanceof HttpError) {
    return { status: err.status, body: { error: err.message, ...(err.details ? { details: err.details } : {}) } };
  }
  return { status: 500, body: { error: 'Beklenmeyen sunucu hatası.' } };
}
