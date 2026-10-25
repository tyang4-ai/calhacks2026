"""The swarm's one Claude call path: `parse(agent_id, system, content, output_model, timeout_s)`.

- The model is the one roster.py gives the agent, checked against `config.ALLOWED_MODELS` (exactly
  `claude-haiku-5-5` and `claude-sonnet-5-5`) before anything is sent. Any other ID, or a code
  agent, raises ModelNotAllowed and no call is made (fix-plan 1.4).
- The client holds the key from server/config.py (`CINDIA_ANTHROPIC_API_KEY` first, then
  `ANTHROPIC_API_KEY`), `base_url=config.CLAUDE_BASE_URL` and `max_retries=0`. Nothing else here
  reads a key. Tests replace `make_client()` with a fake.
- `client.messages.parse()` with the agent's Pydantic model as `output_format` and the agent's own
  `max_tokens` from the roster. The person's words go in the one user turn, never an assistant turn.
- Speed settings: thinking off and effort low, as v1's B09 sends them. Haiku 5.5 takes
  `thinking: {"type": "disabled"}`. Sonnet 5.5 rejects "disabled" and takes "between_tools", which
  with no tools in the request means no thinking (B02). Never `temperature`, `top_p`, `top_k`,
  enabled thinking or a prefill. If a call with the speed settings answers 400, later calls to
  that model leave them out (the first lever the plan names), and this call fails as upstream_error.
- Each call runs in a worker thread with a timeout no longer than the agent's own. A call that runs
  past it is abandoned, never awaited (B02's pattern).
- A `stop_reason` of `refusal` or `max_tokens`, or no parsed output, raises `Unknown` with a plain
  reason, so the agent takes its unknown path (B2-32). With structured outputs the answer is always
  JSON unless Claude declined or was cut off, so a "not JSON at all" parse failure counts as Unknown
  too. A timeout raises CallFailed("upstream_timeout"), an API error CallFailed("upstream_error"),
  and an answer that doesn't fit the model CallFailed("invalid_model_output").
- It never logs a prompt, a response or a key: one line per failure, with the agent and the code.
"""

from __future__ import annotations

import concurrent.futures
import contextvars
import logging
import re
import threading
import time
from dataclasses import dataclass, field
from typing import Any, Optional, TypeVar

from pydantic import BaseModel, ValidationError

from server import config
from server.b14_swarm import roster

log = logging.getLogger("cindia.b14")

T = TypeVar("T", bound=BaseModel)

# The client's own timeout, a ceiling: each request passes its own, shorter one.
CLIENT_TIMEOUT_S = 10.0
# A call with less time than this left isn't worth sending.
MIN_TIMEOUT_S = 0.3

# One worker thread per in-flight call. Two runs at once, each with up to three calls side by side,
# plus calls abandoned after their timeout, which end when the SDK's own timeout does.
_pool = concurrent.futures.ThreadPoolExecutor(max_workers=12, thread_name_prefix="b14-llm")

# Models that answered 400 to the speed settings: later calls leave them out.
_speed_off: set[str] = set()
_speed_lock = threading.Lock()

_client_lock = threading.Lock()
_client: Any = None
_client_key: Optional[str] = None


# The enum value a failure shows as in a step summary.
REASON_OF_CODE = {
    "upstream_timeout": "timeout",
    "upstream_error": "error",
    "invalid_model_output": "invalid",
    "key_missing": "no_key",
}


class ModelNotAllowed(ValueError):
    """A model ID outside config.ALLOWED_MODELS, or a code agent asked to call a model."""


class Unknown(Exception):
    """Claude declined, ran out of tokens or gave no answer. The agent takes its unknown path.

    `reason` is an enum value for summaries (`declined`, `cut_off`, `empty`), `message` a plain
    sentence for logs and error bodies.
    """

    def __init__(self, reason: str, message: str):
        super().__init__(message)
        self.reason = reason
        self.message = message


class CallFailed(Exception):
    """The call failed. `code` is the contract's error code: upstream_timeout, upstream_error,
    invalid_model_output or key_missing. `reason` is the enum value a step summary shows."""

    def __init__(self, code: str, message: str, reason: Optional[str] = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.reason = reason or REASON_OF_CODE.get(code, "error")


def check_model(model: Optional[str]) -> str:
    """The model ID when it's one of config.ALLOWED_MODELS, else ModelNotAllowed."""
    if not isinstance(model, str) or model not in config.ALLOWED_MODELS:
        raise ModelNotAllowed("The swarm uses only the platform's two Claude models.")
    return model


def make_client() -> Any:
    """An Anthropic client with the key from server/config.py, the platform base URL and no retries.

    The client is kept for the process (connections are reused), and built again when the key changes.
    """
    global _client, _client_key
    from anthropic import Anthropic

    key = config.ANTHROPIC_API_KEY
    with _client_lock:
        if _client is None or _client_key is not key:
            _client = Anthropic(api_key=key, base_url=config.CLAUDE_BASE_URL, timeout=CLIENT_TIMEOUT_S, max_retries=0)
            _client_key = key
        return _client


def speed_settings(model: str) -> dict[str, Any]:
    """Thinking off and effort low for this model, or {} once the model answered 400 to them."""
    with _speed_lock:
        if model in _speed_off:
            return {}
    thinking = {"type": "disabled"} if model == config.MODEL_FAST else {"type": "between_tools"}
    return {"thinking": thinking, "output_config": {"effort": "low"}}


def request_kwargs(agent_id: str, system: str, content: str, output_model: type[BaseModel], timeout_s: float) -> dict[str, Any]:
    """Everything parse() sends for one call. Raises ModelNotAllowed before anything else."""
    a = roster.spec(agent_id)
    if a.kind != "claude":
        raise ModelNotAllowed(f"{agent_id} is a code agent and calls no model.")
    model = check_model(a.model)
    kwargs: dict[str, Any] = {
        "model": model,
        "max_tokens": a.max_tokens,
        "system": system,
        "messages": [{"role": "user", "content": content}],
        "output_format": output_model,
        "timeout": timeout_s,
    }
    kwargs.update(speed_settings(model))
    return kwargs


def _send(client: Any, kwargs: dict[str, Any]) -> Any:
    return client.messages.parse(**kwargs)


def _note(agent_id: str, what: str) -> None:
    # The agent and an enum only: never the prompt, the answer, the request or the key.
    log.info("b14 %s: %s", agent_id, what)


def _not_json(exc: ValidationError) -> bool:
    try:
        errors = exc.errors()
    except Exception:
        return False
    return bool(errors) and all(e.get("type") == "json_invalid" for e in errors)


def _failure(exc: BaseException, agent_id: str, kwargs: dict[str, Any]) -> Exception:
    """Maps an exception from the SDK (or a fake) to Unknown or CallFailed."""
    import anthropic

    if isinstance(exc, (anthropic.APITimeoutError, anthropic.DeadlineExceededError)):
        _note(agent_id, "upstream_timeout")
        return CallFailed("upstream_timeout", "Claude didn't answer in time.")
    if isinstance(exc, ValidationError):
        if _not_json(exc):
            _note(agent_id, "unknown (not JSON: declined or cut off)")
            return Unknown("cut_off", "Claude's answer was declined or cut off.")
        _note(agent_id, "invalid_model_output")
        return CallFailed("invalid_model_output", "Claude's answer didn't have the expected shape.")
    if isinstance(exc, anthropic.APIResponseValidationError):
        _note(agent_id, "invalid_model_output")
        return CallFailed("invalid_model_output", "Claude's answer didn't have the expected shape.")
    if isinstance(exc, anthropic.APIStatusError):
        status = getattr(exc, "status_code", 0)
        if status == 400 and "thinking" in kwargs:
            with _speed_lock:
                _speed_off.add(kwargs["model"])
            _note(agent_id, "upstream_error 400, speed settings off for this model from now on")
        else:
            _note(agent_id, f"upstream_error {status}")
        return CallFailed("upstream_error", f"Claude answered with an error (status {status}).")
    if isinstance(exc, anthropic.APIError):
        _note(agent_id, "upstream_error")
        return CallFailed("upstream_error", "Claude couldn't be reached.")
    if isinstance(exc, ValueError):
        _note(agent_id, "invalid_model_output")
        return CallFailed("invalid_model_output", "Claude's answer didn't have the expected shape.")
    _note(agent_id, f"upstream_error ({type(exc).__name__})")
    return CallFailed("upstream_error", "The call to Claude failed.")


def _read(resp: Any, output_model: type[T], agent_id: str) -> T:
    stop = getattr(resp, "stop_reason", None)
    if stop == "refusal":
        _note(agent_id, "unknown (refusal)")
        raise Unknown("declined", "Claude declined to answer this one.")
    if stop == "max_tokens":
        _note(agent_id, "unknown (max_tokens)")
        raise Unknown("cut_off", "Claude's answer ran past its length limit.")
    parsed = getattr(resp, "parsed_output", None)
    if parsed is None:
        _note(agent_id, "unknown (no parsed output)")
        raise Unknown("empty", "Claude gave no answer.")
    if isinstance(parsed, dict):
        try:
            parsed = output_model.model_validate(parsed)
        except ValidationError:
            parsed = None
    if not isinstance(parsed, output_model):
        _note(agent_id, "invalid_model_output")
        raise CallFailed("invalid_model_output", "Claude's answer didn't have the expected shape.")
    return parsed


def parse(agent_id: str, system: str, content: str, output_model: type[T], timeout_s: float) -> T:
    """One structured call for one agent, inside `timeout_s` (and the agent's own timeout).

    Returns the parsed output. Raises ModelNotAllowed (before any call), Unknown or CallFailed.
    """
    kwargs = request_kwargs(agent_id, system, content, output_model, timeout_s)
    if not config.has_key("ANTHROPIC_API_KEY"):
        raise CallFailed("key_missing", "This upgrade needs ANTHROPIC_API_KEY, which isn't set.")
    limit = min(float(timeout_s), roster.spec(agent_id).timeout_s)
    if limit < MIN_TIMEOUT_S:
        _note(agent_id, "skipped, no time left")
        raise CallFailed("upstream_timeout", "There was no time left for this call.", reason="budget")
    kwargs["timeout"] = limit
    client = make_client()
    future = _pool.submit(_send, client, kwargs)
    try:
        resp = future.result(timeout=limit)
    except concurrent.futures.TimeoutError:
        future.cancel()  # abandoned, never awaited
        _note(agent_id, "upstream_timeout")
        raise CallFailed("upstream_timeout", "Claude didn't answer in time.") from None
    except Exception as exc:
        raise _failure(exc, agent_id, kwargs) from None
    return _read(resp, output_model, agent_id)


@dataclass
class Attempt:
    """parse()'s outcome without exceptions: the value, or the reason (an enum value) it's missing."""

    value: Any
    reason: Optional[str]
    ms: int
    code: Optional[str] = None

    @property
    def ok(self) -> bool:
        return self.value is not None


@dataclass
class Tally:
    """How a run's calls went: answers Claude gave (`ok`, an Unknown counts, since Claude answered)
    and the contract codes of the calls that failed. The router reads it: a run in which Claude never
    answered is an error, so the scripted answer plays."""

    ok: int = 0
    failed: list[str] = field(default_factory=list)
    _lock: threading.Lock = field(default_factory=threading.Lock, repr=False)

    def add(self, code: Optional[str]) -> None:
        with self._lock:
            if code is None:
                self.ok += 1
            else:
                self.failed.append(code)

    def never_answered(self) -> Optional[str]:
        """The first failure's code when calls were made and none was answered, else None."""
        with self._lock:
            if self.ok == 0 and self.failed:
                real = [c for c in self.failed if c != "budget"]
                return (real or self.failed)[0]
            return None


_tally: contextvars.ContextVar[Optional[Tally]] = contextvars.ContextVar("b14_tally", default=None)


def start_tally() -> Tally:
    """A new tally for the calls made in this context (and in work submitted with copy_context())."""
    t = Tally()
    _tally.set(t)
    return t


def submit(pool: concurrent.futures.Executor, fn: Any, *args: Any, **kwargs: Any) -> concurrent.futures.Future:
    """pool.submit() in a copy of this context, so the worker's calls count in this run's tally."""
    return pool.submit(contextvars.copy_context().run, fn, *args, **kwargs)


def attempt(agent_id: str, system: str, content: str, output_model: type[BaseModel], timeout_s: float) -> Attempt:
    """parse(), with Unknown and CallFailed turned into a reason. ModelNotAllowed still raises."""
    t0 = time.monotonic()
    tally = _tally.get()
    try:
        value = parse(agent_id, system, content, output_model, timeout_s)
        if tally is not None:
            tally.add(None)
        return Attempt(value, None, _ms(t0))
    except Unknown as exc:
        if tally is not None:
            tally.add(None)
        return Attempt(None, exc.reason, _ms(t0))
    except CallFailed as exc:
        if tally is not None:
            tally.add("budget" if exc.reason == "budget" else exc.code)
        return Attempt(None, exc.reason, _ms(t0), exc.code)


def _ms(t0: float) -> int:
    return max(0, int(round((time.monotonic() - t0) * 1000)))


def data_block(tag: str, text: str) -> str:
    """The person's words (or any untrusted text) in a delimited data block, with the tag's own
    closing text taken out so it can't end the block early."""
    clean = re.sub(rf"<\s*/?\s*{re.escape(tag)}\s*>", "", str(text), flags=re.IGNORECASE)
    return f"<{tag}>\n{clean}\n</{tag}>"
