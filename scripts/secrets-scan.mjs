#!/usr/bin/env node
// G6 secrets scan. Run from the repo root: node scripts/secrets-scan.mjs
// Checks every tracked file, and dist/ when it exists, for the key values in .env
// and for API key patterns. Prints file names and which check matched, never the
// matched text. Exits 1 on any finding.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const findings = [];

// Key values from .env, held in memory only
const secrets = [];
const envPath = path.join(ROOT, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    const value = m[2].replace(/^["']|["']$/g, '');
    if (/KEY|TOKEN|SECRET|PASSWORD/.test(m[1]) && value.length >= 12) secrets.push({ name: m[1], value });
  }
}

const PATTERNS = [
  { name: 'Anthropic key pattern', re: /sk-ant-[A-Za-z0-9_-]{20,}/ },
  { name: 'private key block', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
];

// Tracked files
let tracked = [];
try {
  tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
} catch {
  console.error('secrets-scan: git ls-files failed. Run this from the repo root.');
  process.exit(1);
}

for (const f of tracked) {
  const base = path.basename(f);
  if (/^\.env(\..+)?$/.test(base) && base !== '.env.example') {
    findings.push({ file: f, check: 'an env file is tracked by git' });
  }
}

// dist/ files, if a build exists
const files = [...tracked];
const dist = path.join(ROOT, 'dist');
if (fs.existsSync(dist)) {
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else files.push(path.relative(ROOT, p));
    }
  };
  walk(dist);
}

let checked = 0;
for (const f of files) {
  const full = path.join(ROOT, f);
  let stat;
  try { stat = fs.statSync(full); } catch { continue; }
  if (!stat.isFile() || stat.size > 20 * 1024 * 1024) continue;
  const buf = fs.readFileSync(full);
  const text = buf.toString('latin1');
  checked++;
  for (const s of secrets) {
    if (text.includes(s.value)) findings.push({ file: f, check: `contains the ${s.name} value` });
  }
  for (const p of PATTERNS) {
    if (p.re.test(text)) findings.push({ file: f, check: `matches the ${p.name}` });
  }
}

console.log(`secrets-scan: ${checked} files checked, ${secrets.length} key values from .env, ${findings.length} findings`);
for (const x of findings) console.log(`  ${x.file}: ${x.check}`);
process.exit(findings.length ? 1 : 0);
