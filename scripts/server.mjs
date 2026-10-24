#!/usr/bin/env node
// npm run server: FastAPI on http://127.0.0.1:8000 with --reload, using the .venv Python.
// The orchestrator starts it once.
import { runLive, venvPython } from './lib/common.mjs';

const py = venvPython();
if (!py) {
  console.log('server: no .venv found. Create it with `py -3 -m venv .venv`, then `.venv\\Scripts\\python.exe -m pip install -r server/requirements.txt`.');
  process.exit(1);
}
const code = await runLive(py, ['-m', 'uvicorn', 'server.main:app', '--reload', '--reload-dir', 'server', '--host', '127.0.0.1', '--port', '8000']);
process.exit(code);
