"""One router per upgrade: server/routers/bNN_<slug>.py defines router = APIRouter(prefix="/api/bNN").

server/main.py includes the `router` of every module here that defines one, so an upgrade never
edits main.py. Helper modules with an upgrade's prefix and no `router` (such as b04_nessie.py) are
skipped.
"""
