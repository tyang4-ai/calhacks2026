"""Pulls B11's published model from the private Hugging Face repo into CINDIA_MODEL_DIR (B11-embed.md,
The hand-off; fix-plan 1.7). Use the .venv Python:

    python server/b11_embed/fetch_model.py              # the revision report.json names, else the newest
    python server/b11_embed/fetch_model.py --latest     # the newest revision (main), whatever report.json says
    python server/b11_embed/fetch_model.py --revision <commit>
    python server/b11_embed/fetch_model.py --force      # download even when the model on disk already matches

It is the only way a model arrives: the server never calls the Hub (uvicorn runs with
HF_HUB_OFFLINE=1). The cloud VM runs it after a rebuild, and the demo laptop runs it in its setup
(D-deploy, scripts/laptop-setup.mjs).

- The repo is `config.HF_REPO` (CINDIA_HF_REPO), or report.json's `hubRepo` when that isn't set.
  The repo is private, so it needs `HF_TOKEN` with read access, read through server/config.py only.
- The revision is report.json's `hubRevision` when report.json names this repo, so a checkout
  always gets the model its committed report.json and vectors.json were made with. Without one it
  takes the newest (`main`). `--latest` and `--revision` override that.
- The check (B2-3, D2-5): report.json must hold `modelSha256`, `passagesHash` and a `fingerprint`
  made from them. The download goes to a folder beside CINDIA_MODEL_DIR, and only when its
  model.safetensors hashes to report.json's `modelSha256` does it replace the model folder. A
  mismatch is refused with one plain line, and the model folder is left as it was.
- Then model.py's own check runs (`is_trained()`: the weights, vectors.json's fingerprint and the
  catalog's passages all match report.json), and unless `--no-load` the model is loaded and one
  test encode runs, as the server's warm-up does.

Prints one line per step, never the token. Exits 0 when the model is in place and accepted, 1 when
anything is refused or fails.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any

if __package__ in (None, ""):  # run as a script: python server/b11_embed/fetch_model.py
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from server import config  # noqa: E402
from server.b11_embed import hub  # noqa: E402
from server.b11_embed import model as b11model  # noqa: E402
from server.b11_embed.data import rel  # noqa: E402

HERE = Path(__file__).resolve().parent
SERVER_DIR = HERE.parent
LOAD_TIMEOUT_S = 180.0


class Refused(Exception):
    """The fetch can't go on. The message is one plain line with no secret in it."""


@dataclass
class Options:
    repo: str | None = None  # --repo, else config.HF_REPO, else report.json's hubRepo
    revision: str | None = None  # --revision
    latest: bool = False
    force: bool = False
    load: bool = True
    load_timeout: float = LOAD_TIMEOUT_S


def say(line: str) -> None:
    print(f"fetch: {line}", flush=True)


def read_report() -> dict[str, Any]:
    """report.json, checked for the three hashes the fetch compares against."""
    report = b11model.read_report()
    if report is None:
        raise Refused(f"there's no readable {rel(b11model.REPORT_PATH)}, so there's nothing to check a model against")
    sha, passages, fp = report.get("modelSha256"), report.get("passagesHash"), report.get("fingerprint")
    if not all(isinstance(v, str) and v for v in (sha, passages, fp)):
        raise Refused(f"{rel(b11model.REPORT_PATH)} is missing modelSha256, passagesHash or fingerprint")
    if b11model.fingerprint_of(sha, passages) != fp:
        raise Refused(f"{rel(b11model.REPORT_PATH)}'s fingerprint doesn't match its own hashes")
    return report


def choose(o: Options, report: dict[str, Any]) -> tuple[str, str | None]:
    """The repo and the revision to fetch (None means the newest)."""
    hub_repo = report.get("hubRepo") if isinstance(report.get("hubRepo"), str) else None
    try:
        repo = hub.check_repo_id(o.repo or config.HF_REPO or hub_repo)
    except hub.HubError as exc:
        raise Refused(str(exc)) from None
    if o.revision:
        return repo, o.revision
    pinned = report.get("hubRevision")
    if not o.latest and hub_repo == repo and isinstance(pinned, str) and pinned:
        return repo, pinned
    return repo, None


def outside_server(path: Path) -> Path:
    resolved = Path(path).resolve()
    try:
        resolved.relative_to(SERVER_DIR.resolve())
    except ValueError:
        return Path(path)
    raise Refused(f"CINDIA_MODEL_DIR is under server/ ({rel(path)}), which only holds committed files")


def download(repo: str, revision: str, dest: Path, token: str | None) -> None:
    """The model files of one commit into `dest` (huggingface_hub's snapshot_download)."""
    from huggingface_hub import snapshot_download

    hub.bound_timeouts()
    snapshot_download(
        repo_id=repo,
        repo_type="model",
        revision=revision,
        local_dir=str(dest),
        allow_patterns=list(hub.MODEL_PATTERNS),
        ignore_patterns=list(hub.IGNORE_PATTERNS),
        token=token,
        etag_timeout=hub.INFO_TIMEOUT_S,
    )


# Swapped by the tests, so no test reaches the Hub.
RESOLVE: Callable[[str, str | None, str | None], str] = hub.resolve
DOWNLOAD: Callable[[str, str, Path, str | None], None] = download


def _rmtree(path: Path) -> None:
    if path.exists():
        shutil.rmtree(path, ignore_errors=True)


def install(staged: Path, target: Path) -> list[str]:
    """Moves the model files from `staged` into a fresh folder and swaps it in for `target`, so a
    failed swap never leaves half a model where the server looks. Returns the files installed."""
    names = hub.model_files(staged)
    missing = [n for n in hub.REQUIRED_FILES if n not in names]
    if missing:
        raise Refused(f"the download has no {', '.join(missing)}, so it isn't a model folder")
    uncovered = hub.uncovered_modules(staged, names)
    if uncovered:
        raise Refused(f"modules.json names {', '.join(uncovered)}, whose files the download left out")
    fresh = target.with_name(target.name + ".fetched")
    old = target.with_name(target.name + ".old")
    for p in (fresh, old):
        _rmtree(p)
    for name in names:
        dest = fresh / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        os.replace(staged / name, dest)
    try:
        if target.exists():
            os.replace(target, old)
        os.replace(fresh, target)
    except OSError as exc:
        if old.exists() and not target.exists():
            os.replace(old, target)
        raise Refused(
            f"couldn't swap the new model into {rel(target)} ({type(exc).__name__}): stop the API if it's running, then run this again"
        ) from None
    _rmtree(old)
    return names


def verify_and_install(staged: Path, target: Path, want_sha: str, where: str, hub_report: Any) -> None:
    weights = staged / hub.WEIGHTS_NAME
    if not weights.is_file():
        raise Refused(f"{where} has no {hub.WEIGHTS_NAME}, so {rel(target)} is unchanged")
    got = b11model.sha256_file(weights)
    if got != want_sha:
        hint = ""
        if isinstance(hub_report, dict) and isinstance(hub_report.get("fingerprint"), str):
            hint = f" (its report.json has fingerprint {hub_report['fingerprint']})"
        raise Refused(
            f"the weights at {where}{hint} hash to {got[:12]}, but report.json names {want_sha[:12]}, so "
            f"{rel(target)} is unchanged. Pull this repo to get the matching report.json and vectors.json, or fetch "
            "the revision report.json's hubRevision names"
        )
    install(staged, target)


def _read_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def run(o: Options) -> int:
    try:
        report = read_report()
        repo, revision = choose(o, report)
        target = outside_server(b11model.model_dir())
        want = str(report["modelSha256"])
        have = b11model.weights_file(target)
        if have is not None and not o.force and b11model.sha256_file(have) == want:
            say(f"{rel(target)} already holds the model report.json names (sha256 {want[:12]}), so nothing to download")
        else:
            token = config.HF_TOKEN if config.has_key("HF_TOKEN") else None
            if token is None:
                say("HF_TOKEN isn't set, so only a public repo can be fetched")
            hub.check_online()
            try:
                commit = RESOLVE(repo, revision, token)
            except Exception as exc:  # one plain line, never the error's text
                raise Refused(hub.describe(exc, repo, write=False)) from None
            where = f"{repo}@{commit[:12]}"
            say(f"downloading {where} ({'pinned by report.json' if revision and revision == report.get('hubRevision') else revision or 'newest'})")
            staged = target.with_name(f".{target.name}.fetch")
            _rmtree(staged)
            staged.mkdir(parents=True, exist_ok=True)
            try:
                try:
                    DOWNLOAD(repo, commit, staged, token)
                except Exception as exc:
                    raise Refused(hub.describe(exc, repo, write=False)) from None
                verify_and_install(staged, target, want, where, _read_json(staged / hub.REPORT_NAME))
            finally:
                _rmtree(staged)
            say(f"{rel(target)} now holds {where}, sha256 {want[:12]}, which matches report.json")
        b11model.reset()
        c = b11model.check(compute_hash=True)
        if not c.ok:
            raise Refused(f"the weights match report.json, but the model isn't usable yet: {c.problem}")
        say(f"is_trained() accepts it: fingerprint {report['fingerprint']} matches report.json, vectors.json and the catalog")
        if o.load:
            if not b11model.wait_warm(o.load_timeout):
                problem = b11model.status(start=False).get("problem") or f"it didn't load within {o.load_timeout:.0f} s"
                raise Refused(f"the model is in place but didn't load: {problem}")
            say("it loads and encodes (warm)")
        return 0
    except (Refused, hub.HubError) as exc:
        say(f"refused: {exc}")
        return 1


def parse_args(argv: Sequence[str] | None) -> Options:
    parser = argparse.ArgumentParser(description="Pull B11's published model into CINDIA_MODEL_DIR and check it against report.json.")
    which = parser.add_mutually_exclusive_group()
    which.add_argument("--revision", default=None, help="a commit, branch or tag of the repo (default: report.json's hubRevision, else the newest)")
    which.add_argument("--latest", action="store_true", help="the newest revision (main), whatever report.json pins")
    parser.add_argument("--repo", default=None, help="the repo (default CINDIA_HF_REPO, else report.json's hubRepo)")
    parser.add_argument("--force", action="store_true", help="download even when the model on disk already matches report.json")
    parser.add_argument("--no-load", action="store_true", help="skip loading the model and the test encode at the end")
    args = parser.parse_args(argv)
    return Options(repo=args.repo, revision=args.revision, latest=args.latest, force=args.force, load=not args.no_load)


def main(argv: Sequence[str] | None = None) -> int:
    return run(parse_args(argv))


if __name__ == "__main__":
    sys.exit(main())
