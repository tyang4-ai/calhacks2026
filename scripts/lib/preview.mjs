// Building and serving the production preview on 4173, for the test wrapper and the gate script.
// These are the only two scripts that start a server.
import { spawn } from 'node:child_process';
import { BIN, ROOT, plain, runTool } from './common.mjs';

export const DEV_URL = 'http://localhost:5173';
export const PREVIEW_URL = 'http://localhost:4173';

/** True when something answers at the URL within the timeout. */
export async function answers(url, timeoutMs = 1500) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    return r.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

/** tsc -b && vite build. Returns { ok, out }. */
export function build() {
  const tsc = runTool('tsc', ['-b', '--pretty', 'false']);
  if (tsc.code !== 0) return { ok: false, out: tsc.out };
  const vite = runTool('vite', ['build', '--logLevel', 'warn']);
  return { ok: vite.code === 0, out: `${tsc.out}${vite.out}` };
}

/** Starts vite preview on 4173 (strict port). Resolves to a handle with stop(), or throws. */
export async function startPreview() {
  if (await answers(PREVIEW_URL)) {
    throw new Error('port 4173 is already in use (another gate or a stale preview). Only one of G4, G5 and G6 runs at a time.');
  }
  const child = spawn(process.execPath, [BIN.vite, 'preview', '--port', '4173', '--strictPort'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '0' },
  });
  let log = '';
  child.stdout.on('data', (d) => (log += d));
  child.stderr.on('data', (d) => (log += d));
  let exited = false;
  child.on('exit', () => (exited = true));

  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (exited) throw new Error(`vite preview exited early:\n${plain(log)}`);
    if (await answers(PREVIEW_URL, 1000)) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!(await answers(PREVIEW_URL, 1000))) {
    child.kill();
    throw new Error(`vite preview didn't answer on 4173 within 30 s:\n${plain(log)}`);
  }
  return {
    url: PREVIEW_URL,
    async stop() {
      if (exited) return;
      child.kill();
      const until = Date.now() + 5000;
      while (!exited && Date.now() < until) await new Promise((r) => setTimeout(r, 100));
      if (!exited) child.kill('SIGKILL');
    },
  };
}
