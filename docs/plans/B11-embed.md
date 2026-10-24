# B11-embed · Cindia's own embedding model

Priority: P0 · Wave: V2 · Depends on: I2-core (code, `config`, `services`, `npm run export:mock`), S3-catalog (training data and `contentRules`) · Folder: `server/b11_embed/` · Source key: `b11-embed` · Makes real: the search proof, the embedding map, every vector B12, B14's Indexer and B15 use · Estimate: 3 h, plus a 15 to 30 minute training run

**SCOPE:** `server/routers/b11_embed.py, server/b11_embed/, src/sources/live/b11-embed.ts, tests/server/test_b11_embed.py, tests/server/b11_fixture.json`

## Goal

A sentence-embedding model fine-tuned on Cindia's catalog, so "something warm and bright for my mom's new house" lands on the right weavings, pottery and beadwork, and not just on pieces that share the words. It's one of the platform's three backend pillars (fix-plan 1.4): every seller entry is embedded by this model the moment it's drafted. It's tested on 50 held-out queries that it never trained on, scored against keyword search, the untuned base model and a local hybrid, and every number in the proof comes from that run. Anthropic, Visa and Hyphenate judges all ask how we know it works. This is how, stated without overclaiming.

Everything it learns from is fictional demo data from `src/mock/` (fix-plan 1.6). The training queries are Claude-written about fictional pieces, and the model card says so.

## Read first

- `docs/v2/fix-plan.md` sections 1.4, 1.6 and 1.7. Where it disagrees with `docs/v2/contracts.md`, the fix plan wins until FX1 lands its contract changes.
- `docs/v2/contracts.md`:
  - section 1 (`CINDIA_MODEL_DIR`, `HF_TOKEN`, the hosts),
  - section 2 (IndexEntry, the passage rule, SearchQuery, figure 15),
  - section 3 (`search.mapped`, `model.trained`, `proof.search_scored`),
  - section 5 (B11).

  After I2-core: `docs/common/api-contract.md` B11, `events.md` and `data-model.md`.
- `docs/v2/brief.md`, "Search and the index"
- `docs/plans/S3-catalog.md`: the index entries, the eval set, `contentRules` and T9, which copies your report into `src/mock/model.ts`
- `docs/tech/sentence-transformers/` (training overview, MultipleNegativesRankingLoss and `NO_DUPLICATES`, `mine_hard_negatives`, prompts, push to hub, v6 notes, and `multilingual-e5-small.md`), `docs/tech/huggingface-hub/` (upload, model cards, auth and repos). Don't write these APIs from memory.
- `docs/common/api-contract.md`, "Rules for every endpoint", and the Upgrade checklist in `docs/common/definition-of-done.md`
- `.claude/rules/backend.md`, `docs/harness/lessons.md`

## Interfaces

- **Input data:**
  - `artifacts/mock/mock.json`, written by `npm run export:mock` (I2-core), one key per non-function export of `src/mock/index.ts` and `_generatedAt`.
  - `server/b11_embed/data/mock.json` (committed): a snapshot of the keys B11 uses (`pieces`, `communities`, `searchIndex`, `searchEval`, `keywordAliases`, `contentRules`, `_generatedAt`), written by `python server/b11_embed/data.py --snapshot`. It lets the Akbari machine train without Node. Every line in it is synthetic demo data.
  - `data.py` reads `artifacts/mock/mock.json` when it exists and is newer, otherwise the snapshot. It fails with one clear line if neither exists or `searchIndex` doesn't hold 54 entries, and logs `_generatedAt` and which file it read.
  - Every file is read and written with `encoding="utf-8"`, and JSONL with `ensure_ascii=False`, because the data holds Chinese and Windows defaults to cp1252.
- **Base model:** `intfloat/multilingual-e5-small`, 384 dimensions, MIT licence, downloaded from `huggingface.co` once. It needs the cloud environment on Full network. If the download is blocked, the report says `blocked: base model download` and the upgrade is `blocked` under Needs Gordon. On a certificate error from the `hf_xet` client, rerun with `HF_HUB_DISABLE_XET=1`. A replacement model is allowed only if it also trains on CPU, and the report says why.
- **Text in (one rule everywhere):**
  - Passages are the IndexEntry's `embedText` as it is. It already starts `passage: `.
  - A query is `query: ` followed by the person's words, then `, ` and each chip whose words aren't already in the text. A price chip (`under $200`) is never embedded, because it's a filter. Training queries, eval queries, `map`, B12's search and B15's comparer all use this rule through `compose.query_text(text, chips)`.
  - Prefixes go in the text. Never pass `prompts` to the trainer or call `encode_query()`, so a prefix is never doubled. A test checks that every encoded string starts with exactly one prefix.
  - Every vector is L2-normalized, so cosine is a dot product.
- **Training script:** `python server/b11_embed/train.py`, CPU by default, memory-safe (B2-5):
  - Steps: load the data, load the pairs, fine-tune, evaluate the four systems, fit the 2D map, write the outputs and fingerprints, publish when `HF_TOKEN` and `CINDIA_HF_REPO` are set.
  - `--probe` runs 3 training steps and exits, printing peak RSS (from `resource.getrusage`, or `psutil` on Windows) and seconds per step. Always run it first.
  - `--eval-only` reloads the saved model and reruns only the evaluation and the report, for the pooled-grading rerun below.
  - Seeded (`--seed 13`) in Python, NumPy and torch.
  - Settings: freeze `embeddings.word_embeddings`, so about 22M of the 118M weights train. `max_seq_length` is the longest passage in tokens rounded up to a multiple of 8, at most 128. Batch 32 with `BatchSamplers.NO_DUPLICATES`, 3 epochs, learning rate 2e-5, 10% warmup, `fp16=False`, `bf16=False`, `dataloader_num_workers=0`, `torch.set_num_threads(2)`, `push_to_hub=False`. If the probe shows a peak over 4 GB or more than 30 seconds a step, use batch 16 and say so in `notes`.
  - Checkpoints: one model-only checkpoint per epoch (`save_strategy="epoch"`, `save_only_model=True`, `save_total_limit=1`) under `models/checkpoints/`, never under `server/`. A killed run resumes from the newest one.
  - It logs one line every 10 steps and one per epoch to `artifacts/b11/train.log`, and never prints data.
  - It uses a GPU when torch finds one (`--device auto`), which is the Akbari path. CPU is the default and needs nothing.
- **Outputs:**
  - `CINDIA_MODEL_DIR` (default `models/cindia-embed-v1/`, not committed) holds the fine-tuned model.
  - `server/b11_embed/report.json` (committed):
    ```json
    { "modelId": "cindia-embed-v1", "baseModel": "intfloat/multilingual-e5-small", "dims": 384,
      "pairs": 1080, "epochs": 3, "batch": 32, "seed": 13, "device": "cpu", "pairSource": "claude | template",
      "modelSha256": "...", "passagesHash": "...", "fingerprint": "...", "hubRepo": null, "hubRevision": null, "hubUrl": null,
      "pca": { "explainedVariance": [0.0, 0.0] },
      "eval": { "k": 5, "queries": 50, "querySet": "agent-written, held out",
        "systems": [ { "system": "keyword", "recallAtK": 0.0, "mrr": 0.0 }, { "system": "base", "...": 0 }, { "system": "custom", "...": 0 }, { "system": "hybrid", "...": 0 } ],
        "byLang": { "en": { "queries": 40, "systems": [] }, "zh": { "queries": 10, "systems": [] } },
        "comparisons": [ { "a": "custom", "b": "keyword", "metric": "recallAtK", "delta": 0.0, "ci95": [0.0, 0.0], "beats": false } ] },
      "notes": ["..."] }
    ```
  - `server/b11_embed/vectors.json` (committed): `{ "modelId", "dims", "fingerprint", "pca": { "mean": [...], "components": [[...], [...]], "scale": number, "queryShift": [...] | null }, "pieces": [ { "pieceId", "vector": [...], "x", "y" } ] }`, numbers rounded to 5 decimals.
  - `server/b11_embed/pairs.jsonl` (committed): one training pair per line, `{ "query", "lang", "voice", "pieceId", "negativeId" | null }`, so anyone can audit what the model learned from.
  - `server/b11_embed/unjudged.json` (committed after the first run): for each eval query, the pieces in any system's top 5 that the query doesn't grade, for one pooled grading pass (B2-8).
- **Fingerprints** (B2-3, D2-5). One model, one `vectors.json` and one index belong together, and anything that doesn't match is refused:
  - `modelSha256` is the sha256 of the model's weights file (`model.safetensors`).
  - `passagesHash` is the sha256 of the 54 `embedText`s in `pieceId` order, joined with a newline.
  - `fingerprint` is the first 16 hex characters of the sha256 of `modelSha256 + ":" + passagesHash`. `report.json` and `vectors.json` carry it, B12 writes it into every Elastic document, and `GET /api/b11/model` reports it.
  - `is_trained()` is true only when the model on disk hashes to `modelSha256`, `vectors.json` carries the same `fingerprint`, and the current data's `passagesHash` equals the report's. Otherwise it's false, and `GET /api/b11/model` says why in `problem`.
- **Metrics** (B2-8):
  - `recallAtK` is the mean over the eval queries of (graded pieces in the top 5) / min(5, graded pieces), counting grades 1 and 2.
  - `mrr` is MRR@10: the mean reciprocal rank of the first grade-2 piece within the top 10, or 0 when there is none. Every label says MRR@10.
  - Systems:
    - `keyword` is BM25 over `embedText`, the facet words, `title.zh` and the craft's Chinese name, so Chinese queries get a fair keyword baseline,
    - `base` is the untuned model,
    - `custom` is the fine-tuned model,
    - `hybrid` is reciprocal rank fusion of `custom` and `keyword` with constant 60, skipping keyword hits that scored 0. Labels call it "local hybrid", because the live Elastic hybrid is a different system (B12 records its own numbers).
  - Every system is also scored per language (`byLang`).
  - `comparisons` use a paired bootstrap over the queries (10,000 resamples, seeded) for custom against keyword, custom against base, and hybrid against custom. A note says "beats" only when the 95% interval excludes zero. Otherwise it says the gap is within noise.
  - **Pooled grading.** After the first run, `unjudged.json` lists the pieces any system put in a top 5 that the query doesn't grade. The data-smith grades them once (S3-catalog T9), then `train.py --eval-only` reruns the scores. Until then, `notes` says unjudged pieces count as misses.
- **The eval set's name** (B2-7, A2-12). The 50 queries were written by the data agent, not a person. `querySet` is "agent-written, held out", and the card and `notes` say the same, plus that the 54 documents are in training and only the queries are held out. If S3 marks queries Gordon wrote or edited (fix-plan 1.5), they're scored as their own row in `notes` and `querySet` says how many. Never call the set "hand-written".
- **Endpoints** (`server/routers/b11_embed.py`, `router = APIRouter(prefix="/api/b11")`, no key needed):
  - `GET /api/b11/model` returns `{ "trained", "warm", "modelId", "baseModel", "dims", "fingerprint", "problem" }` in under 200 ms. It never loads the model inside the request. The first call starts the background warm-up (below). `warm` is true once the model is loaded and one test encode has run. `problem` is null or one plain sentence. This isn't an events response.
  - `POST /api/b11/report` `{ "trigger" }` returns `model.trained` and `proof.search_scored` built from `report.json`, under 1 second, or `[]` when there's no report. Tests and the data fix's copy step use it. The tour never waits on it.
  - `POST /api/b11/map` `{ "trigger", "queryId", "text", "keywords" }` embeds the query by the query rule, projects it with the stored PCA (never refitted per request), and returns one `search.mapped`: every piece's point, the query's point and `method: "pca"`, with `approx` unset because the points are real. Under 2 seconds once warm. It returns `[]` when the model isn't trained or isn't warm yet, so the scripted map plays.
- **Events:** `source: "live"`, `key: "b11-embed"`, `at` copied from the trigger or 0. IDs are `evt_live_` plus a number made of `11`, the process start time in seconds modulo 1,000,000 (six digits), and a four-digit counter, so a server reload never repeats an ID (D1-52).
- **Python module for other upgrades** (`server/b11_embed/model.py`):
  - `is_trained()`, `is_warm()`, `fingerprint()`, `encode_queries(texts) -> list[list[float]]`, `encode_passages(texts)`, `piece_vectors() -> dict[pieceId, list[float]]`, `project(vector) -> (x, y, approx)`. B12, B14's Indexer and B15 import these. `compose.query_text()` and `bm25.py` (a small BM25 with English lowercasing and per-character CJK tokens) are shared the same way.
  - **Lazy imports** (B2-10): `torch` and `sentence_transformers` are imported only inside `model.py`'s loader, and sibling upgrades import `model.py` inside their functions. No server module imports torch at module level or calls out at import time, so pytest and every router load fast, and a broken torch install drops nothing but the model.
  - **Warm-up:** the first `GET /api/b11/model` starts one background thread that loads the model, checks the fingerprints and runs one test encode. Every model-dependent `health()` (B11, B12, B15) stays false until `warm` is true.
  - **One encode lock:** every `encode_*` call takes one `threading.Lock`, because a fast tokenizer shared across threadpool threads can raise "Already borrowed".
  - The server never calls the Hugging Face Hub at run time. uvicorn runs with `HF_HUB_OFFLINE=1` (an integrator change to `scripts/server.mjs`, listed under Contract additions).
- **The map projection** (B2-28). The PCA is fit on passages only. `report.json` records the two components' explained variance. A test checks that the tour query's projected point lands within the spread of its top 3 results. If it doesn't, `vectors.json` stores `queryShift` (the passage mean minus the mean training-query vector) and `project()` adds it before projecting. If that still misses, the query is placed at the weighted center of its top 3 and `project()` returns `approx: true`.
- **Adapter** (`src/sources/live/b11-embed.ts`, default export a `LiveAdapter`):
  - `health()`: `GET /api/health` lists `b11` and `services.model` is true, then `GET /api/b11/model` says `trained` and `warm`.
  - `produce(event, state)`: `[]` for every event. The tour is always scripted (fix-plan 1.2), so the tour's keyed `search.mapped`, `model.trained` and `proof.search_scored` play scripted in both modes, with the real numbers that S3 T9 copies into `src/mock/model.ts`. `ALLOWED_EMPTY_FALLBACKS` lists those three types for `b11-embed` (I2-tour T6). A person's search gets its live map through B12's adapter, which calls `POST /api/b11/map`.
  - Every fetch aborts at 3 seconds in `health()`.
- **Python dependencies:**
  - Inference needs `sentence-transformers`, `torch` (CPU wheel through `--extra-index-url https://download.pytorch.org/whl/cpu`), `numpy` and `huggingface_hub` in `server/requirements.txt` (I2-core). After the install, `torch.__version__` ends in `+cpu` on the cloud VM.
  - Training adds `datasets` and `accelerate`, pinned in `server/b11_embed/requirements-train.txt`, which the orchestrator installs into `.venv`.
- **Live tests** use `needs_service("model")` and `needs_key(...)` from `tests/server/conftest.py`. Unit tests use the fake keys from conftest's autouse fixture (I2-core), never print a request, and never download a model.

## The hand-off: Hugging Face (fix-plan 1.7)

The cloud session can't reach the Akbari lab machine, and `models/` isn't committed, so the Hugging Face repo carries the model between machines.

- **Publish** (`publish.py`, called by `train.py` at the end when `HF_TOKEN` and `CINDIA_HF_REPO` are set, or run alone):
  - It refuses to run without both, and refuses unless `README.md` (the model card below) exists and passes its content test.
  - `create_repo(CINDIA_HF_REPO, private=True, exist_ok=True)`. The repo stays private until Gordon says public.
  - `upload_folder` with `allow_patterns` for the model files (`*.json`, `*.safetensors`, `*.txt`, `sentencepiece.bpe.model`, `1_Pooling/*`), `README.md` and `report.json` only. Never checkpoints, logs or pairs.
  - It writes `hubRepo`, `hubRevision` (the commit hash) and `hubUrl` back into `report.json`.
  - `HF_TOKEN` should be a fine-grained token with write access to that one repo (B2-30, B2-33). It's read only through `server/config.py`, and nothing logs it.
- **Fetch** (`python server/b11_embed/fetch_model.py`): downloads the newest revision of `CINDIA_HF_REPO` (or `report.json`'s `hubRepo`) into `CINDIA_MODEL_DIR`, checks the weights against `report.json`'s `modelSha256`, and refuses a mismatch with one plain line. It needs `HF_TOKEN` (read access) because the repo is private. The cloud VM runs it after a rebuild, and the demo laptop runs it in its setup (D-deploy).
- **The Akbari path** (optional, Gordon at the lab): `server/b11_embed/train_akbari.sh` clones the repo (or pulls it), makes a venv, installs `server/requirements.txt` and `requirements-train.txt` (the CUDA torch wheel when `nvidia-smi` works, the CPU wheel otherwise), runs `train.py --device auto` on the committed `data/mock.json` and `pairs.jsonl`, and publishes. Gordon runs one command there with his own `HF_TOKEN` and `CINDIA_HF_REPO` set in that shell. It never reads a key file and never echoes a variable. The orchestrator adds `scripts/train-akbari.sh`, a one-line wrapper that runs it, because a backend-builder can't write `scripts/`.
- **The model card** (`server/b11_embed/README.md`, A2-12, B2-30). Publish only with this card. It states:
  - what it is: `cindia-embed-v1`, fine-tuned from `intfloat/multilingual-e5-small` (MIT, credited with a link),
  - intended use: search over this fictional demo catalog of 54 listings on the Cindia platform,
  - the data: synthetic queries that Claude wrote about 54 fictional listings, some attributed to fictional members of real Native American nations (Diné, Ojibwe, Acoma Pueblo, Seminole). No real community's, maker's or buyer's data,
  - the evaluation: 50 agent-written, held-out queries over the same 54 pieces that are in training, one model family, the numbers from `report.json` with their intervals, and "a small test, not a benchmark",
  - limits: one small catalog, one run, queries and pieces from the same authoring pipeline,
  - not for: classifying, ranking or verifying real makers or their work, judging authenticity or identity, or any decision about a real person.

  A test checks that the card holds each of those lines, no URL outside `huggingface.co`, `example.com` and `example.org`, and no nation's name used as a product word (`contentRules`).

## Tasks

One backend-builder does these in order, except T5's run, which the orchestrator starts (below). Each task adds its own tests to `tests/server/test_b11_embed.py` and ends with them passing.

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | `data.py` (load and check the data, `--snapshot`) and `compose.py` (the passage rule and `query_text()`). Tests: rebuild every `embedText` in a 3-piece fixture and, when the data exists, all 54, and compare. Every encoded string starts with exactly one prefix. A price chip is never embedded | `server/b11_embed/__init__.py`, `server/b11_embed/data.py`, `server/b11_embed/compose.py`, `server/b11_embed/data/mock.json`, `tests/server/b11_fixture.json`, `tests/server/test_b11_embed.py` | none | sonnet |
| T2 | `bm25.py` and `metrics.py`: recall at 5, MRR@10, RRF that skips zero-score keyword hits, per-language scoring and the paired bootstrap. Tests on a toy set whose answers are worked out by hand, and a bootstrap whose interval is checked against a hand case | `server/b11_embed/bm25.py`, `server/b11_embed/metrics.py` | T1 | sonnet |
| T3 | `pairs.py`: Claude writes the training queries, with the checks, filters and fallback below. Then run it once (`python server/b11_embed/pairs.py`) and keep `pairs.jsonl` | `server/b11_embed/pairs.py`, `server/b11_embed/pairs.jsonl` | T1 | opus |
| T4 | `train.py`, `evaluate.py` and `pca.py`: the memory-safe fine-tune, `--probe`, `--eval-only`, checkpoints and resume, the four systems, the map with its projection check, the fingerprints and the report. A smoke test runs the whole pipeline on the 3-piece fixture with a tiny fake encoder, so no test downloads a model | `server/b11_embed/train.py`, `server/b11_embed/evaluate.py`, `server/b11_embed/pca.py`, `server/b11_embed/requirements-train.txt` | T2, T3 | opus |
| T5 | The training run. The orchestrator runs the probe and then the real run in the background (Orchestrator steps). The builder checks the outputs against Acceptance, writes `unjudged.json`, and pastes the four systems' numbers, per language, with their intervals, into the REPORT block | `server/b11_embed/report.json`, `server/b11_embed/vectors.json`, `server/b11_embed/unjudged.json` | T4, S3-catalog green | opus |
| T6 | `model.py` (lazy imports, the warm-up thread, the encode lock, the fingerprint check, `project()`) and the three endpoints, with TestClient tests using a fake model: `GET /api/b11/model` answers in under 200 ms cold, `warm` turns true after the fake load, a fingerprint mismatch makes `trained` false with a `problem` | `server/b11_embed/model.py`, `server/routers/b11_embed.py` | T4 | opus |
| T7 | The live adapter | `src/sources/live/b11-embed.ts` | T6 | sonnet |
| T8 | The hand-off: `publish.py`, `fetch_model.py`, `train_akbari.sh` and the model card, with tests: publish refuses without the token, the repo or the card, `allow_patterns` never matches a checkpoint, fetch refuses a weights file whose sha256 differs, the card's content test | `server/b11_embed/README.md`, `server/b11_embed/publish.py`, `server/b11_embed/fetch_model.py`, `server/b11_embed/train_akbari.sh` | T5 | sonnet |

### T3 · Training pairs

- For each of the 54 pieces, one `client.messages.parse()` call to `claude-sonnet-5-5` through `server/config.py` (key `CINDIA_ANTHROPIC_API_KEY` first, then `ANTHROPIC_API_KEY`, and the config's base URL). `max_retries=0` on the client, a 60-second timeout per call, one retry per piece, four calls at a time.
- The output model holds:
  - `queries`: about 20 items of `{ text, lang: "en" | "zh", voice }`, where `voice` is one of `mood`, `occasion`, `recipient`, `looks`, `material`, `craft_term`, `short`, `long` and `misspelled`, about a fifth of them Chinese,
  - `hard_negative_ids`: two to four other piece IDs a careless search would confuse with this one, such as the same object in another craft.
- The prompt gives the piece's IndexEntry fields, its community's craft line and the list of other pieces' titles and objects. It says: write as a buyer would, use no facts beyond the record, never quote the title whole, and make every mood or occasion query also name one concrete facet of the piece (its object, a color or a material). It says nothing about a piece's meaning, because the records hold none.
- **Server checks** (a failed check retries that piece once, then that piece falls back to templates):
  - between 18 and 22 queries (structured outputs can't force an exact count, lesson B09), at least 3 Chinese, and at least four different voices,
  - every negative exists and isn't the piece,
  - no query longer than 200 characters.
- **Content filter** (A2-8): drop a query that holds any word from `contentRules` (banned objects, stereotype words, meaning words) or uses a People's name from `peopleNames` as a product word ("Navajo rug", "Ojibwe-style earrings"). Count the drops in `notes`. If more than four drop for one piece, retry that piece once, then use templates. A test proves a fake query "spiritual Navajo blanket" never reaches `pairs.jsonl`.
- **Hard negatives** (B2-6): many "negatives" are right answers for mood queries, so:
  - only `looks`, `material` and `craft_term` queries get a hard negative. Every other line's `negativeId` is null and relies on in-batch negatives,
  - a negative is dropped for a query when the negative's facets or vibe hold any of the query's motif, mood or recipient words (from the vibe vocabulary),
  - each kept line's `negativeId` is one of that query's remaining hard negatives, cycled.

  `notes` records how many negatives were dropped. Optional, if T4 has time: `GISTEmbedLoss` with the base model as guide, which filters false in-batch negatives and fits in memory with the embeddings frozen.
- **Template fallback** (`--source template`, or no Anthropic key): for each piece, 20 queries built from its facets and vibe with fixed English and Chinese patterns ("something {mood} for my {recipient}", "{color} {object}", "{material} {object} from {place}" and so on), with negatives chosen by shared object only. `pairSource` says which source built the pairs.
- **Eval-leak guard:** drop any generated query whose normalized text (lowercase, punctuation stripped, spaces collapsed) equals an eval query's, or shares at least 80% of its tokens with one, where tokens come from `bm25.py`'s tokenizer (words for English, single characters for Chinese). Figure 11's tour query is guarded the same way. The test plants an eval query and the tour query in fake output and proves neither reaches `pairs.jsonl`.
- Pairs are written with each anchor once per positive.

### T4 · Training and evaluation

- **Training:** `SentenceTransformerTrainer` with `MultipleNegativesRankingLoss` on (query, positive passage) pairs and (query, positive, hard negative) triplets, with the settings in Interfaces. 10% of each piece's queries are held out as a dev split, and `notes` gives the dev recall too.
- **Evaluation:** encode all 54 passages once per system, rank the eval queries, and compute the metrics exactly as defined, overall and per language. `hybrid` fuses the `custom` and `keyword` rankings.
- **Map:** PCA by SVD on the centered custom vectors. `scale` maps the points into -1 to 1. A query is projected with the same mean and components (plus `queryShift` when set), then clipped to -1.2 to 1.2.
- **Honesty:** every number in `report.json` comes from this run. If the custom model doesn't beat `base` or `keyword` outside the noise, `notes` says so, and nothing rounds in our favor. If the run is cut short or doesn't finish in time, the plan B in Out of scope applies, labeled as such.

## Orchestrator steps (not the builder's)

- **Before T3:** `npm run export:mock`, then `python server/b11_embed/data.py --snapshot`, and install `server/b11_embed/requirements-train.txt` into `.venv`.
- **T5's run:** confirm the network level reaches `huggingface.co`. Run `python server/b11_embed/train.py --probe` in the foreground and read its peak RSS and seconds per step. Then start `python server/b11_embed/train.py` with `run_in_background` and a 60-minute timeout. Nothing heavy runs beside it. Expect 15 to 30 minutes on 2 vCPUs. Check `artifacts/b11/train.log` on each heartbeat. If the VM is reclaimed, restart the same command, and it resumes from the last checkpoint.
- **After T5:** spawn the data-smith for S3-catalog T9 (copy the report, grade `unjudged.json`), then run `python server/b11_embed/train.py --eval-only` and have T9 copy the report again. Rerun `npm run export:mock` before B12's seed.
- **After T8:** add `scripts/train-akbari.sh`, one line that runs `server/b11_embed/train_akbari.sh "$@"`. Run `python server/b11_embed/fetch_model.py` after any VM rebuild.

## Acceptance

- Given the data, when the test rebuilds the passages, then all 54 equal `searchIndex`'s `embedText`, and every query and passage the code encodes starts with exactly one prefix.
- Given a fake Claude that returns an eval query, the tour query and "spiritual Navajo blanket" among its outputs, when `pairs.py` runs, then none of the three is in `pairs.jsonl`, and a mood query's hard negative that shares its motif is dropped.
- Given the toy set, when the metrics run, then recall at 5, MRR@10, RRF and the bootstrap match the hand-worked values.
- Given `train.py --probe`, then it prints peak RSS and seconds per step and exits after 3 steps.
- Given the training run, when it finishes, then `report.json` has all four systems overall and per language from this run, its comparisons with intervals, `querySet` "agent-written, held out", and the three hashes. `vectors.json` has 54 pieces with 384-number vectors, points in range and the same `fingerprint`. The model directory exists, and no checkpoint is under `server/`.
- Given a trained model, when `POST /api/b11/map` gets the tour's query, then it returns one valid `search.mapped` with 54 points and a query point inside the spread of its top 3 (or `approx: true`), and `POST /api/b11/report` returns valid `model.trained` and `proof.search_scored` whose numbers equal `report.json`.
- Given no trained model, or a model whose sha256 doesn't match the report, when either POST is called, then it returns `{ "events": [] }`, and `GET /api/b11/model` says `trained: false` with a `problem`.
- Given a cold server, when `GET /api/b11/model` is called, then it answers in under 200 ms with `warm: false`, and later calls say `warm: true` without any request having waited on the load.
- Given `HF_TOKEN` and `CINDIA_HF_REPO`, when `publish.py` runs, then the repo is private, only model files, the card and the report are uploaded, and `report.json` gets `hubRepo` and `hubRevision`. `fetch_model.py` on a clean folder restores a model that `is_trained()` accepts.
- `npm run test:server` passes, with no model download and no Claude call in any unit test. **G5 for v2** (fix-plan 1.4) passes: `npm run test:server`, a live feature spec where a person's own search in live mode gets a live `search.mapped` from the trained model through B12's adapter, with every event valid, and the scripted tour still passing with `b11-embed` in live mode.

## Out of scope

- Image embeddings (the brief's picture layer comes from the Describer's text, and photos are "if time").
- Training on any real community's, maker's or buyer's data.
- Serving the model to the browser.
- **Plan B if the fine-tune can't finish or doesn't beat base:** serve the base model as `cindia-embed-v0`, labeled "base model, not fine-tuned" in the report and the card, with the honest report. B12 still puts our vectors into Elastic.

## Contract additions needed

FX1 writes these into `docs/v2/contracts.md`. I2-core merges them.
- Section 1: `CINDIA_HF_REPO`, the Hugging Face model repo such as `<user>/cindia-embed-v1`, private, not secret, read through `server/config.py` by `train.py`, `publish.py` and `fetch_model.py`. `HF_TOKEN` is needed for publishing and for fetching the private model on another machine, not only optional.
- Section 5, B11: `GET /api/b11/model` returns `{ trained, warm, modelId, baseModel, dims, fingerprint, problem }`. `report.json` and `vectors.json` carry `modelSha256`, `passagesHash` and `fingerprint` as above. The query embedding rule replaces section 2's "the chips joined with commas": `query: <text>`, then each chip whose words aren't in the text, never a price chip.
- Section 2, `SearchQuery`: "Written by hand" becomes "written separately by our data agent and never used for training", and a marker for queries Gordon wrote or edited if fix-plan 1.5's step happens.
- I2-core: `scripts/server.mjs` starts uvicorn with `HF_HUB_OFFLINE=1` in its environment. `server/config.py` exposes `HF_TOKEN` and `CINDIA_HF_REPO`.
- `tests/demo/beats.ts` (I2-tour T6): `ALLOWED_EMPTY_FALLBACKS` adds `b11-embed` for `search.mapped`, `model.trained` and `proof.search_scored`, and `REQUIRED_SERVICES` has `b11-embed: model`.
- `ModelReport` in `src/core/types.ts` (I2-core) holds what `model.trained` and `proof.search_scored` carry, plus the PCA points, because S3-catalog T9 copies `report.json` and `vectors.json` into it. `report.json`'s other fields stay server-side.
