"""The `seed_catalog` payload from the server's own `artifacts/mock/mock.json` (B13-live T4).

`npm run export:mock` writes that file from `src/mock/`. When it's missing (a fresh checkout), B11's
committed snapshot `server/b11_embed/data/mock.json` is read instead. The payload never comes from a
request:

    { "catalog":   [{ piece_id, community_id, maker_id, title_en, title_zh, community_en, maker_name, price_cents, status }],
      "orders":    [{ order_id, piece_id, channel_id, gross_cents, date, origin }],
      "approvals": [{ approval_id, kind, subject_ids, amount_cents, status }] }

It holds the 54 pieces with their own titles, the scripted orders and the scripted approvals
(`allApprovals`, apr_01 to apr_05): IDs, kinds, statuses, amounts and the catalog's titles, never a
story, a note or a person's words. The module's README gives the shape it checks.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Optional

from server import config

MOCK_PATH = config.REPO_ROOT / "artifacts" / "mock" / "mock.json"
SNAPSHOT_PATH = config.REPO_ROOT / "server" / "b11_embed" / "data" / "mock.json"
TEXT_MAX = 160
APPROVAL_STATUSES = ("pending", "granted", "declined")
_CONTROL = re.compile(r"[\x00-\x1f\x7f-\x9f]")


class SeedDataMissing(Exception):
    """mock.json is missing or doesn't hold the catalog."""


def _clip(value: Any) -> str:
    text = value if isinstance(value, str) else ""
    return _CONTROL.sub(" ", text)[:TEXT_MAX]


def _text(value: Any, lang: str) -> str:
    return _clip(value.get(lang)) if isinstance(value, dict) else _clip(value)


def _cents(value: Any) -> int:
    return int(value) if isinstance(value, (int, float)) and not isinstance(value, bool) and value >= 0 else 0


def load_mock(path: Optional[Path] = None) -> dict[str, Any]:
    """mock.json as a dict: `path`, or artifacts/mock/mock.json, or else B11's committed snapshot."""
    if path is not None:
        p = Path(path)
    else:
        p = MOCK_PATH if MOCK_PATH.is_file() else SNAPSHOT_PATH
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise SeedDataMissing(f"mock.json can't be read ({type(exc).__name__})") from None
    if not isinstance(data, dict) or not isinstance(data.get("pieces"), list):
        raise SeedDataMissing("mock.json holds no pieces")
    return data


def build_payload(mock: dict[str, Any]) -> dict[str, Any]:
    """The seed_catalog payload from a mock.json dict."""
    communities = {c.get("id"): c for c in mock.get("communities") or [] if isinstance(c, dict)}
    makers: dict[str, Any] = {}
    for group in ("people", "allMakers", "makers"):
        for person in mock.get(group) or []:
            if isinstance(person, dict) and isinstance(person.get("id"), str):
                makers.setdefault(person["id"], person)

    catalog = []
    for piece in mock.get("pieces") or []:
        if not isinstance(piece, dict) or not isinstance(piece.get("id"), str):
            continue
        community = communities.get(piece.get("communityId")) or {}
        maker = makers.get(piece.get("makerId")) or {}
        catalog.append({
            "piece_id": piece["id"],
            "community_id": _clip(piece.get("communityId")),
            "maker_id": _clip(piece.get("makerId")),
            "title_en": _text(piece.get("title"), "en"),
            "title_zh": _text(piece.get("title"), "zh"),
            "community_en": _text(community.get("name"), "en"),
            "maker_name": _text(maker.get("name"), "en"),
            "price_cents": _cents(piece.get("priceCents")),
            "status": "active",
        })

    orders = []
    for order in mock.get("orders") or []:
        if not isinstance(order, dict) or not isinstance(order.get("id"), str):
            continue
        orders.append({
            "order_id": order["id"],
            "piece_id": _clip(order.get("pieceId")),
            "channel_id": _clip(order.get("channelId")),
            "gross_cents": _cents(order.get("grossCents")),
            "date": _clip(order.get("date")),
            "origin": "person" if order["id"].startswith("ord_user_") else "mock",
        })

    approvals = []
    for approval in mock.get("allApprovals") or mock.get("approvals") or []:
        if not isinstance(approval, dict) or not isinstance(approval.get("id"), str):
            continue
        status = approval.get("status")
        approvals.append({
            "approval_id": approval["id"],
            "kind": _clip(approval.get("kind")),
            "subject_ids": [s for s in approval.get("subjectIds") or [] if isinstance(s, str)],
            "amount_cents": _cents(approval.get("amountCents")),
            "status": status if status in APPROVAL_STATUSES else "pending",
        })

    return {"catalog": catalog, "orders": orders, "approvals": approvals}


def payload_from_file(path: Optional[Path] = None) -> dict[str, Any]:
    return build_payload(load_mock(path))
