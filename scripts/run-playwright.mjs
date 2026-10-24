#!/usr/bin/env node
// node scripts/run-playwright.mjs <smoke|features|demo|offline> [playwright args...]
// smoke and features use the dev server when http://localhost:5173 answers. If it doesn't, they
// build, serve the preview on 4173 for the run, then stop it. demo and offline always build and
// serve the preview. Each run writes to its own folder under test-results/.
// Env: CINDIA_DEMO_MODE=live tells the demo test to switch to live mode first (G5).
// Env: CINDIA_SKIP_BUILD=1 serves the dist/ already built (the gate builds once for its runs).
import fs from 'node:fs';
import path from 'node:path';
import { BIN, ROOT, runLive } from './lib/common.mjs';
import { DEV_URL, answers, build, startPreview } from './lib/preview.mjs';

const PROJECTS = ['smoke', 'features', 'demo', 'offline'];
// Playwright sets FORCE_COLOR for its workers, and Node warns when NO_COLOR is also set.
delete process.env.NO_COLOR;
const [project, ...extra] = process.argv.slice(2).filter((a) => a !== '--');

if (!PROJECTS.includes(project)) {
  console.log(`usage: node scripts/run-playwright.mjs <${PROJECTS.join('|')}> [playwright args]`);
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = path.join('test-results', `${project}-${stamp}-${process.pid}`);

let preview = null;
let baseURL;
const wantsDev = project === 'smoke' || project === 'features';

if (wantsDev && (await answers(DEV_URL))) {
  baseURL = DEV_URL;
  console.log(`run-playwright: ${project} against the dev server ${DEV_URL}`);
} else {
  const skip = process.env.CINDIA_SKIP_BUILD === '1' && fs.existsSync(path.join(ROOT, 'dist', 'index.html'));
  console.log(skip ? 'run-playwright: using the dist/ already built' : `run-playwright: building the production bundle for ${project}...`);
  const b = skip ? { ok: true, out: '' } : build();
  if (!b.ok) {
    console.log(b.out);
    console.log('run-playwright: build failed');
    process.exit(1);
  }
  try {
    preview = await startPreview();
  } catch (err) {
    console.log(`run-playwright: ${err.message}`);
    process.exit(1);
  }
  baseURL = preview.url;
  console.log(`run-playwright: ${project} against the preview ${baseURL}`);
}

let code = 1;
const stopAndExit = async (c) => {
  if (preview) await preview.stop();
  process.exit(c);
};
process.on('SIGINT', () => void stopAndExit(130));
process.on('SIGTERM', () => void stopAndExit(143));

try {
  code = await runLive(process.execPath, [BIN.playwright, 'test', `--project=${project}`, ...extra], {
    env: {
      CINDIA_BASE_URL: baseURL,
      CINDIA_OUTPUT_DIR: outputDir,
      CINDIA_ROOT: ROOT,
    },
  });
} finally {
  if (preview) await preview.stop();
}
console.log(`run-playwright: ${project} exit ${code}, output in ${outputDir.split(path.sep).join('/')}`);
process.exit(code);
