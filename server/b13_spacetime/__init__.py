"""B13-live: the SpacetimeDB database `cindia` (docs/plans/B13-live.md).

- `bridge.py`: the reducer and SQL calls, as the owner, through one ordered background thread.
- `feed.py`: the one poller per server process and its snapshot, which the router answers from.
- `seed.py`: the catalog, orders and approvals payload from `artifacts/mock/mock.json`.
- `save_token.py`: writes the owner's token to `.env` without printing it (run by the orchestrator).

Other upgrades import the bridge inside their functions, so this package never has to load first.
"""
