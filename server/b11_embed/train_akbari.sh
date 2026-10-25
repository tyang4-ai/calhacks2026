#!/usr/bin/env bash
# B11 on the Akbari lab machine (docs/plans/B11-embed.md, The Akbari path; fix-plan 1.7).
#
# Trains Cindia's embedding model on the lab GPU (or on the CPUs when the driver fails) from the
# committed, synthetic inputs (server/b11_embed/data/mock.json and pairs.jsonl), then publishes it
# to the private Hugging Face repo, which is how the model reaches the cloud VM and the demo laptop.
#
# Run it with your own token and the repo set in this shell (never in a file the script reads):
#
#   export HF_TOKEN=...            # fine-grained, write access to the one model repo
#   export CINDIA_HF_REPO=<account>/cindia-embed
#   bash scripts/train-akbari.sh   # from a checkout (the orchestrator's one-line wrapper), or
#   bash train_akbari.sh           # this file on its own: it clones the repo first
#
# Options:
#   --dir <folder>    the checkout to use or clone into (default: the checkout this file is in,
#                     else ~/cindia-akbari/calhacks2026)
#   --branch <name>   the branch to clone or pull (default main)
#   --cpu             install the CPU torch wheel and train on the CPUs, even with a GPU
#   --no-publish      train and score only, publish nothing
#   --skip-install    reuse the checkout's .venv as it is
#   -- <args>         anything after -- goes to train.py (for example --epochs 5)
#
# Environment: CINDIA_REPO_URL (default the GitHub repo), PYTHON (default python3, 3.12 or later),
# CINDIA_TORCH_INDEX (a PyTorch wheel index for the GPU build, for example
# https://download.pytorch.org/whl/cu128; default PyPI, whose Linux torch wheel is the CUDA build).
#
# It never reads a key file, never echoes a variable and never turns on `set -x`. It writes only the
# checkout, its .venv, models/ and artifacts/, plus the files train.py and publish.py write under
# server/b11_embed/. It commits nothing: the last lines say what to commit and push, because the
# cloud VM's fetch_model.py needs the new report.json and vectors.json to match the published model.
set -euo pipefail

REPO_URL="${CINDIA_REPO_URL:-https://github.com/tyang4-ai/calhacks2026.git}"
BRANCH="main"
DIR=""
DEVICE="auto"
PUBLISH=1
INSTALL=1
TRAIN_ARGS=()
PY="${PYTHON:-python3}"

say() { printf 'train-akbari: %s\n' "$*"; }
die() { printf 'train-akbari: stopped: %s\n' "$*" >&2; exit 1; }

while [ $# -gt 0 ]; do
  case "$1" in
    --dir) [ $# -ge 2 ] || die "--dir needs a folder"; DIR="$2"; shift 2 ;;
    --branch) [ $# -ge 2 ] || die "--branch needs a name"; BRANCH="$2"; shift 2 ;;
    --cpu) DEVICE="cpu"; shift ;;
    --no-publish) PUBLISH=0; shift ;;
    --skip-install) INSTALL=0; shift ;;
    --) shift; TRAIN_ARGS=("$@"); break ;;
    -h|--help) sed -n '2,32p' "$0"; exit 0 ;;
    *) die "unknown option $1 (see --help)" ;;
  esac
done

# --- Tools and variables, checked before anything slow -------------------------------------------
command -v git >/dev/null 2>&1 || die "git isn't installed"
command -v "$PY" >/dev/null 2>&1 || die "$PY isn't installed (set PYTHON to a Python 3.12 or later)"
"$PY" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 12) else 1)' || die "$PY is older than 3.12 (set PYTHON to a newer one)"
if [ "$PUBLISH" -eq 1 ]; then
  [ -n "${HF_TOKEN:-}" ] || die "HF_TOKEN isn't set in this shell: export a fine-grained token with write access to the model repo, or pass --no-publish"
  [ -n "${CINDIA_HF_REPO:-}" ] || die "CINDIA_HF_REPO isn't set in this shell: export it as <account>/cindia-embed, or pass --no-publish"
  # publish.py runs scripts/secrets-scan.mjs before any upload.
  command -v node >/dev/null 2>&1 || die "node isn't installed, and publish.py needs it for the secrets scan (install Node 20 or later, or pass --no-publish)"
fi
# The base model downloads from huggingface.co, so offline mode must be off for this run.
unset HF_HUB_OFFLINE

# --- The checkout --------------------------------------------------------------------------------
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -z "$DIR" ]; then
  if TOP="$(git -C "$HERE" rev-parse --show-toplevel 2>/dev/null)" && [ -f "$TOP/server/b11_embed/train.py" ]; then
    DIR="$TOP"
  else
    DIR="$HOME/cindia-akbari/calhacks2026"
  fi
fi
if [ -d "$DIR/.git" ]; then
  say "using the checkout in $DIR"
  if [ -z "$(git -C "$DIR" status --porcelain --untracked-files=no)" ]; then
    git -C "$DIR" fetch --quiet origin "$BRANCH"
    git -C "$DIR" checkout --quiet "$BRANCH"
    git -C "$DIR" pull --quiet --ff-only origin "$BRANCH" || die "git pull --ff-only failed in $DIR: sort the branch out, then run this again"
  else
    say "the checkout has local changes, so it isn't pulled"
  fi
else
  [ ! -e "$DIR" ] || [ -z "$(ls -A "$DIR" 2>/dev/null)" ] || die "$DIR exists and isn't a git checkout: pass --dir with an empty or new folder"
  mkdir -p "$(dirname "$DIR")"
  say "cloning $BRANCH into $DIR"
  git clone --quiet --branch "$BRANCH" "$REPO_URL" "$DIR"
fi
cd "$DIR"
for f in server/b11_embed/train.py server/b11_embed/data/mock.json server/b11_embed/pairs.jsonl server/requirements.txt server/b11_embed/requirements-train.txt; do
  [ -f "$f" ] || die "$f isn't in this checkout"
done
if [ "$PUBLISH" -eq 1 ]; then
  [ -f server/b11_embed/publish.py ] || die "server/b11_embed/publish.py isn't in this checkout yet: pull later, or pass --no-publish"
fi

# --- The venv and the packages -------------------------------------------------------------------
VPY="$DIR/.venv/bin/python"
if [ ! -x "$VPY" ]; then
  say "making .venv with $PY"
  "$PY" -m venv .venv
fi
GPU=0
if [ "$DEVICE" = "auto" ] && command -v nvidia-smi >/dev/null 2>&1 && nvidia-smi -L >/dev/null 2>&1; then
  GPU=1
fi
if [ "$INSTALL" -eq 1 ]; then
  TORCH_VERSION="$(sed -n 's/^torch==\([^[:space:];]*\).*/\1/p' server/requirements.txt | head -n 1)"
  [ -n "$TORCH_VERSION" ] || die "server/requirements.txt pins no torch version"
  "$VPY" -m pip install --quiet --upgrade pip
  # torch goes in first, so requirements.txt's CPU index can't swap it for the CPU build.
  if [ "$GPU" -eq 1 ]; then
    say "nvidia-smi sees a GPU: installing the CUDA build of torch $TORCH_VERSION"
    if [ -n "${CINDIA_TORCH_INDEX:-}" ]; then
      "$VPY" -m pip install --quiet "torch==$TORCH_VERSION" --index-url "$CINDIA_TORCH_INDEX"
    else
      "$VPY" -m pip install --quiet "torch==$TORCH_VERSION"
    fi
  else
    say "no working GPU (or --cpu): installing the CPU build of torch $TORCH_VERSION"
    "$VPY" -m pip install --quiet "torch==$TORCH_VERSION" --index-url https://download.pytorch.org/whl/cpu
  fi
  "$VPY" -m pip install --quiet -r server/requirements.txt -r server/b11_embed/requirements-train.txt
fi
if [ "$GPU" -eq 1 ] && ! "$VPY" -c 'import sys, torch; sys.exit(0 if torch.cuda.is_available() else 1)' 2>/dev/null; then
  say "torch can't use the GPU (driver or CUDA mismatch), so train.py runs on the CPUs"
fi

# --- Train, score and publish --------------------------------------------------------------------
DATA="server/b11_embed/data/mock.json"
say "probe: 3 training steps (peak memory and seconds per step)"
"$VPY" server/b11_embed/train.py --probe --device "$DEVICE" --data "$DATA" --no-publish
say "training (the log is artifacts/b11/train.log)"
"$VPY" server/b11_embed/train.py --device "$DEVICE" --data "$DATA" --no-publish ${TRAIN_ARGS[@]+"${TRAIN_ARGS[@]}"}
if [ "$PUBLISH" -eq 1 ]; then
  say "publishing to the private repo"
  "$VPY" server/b11_embed/publish.py || die "publish.py refused or failed (its line above says why). The trained model is in models/, so fix that and run: .venv/bin/python server/b11_embed/publish.py"
fi

say "done. Commit and push the run's outputs, so the cloud VM and the laptop fetch a matching model:"
say "  git add server/b11_embed/report.json server/b11_embed/vectors.json server/b11_embed/unjudged.json server/b11_embed/README.md"
say "  git commit -m \"B11-embed: Akbari run\" && git push"
