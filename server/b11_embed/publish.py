"""Publishes B11's model, its card and report.json to the private Hugging Face repo (B11-embed.md,
The hand-off; fix-plan 1.7). Use the .venv Python:

    python server/b11_embed/publish.py            # check, scan, upload, then write hubRepo, hubRevision, hubUrl
    python server/b11_embed/publish.py --dry-run  # every check and the file list, without the Hub

train.py calls `main([])` at the end of a run when `config.HF_TOKEN` and `config.HF_REPO` are set.

It refuses, with one plain line and exit 1, unless all of this holds:
- `HF_TOKEN` and `CINDIA_HF_REPO` are set (read through server/config.py only; the token is never
  printed or logged). It should be a fine-grained token with write access to that one repo.
- server/b11_embed/README.md, the model card, exists and passes card.check(), before and after its
  two blocks are filled in from pairs_meta.json and report.json.
- report.json's fingerprint is made from its own modelSha256 and passagesHash, vectors.json carries
  the same fingerprint, the catalog's passages still hash to passagesHash, and the model's
  model.safetensors hashes to modelSha256 (B2-3, D2-5).
- `node scripts/secrets-scan.mjs server/b11_embed <CINDIA_MODEL_DIR> <the staged folder>` passes
  (B2-22).

Then `create_repo(config.HF_REPO, private=True, exist_ok=True)`, so the repo stays private until
Gordon says public, and one `upload_folder` of a staged folder that holds only the model files
(hub.MODEL_PATTERNS: `*.json`, `*.safetensors`, `*.txt`, `sentencepiece.bpe.model`, `1_Pooling/*`,
`2_Normalize/*`, and every module folder modules.json names must be covered),
the filled-in card as README.md and a copy of report.json. `allow_patterns` are the exact names of
those files, with hub.IGNORE_PATTERNS on top, so no checkpoint, log or pairs file can be uploaded.
Last, it writes `hubRepo`, `hubRevision` (the commit hash) and `hubUrl` into report.json and the
filled-in card into README.md, so the committed card is the published one. The uploaded copy of
report.json has `hubRevision` null, since a commit can't name its own hash.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import shutil
import subprocess
import sys
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

if __package__ in (None, ""):  # run as a script: python server/b11_embed/publish.py
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from server import config  # noqa: E402
from server.b11_embed import card, hub  # noqa: E402
from server.b11_embed import data as b11data  # noqa: E402
from server.b11_embed import model as b11model  # noqa: E402
from server.b11_embed.data import rel  # noqa: E402

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parents[1]
SCAN_SCRIPT = REPO_ROOT / "scripts" / "secrets-scan.mjs"
SCAN_TIMEOUT_S = 600
COMMIT_DESCRIPTION = (
    "Published by server/b11_embed/publish.py: the model files, the model card and report.json. "
    "Fictional demo data only."
)

# No request URL or debug line from the HTTP clients reaches a log (B2-34).
for _name in ("httpx", "httpx2", "httpcore", "huggingface_hub"):
    logging.getLogger(_name).setLevel(logging.WARNING)


class Refused(Exception):
    """The publish can't go on. The message is one plain line with no secret in it."""


@dataclass
class Options:
    model_dir: Path = field(default_factory=lambda: Path(config.MODEL_DIR))
    report: Path = HERE / "report.json"
    vectors: Path = HERE / "vectors.json"
    card: Path = HERE / "README.md"
    pairs_meta: Path = HERE / "pairs_meta.json"
    data: Path | None = None  # None: data.load()'s own pick, as model.py checks it
    expected_pieces: int = b11data.EXPECTED_PIECES
    dry_run: bool = False
    rendered: Path = REPO_ROOT / "artifacts" / "b11" / "README.rendered.md"


def say(line: str) -> None:
    print(f"publish: {line}", flush=True)


def read_json(path: Path, what: str) -> dict[str, Any]:
    try:
        value = json.loads(Path(path).read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise Refused(f"there's no {rel(path)} ({what})") from None
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise Refused(f"{rel(path)} isn't valid UTF-8 JSON ({type(exc).__name__})") from None
    if not isinstance(value, dict):
        raise Refused(f"{rel(path)} isn't a JSON object")
    return value


def write_json(path: Path, obj: Any) -> None:
    """As train.py writes report.json: UTF-8, ensure_ascii off, indent 2, through os.replace."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(f"{path.name}.{os.getpid()}.tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(tmp, path)


def write_text(path: Path, text: str) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(f"{path.name}.{os.getpid()}.tmp")
    tmp.write_text(text, encoding="utf-8")
    os.replace(tmp, path)


# ---------------------------------------------------------------------------------------------
# The checks


def require_keys() -> str:
    """The repo ID. Refuses without the token or the repo, naming the variable, never its value."""
    if not config.has_key("HF_TOKEN"):
        raise Refused("HF_TOKEN isn't set: set a fine-grained token with write access to the one model repo")
    try:
        return hub.check_repo_id(config.HF_REPO)
    except hub.HubError as exc:
        raise Refused(str(exc)) from None


def check_card(o: Options, rules: dict[str, Any]) -> str:
    """The card's text, after its content test."""
    if not Path(o.card).is_file():
        raise Refused(f"there's no model card at {rel(o.card)}, and publish only runs with it")
    text = Path(o.card).read_text(encoding="utf-8")
    problems = card.check(text, rules)
    if problems:
        raise Refused(f"{rel(o.card)} fails its content test: {'; '.join(problems)}")
    return text


def check_model(o: Options, d: b11data.Data) -> dict[str, Any]:
    """report.json, after the fingerprint checks: its own hashes, vectors.json, the catalog's
    passages and the weights."""
    report = read_json(o.report, "train.py writes it")
    sha, passages, fp = report.get("modelSha256"), report.get("passagesHash"), report.get("fingerprint")
    if not all(isinstance(v, str) and v for v in (sha, passages, fp)):
        raise Refused(f"{rel(o.report)} is missing modelSha256, passagesHash or fingerprint")
    if b11model.fingerprint_of(sha, passages) != fp:
        raise Refused(f"{rel(o.report)}'s fingerprint doesn't match its own hashes")
    if not card.systems_in(report):
        raise Refused(f"{rel(o.report)} has no scores, so the card would have no numbers")
    vectors = read_json(o.vectors, "train.py writes it")
    if vectors.get("fingerprint") != fp:
        raise Refused(f"{rel(o.vectors)}'s fingerprint doesn't match report.json's, so they don't belong together")
    if d.passages_hash() != passages:
        raise Refused("the catalog's passages changed since the model was trained, so its fingerprint no longer matches")
    weights = Path(o.model_dir) / hub.WEIGHTS_NAME
    if not weights.is_file():
        raise Refused(f"there's no {hub.WEIGHTS_NAME} in {rel(o.model_dir)}: train it, or run python server/b11_embed/fetch_model.py")
    if b11model.sha256_file(weights) != sha:
        raise Refused(f"the weights in {rel(o.model_dir)} don't hash to report.json's modelSha256")
    return report


def check_pairs(o: Options) -> dict[str, Any]:
    meta = read_json(o.pairs_meta, "pairs.py writes it")
    if card.claude_pieces(meta) == 0:
        raise Refused(f"{rel(o.pairs_meta)} says templates wrote every training query, but the card says Claude did: edit the card first")
    return meta


def file_list(o: Options) -> list[str]:
    """The model files to upload, by exact name, plus the card and the report."""
    names = hub.model_files(o.model_dir)
    missing = [n for n in hub.REQUIRED_FILES if n not in names]
    if missing:
        raise Refused(f"{rel(o.model_dir)} has no {', '.join(missing)}, so it isn't a model folder")
    uncovered = hub.uncovered_modules(o.model_dir, names)
    if uncovered:
        raise Refused(f"modules.json names {', '.join(uncovered)}, whose files hub.MODEL_PATTERNS don't carry, so the model wouldn't load elsewhere")
    try:
        return hub.exact_patterns([*names, hub.CARD_NAME, hub.REPORT_NAME])
    except hub.HubError as exc:
        raise Refused(str(exc)) from None


def stage(o: Options, names: Sequence[str], card_text: str, report_copy: dict[str, Any]) -> Path:
    """A folder beside the model folder holding exactly the files to upload: the model files as
    hard links (copies where links don't work), the filled-in card and the report copy."""
    folder = Path(o.model_dir).with_name(f".{Path(o.model_dir).name}.publish")
    if folder.exists():
        shutil.rmtree(folder)
    for name in names:
        if name in (hub.CARD_NAME, hub.REPORT_NAME):
            continue
        src, dest = Path(o.model_dir) / name, folder / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        try:
            os.link(src, dest)
        except OSError:
            shutil.copy2(src, dest)
    write_text(folder / hub.CARD_NAME, card_text)
    write_json(folder / hub.REPORT_NAME, report_copy)
    return folder


def _arg(path: Path) -> str:
    try:
        return Path(path).resolve().relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return str(Path(path).resolve())


def scan_command(paths: Sequence[Path]) -> list[str]:
    return ["node", _arg(SCAN_SCRIPT), *(_arg(p) for p in paths)]


def secrets_scan(paths: Sequence[Path]) -> tuple[int, str]:
    """Runs scripts/secrets-scan.mjs over the paths. Its output names files and checks, never a value."""
    try:
        done = subprocess.run(
            scan_command(paths), cwd=REPO_ROOT, capture_output=True, text=True, encoding="utf-8",
            errors="replace", timeout=SCAN_TIMEOUT_S,
        )
    except FileNotFoundError:
        return 127, "node isn't installed, so scripts/secrets-scan.mjs can't run"
    except subprocess.TimeoutExpired:
        return 124, f"scripts/secrets-scan.mjs didn't finish within {SCAN_TIMEOUT_S} s"
    return done.returncode, (done.stdout or "").strip()


# Swapped by the tests, so no test reaches the Hub or runs node.
MAKE_API: Callable[[str | None], Any] = hub.make_api
SCAN: Callable[[Sequence[Path]], tuple[int, str]] = secrets_scan


# ---------------------------------------------------------------------------------------------
# The run


def run(o: Options) -> int:
    folder: Path | None = None
    try:
        repo = require_keys()
        if not o.dry_run:
            try:
                hub.check_online()
            except hub.HubError as exc:
                raise Refused(str(exc)) from None
        try:
            d = b11data.load(o.data, expected=o.expected_pieces)
        except b11data.DataError as exc:
            raise Refused(f"B11's data can't be read: {exc}") from None
        template = check_card(o, d.content_rules)
        report = check_model(o, d)
        meta = check_pairs(o)
        filled = card.render(template, report, meta)
        problems = card.check(filled, d.content_rules, filled=True)
        if problems:
            raise Refused(f"the filled-in card fails its content test: {'; '.join(problems)}")
        names = file_list(o)
        url = hub.repo_url(repo)
        report_copy = {**report, "hubRepo": repo, "hubRevision": None, "hubUrl": url}
        folder = stage(o, names, filled, report_copy)
        code, out = SCAN([HERE, Path(o.model_dir), folder])
        for line in out.splitlines():
            say(f"  {line}")
        if code != 0:
            raise Refused("the secrets scan failed, so nothing is uploaded")
        say(f"{len(names)} files for {repo}: {', '.join(names)}")
        if o.dry_run:
            write_text(o.rendered, filled)
            say(f"dry run: nothing uploaded. The filled-in card is in {rel(o.rendered)}")
            return 0
        api = MAKE_API(config.HF_TOKEN)
        try:
            api.create_repo(repo, repo_type="model", private=True, exist_ok=True)
            info = api.upload_folder(
                repo_id=repo,
                repo_type="model",
                folder_path=str(folder),
                allow_patterns=list(names),
                ignore_patterns=list(hub.IGNORE_PATTERNS),
                commit_message=f"{report.get('modelId') or 'cindia-embed'} {report['fingerprint']}",
                commit_description=COMMIT_DESCRIPTION,
            )
        except Exception as exc:  # one plain line, never the error's text
            raise Refused(hub.describe(exc, repo, write=True)) from None
        revision = getattr(info, "oid", None)
        if not isinstance(revision, str) or not revision:
            raise Refused(f"the upload to {repo} returned no commit hash, so report.json is unchanged")
        current = read_json(o.report, "train.py writes it")
        if current.get("fingerprint") != report["fingerprint"]:
            raise Refused(f"{rel(o.report)} changed during the upload, so its hub fields are left alone: run publish again")
        current.update(hubRepo=repo, hubRevision=revision, hubUrl=url)
        write_json(o.report, current)
        if Path(o.card).read_text(encoding="utf-8") != filled:
            write_text(o.card, filled)
        say(f"published {report.get('modelId')} to {url} (private), revision {revision}, fingerprint {report['fingerprint']}")
        say(f"wrote hubRepo, hubRevision and hubUrl into {rel(o.report)} and the filled-in card into {rel(o.card)}")
        return 0
    except Refused as exc:
        say(f"refused: {exc}")
        return 1
    finally:
        if folder is not None:
            shutil.rmtree(folder, ignore_errors=True)


def parse_args(argv: Sequence[str] | None) -> Options:
    parser = argparse.ArgumentParser(description="Publish B11's model, its card and report.json to the private Hugging Face repo.")
    parser.add_argument("--dry-run", action="store_true", help="run every check and the secrets scan, list the files, upload nothing")
    parser.add_argument("--model-dir", type=Path, default=None, help="the model folder (default CINDIA_MODEL_DIR)")
    args = parser.parse_args(argv)
    o = Options(dry_run=args.dry_run)
    if args.model_dir is not None:
        o.model_dir = args.model_dir if args.model_dir.is_absolute() else REPO_ROOT / args.model_dir
    return o


def main(argv: Sequence[str] | None = None) -> int:
    return run(parse_args(argv))


if __name__ == "__main__":
    sys.exit(main())
