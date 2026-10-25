"""The step recorder and what it needs: person-scoped IDs, fixed-phrase summaries, the run's time
budget and the event envelope (docs/plans/B14-swarm.md, "The step recorder").

- `RunRecorder(runId, threadId, side, ids)` builds each `swarm.step` payload (`runId`, `threadId`,
  `stepId`, `agentId`, `kind`, `summary`, `toolName?`, `ms`, `model?`), keeps every step for the
  response, and sends `start_run`, `add_step`, `finish_run` and `set_process("swarm", ...)` to the
  B13 bridge's ordered queue when the bridge is importable and available. A bridge failure never
  reaches the run.
- **Summaries** are made only by `summary(key, **slots)` from the fixed phrases in PHRASES. A slot
  takes an ID, a count, a date, an amount, an agent from the roster or an enum value, each checked
  by its type, so a summary can never carry the model's text, a quote, Intake's reason or the
  person's words (B2-15): steps reach every open screen.
- **IDs** (contracts section 11, fix-plan 1.9): `IdMint(idTag, idStart)` numbers from the first
  number the browser reserved per prefix, `<prefix>_user_<tag>_<n>`, and never past what it reserved
  (40 steps, 3 checks, 1 approval, 1 piece, 6 blocks and 1 question per run).
- **The budget:** 19 seconds per run, checked before each step. Under 3 seconds left the Writer works
  with the facts so far; under 1.5 the template reply is used.
- **Events:** `evt_live_` plus `14`, the process start time in seconds modulo 1,000,000 as six
  digits, and a four-digit count from 0001 (D1-52). `source: "live"`, `key: "b14-swarm"`, and `at`
  copied from the trigger or 0.
"""

from __future__ import annotations

import itertools
import logging
import re
import threading
import time
from dataclasses import dataclass
from typing import Any, Callable, Iterable, Optional, Union

from server.b14_swarm import KEY, roster

log = logging.getLogger("cindia.b14")

# ---------------------------------------------------------------------------------------------
# The budget (module constants, read at call time, so a test can shorten them).

RUN_BUDGET_S = 19.0
WRITER_RESERVE_S = 3.0
TEMPLATE_RESERVE_S = 1.5


class Budget:
    """The run's time left. `for_call(agent_id, reserve)` is the timeout a call may take: the smaller
    of the agent's own and the time left minus `reserve`."""

    def __init__(self, total_s: Optional[float] = None, now: Callable[[], float] = time.monotonic):
        self.total_s = float(RUN_BUDGET_S if total_s is None else total_s)
        self._now = now
        self._t0 = now()

    def elapsed(self) -> float:
        return self._now() - self._t0

    def left(self) -> float:
        return self.total_s - self.elapsed()

    def for_call(self, agent_id: str, reserve: float) -> float:
        own = roster.spec(agent_id).timeout_s
        return max(0.0, min(own, self.left() - reserve))


class Stopwatch:
    def __init__(self, now: Callable[[], float] = time.monotonic):
        self._now = now
        self._t0 = now()

    def ms(self) -> int:
        return max(0, int(round((self._now() - self._t0) * 1000)))


# ---------------------------------------------------------------------------------------------
# IDs

TAG_RE = re.compile(r"^[a-z0-9]{4,12}$")
# Numbers the browser reserves per run (liveIdStart(prefix, count) in src/sources/ids.ts).
RESERVED: dict[str, int] = {"stp": 40, "chk": 3, "apr": 1, "pc": 1, "blk": 6, "qst": 1}


class IdsExhausted(RuntimeError):
    """A run asked for more IDs of a prefix than the browser reserved."""


class IdMint:
    """Hands out `<prefix>_user_<tag>_<n>` from each prefix's reserved first number.

    `start` is one number for every prefix, or a dict of first numbers by prefix.
    """

    def __init__(self, tag: str, start: Union[int, dict[str, int], None], reserved: Optional[dict[str, int]] = None):
        if not isinstance(tag, str) or not TAG_RE.match(tag):
            raise ValueError("idTag must be 4 to 12 lowercase letters or digits.")
        self.tag = tag
        self.reserved = dict(RESERVED if reserved is None else reserved)
        self._first: dict[str, int] = {}
        for prefix in self.reserved:
            first = start.get(prefix) if isinstance(start, dict) else start
            if first is None:
                first = 1
            if isinstance(first, bool) or not isinstance(first, int) or first < 1:
                raise ValueError("idStart must hold whole numbers from 1.")
            self._first[prefix] = first
        self._used: dict[str, int] = {p: 0 for p in self.reserved}
        self._lock = threading.Lock()

    def next(self, prefix: str) -> str:
        with self._lock:
            if prefix not in self.reserved:
                raise IdsExhausted(f"no IDs reserved for {prefix}")
            if self._used[prefix] >= self.reserved[prefix]:
                raise IdsExhausted(f"all {self.reserved[prefix]} {prefix} IDs are used")
            n = self._first[prefix] + self._used[prefix]
            self._used[prefix] += 1
        return f"{prefix}_user_{self.tag}_{n}"

    def used(self, prefix: str) -> int:
        return self._used.get(prefix, 0)


# ---------------------------------------------------------------------------------------------
# Summaries: fixed phrases with typed slots.

ID_RE = re.compile(r"^[a-z]{2,4}(?:_[a-z0-9]+)+$")
DATE_RE = re.compile(r"^(\d{4})-(\d{2})-(\d{2})$")
MONTHS = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")

INTENTS = (
    "find",
    "piece_question",
    "order_status",
    "shipping",
    "returns",
    "authenticity",
    "culture",
    "payout",
    "listing_help",
    "other",
)

# Enum values and how a summary shows them, by slot type.
ENUMS: dict[str, dict[str, tuple[str, str]]] = {
    "intent": {
        "find": ("find", "找货"),
        "piece_question": ("piece question", "作品问题"),
        "order_status": ("order status", "订单状态"),
        "shipping": ("shipping", "配送"),
        "returns": ("returns", "退货"),
        "authenticity": ("authenticity", "真伪"),
        "culture": ("culture", "文化含义"),
        "payout": ("payout", "结款"),
        "listing_help": ("listing help", "上架帮助"),
        "other": ("other", "其他"),
    },
    "lang": {"en": ("English", "英文"), "zh": ("Chinese", "中文"), "other": ("another language", "其他语言")},
    "reason": {
        "timeout": ("no answer in time", "未及时回答"),
        "error": ("an API error", "接口出错"),
        "invalid": ("an answer of the wrong shape", "答案格式不对"),
        "no_key": ("no key", "没有密钥"),
        "declined": ("declined", "拒绝回答"),
        "cut_off": ("cut off", "答案被截断"),
        "empty": ("no answer", "没有答案"),
        "budget": ("no time left", "时间不够"),
        "checks": ("failed the checks", "未通过检查"),
        "unavailable": ("not connected", "未接入"),
        "rule": ("rule-based", "按规则"),
        "simple": ("one specialist or none", "只需一位专员或不需要"),
    },
    "check": {
        "banned_object": ("kept-out object", "不收录物品"),
        "stereotype": ("stereotype word", "刻板用词"),
        "meaning": ("meaning word", "含义用词"),
        "accusing": ("accusing word", "指控用词"),
        "other_people": ("another community's name", "其他社区的名称"),
        "other_craft": ("another community's craft", "其他社区的手艺"),
        "product_word": ("a nation's name as a product word", "把民族名称当作商品词"),
        "diacritics": ("an unknown word with marks", "不明的带音标词"),
        "language": ("another language", "其他语言"),
        "craft_term": ("a craft term missing in Chinese", "中文缺少手艺术语"),
        "number": ("a number that isn't in the notes", "笔记中没有的数字"),
        "claim": ("a claim the notes don't make", "笔记中没有的说法"),
        "no_price": ("no price in the notes", "笔记里没有价格"),
        "typed_number": ("a typed number or date", "手写的数字或日期"),
        "promise": ("guarantee words", "保证类用词"),
        "placeholder": ("an unknown placeholder", "不明的占位符"),
        "missing": ("a fact left out", "遗漏了事实"),
        "empty": ("an empty reply", "回复为空"),
        "too_long": ("too long", "过长"),
    },
    "source": {
        "verification.note": ("verification note", "认证说明"),
        "verification.by": ("verification record", "认证记录"),
        "community.about": ("community page", "社区页面"),
        "community.protocols": ("demo exclusions", "演示排除规则"),
        "piece.heritage": ("heritage line", "传承说明"),
        "piece.story": ("piece story", "作品故事"),
    },
    "engine": {
        "elastic_hybrid": ("Elastic hybrid", "Elastic混合检索"),
        "local_hybrid": ("local hybrid", "本地混合检索"),
        "keyword_only": ("keywords only, the model is loading", "仅关键词，模型加载中"),
    },
    "checkkind": {
        "protocol": ("Protocol", "规定"),
        "facts": ("Facts", "事实"),
        "price": ("Price", "价格"),
    },
    "blockkind": {
        "hero": ("hero", "首屏"),
        "story": ("story", "介绍"),
        "pieces": ("pieces", "作品"),
        "process": ("process", "工序"),
        "projects": ("project", "项目"),
        "visit": ("visit", "到访"),
    },
    "cause": {
        "damage": ("damage reported", "反映作品损坏"),
        "refund": ("a refund asked for", "申请退款"),
        "complaint": ("a complaint", "投诉"),
        "person": ("asked for a person", "要求真人处理"),
    },
}

# key: (English, Chinese, {slot: type}). Types: id, ids, count, date, money, agent, agents, and
# each ENUMS group by its name (one value) or its name plus "s" (a list).
PHRASES: dict[str, tuple[str, str, dict[str, str]]] = {
    "intake.read": ("Read the question: {intents}, pieces {pieces}, in {lang}.", "读取问题：{intents}，作品{pieces}，{lang}。", {"intents": "intents", "pieces": "ids", "lang": "lang"}),
    "intake.rule": (
        "Rule-based read ({reason}): {intents}, pieces {pieces}, in {lang}.",
        "按规则读取（{reason}）：{intents}，作品{pieces}，{lang}。",
        {"reason": "reason", "intents": "intents", "pieces": "ids", "lang": "lang"},
    ),
    "intake.person": ("Needs a person: {cause}.", "需要真人处理：{cause}。", {"cause": "cause"}),
    "cindy.route": ("Calling {agents}.", "请{agents}处理。", {"agents": "agents"}),
    "cindy.route_parallel": ("Calling {agents}, side by side.", "同时请{agents}处理。", {"agents": "agents"}),
    "cindy.rule": ("Rule-based route ({reason}): calling {agents}.", "按规则分派（{reason}）：请{agents}处理。", {"reason": "reason", "agents": "agents"}),
    "cindy.none": ("No specialist covers this. Handing to the Writer.", "没有专员负责这类问题，交给撰写。", {}),
    "cindy.handoff": ("Handing this to a person: support_action approval {approval}.", "转交真人处理：support_action审批{approval}。", {"approval": "id"}),
    "steward.tool_verification": ("Reading the verification record of {community}.", "查阅{community}的认证记录。", {"community": "id"}),
    "steward.tool_page": ("Reading the page of {community}.", "查阅{community}的页面。", {"community": "id"}),
    "steward.quoted": ("Quoted the {source} for {subject}.", "引用了{subject}的{source}。", {"source": "source", "subject": "id"}),
    "steward.unknown": ("Unknown: no record answers this.", "未知：没有任何记录能回答这个问题。", {}),
    "steward.unknown_reason": ("Unknown ({reason}): no quote is given.", "未知（{reason}）：不作引用。", {"reason": "reason"}),
    "steward.no_sources": ("Unknown: no piece or community on screen to read.", "未知：屏幕上没有可查阅的作品或社区。", {}),
    "steward.check_ok": ("Quote found word for word in the record.", "在记录中逐字找到了这句引文。", {}),
    "steward.check_none": ("No quote in the records, so no answer is given.", "记录中没有可引用的内容，因此不作回答。", {}),
    "steward.check_meaning": ("No quote about a meaning in the records, so no answer is given.", "记录中没有关于含义的引文，因此不作回答。", {}),
    "steward.check_bad_index": ("The sentence it named isn't in the list, so no answer is given.", "它指出的句子不在列表中，因此不作回答。", {}),
    "clerk.tool_policy": ("Reading policy {topic}.", "查阅政策{topic}。", {"topic": "id"}),
    "clerk.tool_order": ("Looked up {order}.", "查询了{order}。", {"order": "id"}),
    "clerk.out_of_scope": ("Asked about an order that isn't on screen: answered with L17.", "询问了不在屏幕上的订单：以L17回复。", {}),
    "clerk.arrival": ("arrival_window: ships by {ship}, arrives {start} to {end}.", "arrival_window：{ship}前发出，{start}至{end}送达。", {"ship": "date", "start": "date", "end": "date"}),
    "clerk.answered": ("Answered from {ids}.", "依据{ids}作答。", {"ids": "ids"}),
    "clerk.rule": ("Rule-based answer ({reason}) from {ids}.", "按规则（{reason}）依据{ids}作答。", {"reason": "reason", "ids": "ids"}),
    "clerk.unknown": ("Unknown: no policy or order on screen answers this.", "未知：屏幕上没有能回答这个问题的政策或订单。", {}),
    "bookkeeper.read": (
        "Read {payout} and {statement}: {amount} on {date}, {held} held.",
        "读取{payout}和{statement}：{date}发放{amount}，暂缓{held}。",
        {"payout": "id", "statement": "id", "amount": "money", "date": "date", "held": "money"},
    ),
    "bookkeeper.none": ("No payout record for a maker on screen.", "屏幕上的匠人没有结款记录。", {}),
    "bookkeeper.buyer": ("Seller side only: nothing read.", "仅限卖家端：未读取任何记录。", {}),
    "agent.late": ("No answer in time: going on without it.", "未及时回答：不等它，继续。", {}),
    "agent.failed": ("Couldn't finish: going on without it.", "未能完成：不等它，继续。", {}),
    "finder.unavailable":("Search isn't connected in this build: no candidates.", "本版本未接入搜索：没有候选作品。", {}),
    "writer.check_ok": ("Checks passed: content, placeholders and sources.", "检查通过：内容、占位符和出处。", {}),
    "writer.check_retry": ("Checks failed ({checks}). Retrying once.", "检查未通过（{checks}），重试一次。", {"checks": "checks"}),
    "writer.check_final": ("Checks failed ({checks}). Using the template.", "检查未通过（{checks}），改用模板。", {"checks": "checks"}),
    "writer.reply": ("Writing the reply in {lang}.", "用{lang}撰写回复。", {"lang": "lang"}),
    "writer.reply_quote": ("Writing the reply in {lang}, with the record's words.", "用{lang}撰写回复，附上记录原文。", {"lang": "lang"}),
    "writer.template": ("Template reply from the facts ({reason}).", "根据事实套用模板回复（{reason}）。", {"reason": "reason"}),
    "writer.forward": ("Writing the reply, and forwarding {question} to {maker}.", "撰写回复，并把{question}转给{maker}。", {"question": "id", "maker": "id"}),
    "writer.escalate": ("Writing the reply: a person will follow up.", "撰写回复：将由真人跟进。", {}),
    # The Finder and the Curator (T4)
    "finder.keywords": ("Turned the request into {count} keywords and {filters} filters.", "把请求转成{count}个关键词和{filters}个筛选条件。",
                        {"count": "count", "filters": "count"}),
    "finder.keywords_rule": ("Rule-based keywords ({reason}): {count} keywords and {filters} filters.", "按规则提取关键词（{reason}）：{count}个关键词和{filters}个筛选条件。",
                             {"reason": "reason", "count": "count", "filters": "count"}),
    "finder.search": ("Searched the catalog ({engine}): {count} pieces.", "检索作品目录（{engine}）：{count}件作品。", {"engine": "engine", "count": "count"}),
    "finder.search_failed": ("Catalog search couldn't run ({reason}).", "无法检索作品目录（{reason}）。", {"reason": "reason"}),
    "finder.agent": ("Asked Elastic Agent Builder (cindia-finder): {count} pieces.", "询问了Elastic Agent Builder（cindia-finder）：{count}件作品。", {"count": "count"}),
    "finder.agent_failed": ("Elastic Agent Builder didn't answer ({reason}). Going on with the search.", "Elastic Agent Builder未作答（{reason}），继续使用检索结果。",
                            {"reason": "reason"}),
    "finder.found": ("Found {count} candidates.", "找到{count}件候选作品。", {"count": "count"}),
    "finder.none": ("Found no pieces that fit.", "没有找到合适的作品。", {}),
    "curator.ordered": ("Put {pieces} in order, with the search's code-built reasons.", "把{pieces}排好序，理由由搜索代码生成。", {"pieces": "ids"}),
    "curator.dropped": ("Dropped {count} picks that weren't among the candidates.", "去掉了{count}个不在候选中的作品。", {"count": "count"}),
    "curator.rule": ("Rule-based order ({reason}): {pieces}.", "按规则排序（{reason}）：{pieces}。", {"reason": "reason", "pieces": "ids"}),
    # The listing run (T7)
    "cindy.listing": ("Routing {listing}: draft, tag, check, then index.", "分派{listing}：起草、标注、核查，然后索引。", {"listing": "id"}),
    "cindy.listing_image": ("Routing {listing}: draft, look at the picture, tag, check, then index.", "分派{listing}：起草、看图、标注、核查，然后索引。",
                            {"listing": "id"}),
    "lister.drafted": ("Drafted the title, summary and {count} facet words in English.", "用英文起草了标题、简介和{count}个特征词。", {"count": "count"}),
    "lister.numbers": ("Dropped {count} numbers that aren't in the notes.", "去掉了{count}个笔记中没有的数字。", {"count": "count"}),
    "lister.failed": ("Couldn't draft the listing ({reason}).", "未能起草商品（{reason}）。", {"reason": "reason"}),
    "describer.seen": ("Described the picture: {colors} colors and {motifs} plain shapes.", "描述了图片：{colors}种颜色和{motifs}种简单形状。",
                       {"colors": "count", "motifs": "count"}),
    "describer.failed": ("Couldn't describe the picture ({reason}).", "未能描述图片（{reason}）。", {"reason": "reason"}),
    "describer.rejected": ("The picture note failed the checks ({checks}): left out.", "图片说明未通过检查（{checks}）：不予采用。", {"checks": "checks"}),
    "tagger.proposed": ("Proposed {count} vibe words, {new} of them new.", "提议了{count}个氛围词，其中{new}个是新词。", {"count": "count", "new": "count"}),
    "tagger.dropped": ("Dropped {count} vibe words that aren't in the vocabulary or failed the checks.", "去掉了{count}个不在词表中或未通过检查的氛围词。",
                       {"count": "count"}),
    "tagger.rule": ("Rule-based vibe words ({reason}): {count} from the notes.", "按规则选取氛围词（{reason}）：从笔记中找到{count}个。",
                    {"reason": "reason", "count": "count"}),
    "checker.passed": ("{check} check passed.", "{check}核查通过。", {"check": "checkkind"}),
    "checker.failed": ("{check} check failed ({checks}).", "{check}核查未通过（{checks}）。", {"check": "checkkind", "checks": "checks"}),
    "checker.rule": ("Rule-based checks ({reason}): protocol, facts and price.", "按规则核查（{reason}）：规定、事实和价格。", {"reason": "reason"}),
    "indexer.indexed": ("Embedded the draft into cindia-drafts as {piece}.", "把草稿嵌入cindia-drafts，编号{piece}。", {"piece": "id"}),
    "indexer.not_indexed": ("Didn't index the draft ({reason}): nothing is searchable.", "未能索引草稿（{reason}）：不会被搜到。", {"reason": "reason"}),
    "cindy.publish": ("Asking the owner to approve publishing {listing}: {approval}.", "请店主批准发布{listing}：{approval}。", {"listing": "id", "approval": "id"}),
    # The storefront run (T8)
    "cindy.storefront": ("Routing {storefront} to the Designer.", "把{storefront}交给设计。", {"storefront": "id"}),
    "designer.tool_page": ("Reading the page of {community} and its {count} pieces.", "查阅{community}的页面及其{count}件作品。", {"community": "id", "count": "count"}),
    "designer.drafted": ("Drafted {count} blocks: {kinds}.", "起草了{count}个版块：{kinds}。", {"count": "count", "kinds": "blockkinds"}),
    "designer.tagline_rule": ("The tagline failed the checks ({checks}): using the craft line from the records.", "标语未通过检查（{checks}）：改用记录中的手艺说明。",
                              {"checks": "checks"}),
    "designer.dropped": ("Dropped {count} pieces that aren't the community's.", "去掉了{count}件不属于该社区的作品。", {"count": "count"}),
    "designer.failed": ("Couldn't draft the storefront ({reason}).", "未能起草店铺（{reason}）。", {"reason": "reason"}),
}


class SummaryError(ValueError):
    """A summary slot got a value of the wrong type."""


_SUMMARY_TOKEN = object()


class Summary:
    """A step summary. Only summary() makes one."""

    __slots__ = ("en", "zh")

    def __init__(self, en: str, zh: str, token: object = None):
        if token is not _SUMMARY_TOKEN:
            raise TypeError("Summaries come only from steps.summary().")
        self.en = en
        self.zh = zh

    def text(self) -> dict[str, str]:
        return {"en": self.en, "zh": self.zh}


def _join(items: list[str], lang: str) -> str:
    if lang == "zh":
        return "、".join(items) if len(items) != 2 else f"{items[0]}和{items[1]}"
    if len(items) <= 1:
        return "".join(items)
    if len(items) == 2:
        return f"{items[0]} and {items[1]}"
    return ", ".join(items[:-1]) + f" and {items[-1]}"


def _date(value: Any) -> tuple[str, str]:
    m = DATE_RE.match(value) if isinstance(value, str) else None
    if not m:
        raise SummaryError("a date slot takes an ISO date")
    month, day = int(m.group(2)), int(m.group(3))
    if not 1 <= month <= 12 or not 1 <= day <= 31:
        raise SummaryError("a date slot takes an ISO date")
    return f"{MONTHS[month - 1]} {day}", f"{month}月{day}日"


def usd(cents: int) -> str:
    """$1,149.18 for prose, as src/mock/util.ts writes it."""
    sign = "-" if cents < 0 else ""
    c = abs(int(cents))
    return f"{sign}${c // 100:,}.{c % 100:02d}"


def _agent_name(agent_id: Any, lang: str) -> str:
    if not isinstance(agent_id, str) or not roster.is_agent(agent_id):
        raise SummaryError("an agent slot takes a roster agent ID")
    a = roster.spec(agent_id)
    if lang == "zh":
        return a.name_zh
    return a.name_en if agent_id == "cindy" else f"the {a.name_en}"


def _render(kind: str, value: Any) -> tuple[str, str]:
    if kind == "id":
        if not isinstance(value, str) or not ID_RE.match(value):
            raise SummaryError("an id slot takes a record ID")
        return value, value
    if kind == "ids":
        if not isinstance(value, (list, tuple)):
            raise SummaryError("an ids slot takes a list of record IDs")
        parts = [_render("id", v)[0] for v in value]
        if not parts:
            return "none", "无"
        return ", ".join(parts), "、".join(parts)
    if kind == "count":
        if isinstance(value, bool) or not isinstance(value, int):
            raise SummaryError("a count slot takes a whole number")
        return str(value), str(value)
    if kind == "date":
        return _date(value)
    if kind == "money":
        if isinstance(value, bool) or not isinstance(value, int):
            raise SummaryError("a money slot takes integer cents")
        return usd(value), usd(value)
    if kind == "agent":
        return _agent_name(value, "en"), _agent_name(value, "zh")
    if kind == "agents":
        if not isinstance(value, (list, tuple)) or not value:
            raise SummaryError("an agents slot takes a list of roster agent IDs")
        return _join([_agent_name(v, "en") for v in value], "en"), _join([_agent_name(v, "zh") for v in value], "zh")
    group, many = (kind[:-1], True) if kind.endswith("s") and kind[:-1] in ENUMS else (kind, False)
    labels = ENUMS.get(group)
    if labels is None:
        raise SummaryError(f"unknown slot type {kind}")
    values = list(value) if many and isinstance(value, (list, tuple)) else [value]
    if not values or any(not isinstance(v, str) or v not in labels for v in values):
        raise SummaryError(f"a {kind} slot takes values from its fixed list")
    en = [labels[v][0] for v in values]
    zh = [labels[v][1] for v in values]
    return (", ".join(en), "、".join(zh)) if many else (en[0], zh[0])


def summary(key: str, **slots: Any) -> Summary:
    """A step summary from a fixed phrase, each slot checked by its type. Raises SummaryError."""
    if key not in PHRASES:
        raise SummaryError(f"unknown phrase {key}")
    en, zh, types = PHRASES[key]
    if set(slots) != set(types):
        raise SummaryError(f"phrase {key} takes the slots {sorted(types)}")
    en_vals: dict[str, str] = {}
    zh_vals: dict[str, str] = {}
    for name, kind in types.items():
        en_vals[name], zh_vals[name] = _render(kind, slots[name])
    return Summary(en.format(**en_vals), zh.format(**zh_vals), _SUMMARY_TOKEN)


# ---------------------------------------------------------------------------------------------
# Steps and the recorder

STEP_KINDS = ("route", "call", "tool", "result", "check", "handoff", "reply")


@dataclass
class PendingStep:
    """A step an agent took, recorded later in the run's order (specialists run side by side)."""

    agent_id: str
    kind: str
    summary: Summary
    tool: Optional[str] = None
    ms: int = 0
    rule_based: bool = False


def step_model(agent_id: str, kind: str, tool: Optional[str], rule_based: bool) -> Optional[str]:
    """The step's model, as the scripted runs give it: the agent's own for a Claude agent's step,
    none for a code agent, a check, a rule-based step or a tool the run calls as code."""
    a = roster.spec(agent_id)
    if a.kind != "claude" or rule_based or kind == "check" or (tool is not None and tool in roster.CODE_TOOLS):
        return None
    return a.model


_DEFAULT = object()


def load_bridge() -> Any:
    """B13's bridge module, or None when it can't be imported (B13 is optional at run time)."""
    try:
        from server.b13_spacetime import bridge
    except Exception:
        return None
    return bridge


_runs_lock = threading.Lock()
_runs_going = 0


def runs_going() -> int:
    with _runs_lock:
        return _runs_going


def _runs_add(delta: int) -> int:
    global _runs_going
    with _runs_lock:
        _runs_going = max(0, _runs_going + delta)
        return _runs_going


class RunRecorder:
    """Times and records a run's steps, and mirrors them to the B13 bridge when it's available."""

    def __init__(self, run_id: str, thread_id: str, side: str, ids: IdMint, bridge: Any = _DEFAULT):
        self.run_id = run_id
        self.thread_id = thread_id
        self.side = side
        self.ids = ids
        self.bridge = load_bridge() if bridge is _DEFAULT else bridge
        self._steps: list[dict[str, Any]] = []
        self._on = False
        self._started = False
        self._finished = False

    def _available(self) -> bool:
        b = self.bridge
        if b is None:
            return False
        try:
            return bool(b.available())
        except Exception:
            return False

    def _send(self, name: str, *args: Any) -> None:
        try:
            getattr(self.bridge, name)(*args)
        except Exception as exc:  # the bridge never breaks a run
            log.info("b14 bridge %s failed (%s)", name, type(exc).__name__)

    def start(self) -> None:
        if self._started:
            return
        self._started = True
        n = _runs_add(1)
        self._on = self._available()
        if self._on:
            self._send("start_run", self.run_id, self.thread_id, self.side)
            self._send("set_process", "swarm", "working", n)

    def step(self, agent_id: str, kind: str, text: Summary, *, tool: Optional[str] = None, ms: int = 0,
             rule_based: bool = False) -> Optional[dict[str, Any]]:
        """Records one step and returns its payload, or None when the run's step IDs ran out."""
        if not isinstance(text, Summary):
            raise TypeError("A step summary must come from steps.summary().")
        if kind not in STEP_KINDS:
            raise ValueError(f"unknown step kind {kind}")
        roster.spec(agent_id)
        try:
            step_id = self.ids.next("stp")
        except IdsExhausted:
            log.info("b14 run: no step IDs left, a step was not recorded")
            return None
        payload: dict[str, Any] = {
            "runId": self.run_id,
            "threadId": self.thread_id,
            "stepId": step_id,
            "agentId": agent_id,
            "kind": kind,
            "summary": text.text(),
        }
        if tool:
            payload["toolName"] = tool
        payload["ms"] = max(0, int(ms))
        model = step_model(agent_id, kind, tool, rule_based)
        if model:
            payload["model"] = model
        self._steps.append(payload)
        if self._on:
            self._send("add_step", dict(payload))
        return payload

    def add(self, pending: PendingStep) -> Optional[dict[str, Any]]:
        return self.step(pending.agent_id, pending.kind, pending.summary, tool=pending.tool, ms=pending.ms,
                         rule_based=pending.rule_based)

    def add_all(self, pending: Iterable[PendingStep]) -> None:
        for p in pending:
            self.add(p)

    def finish(self) -> None:
        if not self._started or self._finished:
            return
        self._finished = True
        n = _runs_add(-1)
        if self._on or self._available():
            self._send("finish_run", self.run_id)
            self._send("set_process", "swarm", "working" if n else "done", n)

    @property
    def steps(self) -> list[dict[str, Any]]:
        return list(self._steps)

    def events(self, at: float) -> list[dict[str, Any]]:
        return [envelope("swarm.step", p, at) for p in self._steps]


# ---------------------------------------------------------------------------------------------
# The event envelope

_PROCESS_START = int(time.time()) % 1_000_000
_event_numbers = itertools.count(1)
_event_lock = threading.Lock()


def event_id() -> str:
    with _event_lock:
        n = next(_event_numbers)
    return f"evt_live_14{_PROCESS_START:06d}{n:04d}"


def trigger_at(trigger: Any) -> float:
    """`at` copied from the trigger, or 0."""
    at = trigger.get("at", 0) if isinstance(trigger, dict) else 0
    if isinstance(at, bool) or not isinstance(at, (int, float)):
        return 0
    return at


def envelope(type_: str, payload: dict[str, Any], at: float) -> dict[str, Any]:
    return {"id": event_id(), "type": type_, "at": at, "source": "live", "key": KEY, "payload": payload}
