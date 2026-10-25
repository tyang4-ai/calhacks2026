// The sixteen line icons of design drop 3: the files beside this one, copied from
// design/assets/icons/ with their ink color turned into currentColor, read at build time.

export const ICON_NAMES = [
  "check",
  "flag",
  "clock",
  "dot",
  "chevron",
  "close",
  "search",
  "shuffle",
  "question",
  "arrow",
  "external",
  "lock",
  "thread",
  "seal",
  "send",
  "sheet",
] as const;

export type IconName = (typeof ICON_NAMES)[number];

/** One shape of an icon file: its tag and its attributes, with names as React spells them. */
export interface IconShape {
  tag: "path" | "circle" | "rect";
  attrs: Record<string, string>;
}

function camel(name: string): string {
  return name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

/** Reads the shapes out of an icon file. The files hold only path, circle and rect, each self-closing. */
export function parseIconShapes(svg: string): IconShape[] {
  const shapes: IconShape[] = [];
  for (const m of svg.matchAll(/<(path|circle|rect)\b([^>]*?)\/>/g)) {
    const attrs: Record<string, string> = {};
    for (const a of m[2].matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) attrs[camel(a[1])] = a[2];
    shapes.push({ tag: m[1] as IconShape["tag"], attrs });
  }
  return shapes;
}

// The files, as text, at build time. Vite inlines them, so no request is made for an icon.
const FILES = import.meta.glob<string>("./*.svg", { query: "?raw", import: "default", eager: true });

/** Each icon's shapes, by name. */
export const ICON_SHAPES: Record<string, IconShape[]> = {};
for (const [path, text] of Object.entries(FILES)) {
  ICON_SHAPES[path.replace(/^.*\//, "").replace(/\.svg$/, "")] = parseIconShapes(text);
}
