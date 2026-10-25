/**
 * Herkese açık API için koruma: CORS, izinli kaynak (origin) denetimi ve basit hız sınırı.
 * ALLOWED_ORIGINS: virgülle ayrılmış izinli site adresleri (örn. https://burhanozguden.github.io).
 * Boşsa her kaynağa izin verilir (yalnızca yerel geliştirme için).
 * Not: hız sınırı sunucusuz ortamda örnek başına çalışır; asıl koruma Anthropic Console'daki harcama sınırıdır.
 */
import { HttpError } from './validate';

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX ?? 90);
const hits = new Map<string, number[]>();

function allowedOrigins(): string[] {
  return (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin')?.replace(/\/$/, '') ?? '';
  const allowed = allowedOrigins();
  const ok = allowed.length === 0 || allowed.includes(origin);
  return {
    ...(ok && origin ? { 'access-control-allow-origin': origin } : {}),
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'origin',
  };
}

export function guardRequest(req: Request): void {
  const origin = req.headers.get('origin')?.replace(/\/$/, '');
  const allowed = allowedOrigins();
  if (allowed.length && (!origin || !allowed.includes(origin))) {
    throw new HttpError(403, 'Bu siteden istek kabul edilmiyor.');
  }
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'bilinmiyor';
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    throw new HttpError(429, 'Çok fazla istek. Birkaç dakika sonra yeniden deneyin.');
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
}
