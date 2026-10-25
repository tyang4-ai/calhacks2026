"""B12 · vibe search and surprise me, on Elastic Serverless with Cindia's own vectors
(docs/plans/B12-search.md).

The Python module B14 and its Indexer use (imported inside their functions):

    from server import b12_search
    b12_search.search(text, keywords, lang, filters, k=12)  # results, engine, modelId, closeMatches
    b12_search.surprise(keyword, method, seed)              # the surprise.drawn payload, no surpriseId
    b12_search.converse(text)                               # { pieceIds, ms } from cindia-finder
    b12_search.index_draft(entry, piece, community, vector) # -> bool, into cindia-drafts
    b12_search.publish(listingId, pieceId)                  # -> bool, the draft into cindia-pieces

Modules: thresholds.py (the numbers), catalog.py (documents from the server's own data), reasons.py,
local.py (the local hybrid and the shared fusion), surprise.py (the exact port of surprise.ts),
elastic.py (REST, the seed, the status cache), agent.py (Agent Builder), engine.py (the wiring).

Importing this package loads no model, starts no thread and calls out to nothing (B2-10).
"""

from __future__ import annotations

from server.b12_search.engine import NotReady, converse, index_draft, publish, search, surprise

__all__ = ["NotReady", "converse", "index_draft", "publish", "search", "surprise"]
