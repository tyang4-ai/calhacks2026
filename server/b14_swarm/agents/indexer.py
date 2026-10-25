"""The Indexer (code, tools `embed` and `index_write`): builds the draft's IndexEntry and its passage
by B11's rule, embeds it and writes it into `cindia-drafts` with B12's `index_draft()`, so a draft is
never searchable before the owner approves it. It runs only after the Checker.

The draft's piece is `pc_user_<tag>_<n>`. `listing.indexed` (index `cindia-drafts`, its `pieceId`,
`modelId` and `embedText`, and the map dot when B11 can place it) follows only when the write
succeeded. Otherwise the step says why, and nothing claims the draft is searchable.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Optional

from server.b14_swarm import data
from server.b14_swarm.agents import ListingContext
from server.b14_swarm.steps import PendingStep, Stopwatch, summary

log = logging.getLogger("cindia.b14")

AGENT = "indexer"


@dataclass
class Indexed:
    piece_id: str
    payload: Optional[dict[str, Any]]  # the listing.indexed payload, or None when nothing was written


def model_id() -> Optional[str]:
    try:
        from server.b11_embed import model

        mid = (model.read_report() or {}).get("modelId")
        if isinstance(mid, str) and mid:
            return mid
    except Exception as exc:
        log.info("b14 indexer: no model report (%s)", type(exc).__name__)
    mid = data.mock().get("modelId")
    return mid if isinstance(mid, str) and mid else None


def piece_and_entry(ctx: ListingContext, piece_id: str, vibe: dict[str, list[str]]) -> tuple[dict[str, Any], dict[str, Any]]:
    job, d = ctx.job, ctx.draft
    com = job.community
    piece = {
        "id": piece_id,
        "title": {"en": d.title, "zh": d.title},
        "makerId": job.maker_id,
        "communityId": com.get("id"),
        "priceCents": 0,
        "story": {"en": d.summary, "zh": d.summary},
        "facets": d.facets,
        "vibe": {k: list(vibe.get(k) or []) for k in ("moods", "occasions", "recipients")},
    }
    slug = com.get("slug") if isinstance(com.get("slug"), str) else ""
    provenance = {"facts": "maker", "culture": "community", "vibe": "agent:tagger"}
    note = {"en": "", "zh": ""}
    if ctx.picture is not None:
        provenance["picture"] = "agent:describer"
        note = {"en": ctx.picture.note, "zh": ctx.picture.note}
    entry = {
        "pieceId": piece_id,
        "communityId": com.get("id"),
        "makerId": job.maker_id,
        "storefrontSlug": slug,
        "provenance": provenance,
        "approvedBy": job.maker_id,
        "pictureNote": note,
        "salesThisMonth": 0,
        "status": "draft",
    }
    return piece, entry


def run(ctx: ListingContext, vibe: dict[str, list[str]]) -> tuple[Indexed, list[PendingStep]]:
    piece_id = ctx.ids.next("pc")
    piece, entry = piece_and_entry(ctx, piece_id, vibe)
    w = Stopwatch()
    result = ctx.box.use(AGENT, "index_write", entry=entry, piece=piece, community=ctx.job.community)
    ms = w.ms()
    mid = model_id()
    if not isinstance(result, dict) or result.get("status") != "found" or not result.get("embedText") or not mid:
        reason = (result or {}).get("reason") if isinstance(result, dict) else None
        reason = reason if reason in ("unavailable", "error", "invalid") else "unavailable"
        return Indexed(piece_id, None), [PendingStep(AGENT, "result", summary("indexer.not_indexed", reason=reason), tool="index_write", ms=ms)]
    payload: dict[str, Any] = {
        "listingId": ctx.job.listing_id,
        "pieceId": piece_id,
        "modelId": mid,
        "embedText": result["embedText"],
        "index": "cindia-drafts",
    }
    if isinstance(result.get("point"), dict):
        payload["point"] = result["point"]
        payload["approx"] = bool(result.get("approx"))
    return Indexed(piece_id, payload), [PendingStep(AGENT, "result", summary("indexer.indexed", piece=piece_id), tool="index_write", ms=ms)]
