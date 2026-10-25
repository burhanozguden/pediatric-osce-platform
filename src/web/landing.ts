/**
 * Giriş ekranı: hasta türü kartları, anne-çocuk çizimleri ve detay paneli.
 * Vaka sayıları gerçek vaka havuzundan hesaplanır; metinler elle yazılmıştır.
 */
import { listCases } from '@/lib/data';

interface PatientType {
  name: string;
  age: string;
  domains: string[];
  task: string;
  topics: string[];
}

export const PATIENT_TYPES: PatientType[] = [
  { name: 'Tamamlayıcı beslenme', age: '6-9 aylık', domains: ['complementary_feeding'],
    task: '9 aylık bebeğin annesiyle görüşünüz; evde pişen yemeklere geçiş sürecini değerlendirip plan yapınız.',
    topics: ['Ek gıdaya başlama sırası ve porsiyonlar', 'Enerji ve protein hedefini doğru ağırlıkla hesaplama', '1 yaş altı için kaçınılacaklar'] },
  { name: 'Prematüre', age: '28-30. hafta', domains: ['neonatal'],
    task: '28. haftada doğan prematüre bebeğin annesiyle görüşünüz; beslenme planı oluşturunuz.',
    topics: ['Enerji, protein ve sıvı hedefi', 'Anne sütü ve zenginleştirici ya da prematüre mama', 'Küçük hacimli, sık beslenme'] },
  { name: 'Malnütrisyon', age: '10-11 aylık', domains: ['malnutrition'],
    task: '10 aylık, ödemli bebeğin annesiyle görüşünüz; ilk gün beslenme ve sıvı planını oluşturunuz.',
    topics: ['Marasmus ile kwashiorkoru ayırt etme', 'Ödeme göre başlangıç enerjisi', 'Kademeli yeniden besleme'] },
  { name: 'Malabsorpsiyon', age: '7,5 ay-5 yaş', domains: ['malabsorption'],
    task: 'Kilo alamayan bir çocuğun ebeveyniyle görüşünüz; tanıya uygun beslenme planını oluşturunuz.',
    topics: ['Artmış enerji gereksinimi', 'Uygun formül seçimi', 'Çölyakta glutensiz plan ve çapraz bulaşma'] },
  { name: 'Böbrek hastalığı', age: '9-12 yaş', domains: ['renal'],
    task: 'Kronik böbrek yetmezliği tanılı çocuğun ebeveyniyle görüşünüz; diyet planı oluşturunuz.',
    topics: ['Protein hedefi (g/kg)', 'Potasyum ve fosfor sınırı', 'Düşük proteinli özel ürünler'] },
  { name: 'Tip 1 diyabet', age: '7 yaş', domains: ['endocrine'],
    task: 'Tip 1 diyabetli 7 yaşındaki çocuğun ebeveyniyle görüşünüz; 3 ana ve 3 ara öğünlü diyet planı oluşturunuz.',
    topics: ['Karbonhidrat oranı ve makro dağılımı', 'Öğün ve insülin zamanlaması', 'Hipoglisemiyi önleme'] },
  { name: 'İnek sütü alerjisi', age: '9 aylık', domains: ['allergy_intolerance'],
    task: 'İnek sütü alerjisi tanılı 9 aylık bebeğin annesiyle görüşünüz; uygun formül ve ek gıda planını oluşturunuz.',
    topics: ['Uygun formül seçimi', 'Gizli süt kaynaklarını sorgulama', 'Kalsiyum ve büyüme izlemi'] },
  { name: 'Gastroenterit', age: '9 ay-2 yaş', domains: ['gastrointestinal'],
    task: 'Birkaç gündür ishal, kusma ve ateşi olan çocuğun ebeveyniyle görüşünüz; sıvı ve beslenme planını oluşturunuz.',
    topics: ['Dehidratasyon derecesine göre rehidratasyon', 'Beslenmeye devam', 'Enerji hedefi'] },
];

interface Scene {
  tip: 'hold' | 'stand' | 'incubator';
  skinM: string;
  skinC: string;
  scarf?: boolean;
  thin?: boolean;
  ratio?: number;
  drop?: boolean;
}

const SCENES: Scene[] = [
  { tip: 'hold', skinM: '#e7c2a0', skinC: '#f0d0b2' },
  { tip: 'incubator', skinM: '#c68e65', skinC: '#d9a780', scarf: true },
  { tip: 'hold', skinM: '#a9714a', skinC: '#bf8761', thin: true },
  { tip: 'hold', skinM: '#efcfb1', skinC: '#f4dcc3', scarf: true },
  { tip: 'stand', ratio: 0.86, skinM: '#d9a780', skinC: '#e5b996' },
  { tip: 'stand', ratio: 0.72, skinM: '#8d5a3c', skinC: '#a46f4c', scarf: true },
  { tip: 'hold', skinM: '#e0b48f', skinC: '#ecc7a6' },
  { tip: 'stand', ratio: 0.52, skinM: '#c68e65', skinC: '#d9a780', scarf: true, drop: true },
];

const NS = 'http://www.w3.org/2000/svg';
type Attrs = Record<string, string | number>;

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Attrs = {}): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

function scene(g: Scene): SVGSVGElement {
  const s = svgEl('svg', { viewBox: '0 52 200 166', 'aria-hidden': 'true', preserveAspectRatio: 'xMidYMax meet' });
  const add = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Attrs): void => {
    s.append(svgEl(tag, attrs));
  };
  const mx = g.tip === 'stand' ? 62 : g.tip === 'incubator' ? 58 : 100;
  const base = 212;
  let hand = { x: mx + 34, y: 158 };

  if (g.tip === 'stand') {
    const Hc = 148 * (g.ratio ?? 0.7), cx = 146, r = Hc * 0.14, bw = r * 2.5;
    const top = base - Hc, bodyTop = top + 2 * r + 2, legTop = base - Hc * 0.36;
    hand = { x: cx - bw / 2 - 3, y: bodyTop + (legTop - bodyTop) * 0.7 };
    add('rect', { x: cx - bw * 0.36, y: legTop, width: bw * 0.3, height: base - legTop, rx: 3, fill: 'var(--c4)' });
    add('rect', { x: cx + bw * 0.06, y: legTop, width: bw * 0.3, height: base - legTop, rx: 3, fill: 'var(--c4)' });
    add('rect', { x: cx - bw / 2, y: bodyTop, width: bw, height: legTop - bodyTop + 4, rx: bw / 3, fill: 'var(--c2)' });
    add('circle', { cx, cy: top + r, r, fill: g.skinC });
    add('path', { d: `M${cx - r} ${top + r - 1} a${r} ${r} 0 0 1 ${2 * r} 0 q-${r} -${r * 0.7} -${2 * r} 0z`, fill: 'var(--hair)' });
    if (g.drop) {
      for (const [x, y] of [[176, 128], [186, 150]] as const) {
        add('path', { d: `M${x} ${y} q-6 9 0 13 q6 -4 0 -13z`, fill: 'var(--fig-line)' });
      }
    }
  }
  if (g.tip === 'incubator') {
    add('rect', { x: 110, y: 196, width: 84, height: 16, rx: 4, fill: 'var(--c1)' });
    add('path', { d: 'M112 196 V172 C112 138 134 122 152 122 C170 122 192 138 192 172 V196', fill: 'none', stroke: 'var(--fig-line)', 'stroke-width': 3 });
    add('ellipse', { cx: 152, cy: 188, rx: 22, ry: 8, fill: 'var(--c3)' });
    add('circle', { cx: 136, cy: 183, r: 7, fill: g.skinC });
  }

  add('path', { d: `M${mx - 18} 116 Q${mx} 104 ${mx + 18} 116 L${mx + 30} ${base} L${mx - 30} ${base} Z`, fill: 'var(--c1)' });
  add('rect', { x: mx - 4, y: 94, width: 8, height: 14, fill: g.skinM });
  if (g.scarf) {
    add('path', { d: `M${mx - 19} 84 Q${mx - 19} 62 ${mx} 62 Q${mx + 19} 62 ${mx + 19} 84 L${mx + 21} 112 Q${mx} 118 ${mx - 21} 112 Z`, fill: 'var(--c3)' });
    add('ellipse', { cx: mx, cy: 84, rx: 10.5, ry: 12.5, fill: g.skinM });
  } else {
    add('rect', { x: mx - 17, y: 66, width: 34, height: 36, rx: 16, fill: 'var(--hair)' });
    add('ellipse', { cx: mx, cy: 85, rx: 11.5, ry: 13, fill: g.skinM });
    add('path', { d: `M${mx - 14} 80 Q${mx} 56 ${mx + 14} 80 Q${mx} 68 ${mx - 14} 80z`, fill: 'var(--hair)' });
  }

  if (g.tip === 'hold') {
    const bs = g.thin ? 0.8 : 1;
    add('ellipse', { cx: mx, cy: 142, rx: 17 * bs, ry: 11 * bs, fill: 'var(--c3)' });
    add('circle', { cx: mx - 6, cy: 130, r: 8.5 * bs, fill: g.skinC });
    add('path', { d: `M${mx - 18} 118 Q${mx - 28} 146 ${mx + 6} 150`, fill: 'none', stroke: 'var(--c1)', 'stroke-width': 9, 'stroke-linecap': 'round' });
    add('path', { d: `M${mx + 18} 118 Q${mx + 28} 146 ${mx - 4} 150`, fill: 'none', stroke: 'var(--c1)', 'stroke-width': 9, 'stroke-linecap': 'round' });
  } else {
    const tx = g.tip === 'incubator' ? 118 : hand.x;
    const ty = g.tip === 'incubator' ? 176 : hand.y;
    add('path', { d: `M${mx + 17} 118 Q${mx + 30} ${(118 + ty) / 2} ${tx} ${ty}`, fill: 'none', stroke: 'var(--c1)', 'stroke-width': 8, 'stroke-linecap': 'round' });
    add('circle', { cx: tx, cy: ty, r: 4.5, fill: g.skinM });
    add('path', { d: `M${mx - 17} 118 Q${mx - 24} 150 ${mx - 22} 168`, fill: 'none', stroke: 'var(--c1)', 'stroke-width': 8, 'stroke-linecap': 'round' });
  }
  return s;
}

function chevron(): SVGSVGElement {
  const c = svgEl('svg', { viewBox: '0 0 10 10', 'aria-hidden': 'true' });
  c.append(svgEl('path', { d: 'M1.5 3.5 L5 7 L8.5 3.5', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  return c;
}

/** Kartları kurar. `onEnter(domains)` seçilen türün alanlarını verir. */
export function mountLanding(onEnter: (domains: string[]) => void): void {
  const cases = listCases();
  const cards = document.getElementById('kartlar');
  const detail = document.getElementById('detay');
  if (!cards || !detail) throw new Error('Giriş alanları bulunamadı');
  const buttons: HTMLButtonElement[] = [];
  const count = (t: PatientType): number => cases.filter((c) => t.domains.includes(c.domain)).length;

  const select = (i: number): void => {
    const t = PATIENT_TYPES[i];
    if (!t) return;
    buttons.forEach((b, j) => b.setAttribute('aria-expanded', String(j === i)));
    const left = el('div');
    left.append(el('h3', '', t.name), el('p', 'meta', `${t.age} · ${count(t)} vaka`), el('p', 'brief', t.task));
    const right = el('div');
    const ul = el('ul');
    for (const k of t.topics) ul.append(el('li', '', k));
    const go = el('button', 'btn', 'Bu türden istasyona gir');
    go.type = 'button';
    go.addEventListener('click', () => onEnter(t.domains));
    right.append(el('h4', '', 'Çalışacağınız konular'), ul, go);
    detail.replaceChildren(left, right);
  };

  PATIENT_TYPES.forEach((t, i) => {
    const b = el('button', 'type');
    b.type = 'button';
    b.setAttribute('aria-expanded', 'false');
    b.setAttribute('aria-controls', 'detay');
    const text = el('span', 'type-text');
    text.append(el('span', 'type-name', t.name), el('span', 'type-meta', `${t.age} · ${count(t)} vaka`));
    const pill = el('span', 'pill');
    pill.append(document.createTextNode('KEŞFET'), chevron());
    const sc = SCENES[i];
    if (sc) b.append(scene(sc));
    b.append(text, pill);
    b.addEventListener('click', () => select(i));
    cards.append(b);
    buttons.push(b);
  });
  select(0);
}
