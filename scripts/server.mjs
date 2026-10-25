#!/usr/bin/env node
// npm run server: FastAPI on http://127.0.0.1:8000 with --reload, using the .venv Python.
// The orchestrator starts it once.
// --timeout-graceful-shutdown 3 keeps an open response from hanging a reload. HF_HUB_OFFLINE=1
// means the server never calls the Hugging Face Hub (server/b11_embed/fetch_model.py is the only
// way a model arrives), and ANTHROPIC_BASE_URL pins every Claude client, v1's routers included,
// to the real API whatever the shell says.
import { IS_WIN, runLive, venvPython } from './lib/common.mjs';

const py = venvPython();
if (!py) {
  console.log(
    IS_WIN
      ? 'server: no .venv found. Create it with `py -3 -m venv .venv`, then `.venv\\Scripts\\python.exe -m pip install -r server/requirements.txt`.'
      : 'server: no .venv found. Create it with `python3 -m venv .venv`, then `.venv/bin/python -m pip install -r server/requirements.txt`.',
  );
  process.exit(1);
}
const code = await runLive(
  py,
  [
    '-m',
    'uvicorn',
    'server.main:app',
    '--reload',
    '--reload-dir',
    'server',
    '--host',
    '127.0.0.1',
    '--port',
    '8000',
    '--timeout-graceful-shutdown',
    '3',
  ],
  { env: { HF_HUB_OFFLINE: '1', ANTHROPIC_BASE_URL: 'https://api.anthropic.com' } },
);
process.exit(code);
