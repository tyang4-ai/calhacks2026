// A small strict XML well-formedness parser for the illustration check (I2-art). The repo has no
// XML library and no package is added for this, so this reads the subset an SVG file needs:
// an optional XML declaration, comments, elements with quoted attributes, text, CDATA and the five
// predefined entities plus numeric references. It rejects what an illustration never needs and
// could use to reach outside the file: DOCTYPE and ENTITY declarations and processing
// instructions.
//
// parseXml(source) returns { root, elements } where each element is
// { name, local, attrs, text }: attrs is a null-prototype object of decoded values, text is the
// element's own text and CDATA, and local is the name without a namespace prefix. It throws an
// XmlError with a line and column when the source isn't well-formed.

export class XmlError extends Error {
  constructor(message, source, index) {
    const before = source.slice(0, index);
    const line = before.split('\n').length;
    const column = index - before.lastIndexOf('\n');
    super(`${message} (line ${line}, column ${column})`);
    this.name = 'XmlError';
  }
}

const NAME = '[A-Za-z_][\\w.-]*(?::[A-Za-z_][\\w.-]*)?';
const START_TAG = new RegExp(`<(${NAME})`, 'y');
const END_TAG = new RegExp(`</(${NAME})[ \\t\\r\\n]*>`, 'y');
const ATTRIBUTE = new RegExp(`(${NAME})[ \\t\\r\\n]*=[ \\t\\r\\n]*(?:"([^"<]*)"|'([^'<]*)')`, 'y');
const XML_DECLARATION =
  /<\?xml[ \t\r\n]+version[ \t\r\n]*=[ \t\r\n]*(["'])1\.\d+\1(?:[ \t\r\n]+encoding[ \t\r\n]*=[ \t\r\n]*(["'])[A-Za-z][\w.-]*\2)?(?:[ \t\r\n]+standalone[ \t\r\n]*=[ \t\r\n]*(["'])(?:yes|no)\3)?[ \t\r\n]*\?>/y;
const BAD_AMPERSAND = /&(?!(?:amp|lt|gt|quot|apos|#[0-9]+|#x[0-9a-fA-F]+);)/;
const REFERENCE = /&(?:(amp|lt|gt|quot|apos)|#([0-9]+)|#x([0-9a-fA-F]+));/g;
const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

const isSpace = (c) => c === ' ' || c === '\t' || c === '\r' || c === '\n';

function isXmlChar(cp) {
  return cp === 0x9 || cp === 0xa || cp === 0xd || (cp >= 0x20 && cp <= 0xd7ff) || (cp >= 0xe000 && cp <= 0xfffd) || (cp >= 0x10000 && cp <= 0x10ffff);
}

export function parseXml(input) {
  const src = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const fail = (message, index) => {
    throw new XmlError(message, src, index);
  };

  for (let k = 0; k < src.length; k++) {
    const c = src.charCodeAt(k);
    if ((c < 0x20 && c !== 0x9 && c !== 0xa && c !== 0xd) || c === 0xfffe || c === 0xffff) fail(`illegal character U+${c.toString(16).toUpperCase().padStart(4, '0')}`, k);
  }

  /** Checks every & in a piece of text or an attribute value, then decodes the references. */
  const decode = (s, at) => {
    const bad = BAD_AMPERSAND.exec(s);
    if (bad) fail('"&" does not start a valid entity or character reference', at + bad.index);
    return s.replace(REFERENCE, (match, named, dec, hex) => {
      if (named) return NAMED[named];
      const cp = dec !== undefined ? Number.parseInt(dec, 10) : Number.parseInt(hex, 16);
      if (!isXmlChar(cp)) fail(`character reference ${match} is not a legal XML character`, at);
      return String.fromCodePoint(cp);
    });
  };

  let i = 0;
  if (/^<\?xml[ \t\r\n]/.test(src)) {
    XML_DECLARATION.lastIndex = 0;
    const decl = XML_DECLARATION.exec(src);
    if (!decl) fail('malformed XML declaration', 0);
    i = decl[0].length;
  }

  const stack = [];
  const elements = [];
  let root = null;
  let rootClosed = false;

  while (i < src.length) {
    if (src[i] !== '<') {
      let end = src.indexOf('<', i);
      if (end < 0) end = src.length;
      const raw = src.slice(i, end);
      if (raw.includes(']]>')) fail('"]]>" in text', i + raw.indexOf(']]>'));
      const text = decode(raw, i);
      if (stack.length === 0) {
        if (text.trim() !== '') fail('text outside the root element', i);
      } else {
        stack[stack.length - 1].text += text;
      }
      i = end;
      continue;
    }

    if (src.startsWith('<!--', i)) {
      const end = src.indexOf('-->', i + 4);
      if (end < 0) fail('unterminated comment', i);
      const body = src.slice(i + 4, end);
      if (body.includes('--') || body.endsWith('-')) fail('"--" inside a comment', i);
      i = end + 3;
      continue;
    }
    if (src.startsWith('<![CDATA[', i)) {
      if (stack.length === 0) fail('CDATA outside the root element', i);
      const end = src.indexOf(']]>', i + 9);
      if (end < 0) fail('unterminated CDATA section', i);
      stack[stack.length - 1].text += src.slice(i + 9, end);
      i = end + 3;
      continue;
    }
    if (src.startsWith('<!', i)) fail('DOCTYPE, ENTITY and other declarations are not allowed', i);
    if (src.startsWith('<?', i)) fail('processing instructions are not allowed', i);

    if (src.startsWith('</', i)) {
      END_TAG.lastIndex = i;
      const m = END_TAG.exec(src);
      if (!m) fail('malformed end tag', i);
      const open = stack.pop();
      if (!open) fail(`end tag </${m[1]}> with nothing open`, i);
      if (open.name !== m[1]) fail(`end tag </${m[1]}> does not match <${open.name}>`, i);
      if (stack.length === 0) rootClosed = true;
      i += m[0].length;
      continue;
    }

    START_TAG.lastIndex = i;
    const start = START_TAG.exec(src);
    if (!start) fail('malformed start tag', i);
    if (rootClosed) fail('more than one root element', i);
    const name = start[1];
    const attrs = Object.create(null);
    let j = i + start[0].length;
    let selfClosing = false;
    for (;;) {
      let k = j;
      while (isSpace(src[k])) k++;
      if (src[k] === '>') {
        j = k + 1;
        break;
      }
      if (src.startsWith('/>', k)) {
        j = k + 2;
        selfClosing = true;
        break;
      }
      if (k === j) fail(`expected whitespace, ">" or "/>" in <${name}>`, k);
      ATTRIBUTE.lastIndex = k;
      const a = ATTRIBUTE.exec(src);
      if (!a) fail(`malformed attribute in <${name}>`, k);
      if (a[1] in attrs) fail(`duplicate attribute ${a[1]} in <${name}>`, k);
      attrs[a[1]] = decode(a[2] ?? a[3], k);
      j = k + a[0].length;
    }
    const element = { name, local: name.slice(name.indexOf(':') + 1), attrs, text: '' };
    elements.push(element);
    if (root === null) root = element;
    if (selfClosing) {
      if (stack.length === 0) rootClosed = true;
    } else {
      stack.push(element);
    }
    i = j;
  }

  if (stack.length > 0) fail(`<${stack[stack.length - 1].name}> is never closed`, src.length);
  if (root === null) fail('no root element', 0);
  return { root, elements };
}
