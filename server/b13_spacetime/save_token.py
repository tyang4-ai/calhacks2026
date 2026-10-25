"""Saves the SpacetimeDB owner's token to the repo's .env without printing it (B13-live T4).

Run once per machine after publishing, from the repo root:

    .venv/bin/python server/b13_spacetime/save_token.py
    (Windows: .venv\\Scripts\\python.exe server/b13_spacetime/save_token.py)

It runs `spacetime login show --token`, finds the token in that output inside Python, and writes or
replaces the one line `SPACETIME_TOKEN=<token>` in `.env`, leaving every other line as it was. It
prints only "SPACETIME_TOKEN saved to .env", or one plain sentence on a failure. It never echoes,
logs or returns the value. Restart `npm run server` afterwards so server/config.py reads it.
"""

from __future__ import annotations

import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Optional

REPO_ROOT = Path(__file__).resolve().parents[2]
ENV_PATH = REPO_ROOT / ".env"
NAME = "SPACETIME_TOKEN"
# The CLI command, a list. None finds `spacetime` on the path. The tests swap in a fake CLI.
CLI: Optional[list[str]] = None
TIMEOUT_S = 30

# A JWT: three base64url parts joined by dots. SpacetimeDB's tokens are JWTs.
_JWT = re.compile(r"(?<![A-Za-z0-9_.-])[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}(?![A-Za-z0-9_.-])")
_OPAQUE = re.compile(r"^[A-Za-z0-9._~+/=-]{20,}$")
_LINE = re.compile(rf"^\s*(?:export\s+)?{NAME}\s*=")


def _cli() -> Optional[list[str]]:
    if CLI is not None:
        return list(CLI)
    found = shutil.which("spacetime")
    return [found] if found else None


def find_token(output: str) -> Optional[str]:
    """The token in the CLI's output: a JWT on a line that mentions the token, else the only JWT."""
    lines = output.splitlines()
    for line in lines:
        if "token" in line.lower():
            hits = _JWT.findall(line)
            if hits:
                return hits[-1]
    hits = _JWT.findall(output)
    if len(set(hits)) == 1:
        return hits[-1]
    # Not a JWT: the last word of the line that says "... token ... is <token>".
    for line in lines:
        low = line.lower()
        if "token" in low and " is " in low:
            word = line.rsplit(None, 1)[-1] if line.split() else ""
            if _OPAQUE.match(word):
                return word
    return None


def read_token() -> Optional[str]:
    cmd = _cli()
    if cmd is None:
        print("The spacetime CLI isn't on the path. Nothing was written.")
        return None
    try:
        result = subprocess.run(
            [*cmd, "login", "show", "--token"],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=TIMEOUT_S,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        print(f"spacetime login show didn't run ({type(exc).__name__}). Nothing was written.")
        return None
    if result.returncode != 0:
        print(f"spacetime login show exited with {result.returncode}. Nothing was written.")
        return None
    token = find_token(result.stdout + "\n" + result.stderr)
    if token is None:
        print("No token was found in the output of spacetime login show --token. Nothing was written.")
    return token


def updated_env(text: str, token: str) -> str:
    """The .env text with one SPACETIME_TOKEN line, replacing any earlier ones, other lines kept."""
    newline = "\r\n" if "\r\n" in text else "\n"
    out: list[str] = []
    written = False
    for line in text.splitlines():
        if _LINE.match(line):
            if not written:
                out.append(f"{NAME}={token}")
                written = True
            continue
        out.append(line)
    if not written:
        out.append(f"{NAME}={token}")
    return newline.join(out) + newline


def write_env(path: Path, token: str) -> None:
    # Bytes, so Windows line endings survive (read_text would turn \r\n into \n).
    old = path.read_bytes().decode("utf-8") if path.exists() else ""
    new = updated_env(old, token)
    tmp = path.with_name(f"{path.name}.{os.getpid()}.tmp")
    tmp.write_text(new, encoding="utf-8", newline="")
    for attempt in range(5):
        try:
            os.replace(tmp, path)
            return
        except PermissionError:
            # Windows refuses while another process has .env open. Try again, then write in place.
            time.sleep(0.2 * (attempt + 1))
    try:
        path.write_text(new, encoding="utf-8", newline="")
    finally:
        tmp.unlink(missing_ok=True)


def main() -> int:
    token = read_token()
    if token is None:
        return 1
    try:
        write_env(ENV_PATH, token)
    except OSError as exc:
        print(f".env couldn't be written ({type(exc).__name__}). Nothing was saved.")
        return 1
    print(f"{NAME} saved to .env")
    return 0


if __name__ == "__main__":
    sys.exit(main())
