/** Küçük DOM yardımcıları. Model çıktısı asla innerHTML ile yazılmaz; yalnızca metin düğümü olarak eklenir. */
export type Child = Node | string | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, string | boolean | undefined> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === false) continue;
    if (v === true) el.setAttribute(k, '');
    else if (k === 'class') el.className = v;
    else el.setAttribute(k, v);
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c);
  }
  return el;
}

export function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} bulunamadı`);
  return el as T;
}

export function store(kind: 'local' | 'session') {
  const area = (): Storage | null => {
    try {
      return kind === 'local' ? window.localStorage : window.sessionStorage;
    } catch {
      return null;
    }
  };
  return {
    get(key: string): string | null {
      try {
        return area()?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    set(key: string, value: string): void {
      try {
        area()?.setItem(key, value);
      } catch {
        /* depolama kapalı olabilir */
      }
    },
    remove(key: string): void {
      try {
        area()?.removeItem(key);
      } catch {
        /* yoksay */
      }
    },
  };
}
