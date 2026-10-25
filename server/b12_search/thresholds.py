"""B12's numbers in one place (docs/plans/B12-search.md, Thresholds).

- ELASTIC_BUDGET_S: one budget for the whole Elastic part of a search, retries included. When it
  runs out the search goes local (engine `local_hybrid`).
- SEED_BUDGET_S: the whole seed, indices, bulk write, refresh, the agent and its one test
  conversation. BULK_TIMEOUT_S is the bulk write's own timeout inside it.
- CONVERSE_TIMEOUT_S: one Agent Builder conversation.
- CLOSE_MIN: a result is "close" when its closeness reaches this. When no result does, the answer
  carries `closeMatches: false` and the screen says "no close matches".

  Measured on the 50 held-out eval queries with B11's trained model (fingerprint f7181c7ddb90af25),
  by `python server/b12_search/measure_close.py`: each query's best closeness, and how many of its
  graded pieces reach the line, against a few nonsense queries. The measured numbers are written in
  CLOSE_MIN_NOTE below.
"""

from __future__ import annotations

ELASTIC_BUDGET_S = 2.5
SEED_BUDGET_S = 60.0
BULK_TIMEOUT_S = 20.0
# The plan's 6 seconds, raised after measuring: one conversation took 7.1 s with reasoning "none" and
# one tool call (37.5 s with the defaults), on the trial project, 2026-10-24 23:50 PT. The seed's own
# test conversation runs in its background thread and may use up to SEED_CONVERSE_TIMEOUT_S.
CONVERSE_TIMEOUT_S = 9.0
SEED_CONVERSE_TIMEOUT_S = 25.0
# The adapter gives publish 3 seconds and surprise 2, so their Elastic parts get less than a search.
PUBLISH_BUDGET_S = 2.5
SURPRISE_ELASTIC_BUDGET_S = 1.2
# Status: the background refresh's period, and each of its calls' timeout.
STATUS_REFRESH_S = 30.0
STATUS_CALL_TIMEOUT_S = 3.0
# How long the encode may wait for B11's lock inside a search.
ENCODE_WAIT_S = 1.0

CLOSE_MIN = 0.25
CLOSE_MIN_NOTE = (
    "Measured 2026-10-24 23:50 PT with fingerprint f7181c7ddb90af25 on the local hybrid: the 50 eval "
    "queries' best closeness has min 0.119, p10 0.196, median 0.464; six nonsense queries' best is 0.144 to "
    "0.217. At 0.25, 41 of 50 eval queries are close and no nonsense query is. The plan's 0.5 would have "
    "marked 30 of 50 real queries 'no close matches'."
)

# The fusion, the same on both paths (Elastic's rrf retriever and the local one).
SIZE = 12
KNN_K = 24
NUM_CANDIDATES = 100
RANK_CONSTANT = 60
RANK_WINDOW = 50
