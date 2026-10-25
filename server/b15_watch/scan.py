"""One scan, from the crawl to its events (docs/plans/B15-watch.md, Interfaces and Endpoints).

`analyze(maker_id)` runs the four agents in order inside TOTAL_BUDGET_S (58 seconds):
1. the Scout crawls the sandbox market through Apify (B11's model warms up meanwhile),
2. the Comparer scores each listing against the co-op's twelve pieces,
3. Claims checks the evidence by code and what each listing claims (the model for listings with
   evidence or a text match at the threshold, the rule-based check for the rest), and decides each
   verdict,
4. the Reporter drafts a report for each possible copy, at most MAX_HITS.
It raises ScoutError when the crawl fails, and returns an `Analysis` the router caches by maker.

`events_for(analysis, ...)` turns an analysis into the poll's events with this request's IDs: the
steps, `watch.scanned` with every checked listing, then per hit `counterfeit.flagged`,
`followup.drafted` and `approval.requested` (kind `report_listing`, with its inline approval).
A cached analysis gets fresh IDs and a Scout step that says the crawl was reused.
"""

from __future__ import annotations

import concurrent.futures
import time
from dataclasses import dataclass, field, replace
from typing import Any, Optional

from server.b15_watch import claims as claims_mod
from server.b15_watch import compare, evidence, reporter, scout, steps, thresholds
from server.b15_watch.coop import Records

DECISION_DATE = "2026-10-01"


class Budget:
    def __init__(self, total_s: float = thresholds.TOTAL_BUDGET_S):
        self.total_s = float(total_s)
        self._t0 = time.monotonic()

    def left(self) -> float:
        return self.total_s - (time.monotonic() - self._t0)


@dataclass
class Checked:
    item: scout.Item
    match: compare.Match
    evidence: evidence.Evidence
    claim: claims_mod.Claim
    verdict: str


@dataclass
class Hit:
    index: int
    piece_id: str
    similarity: Optional[float]
    draft: reporter.Draft
    claim_text: str


@dataclass
class Analysis:
    maker_id: str
    checked: list[Checked]
    hits: list[Hit]
    steps: list[steps.Step]
    created: float = field(default_factory=time.monotonic)


def _s(n: int, word: str, plural: Optional[str] = None) -> str:
    return f"{n} {word if n == 1 else (plural or word + 's')}"


def _hit_piece(c: Checked, records: Records, maker_id: str) -> str:
    if c.match.piece_id:
        return c.match.piece_id
    if c.evidence.story_piece:
        return c.evidence.story_piece
    for m in c.evidence.makers:
        p = records.first_piece_of(m)
        if p:
            return p.piece_id
    p = records.first_piece_of(maker_id)
    if p:
        return p.piece_id
    return records.pieces[0].piece_id if records.pieces else "pc_01"


def analyze(maker_id: str, records: Records, *, budget: Optional[Budget] = None,
            max_pages: int = thresholds.MAX_PAGES) -> Analysis:
    budget = budget or Budget()
    out_steps: list[steps.Step] = []

    # 1. Scout
    compare.start_warmup()
    sw = steps.Stopwatch()
    items = scout.crawl(max_pages=max_pages, budget_s=min(thresholds.APIFY_BUDGET_S, max(1.0, budget.left() - 10.0)))
    out_steps.append(steps.step("scout", "tool", f"Crawled the sandbox market through Apify: {_s(len(items), 'listing')} to check.",
                                ms=sw.ms(), tool="apify_crawl"))

    # 2. Comparer
    sw = steps.Stopwatch()
    threshold, measured = thresholds.similarity_min()
    texts = [compare.listing_text(it.title, it.snippet) for it in items]
    outcome = compare.compare(texts, records.piece_ids(), wait_s=min(thresholds.MODEL_WAIT_S, max(0.0, budget.left() - 13.0)))
    matches = outcome.matches
    note = "measured" if measured else "not measured"
    if outcome.used_model:
        above = sum(1 for m in matches if m.similarity is not None and m.similarity >= threshold)
        summary = (f"Compared {_s(len(items), 'listing')} with the co-op's {len(records.pieces)} pieces: "
                   f"{above} at or above the threshold {threshold:.2f} ({note}).")
    elif items:
        summary = f"No trained model loaded, so no text match: {_s(len(items), 'listing')} go on to the text checks."
    else:
        summary = "Nothing to compare: the crawl found no listings."
    out_steps.append(steps.step("comparer", "tool", summary, ms=sw.ms(), tool="embed"))

    # 3. Claims: evidence by code, then the claims, then the verdicts
    sw = steps.Stopwatch()
    evs = [evidence.find(it.title, it.snippet, it.text, it.url, records) for it in items]
    with_ev = sum(1 for e in evs if e.found)
    out_steps.append(steps.step("claims", "check", f"Evidence about the co-op in {with_ev} of {_s(len(items), 'listing')}: "
                                "names, story words or a Cindia verification.", ms=sw.ms()))
    sw = steps.Stopwatch()
    eligible = [i for i, (e, m) in enumerate(zip(evs, matches)) if e.found or (m.similarity is not None and m.similarity >= threshold)]
    batch = claims_mod.check_all(items, eligible, records.name, budget.left() - thresholds.REPORTER_RESERVE_S)
    if batch.model_calls:
        out_steps.append(steps.step("claims", "call", f"Read what {_s(batch.model_calls, 'listing')} claim: {batch.model_ok} answered, "
                                    f"{batch.rule_based} checked by rule.", ms=sw.ms(), model_call=True))
    else:
        why = {"no_key": "no key", "unavailable": "not connected", "budget": "no time left"}.get(batch.reason or "", "none at the threshold")
        out_steps.append(steps.step("claims", "check", f"Read what {_s(len(items), 'listing')} claim by rule ({why}).", ms=sw.ms()))
    checked = [Checked(it, m, e, c, claims_mod.verdict(e, c)) for it, m, e, c in zip(items, matches, evs, batch.claims)]
    counts = {v: sum(1 for c in checked if c.verdict == v) for v in ("possible_copy", "claim_only", "neither")}
    out_steps.append(steps.step("claims", "result", f"Verdicts: {counts['possible_copy']} possible copy, {counts['claim_only']} claim only, "
                                f"{counts['neither']} neither.", ms=0))

    # 4. Reporter
    sw = steps.Stopwatch()
    hit_rows = [i for i, c in enumerate(checked) if c.verdict == "possible_copy"][: thresholds.MAX_HITS]
    hits: list[Hit] = []
    answered = 0
    if hit_rows:
        timeout = min(thresholds.REPORTER_TIMEOUT_S, budget.left() - 1.0)
        pool = concurrent.futures.ThreadPoolExecutor(max_workers=len(hit_rows), thread_name_prefix="b15-reporter")
        try:
            futures = {}
            for i in hit_rows:
                c = checked[i]
                piece_id = _hit_piece(c, records, maker_id)
                futures[i] = (piece_id, pool.submit(
                    reporter.draft_for, url=c.item.url, title=c.item.title, snippet=c.item.snippet, piece_id=piece_id,
                    similarity=c.match.similarity, ev=c.evidence, records=records, timeout_s=timeout))
            t0 = time.monotonic()
            for i in hit_rows:
                c = checked[i]
                piece_id, fut = futures[i]
                try:
                    d, ok = fut.result(timeout=max(0.0, timeout + 0.5 - (time.monotonic() - t0)))
                except Exception:
                    d, ok = reporter.draft(url=c.item.url, title=c.item.title, snippet=c.item.snippet, piece_id=piece_id,
                                           similarity=c.match.similarity, ev=c.evidence, records=records), False
                answered += 1 if ok else 0
                quote = c.claim.quote if c.claim.any else ""
                hits.append(Hit(i, piece_id, c.match.similarity, d, reporter.claim_text(c.evidence, records, quote)))
        finally:
            pool.shutdown(wait=False, cancel_futures=True)
        out_steps.append(steps.step("reporter", "reply", f"Drafted {_s(len(hits), 'report')} for the owner to review. Nothing is sent.",
                                    ms=sw.ms(), model_call=answered > 0))
        out_steps.append(steps.step("reporter", "handoff", f"{_s(len(hits), 'report approval')} waiting for the owner.", ms=0))
    else:
        out_steps.append(steps.step("reporter", "result", "No possible copies, so there's no report to draft.", ms=sw.ms()))
    return Analysis(maker_id, checked, hits, out_steps)


def _round(x: Optional[float]) -> Optional[float]:
    return None if x is None else round(float(x), 2)


def reused_steps(analysis: Analysis, age_s: float) -> list[steps.Step]:
    """The steps for a cached analysis: the Scout says the crawl was reused, and no step claims time
    or a model call it didn't make this time."""
    minutes = max(0, int(age_s // 60))
    out: list[steps.Step] = []
    for s in analysis.steps:
        if s.agent_id == "scout":
            n = len(analysis.checked)
            out.append(replace(s, summary=f"Reused this co-op's crawl from {_s(minutes, 'minute')} ago: {_s(n, 'listing')}, no new Apify run.",
                               ms=0))
        else:
            out.append(replace(s, ms=0, model=None))
    return out


def events_for(analysis: Analysis, *, ids: steps.Ids, run_id: str, scan_id: str, at: float,
               reused_age_s: Optional[float] = None) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """(the poll's events in order, the step payloads for the bridge)."""
    plan = analysis.steps if reused_age_s is None else reused_steps(analysis, reused_age_s)
    step_payloads: list[dict[str, Any]] = []
    for s in plan:
        try:
            sid = ids.next("stp")
        except steps.IdsExhausted:
            break
        step_payloads.append(steps.step_payload(s, run_id=run_id, scan_id=scan_id, step_id=sid))
    events = [steps.envelope("swarm.step", p, at) for p in step_payloads]
    events.append(steps.envelope("watch.scanned", {
        "scanId": scan_id,
        "engine": "apify",
        "candidates": len(analysis.checked),
        "results": [
            {"title": c.item.title, "url": c.item.url, "snippet": c.item.snippet, "similarity": _round(c.match.similarity), "verdict": c.verdict}
            for c in analysis.checked
        ],
    }, at))
    for h in analysis.hits:
        try:
            cft_id, fup_id, apr_id = ids.next("cft"), ids.next("fup"), ids.next("apr")
        except steps.IdsExhausted:
            break
        c = analysis.checked[h.index]
        texts = h.draft.texts()
        events.append(steps.envelope("counterfeit.flagged", {
            "cftId": cft_id,
            "scanId": scan_id,
            "pieceId": h.piece_id,
            "url": c.item.url,
            "title": c.item.title,
            "snippet": c.item.snippet,
            # The payload needs a number: 0 when no model scored it (watch.scanned says null).
            "similarity": _round(h.similarity) if h.similarity is not None else 0.0,
            "claim": {"en": h.claim_text, "zh": h.claim_text},
        }, at))
        events.append(steps.envelope("followup.drafted", {
            "followUpId": fup_id,
            "approvalId": apr_id,
            "to": texts["to"],
            "subject": texts["subject"],
            "body": texts["body"],
        }, at))
        if h.draft.by == "plain":  # the listing's title failed the content check, so it stays out
            summary = "Report this listing to the sandbox market's trust team for review."
        else:
            summary = f'Report the listing "{c.item.title}" to the sandbox market\'s trust team for review.'
        events.append(steps.envelope("approval.requested", {
            "approvalId": apr_id,
            "approval": {
                "kind": "report_listing",
                "subjectIds": [cft_id],
                "overLimit": False,
                "proposedBy": "cindy",
                "summary": {"en": summary, "zh": summary},
                "decisionDate": DECISION_DATE,
            },
        }, at))
    return events, step_payloads
