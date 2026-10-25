// Every piece illustration answers: /images/pc_01.svg to /images/pc_54.svg are 200 with an SVG
// content type. Vite's index.html fallback answers a missing file with 200 and text/html, so the
// content type (and the body) is what proves the file is there. I2-art T0.
import { expect, test } from "@playwright/test";

const PIECE_IDS = Array.from({ length: 54 }, (_, i) => `pc_${String(i + 1).padStart(2, "0")}`);

for (const id of PIECE_IDS) {
  test(`/images/${id}.svg answers with an SVG`, async ({ request }) => {
    const res = await request.get(`/images/${id}.svg`);
    expect(res.status(), `${id} status`).toBe(200);
    expect(res.headers()["content-type"] ?? "", `${id} content type`).toMatch(/^image\/svg\+xml/);
    const body = await res.text();
    expect(body, `${id} body is an SVG, not index.html`).toMatch(/^\s*(<\?xml[^>]*\?>\s*)?<svg[\s>]/);
    expect(body, `${id} viewBox`).toContain('viewBox="0 0 800 800"');
  });
}
