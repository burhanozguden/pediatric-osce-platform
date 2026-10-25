/**
 * GitHub Pages arayüzü: giriş → sesli görüşme → karne.
 * Model çağrıları sunucuya (Vercel) gider; anahtar ve model adı tarayıcıda bulunmaz.
 */
import { listCases, listPersonas } from '@/lib/data';
import type { ClinicalCase, Persona, RapportMetrics, Scorecard, TranscriptMessage } from '@/types';
import { chatApi, evaluateApi } from './api';
import { byId, h } from './dom';
import { mountLanding } from './landing';
import { canListen, canSpeak, listen, speak, stopListening, stopSpeaking } from './voice';

interface State {
  clinicalCase: ClinicalCase | null;
  persona: Persona | null;
  transcript: TranscriptMessage[];
  rapport: RapportMetrics | null;
  busy: boolean;
  startedAt: number;
  timer: number | undefined;
}

const state: State = { clinicalCase: null, persona: null, transcript: [], rapport: null, busy: false, startedAt: 0, timer: undefined };

type ViewName = 'setup' | 'session' | 'result';

function showView(name: ViewName): void {
  for (const v of ['setup', 'session', 'result'] as const) byId(`view-${v}`).hidden = v !== name;
  window.scrollTo({ top: 0 });
}

function showError(message: string | null): void {
  const box = byId('error');
  box.textContent = message ?? '';
  box.hidden = message === null;
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.';
}

const status = (t: string): void => {
  byId('status').textContent = t;
};

function setBusy(busy: boolean, text = ''): void {
  state.busy = busy;
  byId<HTMLButtonElement>('send').disabled = busy;
  byId<HTMLButtonElement>('finish').disabled = busy;
  byId<HTMLButtonElement>('mic').disabled = busy;
  byId<HTMLTextAreaElement>('msg').disabled = busy;
  status(text);
}

/* Giriş */

function pick<T>(items: readonly T[]): T | undefined {
  return items[Math.floor(Math.random() * items.length)];
}

/** Belirtilen alanlardan (boşsa tüm havuzdan) rastgele vaka ve rastgele ebeveyn seçer. */
function enter(domains: string[]): void {
  if (state.busy) return;
  showError(null);
  const all = listCases();
  const pool = domains.length ? all.filter((c) => domains.includes(c.domain)) : all;
  const clinicalCase = pick(pool.length ? pool : all);
  const persona = pick(listPersonas());
  if (!clinicalCase || !persona) {
    showError('Vaka veya ebeveyn bulunamadı.');
    return;
  }
  state.clinicalCase = clinicalCase;
  state.persona = persona;
  state.transcript = [];
  state.rapport = null;
  void beginSession();
}

/* Görüşme */

async function beginSession(): Promise<void> {
  const { clinicalCase, persona } = state;
  if (!clinicalCase || !persona) return;
  const startBtns = document.querySelectorAll<HTMLButtonElement>('#rastgele, #detay .btn');
  startBtns.forEach((b) => (b.disabled = true));
  state.busy = true;
  let opening;
  try {
    opening = await chatApi({ caseId: clinicalCase.id, personaId: persona.id, messages: [] });
  } catch (err) {
    showError(errMessage(err));
    return;
  } finally {
    state.busy = false;
    startBtns.forEach((b) => (b.disabled = false));
  }
  state.transcript = [{ role: 'parent', content: opening.reply }];
  state.rapport = opening.rapport;

  renderStation();
  renderTranscript();
  renderMeter();
  resetComposer();
  showView('session');

  state.startedAt = Date.now();
  window.clearInterval(state.timer);
  state.timer = window.setInterval(tick, 1000);
  tick();
  setBusy(false);
  speakReply(opening.reply);
}

function tick(): void {
  const s = Math.floor((Date.now() - state.startedAt) / 1000);
  byId('timer').textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function renderStation(): void {
  const { clinicalCase: c, persona: p } = state;
  if (!c || !p) return;
  byId('station').replaceChildren(
    h('div', { class: 'station-band' }, h('span', {}, 'İstasyon kartı'), h('span', { id: 'timer', class: 'timer', 'aria-label': 'Geçen süre' }, '00:00')),
    h(
      'div',
      { class: 'station-body' },
      h('p', { class: 'brief' }, c.stationBrief),
      h('dl', { class: 'facts' }, h('dt', {}, 'Çocuk'), h('dd', {}, c.patient.ageLabel), h('dt', {}, 'Karşınızdaki'), h('dd', {}, p.role)),
      h(
        'div',
        { class: 'meter-wrap' },
        h('div', { class: 'meter-label', id: 'meter-label' }),
        h('div', { class: 'meter', id: 'meter', role: 'img' }, h('i'), h('i'), h('i')),
        h('p', { class: 'hint' }, 'Açık uçlu sorular ve empati, ebeveynin daha fazla bilgi paylaşmasını sağlar.'),
      ),
    ),
  );
}

function renderMeter(): void {
  const level = state.rapport?.disclosureLevel ?? 0;
  const labels = ['Çekingen', 'Açılıyor', 'Güvenle konuşuyor'];
  const meter = byId('meter');
  meter.setAttribute('aria-label', `Ebeveynin açıklık düzeyi: ${labels[level]}`);
  [...meter.children].forEach((seg, i) => seg.classList.toggle('on', i <= level));
  byId('meter-label').textContent = `Ebeveyn: ${labels[level]?.toLowerCase() ?? ''}`;
}

function renderTranscript(): void {
  byId('transcript').replaceChildren(
    ...state.transcript.map((m) =>
      h('li', { class: `line ${m.role}` }, h('span', { class: 'who' }, m.role === 'student' ? 'Siz' : 'Ebeveyn'), h('p', { class: 'said' }, m.content)),
    ),
  );
  const last = [...state.transcript].reverse().find((m) => m.role === 'parent');
  byId('caption').textContent = last?.content ?? '';
}

/* Ses */

const hasMic = canListen();

function resetComposer(): void {
  byId<HTMLTextAreaElement>('msg').value = '';
  byId('heard-box').hidden = hasMic;
  setMic(false);
}

function speakReply(text: string): void {
  if (!canSpeak() || !byId<HTMLInputElement>('speak').checked) return;
  stopListening();
  speak(text, () => undefined);
}

function setMic(on: boolean): void {
  byId('mic').setAttribute('aria-pressed', String(on));
  byId('mic-label').textContent = on ? 'Dinliyorum… bitirince dokunun' : 'Konuşmak için dokunun';
}

function toggleMic(): void {
  if (byId('mic').getAttribute('aria-pressed') === 'true') {
    stopListening();
    return;
  }
  if (state.busy) return;
  stopSpeaking();
  showError(null);
  const input = byId<HTMLTextAreaElement>('msg');
  let heard = '';
  setMic(true);
  status('Dinleniyor. Konuşun.');
  listen({
    onText: (text) => {
      heard = text;
      input.value = text;
      byId('heard-box').hidden = false;
    },
    onEnd: (error) => {
      setMic(false);
      status('');
      if (error === 'not-allowed' || error === 'service-not-allowed') {
        showError('Mikrofon izni verilmedi. Tarayıcı ayarlarından mikrofona izin verip yeniden deneyin.');
      } else if (error === 'no-speech') {
        status('Ses duyulmadı. Yeniden deneyin.');
      } else if (error && error !== 'aborted') {
        showError('Ses tanıma çalışmadı. Yeniden deneyin ya da kutuya yazın.');
        byId('heard-box').hidden = false;
      } else if (heard.trim()) {
        status('Söylediğinizi kontrol edin; doğruysa Gönder’e basın.');
        byId('send').focus();
      }
    },
  });
}

/* Mesaj ve karne */

async function send(): Promise<void> {
  const { clinicalCase, persona } = state;
  const input = byId<HTMLTextAreaElement>('msg');
  const text = input.value.trim();
  stopSpeaking();
  if (state.busy || !text || !clinicalCase || !persona) return;
  showError(null);
  state.transcript.push({ role: 'student', content: text });
  input.value = '';
  setBusy(true, 'Ebeveyn yanıtlıyor…');
  renderTranscript();
  try {
    const res = await chatApi({ caseId: clinicalCase.id, personaId: persona.id, messages: state.transcript });
    state.transcript.push({ role: 'parent', content: res.reply });
    state.rapport = res.rapport;
    renderMeter();
    byId('heard-box').hidden = hasMic;
    speakReply(res.reply);
  } catch (err) {
    state.transcript.pop();
    input.value = text;
    byId('heard-box').hidden = false;
    showError(errMessage(err));
  } finally {
    setBusy(false);
    renderTranscript();
  }
}

async function finish(): Promise<void> {
  const { clinicalCase, persona } = state;
  if (state.busy || !clinicalCase || !persona) return;
  if (!state.transcript.some((m) => m.role === 'student')) {
    showError('Değerlendirme için önce ebeveynle konuşun.');
    return;
  }
  showError(null);
  stopListening();
  stopSpeaking();
  setBusy(true, 'Karne hazırlanıyor. Bu işlem 20-40 saniye sürebilir.');
  try {
    const { scorecard } = await evaluateApi({ caseId: clinicalCase.id, personaId: persona.id, transcript: state.transcript });
    window.clearInterval(state.timer);
    renderResult(scorecard);
    showView('result');
  } catch (err) {
    showError(errMessage(err));
  } finally {
    setBusy(false);
  }
}

/* ------------------------------------------------------------------ */
/* Karne                                                                */
/* ------------------------------------------------------------------ */

const SEAL_TEXT = { PASSED: 'Geçti', FAILED: 'Kaldı', RED_ALERT: 'Kırmızı uyarı' } as const;

function list(items: string[]): HTMLElement {
  return h('ul', {}, ...items.map((t) => h('li', {}, t)));
}

function renderResult(card: Scorecard): void {
  const root = byId('result');
  const capped = card.uncappedScore !== card.overallScore;

  const categories = card.categories.map((cat) => {
    const pct = Math.round((cat.score / cat.maxPoints) * 100);
    return h(
      'section',
      { class: 'cat' },
      h('div', { class: 'cat-head' }, h('h3', {}, cat.title), h('span', { class: 'cat-score' }, `${cat.score} / ${cat.maxPoints}`)),
      h('div', { class: 'bar', role: 'img', 'aria-label': `%${pct}` }, h('i', { style: `width:${pct}%` })),
      h(
        'div',
        { class: 'crit-list' },
        ...cat.criteria.map((k) =>
          h(
            'details',
            { class: 'crit-item' },
            h('summary', {}, h('span', {}, k.title), h('span', { class: 'crit-score' }, `${k.score} / ${k.maxPoints}`)),
            h('p', {}, k.justification),
            k.evidenceQuote ? h('blockquote', {}, `“${k.evidenceQuote}”`) : null,
          ),
        ),
      ),
    );
  });

  const parts: (Node | null)[] = [
    h(
      'div',
      { class: 'result-head' },
      h(
        'div',
        { class: `seal ${card.seal.toLowerCase().replace('_', '-')}`, role: 'img', 'aria-label': `Sonuç: ${SEAL_TEXT[card.seal]}` },
        h('span', {}, SEAL_TEXT[card.seal]),
      ),
      h(
        'div',
        { class: 'score-block' },
        h('p', { class: 'score' }, h('strong', {}, String(card.overallScore)), ' / 100'),
        h('p', { class: 'muted' }, `Geçme sınırı ${card.passThreshold}.`),
        capped
          ? h('p', { class: 'muted' }, `Hayati hata olmasaydı puanınız ${card.uncappedScore} olacaktı. Hayati hata varsa puan en çok ${card.overallScore} olabilir.`)
          : null,
      ),
    ),
    card.redAlert
      ? h(
          'div',
          { class: 'alert', role: 'alert' },
          h('h3', {}, card.redAlert.title),
          list(card.redAlert.messages),
          ...card.fatalErrors.map((f) => h('p', { class: 'evidence' }, `Söylediğiniz: “${f.evidence.studentText}”`)),
        )
      : null,
    card.warnings.length ? h('div', { class: 'notice' }, h('h3', {}, 'Klinik uyarılar'), list(card.warnings.map((w) => w.message))) : null,
    h('p', { class: 'summary' }, card.summary),
    h('div', { class: 'cats' }, ...categories),
    h(
      'div',
      { class: 'two-col' },
      h('section', {}, h('h3', {}, 'Güçlü yanlar'), card.strengths.length ? list(card.strengths) : h('p', { class: 'muted' }, 'Belirtilmedi.')),
      h('section', {}, h('h3', {}, 'Geliştirilecek noktalar'), card.improvements.length ? list(card.improvements) : h('p', { class: 'muted' }, 'Belirtilmedi.')),
    ),
    h('p', { class: 'muted small' }, 'Vaka içeriği diyetisyen onayı bekleyen bir taslaktır; sonuç eğitim amaçlıdır, resmî bir not değildir.'),
  ];
  root.replaceChildren(...parts.filter((n): n is Node => n !== null));
}

function downloadTranscript(): void {
  const data = JSON.stringify(
    { caseId: state.clinicalCase?.id, personaId: state.persona?.id, savedAt: new Date().toISOString(), transcript: state.transcript },
    null,
    2,
  );
  const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  const a = h('a', { href: url, download: `gorusme-${state.clinicalCase?.id ?? 'vaka'}.json` });
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* Başlangıç */

function leave(): void {
  stopListening();
  stopSpeaking();
  window.clearInterval(state.timer);
  showError(null);
  showView('setup');
}

function init(): void {
  mountLanding(enter);
  byId('rastgele').addEventListener('click', () => enter([]));

  const mic = byId<HTMLButtonElement>('mic');
  if (hasMic) {
    mic.addEventListener('click', toggleMic);
  } else {
    mic.hidden = true;
    byId('heard-box').hidden = false;
    byId('msg').setAttribute('placeholder', 'Bu tarayıcı konuşma tanımayı desteklemiyor. Mesajınızı buraya yazın. Sesli konuşma için Chrome veya Edge kullanın.');
  }
  if (!canSpeak()) byId('speak').closest('label')?.setAttribute('hidden', '');
  byId<HTMLInputElement>('speak').addEventListener('change', (e) => {
    if (!(e.target as HTMLInputElement).checked) stopSpeaking();
  });

  byId<HTMLFormElement>('composer').addEventListener('submit', (e) => {
    e.preventDefault();
    void send();
  });
  byId('redo').addEventListener('click', () => {
    byId<HTMLTextAreaElement>('msg').value = '';
    toggleMic();
  });
  byId('finish').addEventListener('click', () => void finish());
  byId('restart').addEventListener('click', leave);
  byId('download').addEventListener('click', downloadTranscript);
  byId('print').addEventListener('click', () => window.print());
  byId('abandon').addEventListener('click', () => {
    if (state.transcript.length > 1 && !window.confirm('Görüşme silinecek. Çıkılsın mı?')) return;
    leave();
  });
  showView('setup');
}

init();
