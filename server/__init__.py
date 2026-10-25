"""Cindia's FastAPI backend. One router per Phase 2 upgrade lives in server/routers/.

The error shape from api-contract.md lives here, so every router imports it without a cycle:

    from server import ApiError
    raise ApiError("key_missing", "This upgrade needs NESSIE_KEY, which isn't set.")

main.py turns ApiError, validation errors and anything unhandled into
{ "error": { "code": string, "message": string } }. A message is one plain sentence, never a key,
a full request or a stack trace.
"""

from __future__ import annotations

from fastapi.responses import JSONResponse

STATUS = {
    "bad_request": 400,
    "not_found": 404,
    "key_missing": 503,
    "upstream_timeout": 504,
    "upstream_error": 502,
    "invalid_model_output": 502,
    "busy": 503,
    "internal": 500,
}


class ApiError(Exception):
    """Raise this from a route to answer with the contract's error shape."""

    def __init__(self, code: str, message: str):
        if code not in STATUS:
            code = "internal"
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = STATUS[code]


def error_response(code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=STATUS.get(code, 500), content={"error": {"code": code, "message": message}})
