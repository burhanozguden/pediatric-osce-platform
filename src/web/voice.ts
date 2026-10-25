/** Tarayıcı konuşma tanıma (tr-TR) ve sesli yanıt. Desteklenmiyorsa yazı yedek kalır. */
interface RecResult { readonly isFinal: boolean; readonly 0: { readonly transcript: string } }
interface RecEvent { readonly resultIndex: number; readonly results: ArrayLike<RecResult> }
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: RecEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type RecCtor = new () => Recognition;

function recCtor(): RecCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const canListen = (): boolean => recCtor() !== null;
export const canSpeak = (): boolean => 'speechSynthesis' in window;

let rec: Recognition | null = null;

export function listen(handlers: { onText: (text: string, final: boolean) => void; onEnd: (error?: string) => void }): void {
  const Ctor = recCtor();
  if (!Ctor) {
    handlers.onEnd('unsupported');
    return;
  }
  stopListening();
  const r = new Ctor();
  let error: string | undefined;
  r.lang = 'tr-TR';
  r.interimResults = true;
  r.continuous = false;
  r.onresult = (e) => {
    let text = '';
    let final = false;
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      if (!res) continue;
      text += res[0].transcript;
      final = final || res.isFinal;
    }
    handlers.onText(text.trim(), final);
  };
  r.onerror = (e) => {
    error = e.error;
  };
  r.onend = () => {
    rec = null;
    handlers.onEnd(error);
  };
  rec = r;
  r.start();
}

export function stopListening(): void {
  try {
    rec?.stop();
  } catch {
    /* zaten durmuş */
  }
}

export function speak(text: string, onDone: () => void): void {
  if (!canSpeak()) {
    onDone();
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'tr-TR';
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith('tr'));
  if (voice) u.voice = voice;
  u.onend = onDone;
  u.onerror = onDone;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking(): void {
  if (canSpeak()) window.speechSynthesis.cancel();
}
