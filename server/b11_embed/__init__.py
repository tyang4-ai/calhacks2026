"""B11 · Cindia's own embedding model (docs/plans/B11-embed.md).

Modules:
- data.py: loads and checks B11's data (artifacts/mock/mock.json or the committed snapshot in
  data/mock.json), and writes the snapshot with `python server/b11_embed/data.py --snapshot`.
- compose.py: the one text rule, passages and `query_text(text, chips)`, plus the keyword text.
- bm25.py: the shared tokenizer and a small BM25 (English words, single CJK characters).
- metrics.py: recall@5, MRR@10, reciprocal rank fusion, per-language scores, the paired bootstrap.

Nothing here imports torch or sentence-transformers, and nothing calls out at import time (B2-10).
Only model.py (T6) loads the model, inside its loader.
"""
