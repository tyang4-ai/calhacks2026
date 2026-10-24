# B11-embed · Cindia's own embedding model

Priority: P0 · Wave: V2 · Depends on: I2-core (code, and `npm run export:mock`), S3-catalog (training data) · Folder: `server/b11_embed/` · Source key: `b11-embed` · Makes real: the search proof, the embedding map, every vector B12 and B15 use · Estimate: 3 h, plus the training run

**SCOPE:** `server/routers/b11_embed.py, server/b11_embed/, src/sources/live/b11-embed.ts, tests/server/test_b11_embed.py, tests/server/b11_fixture.json`

## Goal

A sentence-embedding model fine-tuned on Cindia's catalog, so "something soft and hopeful for my mom who gardens" lands on the peony fan, the floral shawl and the flower pouch, and not just on pieces that share the words. It's tested on hand-written queries it never saw, scored against keyword search, the untuned base model and a hybrid, and every number in the proof comes from that run. Anthropic, Visa and Hyphenate judges all ask how we know it works. This is how.

## Read first

- `docs/v2/contracts.md`:
  - section 1 (`CINDIA_MODEL_DIR`, `HF_TOKEN`, the hosts),
  - section 2 (IndexEntry, the passage rule, SearchQuery, figure 15),
  - section 3 (`search.mapped`, `model.trained`, `proof.search_scored`),
  - section 5 (B11).
  
  After I2-core: `docs/common/api-contract.md` B11, `events.md` and `data-model.md`.
- `docs/v2/brief.md`, "Search and the index"
- `docs/plans/S3-catalog.md`: the index entries, the eval set and T9, which copies your report into `src/mock/model.ts`
- `docs/common/api-contract.md`, "Rules for every endpoint", and the Upgrade checklist in `docs/common/definition-of-done.md`
- `.claude/rules/backend.md`, `docs/harness/lessons.md`
- The sentence-transformers training docs (v3 and later, `SentenceTransformerTrainer`) and the `intfloat/multilingual-e5-small` model card. Fetch them if they aren't in the vault docs folder.

## Interfaces

- **Input data:** `artifacts/mock/mock.json`, written by `npm run export:mock` (I2-core) from `src/mock/`, with one key per non-function export and `_generatedAt`. B11 reads `pieces`, `communities`, `searchIndex` and `searchEval` from it. Run the export before training. `data.py` fails with one clear line if the file is missing or incomplete (its `searchIndex` count isn't 54), and logs `_generatedAt`.
- **Base model:** `intfloat/multilingual-e5-small`, 384 dimensions, downloaded from `huggingface.co`. If the download is blocked, the report says `blocked: base model download` and the upgrade is `blocked` under Needs Gordon (the network setting). A replacement model is allowed only if it also trains on CPU, and the report says why.
- **Text in:** passages are the IndexEntry's `embedText` as it is (it already starts `passage: `). Queries are `query: ` followed by the person's words and the chips joined with commas (the contracts rule). Every vector is L2-normalized, so cosine is a dot product.
- **Training script:** `python server/b11_embed/train.py`, run as task T5. The steps:
  1. Load the data.
  2. Build or load the training pairs.
  3. Fine-tune.
  4. Evaluate the four systems.
  5. Fit the 2D map.
  6. Write the outputs.
  7. Optionally publish.

  Seeded (`--seed 13`), CPU friendly: batch 32, 3 epochs, learning rate 2e-5, 10% warmup, max sequence length 256. It prints one progress line per epoch and no data.
- **Outputs:**
  - `CINDIA_MODEL_DIR` (default `models/cindia-embed-v1/`, not committed) holds the fine-tuned model.
  - `server/b11_embed/report.json` (committed):
    ```json
    { "modelId": "cindia-embed-v1", "baseModel": "intfloat/multilingual-e5-small", "dims": 384,
      "pairs": 1080, "epochs": 3, "seed": 13, "pairSource": "claude | template", "hubUrl": null,
      "eval": { "k": 5, "queries": 50,
        "systems": [ { "system": "keyword", "recallAtK": 0.0, "mrr": 0.0 }, { "system": "base", ... }, { "system": "custom", ... }, { "system": "hybrid", ... } ] },
      "notes": ["..."] }
    ```
  - `server/b11_embed/vectors.json` (committed): `{ "modelId", "dims", "pca": { "mean": [...], "components": [[...], [...]], "scale": number }, "pieces": [ { "pieceId", "vector": [...], "x", "y" } ] }`, vectors and coordinates rounded to 5 decimals.
  - `server/b11_embed/pairs.jsonl` (committed): one training pair per line, `{ "query", "lang", "voice", "pieceId", "negativeId" }`, so anyone can audit what the model learned from.
- **Metrics:**
  - `recallAtK` is the mean over the 50 eval queries of (graded pieces in the top 5) / min(5, graded pieces), counting grades 1 and 2.
  - `mrr` is the mean reciprocal rank of the first grade-2 piece within the top 10, or 0 when there is none.
  - Systems:
    - `keyword` is BM25 over `embedText` and the facet words,
    - `base` is the untuned model,
    - `custom` is the fine-tuned model,
    - `hybrid` is reciprocal rank fusion of `custom` and `keyword` with constant 60.
- **Endpoints** (`server/routers/b11_embed.py`, `router = APIRouter(prefix="/api/b11")`, no key needed):
  - `GET /api/b11/model` returns `{ "trained", "modelId", "baseModel", "dims" }`, read from `report.json` and the model directory. `trained` is true only when both exist. This isn't an events response.
  - `POST /api/b11/report` `{ "trigger" }` returns `model.trained` and `proof.search_scored` built from `report.json`, under 1 second, or `[]` when there's no report.
  - `POST /api/b11/map` `{ "trigger", "queryId", "text", "keywords" }` embeds the query with the fine-tuned model, projects it with the stored PCA (never refitted per request), and returns one `search.mapped`: every piece's point, the query's point, `method: "pca"`, and `approx` left unset because the points are real. Under 2 seconds once the model is warm. It returns `[]` when there's no trained model.
- **Events:** `source: "live"`, `key: "b11-embed"`, IDs `evt_live_` from a counter starting at 1100001, `at` copied from the trigger or 0.
- **Python module for other upgrades** (`server/b11_embed/model.py`): `is_trained()`, `encode_queries(texts) -> list[list[float]]`, `encode_passages(texts)`, `piece_vectors() -> dict[pieceId, list[float]]`, `project(vector) -> (x, y)`. Lazy-loaded once per process, thread-safe. B12 and B15 import these. `server/b11_embed/bm25.py` (a small BM25 with English lowercasing and per-character CJK tokens) is shared the same way.
- **Adapter** (`src/sources/live/b11-embed.ts`, default export a `LiveAdapter`):
  - `health()`: `GET /api/health` lists `b11` and `services.model` is true, then `GET /api/b11/model` says `trained`.
  - `produce(event, state)`:
    - On a keyed `model.trained` or `proof.search_scored` (the tour's `d13-proof`): post `/api/b11/report` once, cache it, and return the event of the same type.
    - On a keyed `search.mapped` (the tour's `d01-vibe`): post `/api/b11/map` with the `queryId` from the trigger, and the text and keywords of that query's `search.queried` in the store.
    - Anything else: `[]`.
    - Every fetch aborts at 7.5 seconds.
- **Python dependencies:**
  - Inference needs `sentence-transformers`, `torch` and `numpy` in `server/requirements.txt`. I2-core maintains that file with `--extra-index-url https://download.pytorch.org/whl/cpu`, so torch comes as the CPU wheel and not gigabytes of GPU libraries.
  - Training adds `datasets` and `accelerate`, pinned in `server/b11_embed/requirements-train.txt`, which the orchestrator installs into `.venv`.
- **Live tests** use `needs_service("model")` and `needs_key(...)` from `tests/server/conftest.py`.

## Tasks

One backend-builder does these in order. Each task adds its own tests to `tests/server/test_b11_embed.py` and ends with them passing.

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | `data.py` (load and check `mock.json`) and `compose.py` (the passage and query rules). The test rebuilds every `embedText` in a 3-piece fixture and, when `mock.json` exists, all 54, and compares them | `server/b11_embed/__init__.py`, `server/b11_embed/data.py`, `server/b11_embed/compose.py`, `tests/server/b11_fixture.json`, `tests/server/test_b11_embed.py` | none | sonnet |
| T2 | `bm25.py` and `metrics.py` (recall at k, MRR, RRF) with tests on a toy set whose answers are worked out by hand | `server/b11_embed/bm25.py`, `server/b11_embed/metrics.py` | T1 | sonnet |
| T3 | `pairs.py`: Claude writes the training queries, with a template fallback and the eval-leak guard (below), tested with a fake Anthropic client | `server/b11_embed/pairs.py` | T1 | opus |
| T4 | `train.py`, `evaluate.py` and `pca.py`: fine-tune, score the four systems, fit the map, write the outputs. A smoke test runs the whole pipeline on the 3-piece fixture with a tiny fake encoder, so CI never downloads a model | `server/b11_embed/train.py`, `server/b11_embed/evaluate.py`, `server/b11_embed/pca.py`, `server/b11_embed/requirements-train.txt` | T2, T3 | opus |
| T5 | The training run: `npm run export:mock`, then `python server/b11_embed/pairs.py`, then `python server/b11_embed/train.py`. Commit-ready outputs and the report's numbers in your REPORT block | `server/b11_embed/report.json`, `server/b11_embed/vectors.json`, `server/b11_embed/pairs.jsonl` | T4, S3-catalog green | opus |
| T6 | `model.py` (lazy inference, project) and the three endpoints, with TestClient tests using a fake model | `server/b11_embed/model.py`, `server/routers/b11_embed.py` | T4 | opus |
| T7 | The live adapter | `src/sources/live/b11-embed.ts` | T6 | sonnet |
| T8 | The model card and the optional Hugging Face publish (`publish.py`, which refuses to run without `HF_TOKEN` and pushes the model and the card to the repo name in `report.json`, then writes `hubUrl` back) | `server/b11_embed/README.md`, `server/b11_embed/publish.py` | T5 | sonnet |

### T3 · Training pairs

- For each of the 54 pieces, one `client.messages.parse()` call to `claude-sonnet-5-5`, through the server config's key. The output model holds:
  - `queries`: exactly 20 items of `{ text, lang: "en" | "zh", voice }`, where `voice` is one of `mood`, `occasion`, `recipient`, `looks`, `material`, `craft_term`, `short`, `long` and `misspelled`, about a fifth of them Chinese,
  - `hard_negative_ids`: two to four other piece IDs a careless search would confuse with this one (the same object from another craft, the same motif on another object).
- The prompt gives the piece's IndexEntry fields, its community's craft line and the list of other pieces' titles and objects. It says to write as a buyer would, with no facts beyond the record, and never to quote the title whole.
- **Server checks:**
  - every negative exists and isn't the piece,
  - at least 3 Chinese queries,
  - no query longer than 200 characters.
  
  A failed check retries that piece once, then it falls back to templates.
- **Template fallback** (`--source template`, or no Anthropic key): for each piece, 20 queries built from its facets and vibe with fixed English and Chinese patterns ("something {mood} for my {recipient}", "{color} {object}", "{material} {object} from {place}" and so on), plus negatives chosen by shared object or motif. The report's `pairSource` says which source built the pairs.
- **Eval-leak guard:** drop any generated query whose normalized text (lowercase, punctuation stripped, spaces collapsed) equals an eval query's, or shares at least 80% of its tokens with one. The test proves an eval query planted in fake output never reaches `pairs.jsonl`.
- Pairs are written with each anchor once per positive, and each line's `negativeId` is one of that query's hard negatives, cycled.

### T4 · Training and evaluation

- **Training:** `SentenceTransformerTrainer` with `MultipleNegativesRankingLoss` on (query, positive passage, hard-negative passage) triplets, the hyperparameters in Interfaces, everything seeded (Python, NumPy, torch). 10% of pieces' queries are held out as a dev split, and the report's notes give the dev recall too.
- **Evaluation:** encode all 54 passages once per system, rank the 50 eval queries, and compute the metrics exactly as defined. `hybrid` fuses the `custom` and `keyword` rankings.
- **Map:** PCA by SVD on the centered custom vectors. `scale` maps the points into -1 to 1. A query is projected with the same mean and components, then clipped to -1.2 to 1.2.
- **Honesty:** every number in `report.json` comes from this run. If the custom model doesn't beat `base`, the report says so in `notes`, and nothing rounds it in our favor.

### T5 · The run

Run it once the S3-catalog data is green. It's one agent for the concurrency cap and takes the CPU, so the orchestrator runs nothing heavy beside it. Paste the four systems' numbers into the REPORT block. Then the orchestrator spawns the data-smith for S3-catalog T9.

## Acceptance

- Given `artifacts/mock/mock.json`, when the test rebuilds the passages, then all 54 equal `searchIndex`'s `embedText`.
- Given a fake Claude that returns an eval query among its outputs, when `pairs.py` runs, then that query isn't in `pairs.jsonl`.
- Given the toy set, when the metrics run, then recall at 5, MRR and RRF match the hand-worked values.
- Given the training run, when it finishes, then `report.json` has all four systems from this run, `vectors.json` has 54 pieces with 384-number vectors and points in range, and the model directory exists.
- Given a trained model, when `POST /api/b11/map` gets the tour's query, then it returns one valid `search.mapped` with 54 points and a query point, and `POST /api/b11/report` returns valid `model.trained` and `proof.search_scored` whose numbers equal `report.json`.
- Given no trained model, when either POST is called, then it returns `{ "events": [] }`, and `GET /api/b11/model` says `trained: false`.
- `npm run test:server` passes, with no model download in any test. G5 for `b11` passes: the tour in live mode shows `b11-embed` live for `search.mapped` and the two proof events.

## Out of scope

- Image embeddings (the brief's picture layer comes from the Describer's text for now).
- Training on any real community's data.
- A GPU path. If one is there, `train.py` may use it, but CPU is the default.
- Serving the model to the browser.

## Contract additions needed

- `server/requirements.txt` lists `sentence-transformers`, `torch` and `numpy` (I2-core, beside the CPU index line section 11 already gives it).
- `ModelReport` in `src/core/types.ts` (I2-core) holds what `model.trained` and `proof.search_scored` carry, plus the PCA points, because S3-catalog T9 copies `report.json` and `vectors.json` into it. `report.json`'s extra fields (`seed`, `pairSource`, `notes`) stay server-side.
