"""The FastAPI app. Run with: npm run server (uvicorn --reload on 127.0.0.1:8000).

It includes the `router` of every module in server/routers/, so an upgrade never edits this file.
"""

from __future__ import annotations

import importlib
import logging
import pkgutil
import re
import time

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from server import config
from server import routers as routers_pkg
from server import ApiError, error_response

log = logging.getLogger("cindia")
if not log.handlers:
    _handler = logging.StreamHandler()
    _handler.setFormatter(logging.Formatter("%(asctime)s %(message)s", "%H:%M:%S"))
    log.addHandler(_handler)
log.setLevel(logging.INFO)
log.propagate = False

app = FastAPI(title="Cindia", version=config.VERSION)

ROUTER_RE = re.compile(r"^(b\d\d)_[a-z0-9_]+$")
LOADED: list[str] = []


def _load_routers() -> None:
    for mod in sorted(pkgutil.iter_modules(routers_pkg.__path__), key=lambda m: m.name):
        m = ROUTER_RE.match(mod.name)
        if not m:
            continue
        try:
            module = importlib.import_module(f"server.routers.{mod.name}")
        except Exception as exc:  # a broken router must not take the server down
            log.info("router %s failed to load: %s", mod.name, type(exc).__name__)
            continue
        router = getattr(module, "router", None)
        if router is None:
            continue  # a helper module, such as b04_nessie.py
        app.include_router(router)
        prefix = m.group(1)
        if prefix not in LOADED:
            LOADED.append(prefix)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """One line per request: route, status, milliseconds. Never a key, a body or Claude's output."""
    t0 = time.perf_counter()
    status = 500
    try:
        response = await call_next(request)
        status = response.status_code
        return response
    finally:
        ms = (time.perf_counter() - t0) * 1000
        log.info("%s %s %d %.0fms", request.method, request.url.path, status, ms)


@app.exception_handler(ApiError)
async def api_error_handler(_request: Request, exc: ApiError):
    return error_response(exc.code, exc.message)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_request: Request, exc: RequestValidationError):
    first = exc.errors()[0] if exc.errors() else {}
    where = ".".join(str(p) for p in first.get("loc", []) if p != "body")
    message = f"The request body doesn't match the contract{f' at {where}' if where else ''}."
    return error_response("bad_request", message)


@app.exception_handler(StarletteHTTPException)
async def http_error_handler(_request: Request, exc: StarletteHTTPException):
    if exc.status_code == 404:
        return error_response("not_found", "Nothing is at this path.")
    if exc.status_code == 405:
        return error_response("bad_request", "This method isn't allowed on this path.")
    if 400 <= exc.status_code < 500:
        return error_response("bad_request", "The request isn't valid.")
    return error_response("internal", "The server hit an error.")


@app.exception_handler(Exception)
async def unhandled_error_handler(_request: Request, exc: Exception):
    log.info("unhandled %s", type(exc).__name__)
    return error_response("internal", "The server hit an error.")


@app.get("/api/health")
def health() -> dict:
    return {
        "ok": True,
        "version": config.VERSION,
        "keys": {"anthropic": config.has_key("ANTHROPIC_API_KEY"), "nessie": config.has_key("NESSIE_KEY")},
        "routers": list(LOADED),
    }


_load_routers()
