"""The Bookkeeper (code, no model): a maker's payout, held amount and payout date, read from the
records' `makerPayouts` and `makerStatements`, seller side only.

The maker is the one whose page is on screen (`mkr_` in `contextIds`), or the maker of the piece on
screen. The figures are the records' own, filled into the reply by code, so the Writer types none:
`{payout_amount}`, `{payout_date}`, `{held_amount}`, `{month}`, and `{gallery_short}` when a
short-payment flag is in the records. The buyer side never reaches it (Cindy's route table), and if
it did it would read nothing.
"""

from __future__ import annotations

from typing import Any, Optional

from server.b14_swarm.agents import Fact, SpecialistResult, SupportContext, date_text, money_text, month_text, text
from server.b14_swarm.steps import PendingStep, Stopwatch, summary

AGENT = "bookkeeper"


def maker_on_screen(ctx: SupportContext) -> Optional[str]:
    r = ctx.records
    for m in r.context("mkr_"):
        return m
    for pid in r.context("pc_"):
        p = r.piece(pid)
        if p and isinstance(p.get("makerId"), str):
            return p["makerId"]
    return None


def figures(ctx: SupportContext, maker_id: str) -> Optional[dict[str, Any]]:
    """The maker's payout figures from the records, or None when there are none."""
    r = ctx.records
    mpo, mst = r.maker_payout(maker_id), r.maker_statement(maker_id)
    if mpo is None or mst is None:
        return None
    amount, date = mpo.get("amountCents"), mst.get("payoutDate")
    held = mst.get("heldCents", mpo.get("heldCents", 0))
    if not isinstance(amount, int) or not isinstance(held, int) or not isinstance(date, str):
        return None
    flag = next((f for f in r.all("flags") if f.get("kind") == "short_payment" and isinstance(f.get("deltaCents"), int)), None)
    return {
        "makerPayoutId": mpo.get("id"),
        "statementId": mst.get("id"),
        "monthId": mst.get("monthId") or mpo.get("monthId"),
        "amountCents": amount,
        "heldCents": held,
        "payoutDate": date,
        "flagId": flag.get("id") if flag else None,
        "shortCents": flag.get("deltaCents") if flag else None,
    }


def run(ctx: SupportContext) -> SpecialistResult:
    w = Stopwatch()
    if ctx.job.side != "seller":
        return SpecialistResult(AGENT, "skipped", steps=[PendingStep(AGENT, "result", summary("bookkeeper.buyer"), ms=w.ms())])
    maker_id = maker_on_screen(ctx)
    f = figures(ctx, maker_id) if maker_id else None
    if f is None:
        return SpecialistResult(
            AGENT, "unknown",
            steps=[PendingStep(AGENT, "result", summary("bookkeeper.none"), ms=w.ms())],
            draft=text("I can answer pay questions on a maker's own page.", "我可以在匠人自己的页面上回答结款问题。"),
        )
    facts = [
        Fact("payout_amount", money_text(f["amountCents"]), "the maker's payout for the month"),
        Fact("payout_date", date_text(f["payoutDate"]), "the day it's paid"),
        Fact("held_amount", money_text(f["heldCents"]), "the part of the maker's share that's held"),
    ]
    en = "Your {month} payout is {payout_amount}, paid on {payout_date} once the co-op's manager approves it."
    zh = "您{month}的结款是{payout_amount}，经合作社负责人批准后于{payout_date}发放。"
    if isinstance(f["monthId"], str) and len(f["monthId"]) == 7:
        facts.append(Fact("month", month_text(f["monthId"]), "the month the payout is for"))
    else:
        en = en.replace("Your {month} payout", "Your payout")
        zh = zh.replace("您{month}的结款", "您的结款")
    ref_ids = [x for x in (f["makerPayoutId"], f["statementId"]) if isinstance(x, str)]
    if f["heldCents"] > 0:
        en += " {held_amount} of your share is held until the gallery pays what it owes."
        zh += "您的份额中有{held_amount}暂缓发放，待画廊补齐欠款后发放。"
        if f["shortCents"]:
            facts.append(Fact("gallery_short", money_text(f["shortCents"]), "how much the gallery paid short against its contract"))
            en += " The gallery paid {gallery_short} short against its contract."
            zh += "画廊按合同少付了{gallery_short}。"
            ref_ids.append(f["flagId"])
    step = PendingStep(
        AGENT, "result",
        summary("bookkeeper.read", payout=f["makerPayoutId"], statement=f["statementId"], amount=f["amountCents"],
                date=f["payoutDate"], held=f["heldCents"]),
        ms=w.ms(),
    )
    return SpecialistResult(
        AGENT, "answered", facts=facts, ref_ids=ref_ids, draft=text(en, zh), steps=[step],
        required=[["payout_amount"], ["payout_date"]], extra={"figures": f},
    )
