"""The runs: the support run (T6), the listing run (T7) and the storefront run (T8).

**Support** (`support_run(job)`), with a 19-second budget checked before each step:

1. `intake` reads the request,
2. `cindy` picks the specialists from the route table (the Writer is added last by code),
3. the specialists, side by side where Cindy marks them parallel (through a thread pool), each with
   its own tools and records. `arrival_window` is called as code for the Clerk. For a find intent
   the Finder's `elastic_agent` call starts from code right after Intake, beside Cindy,
4. `writer` writes the reply from their facts, and code fills every number, date and quote.

Under 3 seconds left no further model call is made and the Writer works with the facts so far.
Under 1.5 seconds left the template reply is used.

It ends in one of three ways:

- `support.answered` from the Writer (`agentId: "writer"`),
- **the maker is asked:** when the Steward says unknown on a culture or authenticity question about
  a piece, `support.answered` with L14 naming the piece's maker, then `question.forwarded` to her
  (`qst_user_<tag>_<n>`, the person's own text and language), as `run_07` does,
- **a person takes over:** when Intake says so, or the words report damage, ask for a refund or
  complain, `support.escalated` and an `approval.requested` of kind `support_action` with its inline
  approval. Any `amountCents` comes from the order on screen, never from the person's words.

No run ever emits `approval.granted`, `approval.declined`, `followup.sent`, `payout.sent`,
`money.moved` or `storefront.published`: anything that would move money waits for a person.
"""

from __future__ import annotations

import concurrent.futures
import logging
from typing import Any, Optional

from server.b14_swarm import data, llm, roster, steps
from server.b14_swarm.agents import (
    ListingContext,
    ListingJob,
    SpecialistResult,
    StorefrontJob,
    english,
    SupportContext,
    SupportJob,
    checker,
    cindy,
    describer,
    designer,
    fill_text,
    indexer,
    intake,
    join_drafts,
    lister,
    name_of,
    specialist,
    tagger,
    text,
    writer,
)
from server.b14_swarm.steps import Budget, IdMint, PendingStep, RunRecorder, envelope, summary
from server.b14_swarm.tools import Records, Toolbox

log = logging.getLogger("cindia.b14")

# Event types no run may emit: each is a person's decision or a move of money.
FORBIDDEN_EVENTS = frozenset(
    {"approval.granted", "approval.declined", "followup.sent", "payout.sent", "money.moved", "storefront.published"}
)

# Specialists side by side. Two runs at once, each with up to three specialists, plus any abandoned.
_agents_pool = concurrent.futures.ThreadPoolExecutor(max_workers=8, thread_name_prefix="b14-agent")

OVER_LIMIT_CENTS = 50000
DECISION_DATE = "2026-10-01"  # data-model.md: the date any grant or decline carries

ESCALATION_REASONS: dict[str, dict[str, str]] = {
    "damage": text(
        "You reported damage. A person will follow up here. Nothing has been refunded or changed.",
        "您反映了作品损坏。会有真人在这里跟进。目前没有退款，也没有做任何更改。",
    ),
    "refund": text(
        "You asked for a refund. A person will follow up here. Nothing has been refunded or changed.",
        "您申请了退款。会有真人在这里跟进。目前没有退款，也没有做任何更改。",
    ),
    "complaint": text(
        "You raised a complaint. A person will follow up here. Nothing has been refunded or changed.",
        "您提出了投诉。会有真人在这里跟进。目前没有退款，也没有做任何更改。",
    ),
    "person": text(
        "This needs a person. A person will follow up here. Nothing has been refunded or changed.",
        "这件事需要真人处理。会有真人在这里跟进。目前没有退款，也没有做任何更改。",
    ),
}


def l14(maker_name: Optional[dict[str, str]]) -> dict[str, str]:
    """L14 word for word, with the piece's maker named (the maker when the records don't name her)."""
    en_name = maker_name["en"] if maker_name else "the maker"
    zh_name = maker_name["zh"] if maker_name else "匠人"
    en_ask = en_name if en_name.endswith(".") else f"{en_name}."
    return {
        "en": f"Our records don't say, and I won't guess, so I'll ask {en_ask} Her answer will show here in her own words.",
        "zh": f"我们的记录里没有答案，我不会乱猜，所以我会去问 {zh_name}。她的回答会以她自己的原话显示在这里。",
    }


def decision_date() -> str:
    for a in data.mock().get("allApprovals") or []:
        if isinstance(a, dict) and isinstance(a.get("decisionDate"), str):
            return a["decisionDate"]
    return DECISION_DATE


# ---------------------------------------------------------------------------------------------
# The specialists


def _safe(name: str, ctx: SupportContext) -> SpecialistResult:
    try:
        return specialist(name)(ctx)
    except Exception as exc:  # one specialist's failure never ends the run
        log.info("b14 run: %s failed (%s)", name, type(exc).__name__)
        return SpecialistResult(name, "unknown", reason="error",
                                steps=[PendingStep(name, "result", summary("agent.failed"), rule_based=True)])


def run_group(ctx: SupportContext, group: list[str]) -> dict[str, SpecialistResult]:
    """One group of specialists: alone inline, or side by side. A specialist still working when
    only the template's time is left is abandoned and counts as late."""
    if len(group) == 1:
        return {group[0]: _safe(group[0], ctx)}
    futures = {name: llm.submit(_agents_pool, _safe, name, ctx) for name in group}
    wait_s = max(0.0, ctx.budget.left() - steps.TEMPLATE_RESERVE_S)
    concurrent.futures.wait(futures.values(), timeout=wait_s)
    out: dict[str, SpecialistResult] = {}
    for name, fut in futures.items():
        if fut.done() and fut.exception() is None:
            out[name] = fut.result()
        else:
            fut.cancel()
            out[name] = SpecialistResult(name, "unknown", reason="timeout",
                                         steps=[PendingStep(name, "result", summary("agent.late"), rule_based=True)])
    return out


# ---------------------------------------------------------------------------------------------
# The endings


def _answered(job: SupportJob, reply: dict[str, str], ref_ids: list[str]) -> dict[str, Any]:
    # English only: the reply's zh value repeats the English (decisions.md, Oct 25 00:14 PT).
    return {"threadId": job.thread_id, "runId": job.run_id, "agentId": "writer", "reply": english(reply), "refIds": ref_ids}


def _escalate(ctx: SupportContext, rec: RunRecorder) -> list[dict[str, Any]]:
    job, r, it = ctx.job, ctx.records, ctx.intake
    approval_id = ctx.ids.next("apr")
    rec.add(cindy.handoff_step(approval_id))
    rec.add(PendingStep("writer", "reply", summary("writer.escalate"), rule_based=True))
    cause = it.cause or "person"
    order_id = next((o for o in it.order_ids if r.order(o) is not None), None) or next(
        (o for o in r.context("ord_") if r.order(o) is not None), None
    )
    piece_id = next(iter(it.piece_ids), None)
    subjects = [job.thread_id] + [x for x in (order_id, piece_id) if x]
    about = order_id or piece_id or job.thread_id
    approval: dict[str, Any] = {
        "kind": "support_action",
        "subjectIds": subjects,
        "overLimit": False,
        "proposedBy": "cindy",
        "summary": english(text(
            f"Support needs a person: {steps.ENUMS['cause'][cause][0]}, on {about}.",
            f"客服需要真人处理：{steps.ENUMS['cause'][cause][1]}，涉及{about}。",
        )),
        "decisionDate": decision_date(),
    }
    gross = (r.order(order_id) or {}).get("grossCents") if order_id else None
    if cause in ("damage", "refund") and isinstance(gross, int) and not isinstance(gross, bool) and gross > 0:
        approval["amountCents"] = gross  # from the records, never from the person's words
        approval["overLimit"] = gross > OVER_LIMIT_CENTS
    finals = [
        envelope("support.escalated", {"threadId": job.thread_id, "runId": job.run_id, "reason": english(ESCALATION_REASONS[cause]),
                                        "approvalId": approval_id}, job.at),
        envelope("approval.requested", {"approvalId": approval_id, "approval": approval}, job.at),
    ]
    return rec.events(job.at) + finals


def _forward(ctx: SupportContext, rec: RunRecorder, steward: SpecialistResult, others: list[SpecialistResult]) -> list[dict[str, Any]]:
    job, r = ctx.job, ctx.records
    piece_id, maker_id = steward.extra["piece_id"], steward.extra["maker_id"]
    question_id = ctx.ids.next("qst")
    rec.add(PendingStep("writer", "reply", summary("writer.forward", question=question_id, maker=maker_id), rule_based=True))
    answered_others = [o for o in others if o.status == "answered" and (o.template or o.draft)]
    reply = l14(name_of(r.maker(maker_id)))
    ref_ids = [piece_id, maker_id, question_id]
    if answered_others:
        facts = {f.name: f for o in answered_others for f in o.facts}
        rest = fill_text(join_drafts([o.template or o.draft for o in answered_others]), facts)  # type: ignore[misc]
        reply = {"en": f"{reply['en']} {rest['en']}".strip(), "zh": ""}
        ref_ids += [i for o in answered_others for i in o.ref_ids if i not in ref_ids]
    finals = [
        envelope("support.answered", _answered(job, reply, ref_ids), job.at),
        envelope("question.forwarded", {"questionId": question_id, "threadId": job.thread_id, "makerId": maker_id, "pieceId": piece_id,
                                         "text": job.text, "lang": job.lang}, job.at),
    ]
    return rec.events(job.at) + finals


# ---------------------------------------------------------------------------------------------
# The support run


def support_run(job: SupportJob, *, bridge: Any = steps._DEFAULT, budget_s: Optional[float] = None) -> list[dict[str, Any]]:
    """Every `swarm.step` in order, then the run's final events, as live events keyed b14-swarm."""
    budget = Budget(budget_s)
    ids = IdMint(job.id_tag, job.id_start)
    records = Records.build(job.records, job.side, job.context_ids)
    ctx = SupportContext(job=job, records=records, box=Toolbox(records), budget=budget, ids=ids)
    rec = RunRecorder(job.run_id, job.thread_id, job.side, ids, bridge=bridge)
    rec.start()
    try:
        it, intake_steps = intake.run(ctx)
        ctx.intake = it
        rec.add_all(intake_steps)
        if it.needs_person:
            return _escalate(ctx, rec)
        if "find" in it.intents and job.side == "buyer":
            # Every find question goes to Elastic Agent Builder, chosen in code. It's the slowest
            # call, so it starts now, beside Cindy and the Finder's keywords.
            from server.b14_swarm.agents import finder

            finder.start_agent(ctx)

        route, route_steps = cindy.run(ctx)
        rec.add_all(route_steps)
        order: list[SpecialistResult] = []
        for group in route.groups:
            results = run_group(ctx, group)
            for name in group:
                res = results[name]
                ctx.results[name] = res
                order.append(res)
                rec.add_all(res.steps)

        steward_result = ctx.results.get("steward")
        if steward_result is not None and steward_result.extra.get("forward"):
            others = [o for o in order if o.agent_id != "steward"]
            return _forward(ctx, rec, steward_result, others)

        outcome = writer.run(ctx, order)
        rec.add_all(outcome.steps)
        final = envelope("support.answered", _answered(job, outcome.reply, outcome.ref_ids), job.at)
        return rec.events(job.at) + [final]
    finally:
        rec.finish()


# ---------------------------------------------------------------------------------------------
# The listing run (T7) and the storefront run (T8)


class RunFailed(Exception):
    """The run can't produce its answer (the Lister or the Designer had no draft). `code` is the
    contract's error code, so the router answers with it and the scripted run plays."""

    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


def _maker_name(maker: dict[str, Any]) -> dict[str, str]:
    n = name_of(maker)
    return n if n else {"en": "the maker", "zh": "匠人"}


def listing_run(job: ListingJob, *, bridge: Any = steps._DEFAULT, budget_s: Optional[float] = None) -> list[dict[str, Any]]:
    """Cindy (code), the Lister, the Describer (with an image only), the Tagger and the Checker side
    by side, then the Indexer. Ends in listing.drafted, listing.indexed (when the draft reached
    cindia-drafts) and a listing_publish approval. Raises RunFailed without a draft."""
    budget = Budget(budget_s)
    ids = IdMint(job.id_tag, job.id_start)
    ctx = ListingContext(job=job, budget=budget, ids=ids, box=Toolbox(Records({}, "seller", [])))
    rec = RunRecorder(job.run_id, job.listing_id, "seller", ids, bridge=bridge)
    rec.start()
    try:
        key = "cindy.listing_image" if job.image else "cindy.listing"
        rec.add(PendingStep("cindy", "route", summary(key, listing=job.listing_id), rule_based=True))
        draft, lister_steps, code = lister.run(ctx)
        rec.add_all(lister_steps)
        if draft is None:
            raise RunFailed(code or "invalid_model_output")
        ctx.draft = draft
        picture, describer_steps = describer.run(ctx)
        rec.add_all(describer_steps)
        if picture is not None:
            ctx.picture = picture
            colors = draft.facets["colors"]
            draft.facets["colors"] = (colors + [c for c in picture.colors if c not in colors])[:8]

        # The Tagger and the Checker read the same draft and not each other, so they run side by side.
        f_tag = llm.submit(_agents_pool, tagger.run, ctx)
        f_chk = llm.submit(_agents_pool, checker.run, ctx)
        concurrent.futures.wait([f_tag, f_chk], timeout=max(0.0, budget.left() - steps.TEMPLATE_RESERVE_S))
        if f_tag.done() and f_tag.exception() is None:
            vibe, tagger_steps = f_tag.result()
        else:
            f_tag.cancel()
            vibe = tagger.rule_vibe(ctx)
            tagger_steps = [PendingStep("tagger", "result", summary("agent.late"), rule_based=True)]
        if f_chk.done() and f_chk.exception() is None:
            checks, checker_steps = f_chk.result()
        else:
            f_chk.cancel()
            checks = checker.code_checks(ctx, None)
            checker_steps = [PendingStep("checker", "result", summary("checker.rule", reason="timeout"), rule_based=True)]
            checker_steps += checker.check_steps(checks)
        rec.add_all(tagger_steps)
        rec.add_all(checker_steps)
        drafted_checks = [{"checkId": ids.next("chk"), "kind": c.kind, "ok": c.ok, "note": c.note} for c in checks]

        indexed, indexer_steps = indexer.run(ctx, vibe)
        rec.add_all(indexer_steps)
        approval_id = ids.next("apr")
        rec.add(PendingStep("cindy", "handoff", summary("cindy.publish", listing=job.listing_id, approval=approval_id), rule_based=True))

        drafted: dict[str, Any] = {
            "listingId": job.listing_id,
            "makerId": job.maker_id,
            "title": {"en": draft.title, "zh": draft.title},
            "summary": {"en": draft.summary, "zh": draft.summary},
            "facets": draft.facets,
            "vibe": {k: list(vibe.get(k) or []) for k in ("moods", "occasions", "recipients")},
            "checks": drafted_checks,
        }
        if draft.hours is not None:
            drafted["hours"] = draft.hours
        maker = _maker_name(job.maker)
        approval = {
            "kind": "listing_publish",
            "subjectIds": [job.listing_id],
            "overLimit": False,
            "proposedBy": "cindy",
            "summary": {
                "en": f"Publish {maker['en']}'s new listing to the catalog: “{draft.title}”.",
                "zh": f"将 {maker['zh']} 的新作品上架到目录：“{draft.title}”。",
            },
            "decisionDate": decision_date(),
        }
        finals = [envelope("listing.drafted", drafted, job.at)]
        if indexed.payload is not None:
            finals.append(envelope("listing.indexed", indexed.payload, job.at))
        finals.append(envelope("approval.requested", {"approvalId": approval_id, "approval": approval}, job.at))
        return rec.events(job.at) + finals
    finally:
        rec.finish()


def storefront_run(job: StorefrontJob, *, bridge: Any = steps._DEFAULT, budget_s: Optional[float] = None) -> list[dict[str, Any]]:
    """Cindy (code), then the Designer. Ends in storefront.drafted. Raises RunFailed without blocks.
    Publishing stays the owner's own storefront.published."""
    budget = Budget(budget_s)
    ids = IdMint(job.id_tag, job.id_start)
    rec = RunRecorder(job.run_id, job.storefront_id, "seller", ids, bridge=bridge)
    rec.start()
    try:
        rec.add(PendingStep("cindy", "route", summary("cindy.storefront", storefront=job.storefront_id), rule_based=True))
        roster.require("designer", "community_page")
        blocks, designer_steps, code = designer.run(job.community, job.pieces, ids, budget)
        rec.add_all(designer_steps)
        if blocks is None:
            raise RunFailed(code or "invalid_model_output")
        final = envelope("storefront.drafted", {"storefrontId": job.storefront_id, "blocks": blocks}, job.at)
        return rec.events(job.at) + [final]
    finally:
        rec.finish()
