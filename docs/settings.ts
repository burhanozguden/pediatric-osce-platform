/** Yönetici ayarları (yalnızca doğrudan modda): anahtar ve modeller bu tarayıcıda saklanır. */
import { byId, store } from './dom';

const local = store('local');
const session = store('session');
const KEY = 'osce.apiKey';
const CHAT = 'osce.chatModel';
const EVAL = 'osce.evalModel';
export const DEFAULT_CHAT_MODEL = 'claude-haiku-5-5';
export const DEFAULT_EVAL_MODEL = 'claude-sonnet-5-5';

export interface Settings {
  apiKey: string;
  chatModel: string;
  evalModel: string;
}

export function getSettings(): Settings {
  return {
    apiKey: (local.get(KEY) ?? session.get(KEY) ?? '').trim(),
    chatModel: local.get(CHAT)?.trim() || DEFAULT_CHAT_MODEL,
    evalModel: local.get(EVAL)?.trim() || DEFAULT_EVAL_MODEL,
  };
}

/**
 * Tek seferlik kurulum bağlantısı: site adresinin sonuna #anahtar=sk-ant-... eklenip açılırsa
 * anahtar bu tarayıcıya kaydedilir ve adres çubuğundan hemen silinir (# kısmı sunucuya gönderilmez).
 */
function importKeyFromLink(): void {
  const m = /[#&]anahtar=([^&]+)/.exec(window.location.hash);
  if (!m?.[1]) return;
  const key = decodeURIComponent(m[1]).trim();
  history.replaceState(null, '', window.location.pathname + window.location.search);
  if (key) local.set(KEY, key);
}

export function mountSettings(): void {
  importKeyFromLink();
  const s = getSettings();
  const key = byId<HTMLInputElement>('api-key');
  const remember = byId<HTMLInputElement>('remember');
  const chat = byId<HTMLInputElement>('chat-model');
  const ev = byId<HTMLInputElement>('eval-model');
  key.value = s.apiKey;
  remember.checked = local.get(KEY) !== null;
  chat.value = s.chatModel;
  ev.value = s.evalModel;
  const save = (): void => {
    local.remove(KEY);
    session.remove(KEY);
    const k = key.value.trim();
    if (k) (remember.checked ? local : session).set(KEY, k);
    local.set(CHAT, chat.value.trim() || DEFAULT_CHAT_MODEL);
    local.set(EVAL, ev.value.trim() || DEFAULT_EVAL_MODEL);
  };
  for (const el of [key, remember, chat, ev]) el.addEventListener('change', save);
  byId<HTMLFormElement>('setup-form').addEventListener('submit', (e) => {
    e.preventDefault();
    save();
  });
}

/** Doğrudan modda anahtar yoksa ayarları açar ve false döner. */
export function ensureKey(): boolean {
  if (getSettings().apiKey) return true;
  byId<HTMLDetailsElement>('ayarlar').open = true;
  byId('api-key').scrollIntoView({ block: 'center' });
  byId('api-key').focus();
  return false;
}
