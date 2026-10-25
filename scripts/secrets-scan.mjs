#!/usr/bin/env node
// G6 secrets scan. Run from the repo root: node scripts/secrets-scan.mjs [<path> ...]
// Checks every tracked file, dist/ when it exists, and any extra paths given (files or folders,
// such as B11's model folder and its card before a publish) for:
// - the key values in .env and in the process environment, for every v2 name, held in memory only,
// - API key patterns: Anthropic, Apify, Hugging Face, JWTs and private key blocks.
// Prints file names, the variable or pattern that matched, never the matched text. Exits 1 on any
// finding.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const findings = [];
const extraArgs = process.argv.slice(2).filter((a) => a !== '--');

// The v2 key names (docs/v2/contracts.md section 1), read from the process environment as well.
const KEY_NAMES = [
  'CINDIA_ANTHROPIC_API_KEY',
  'ANTHROPIC_API_KEY',
  'NESSIE_KEY',
  'ELASTIC_API_KEY',
  'APIFY_TOKEN',
  'HF_TOKEN',
  'SPACETIME_TOKEN',
];
const MIN_LENGTH = 12;

// Key values, held in memory only. One entry per distinct value, with every name that holds it.
const secrets = new Map();
let fromDotenv = 0;
let fromEnv = 0;
function addSecret(name, value, where) {
  if (typeof value !== 'string') return false;
  const v = value.trim().replace(/^["']|["']$/g, '');
  if (v.length < MIN_LENGTH) return false;
  const names = secrets.get(v) ?? new Set();
  names.add(`${name} (${where})`);
  secrets.set(v, names);
  return true;
}

const envPath = path.join(ROOT, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    if (/KEY|TOKEN|SECRET|PASSWORD/.test(m[1]) && addSecret(m[1], m[2], '.env')) fromDotenv++;
  }
}
for (const name of KEY_NAMES) {
  if (addSecret(name, process.env[name], 'environment')) fromEnv++;
}

const PATTERNS = [
  { name: 'Anthropic key pattern', re: /sk-ant-[A-Za-z0-9_-]{20,}/ },
  { name: 'Apify token pattern', re: /apify_api_[A-Za-z0-9]{20,}/ },
  { name: 'Hugging Face token pattern', re: /(?<![A-Za-z0-9_])hf_[A-Za-z0-9]{30,}(?![A-Za-z0-9])/ },
  { name: 'JWT pattern', re: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { name: 'private key block', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
];

// Tracked files
let tracked = [];
try {
  tracked = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split('\0')
    .filter(Boolean);
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

const SKIP_DIRS = new Set(['node_modules', '.git', '.venv', '__pycache__']);
function walk(dir, out) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(p, out);
    } else out.push(path.relative(ROOT, p));
  }
}

const files = new Set(tracked);
// dist/ files, if a build exists
const dist = path.join(ROOT, 'dist');
if (fs.existsSync(dist)) {
  const out = [];
  walk(dist, out);
  for (const f of out) files.add(f);
}
// Extra paths from the command line
let extraCount = 0;
for (const arg of extraArgs) {
  const full = path.resolve(ROOT, arg);
  let st;
  try {
    st = fs.statSync(full);
  } catch {
    console.error(`secrets-scan: ${arg} doesn't exist`);
    process.exit(1);
  }
  const out = [];
  if (st.isDirectory()) walk(full, out);
  else out.push(path.relative(ROOT, full));
  for (const f of out) files.add(f);
  extraCount += out.length;
}

let checked = 0;
for (const f of files) {
  const full = path.resolve(ROOT, f);
  let stat;
  try {
    stat = fs.statSync(full);
  } catch {
    continue;
  }
  if (!stat.isFile() || stat.size > 20 * 1024 * 1024) continue;
  const text = fs.readFileSync(full).toString('latin1');
  const shown = f.split(path.sep).join('/');
  checked++;
  for (const [value, names] of secrets) {
    if (text.includes(value)) findings.push({ file: shown, check: `contains the value of ${[...names].join(', ')}` });
  }
  for (const p of PATTERNS) {
    if (p.re.test(text)) findings.push({ file: shown, check: `matches the ${p.name}` });
  }
}

console.log(
  `secrets-scan: ${checked} files checked (${extraCount} from extra paths), ${fromDotenv} key values from .env, ${fromEnv} from the environment, ${findings.length} findings`,
);
for (const x of findings) console.log(`  ${x.file}: ${x.check}`);
process.exit(findings.length ? 1 : 0);
