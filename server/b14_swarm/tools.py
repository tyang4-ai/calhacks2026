"""The records each side may see, and the tools that read them (B14-swarm.md, "Records per side" and
"Tools"; B2-17, A2-14).

`side` in a request is a UI hint, not an access boundary, so the server enforces it here:

- **Buyer:** the pieces, communities, policy, index entries and the roster, the makers of the pieces
  in `contextIds` (and a maker whose page is on screen), and only the orders in `contextIds`, without
  any person's ID or name. No payouts, maker payouts, maker statements, flags or other people.
- **Seller:** all of that, plus every order, the payouts, the maker payouts, the maker statements
  and the flags (the co-op's own books, which the Bookkeeper reads).

`scope_records()` drops everything else before any agent sees it. Each tool reads only the scoped
records, or calls a sibling upgrade's module imported inside the function, and returns plain data,
never prose. `Toolbox.use(agent_id, tool, ...)` asks `roster.allowed()` first and raises
ToolNotAllowed otherwise. `arrival_window` is the one tool the run calls as code (`Toolbox.code()`),
so the Clerk's roster tools stay `order_lookup` and `policy` (D1-41).
"""

from __future__ import annotations

import datetime as dt
import logging
import re
from typing import Any, Iterable, Optional

from server.b14_swarm import data, roster

log = logging.getLogger("cindia.b14")

BUYER_KEYS = ("pieces", "communities", "policy", "searchIndex", "agents", "makers", "orders")
SELLER_KEYS = BUYER_KEYS + ("payouts", "makerPayouts", "makerStatements", "flags")
# Fields of an order that name or point at a person. A buyer never sees them.
PERSON_FIELDS = frozenset({"buyerId", "buyer", "buyerName", "name", "email", "phone", "address", "customerId", "customer"})
ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
# The order whose date is the demo's buying day (src/mock/swarm.ts reads the same one for run_01).
DEMO_ORDER_ID = "ord_001"
# How long the Indexer waits for B11's encode lock.
ENCODE_WAIT_S = 2.0

# L17, word for word (contracts section 12).
L17 = {"en": "I can only look up the order on your screen.", "zh": "我只能查询您屏幕上的这笔订单。"}


def _id_of(item: Any, key: str = "id") -> Optional[str]:
    if isinstance(item, dict) and isinstance(item.get(key), str):
        return item[key]
    return None


def _list(value: Any) -> list[dict[str, Any]]:
    return [x for x in value if isinstance(x, dict)] if isinstance(value, list) else []


def scope_records(records: Any, side: str, context_ids: Iterable[str]) -> dict[str, Any]:
    """The records the side may see, as plain lists. Unknown keys and the rest are dropped."""
    raw = records if isinstance(records, dict) else {}
    ctx = {c for c in context_ids or [] if isinstance(c, str)}
    keys = SELLER_KEYS if side == "seller" else BUYER_KEYS
    out: dict[str, Any] = {k: _list(raw.get(k)) for k in keys}
    if side != "seller":
        context_pieces = [p for p in out["pieces"] if _id_of(p) in ctx]
        maker_ids = {p.get("makerId") for p in context_pieces} | {c for c in ctx if c.startswith("mkr_")}
        out["makers"] = [m for m in out["makers"] if _id_of(m) in maker_ids]
        out["orders"] = [{k: v for k, v in o.items() if k not in PERSON_FIELDS} for o in out["orders"] if _id_of(o) in ctx]
    demo = raw.get("demoDate")
    if isinstance(demo, str) and ISO_DATE.match(demo):
        out["demoDate"] = demo
    return out


class Records:
    """Read-only lookups over scoped records. `raw` is the scoped dict."""

    def __init__(self, scoped: dict[str, Any], side: str, context_ids: Iterable[str]):
        self.raw = scoped
        self.side = side
        self.context_ids = [c for c in context_ids or [] if isinstance(c, str)]
        self._by: dict[str, dict[str, dict[str, Any]]] = {}
        for key in ("pieces", "communities", "policy", "makers", "orders", "payouts", "makerPayouts", "makerStatements", "flags"):
            self._by[key] = {i: x for x in scoped.get(key, []) if (i := _id_of(x))}

    @classmethod
    def build(cls, records: Any, side: str, context_ids: Iterable[str]) -> "Records":
        return cls(scope_records(records, side, context_ids), side, context_ids)

    def get(self, key: str, record_id: Optional[str]) -> Optional[dict[str, Any]]:
        if not isinstance(record_id, str):
            return None
        return self._by.get(key, {}).get(record_id)

    def piece(self, piece_id: Optional[str]) -> Optional[dict[str, Any]]:
        return self.get("pieces", piece_id)

    def community(self, community_id: Optional[str]) -> Optional[dict[str, Any]]:
        return self.get("communities", community_id)

    def maker(self, maker_id: Optional[str]) -> Optional[dict[str, Any]]:
        return self.get("makers", maker_id)

    def order(self, order_id: Optional[str]) -> Optional[dict[str, Any]]:
        return self.get("orders", order_id)

    def topic(self, topic_id: Optional[str]) -> Optional[dict[str, Any]]:
        return self.get("policy", topic_id)

    def ids(self, key: str) -> list[str]:
        return list(self._by.get(key, {}))

    def all(self, key: str) -> list[dict[str, Any]]:
        return list(self._by.get(key, {}).values())

    def context(self, prefix: str) -> list[str]:
        """The IDs on screen with this prefix (`pc_`, `ord_`, `mkr_`, `com_`), in order."""
        return [c for c in self.context_ids if c.startswith(prefix)]

    def maker_payout(self, maker_id: str) -> Optional[dict[str, Any]]:
        return next((m for m in self.all("makerPayouts") if m.get("makerId") == maker_id), None)

    def maker_statement(self, maker_id: str) -> Optional[dict[str, Any]]:
        return next((m for m in self.all("makerStatements") if m.get("makerId") == maker_id), None)

    def demo_date(self) -> Optional[str]:
        """The demo's buying day, from the records, never the wall clock: the request's `demoDate`,
        else the demo order's date in the mock data."""
        d = self.raw.get("demoDate")
        if isinstance(d, str) and ISO_DATE.match(d):
            return d
        for o in data.mock().get("orders") or []:
            if isinstance(o, dict) and o.get("id") == DEMO_ORDER_ID and isinstance(o.get("date"), str):
                return o["date"] if ISO_DATE.match(o["date"]) else None
        return None


def _date(iso: str) -> dt.date:
    return dt.date.fromisoformat(iso)


def unknown(reason: str) -> dict[str, Any]:
    return {"status": "unknown", "reason": reason}


class Toolbox:
    """The tools, over one request's scoped records."""

    def __init__(self, records: Records):
        self.records = records

    def use(self, agent_id: str, tool: str, **kwargs: Any) -> Any:
        """Calls `tool` for `agent_id`. Raises ToolNotAllowed unless the roster allows it."""
        roster.require(agent_id, tool)
        fn = getattr(self, f"_tool_{tool}", None)
        if fn is None:
            raise roster.ToolNotAllowed(f"{tool} isn't a swarm tool")
        return fn(**kwargs)

    def code(self, tool: str, **kwargs: Any) -> Any:
        """A tool the run calls as code (roster.CODE_TOOLS), on no model's choice."""
        if tool not in roster.CODE_TOOLS:
            raise roster.ToolNotAllowed(f"{tool} isn't called as code")
        return getattr(self, tool)(**kwargs)

    # --- the records ------------------------------------------------------------------------

    def _tool_community_page(self, communityId: str) -> dict[str, Any]:
        c = self.records.community(communityId)
        if c is None:
            return unknown("not_found")
        keep = ("id", "name", "people", "place", "craft", "about", "protocols", "verification", "makerIds", "storefrontId", "projectIds")
        return {"status": "found", **{k: c[k] for k in keep if k in c}}

    def _tool_verification_record(self, communityId: str, makerId: Optional[str] = None) -> dict[str, Any]:
        c = self.records.community(communityId)
        if c is None or not isinstance(c.get("verification"), dict):
            return unknown("not_found")
        v = c["verification"]
        makers = c.get("makerIds") if isinstance(c.get("makerIds"), list) else []
        return {
            "status": "found",
            "communityId": communityId,
            "method": v.get("method"),
            "by": v.get("by"),
            "note": v.get("note"),
            "makerId": makerId,
            "makerInCommunity": bool(makerId) and makerId in makers,
        }

    def _tool_order_lookup(self, orderId: str) -> dict[str, Any]:
        """The order, its payout and its receipt state. On the buyer side only an order on screen,
        never a person's name or ID. Any other order gets L17."""
        r = self.records
        o = r.order(orderId)
        if r.side != "seller" and (o is None or orderId not in r.context_ids):
            return {"status": "out_of_scope", "reply": dict(L17)}
        if o is None:
            return unknown("not_found")
        out = {
            "status": "found",
            "orderId": orderId,
            "pieceId": o.get("pieceId"),
            "channelId": o.get("channelId"),
            "date": o.get("date"),
            "grossCents": o.get("grossCents"),
            "receipt": o.get("status"),
        }
        if r.side == "seller":
            payout = next((p for p in r.all("payouts") if orderId in (p.get("orderIds") or [])), None)
            if payout is not None:
                out["payout"] = {"payoutId": payout.get("id"), "date": payout.get("date")}
        return {k: v for k, v in out.items() if k not in PERSON_FIELDS}

    def _tool_policy(self, topicId: str) -> dict[str, Any]:
        t = self.records.topic(topicId)
        if t is None:
            return unknown("not_found")
        return {"status": "found", "id": topicId, "title": t.get("title"), "body": t.get("body"), "data": dict(t.get("data") or {})}

    # --- sibling upgrades, imported inside the function -------------------------------------

    def _tool_cindia_search(self, text: str, keywords: Optional[list[str]] = None, filters: Optional[dict[str, Any]] = None,
                            lang: str = "en") -> dict[str, Any]:
        try:
            from server import b12_search  # type: ignore[attr-defined]
        except Exception:
            return unknown("unavailable")
        try:
            result = b12_search.search(text, keywords or [], lang, filters or {})
        except b12_search.NotReady:
            # B11's model isn't warm yet: B12's own keyword half, with its code-built reasons.
            return self._keyword_only(text, keywords or [], filters or {})
        except Exception as exc:
            log.info("b14 tool cindia_search failed (%s)", type(exc).__name__)
            return unknown("error")
        return {"status": "found", **result} if isinstance(result, dict) else unknown("invalid")

    @staticmethod
    def _keyword_only(text: str, keywords: list[str], filters: dict[str, Any]) -> dict[str, Any]:
        try:
            from server.b12_search import catalog, local

            cat = catalog.get()
            flt = local.Filters.of(keywords, filters)
            allowed = {pid for pid in cat.active_ids() if flt.allows(cat.docs[pid])}
            ids = local.keyword_index(cat).hits(local.keyword_query(text, keywords), allowed)
            ranked = [(pid, 1.0 / (i + 1)) for i, pid in enumerate(ids)]
            results, _ = local.results(ranked, cat.docs, keywords, cat.aliases, {}, None)
        except Exception as exc:
            log.info("b14 tool cindia_search keyword half failed (%s)", type(exc).__name__)
            return unknown("error")
        return {"status": "found", "results": results, "closeMatches": False, "engine": "keyword_only"}

    def _tool_elastic_agent(self, text: str) -> dict[str, Any]:
        try:
            from server import b12_search  # type: ignore[attr-defined]
        except Exception:
            return unknown("unavailable")
        try:
            result = b12_search.converse(text)
        except Exception as exc:
            log.info("b14 tool elastic_agent failed (%s)", type(exc).__name__)
            return unknown("error")
        ids = result.get("pieceIds") if isinstance(result, dict) else None
        if not isinstance(ids, list):
            return unknown("invalid")
        return {"status": "found", "pieceIds": [i for i in ids if isinstance(i, str)], "ms": result.get("ms")}

    def _tool_embed(self, texts: list[str]) -> dict[str, Any]:
        try:
            from server.b11_embed import model
        except Exception:
            return unknown("unavailable")
        try:
            return {"status": "found", "vectors": model.encode_passages(list(texts))}
        except Exception as exc:
            log.info("b14 tool embed failed (%s)", type(exc).__name__)
            return unknown("error")

    def _tool_index_write(self, entry: dict[str, Any], piece: dict[str, Any], community: dict[str, Any]) -> dict[str, Any]:
        """B11's passage rule and vector, then B12's index_draft() into cindia-drafts."""
        try:
            from server import b12_search  # type: ignore[attr-defined]
            from server.b11_embed import compose, model
        except Exception:
            return unknown("unavailable")
        if not model.is_warm():
            model.start_warmup()  # B11 loads in the background, so the next draft can be indexed
            return unknown("unavailable")
        try:
            passage = entry.get("embedText") if isinstance(entry.get("embedText"), str) and entry.get("embedText") else compose.passage_text(piece, community)
            vector = model.encode_passages([passage], timeout=ENCODE_WAIT_S)[0]
            ok = b12_search.index_draft({**entry, "embedText": passage}, piece, community, vector)
        except Exception as exc:
            log.info("b14 tool index_write failed (%s)", type(exc).__name__)
            return unknown("error")
        if not ok:
            return {"status": "unknown", "reason": "unavailable", "embedText": passage}
        out: dict[str, Any] = {"status": "found", "embedText": passage}
        try:
            x, y, approx = model.project(vector)
            out["point"] = {"x": round(float(x), 4), "y": round(float(y), 4)}
            out["approx"] = bool(approx)
        except Exception as exc:  # the map dot is optional
            log.info("b14 tool index_write: no map point (%s)", type(exc).__name__)
        return out

    # --- called as code ---------------------------------------------------------------------

    def arrival_window(self, pieceId: str, fromDate: Optional[str] = None) -> dict[str, Any]:
        """Earliest and latest arrival from the piece's lead time and the shipping topic's transit
        days, counted from the demo date in the records (never the wall clock)."""
        p = self.records.piece(pieceId)
        start = fromDate or self.records.demo_date()
        shipping = next((t for t in self.records.all("policy") if isinstance(t.get("data"), dict)
                         and "transitDaysMin" in t["data"] and "transitDaysMax" in t["data"]), None)
        if p is None or shipping is None or not isinstance(start, str) or not ISO_DATE.match(start):
            return unknown("not_found")
        facets = p.get("facets") if isinstance(p.get("facets"), dict) else {}
        lead, lo, hi = facets.get("leadTimeDays"), shipping["data"].get("transitDaysMin"), shipping["data"].get("transitDaysMax")
        if not all(isinstance(x, int) and not isinstance(x, bool) and x >= 0 for x in (lead, lo, hi)) or lo > hi:
            return unknown("invalid")
        ship_by = _date(start) + dt.timedelta(days=lead)
        return {
            "status": "found",
            "pieceId": pieceId,
            "policyId": shipping.get("id"),
            "fromDate": start,
            "leadTimeDays": lead,
            "transitDaysMin": lo,
            "transitDaysMax": hi,
            "shipBy": ship_by.isoformat(),
            "earliest": (ship_by + dt.timedelta(days=lo)).isoformat(),
            "latest": (ship_by + dt.timedelta(days=hi)).isoformat(),
        }
