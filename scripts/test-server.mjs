#!/usr/bin/env node
// npm run test:server: pytest tests/server -q with the .venv Python ("no tests collected" counts as
// a pass), then scripts/server_selftest.py, which checks GET /api/health with the TestClient.
import { runLive, venvPython } from './lib/common.mjs';

const py = venvPython();
if (!py) {
  console.log('test:server: no .venv found. Create it with `py -3 -m venv .venv` and install server/requirements.txt.');
  process.exit(1);
}
const extra = process.argv.slice(2).filter((a) => a !== '--');
const env = { PYTHONDONTWRITEBYTECODE: '1' };

let code = await runLive(py, ['-m', 'pytest', 'tests/server', '-q', ...extra], { env });
if (code === 5) {
  console.log('test:server: no tests collected yet, counted as a pass');
  code = 0;
}
const self = await runLive(py, ['scripts/server_selftest.py'], { env });
console.log(`test:server: pytest exit ${code}, self-test exit ${self}`);
process.exit(code || self);
