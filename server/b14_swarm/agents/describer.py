"""The Describer (`claude-sonnet-5-5`, tool `image`): says what's visible in the listing's picture, in
plain shape and color words. It runs only when the request carries an image (PNG or JPEG, checked by
its magic bytes in the router), and no step claims it ran when there's none.

The server's checks after the call: plain visual words only, never a meaning or a named motif, so
`content_check()` must pass on everything it wrote, against the maker's own community. A failed
check leaves the note out. Its colors join the draft's colors; the rest becomes the index entry's
`pictureNote`, written in English (the `zh` value reuses it).
"""

from __future__ import annotations

import base64
from dataclasses import dataclass
from typing import Optional

from pydantic import BaseModel

from server.b14_swarm import content, llm, steps
from server.b14_swarm.agents import ListingContext
from server.b14_swarm.steps import PendingStep, summary

AGENT = "describer"

SYSTEM = """You are the Describer on Cindia, a demo marketplace for fictional Native American makers. You say what is visible in one picture of a maker's piece, in plain words: the object, its colors and its plain shapes (stripe, zigzag, diamond, dot, band). Never say what a shape or color means, never name a design, a style or a People, and never guess at materials you can't see.

Return: object (one or two words), colors and motifs (short lowercase words), and note (one plain sentence about what's visible)."""


class DescriberOut(BaseModel):
    object: str
    colors: list[str]
    motifs: list[str]
    note: str


@dataclass
class Picture:
    object: str
    colors: list[str]
    motifs: list[str]
    note: str


def _words(values: list[str]) -> list[str]:
    out: list[str] = []
    for v in values:
        w = " ".join(str(v).strip().lower().split())
        if w and len(w) <= 30 and w not in out:
            out.append(w)
    return out[:6]


def run(ctx: ListingContext) -> tuple[Optional[Picture], list[PendingStep]]:
    job = ctx.job
    if not job.image or not job.image_type:
        return None, []
    blocks = [
        {"type": "image", "source": {"type": "base64", "media_type": job.image_type, "data": base64.b64encode(job.image).decode("ascii")}},
        {"type": "text", "text": "Describe what's visible in this picture of the maker's piece."},
    ]
    timeout = ctx.budget.for_call(AGENT, steps.WRITER_RESERVE_S + 3.0)
    att = llm.attempt(AGENT, SYSTEM, blocks, DescriberOut, timeout)  # type: ignore[arg-type]
    if not att.ok:
        return None, [PendingStep(AGENT, "result", summary("describer.failed", reason=att.reason or "error"), tool="image", ms=att.ms, rule_based=True)]
    out: DescriberOut = att.value
    pic = Picture(" ".join(out.object.lower().split())[:40], _words(out.colors), _words(out.motifs), " ".join(out.note.split())[:300])
    found = content.content_check(" ".join([pic.object, pic.note] + pic.colors + pic.motifs), job.community.get("id"), None)
    if not found.ok:
        reasons = [r for r in found.reasons() if r in steps.ENUMS["check"]] or ["empty"]
        return None, [PendingStep(AGENT, "result", summary("describer.seen", colors=len(pic.colors), motifs=len(pic.motifs)), tool="image", ms=att.ms),
                      PendingStep(AGENT, "check", summary("describer.rejected", checks=reasons))]
    return pic, [PendingStep(AGENT, "result", summary("describer.seen", colors=len(pic.colors), motifs=len(pic.motifs)), tool="image", ms=att.ms)]
