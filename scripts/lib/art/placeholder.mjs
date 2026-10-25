// The placeholder drawn for every piece until its illustration is drawn (I2-art T0): the mat
// ground, the stitch line along the edges, and a plain rounded frame in the middle. It's the same
// for every piece, holds no text, and is byte-identical on every run. Colors are the kit's tokens
// (design-system.md): mat, ink-soft, paper and line.
const MAT = '#EDE4D3';
const INK_SOFT = '#5A5249';
const PAPER = '#F6F1E7';
const LINE = '#D9CFBF';

// The stitch rect is 752 by 752, so its perimeter is 3008, which 18 + 14 divides 94 times: the
// running stitch closes at the corner without a short dash.
const SVG = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">',
  `  <rect width="800" height="800" fill="${MAT}"/>`,
  `  <rect x="24" y="24" width="752" height="752" fill="none" stroke="${INK_SOFT}" stroke-width="3" stroke-linecap="round" stroke-dasharray="18 14"/>`,
  `  <rect x="240" y="240" width="320" height="320" rx="32" fill="${PAPER}" stroke="${LINE}" stroke-width="4"/>`,
  '</svg>',
  '',
].join('\n');

export function placeholderSvg() {
  return SVG;
}
