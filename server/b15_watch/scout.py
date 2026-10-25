"""The Scout: one synchronous run of Apify's Cheerio Scraper over the sandbox market
(docs/plans/B15-watch.md, Scout; docs/tech/apify/cheerio-scraper.md, "How Cindia calls it").

- `POST https://api.apify.com/v2/actors/apify~cheerio-scraper/run-sync-get-dataset-items` with
  `timeout=40&format=json&clean=true`, and the Actor input from `request_body()`: the market's index
  as the one start URL, links under `/market/` only, depth 1, 30 pages, `respectRobotsTxtFile: false`
  (the public site's robots.txt keeps search engines off, and this reads only our own pages) and no
  Apify proxy.
- The page function reads each page as D-deploy writes it: the title from the `h1`, the snippet from
  the first paragraph in `<main>`, and the text of `<main>` without the `.claim` paragraphs, which are
  Cindia's own note about the listing (written in the narrator's voice), never the seller's words. It
  returns nothing for the market's index.
- Auth only from `config.apify_headers()`: a Bearer token, or nothing in proxy mode. No URL built here
  carries a token, and nothing here logs a URL, a header or a body.
- 45 seconds on our side (APIFY_BUDGET_S). A timeout or a 408 is `upstream_timeout`, any other
  failure `upstream_error`. A missing `PUBLIC_SITE_URL` is `upstream_error` ("The sandbox market isn't
  set up yet."), and no token is `key_missing`.
- `clean_items()` keeps only `http` and `https` items whose URL starts with `PUBLIC_SITE_URL/market/`,
  drops the index and duplicate listings (a listing's key is its path without `.html` or a trailing
  slash, because Cloudflare Pages may answer `/market/listing-01.html` at `/market/listing-01`), and
  caps title and snippet at 300 characters and the text at 2,000.
"""

from __future__ import annotations

import logging
import re
import time
from dataclasses import dataclass
from typing import Any, Optional
from urllib.parse import urlsplit

import httpx

from server import config
from server.b15_watch import thresholds

log = logging.getLogger("cindia.b15")

APIFY_URL = "https://api.apify.com/v2/actors/apify~cheerio-scraper/run-sync-get-dataset-items"

# Tests set an httpx MockTransport here. None means the real network.
TRANSPORT: Optional[httpx.BaseTransport] = None

PAGE_FUNCTION = """async function pageFunction(context) {
  const { $, request } = context;
  const clean = (s) => String(s || '').replace(/\\s+/g, ' ').trim();
  let path = '';
  try { path = new URL(request.url).pathname; } catch (e) { return; }
  if (/\\/market\\/?(index(\\.html)?)?$/.test(path)) return;
  const main = $('main').first();
  const title = clean(main.find('h1').first().text() || $('h1').first().text()).slice(0, 300);
  if (!title) return;
  const snippet = clean(main.find('p').first().text()).slice(0, 300);
  const body = main.clone();
  body.find('.claim').remove();
  const text = clean(body.text()).slice(0, 2000);
  return { url: request.url, title, snippet, text };
}"""


class ScoutError(Exception):
    """The crawl failed. `code` is the contract's error code, `message` one plain sentence."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass(frozen=True)
class Item:
    url: str
    title: str
    snippet: str
    text: str


def market_url(site: Optional[str] = None) -> str:
    """`PUBLIC_SITE_URL/market/`."""
    base = (site if site is not None else config.PUBLIC_SITE_URL) or ""
    return base.strip().rstrip("/") + "/market/"


def request_body(site: Optional[str] = None, max_pages: int = thresholds.MAX_PAGES) -> dict[str, Any]:
    """The Actor input, exactly as docs/tech/apify/cheerio-scraper.md gives Cindia's call."""
    market = market_url(site)
    return {
        "startUrls": [{"url": market}],
        "linkSelector": "a[href]",
        "globs": [{"glob": market + "**"}],
        "maxCrawlingDepth": thresholds.MAX_DEPTH,
        "maxPagesPerCrawl": int(max_pages),
        "maxConcurrency": 5,
        "maxRequestRetries": 1,
        "pageLoadTimeoutSecs": 15,
        "respectRobotsTxtFile": False,
        "pageFunction": PAGE_FUNCTION,
        "proxyConfiguration": {"useApifyProxy": False},
    }


def request_params() -> dict[str, Any]:
    return {"timeout": thresholds.APIFY_RUN_TIMEOUT_S, "format": "json", "clean": "true"}


def _clip(value: Any, cap: int) -> str:
    text = " ".join(value.split()) if isinstance(value, str) else ""
    return text[:cap]


def _norm_path(path: str) -> str:
    p = re.sub(r"/+", "/", path or "/")
    if p.lower().endswith(".html"):
        p = p[: -len(".html")]
    return p.rstrip("/").lower()


def listing_key(url: str) -> str:
    """A listing's identity: host and path, without `.html` or a trailing slash, lowercased."""
    parts = urlsplit(url)
    return f"{(parts.hostname or '').lower()}{_norm_path(parts.path)}"


def _market_parts(site: str) -> tuple[str, str]:
    m = urlsplit(market_url(site))
    return (m.hostname or "").lower(), _norm_path(m.path)  # host, "/market" (or "/<prefix>/market")


def on_market(url: str, site: str) -> bool:
    """An http or https URL under `PUBLIC_SITE_URL/market/` (the index included)."""
    if not isinstance(url, str) or len(url) > thresholds.URL_CAP:
        return False
    try:
        parts = urlsplit(url.strip())
    except ValueError:
        return False
    if parts.scheme.lower() not in ("http", "https"):
        return False
    host, market_path = _market_parts(site)
    if not host or (parts.hostname or "").lower() != host:
        return False
    return (_norm_path(parts.path) + "/").startswith(market_path + "/")


def is_index(url: str, site: str) -> bool:
    """The market's index page: `/market/`, `/market` or `/market/index.html`."""
    _, market_path = _market_parts(site)
    path = _norm_path(urlsplit(url).path)
    return path in (market_path, market_path + "/index")


def clean_items(raw: Any, site: str, cap: int = thresholds.MAX_PAGES) -> list[Item]:
    """The listings worth checking, in the order Apify returned them."""
    out: list[Item] = []
    seen: set[str] = set()
    if not isinstance(raw, list):
        return out
    for it in raw:
        if not isinstance(it, dict):
            continue
        url = it.get("url")
        if not isinstance(url, str) or not on_market(url, site) or is_index(url, site):
            continue
        key = listing_key(url)
        if key in seen:
            continue
        title = _clip(it.get("title"), thresholds.TEXT_CAP)
        if not title:
            continue
        seen.add(key)
        out.append(
            Item(
                url=url.strip(),
                title=title,
                snippet=_clip(it.get("snippet"), thresholds.TEXT_CAP),
                text=_clip(it.get("text"), thresholds.PAGE_TEXT_CAP),
            )
        )
        if len(out) >= cap:
            break
    return out


def check_ready() -> None:
    """Raises ScoutError when the crawl can't run: no token, or no sandbox market."""
    if not config.has_key("APIFY_TOKEN"):
        raise ScoutError("key_missing", "This upgrade needs APIFY_TOKEN, which isn't set.")
    if not config.PUBLIC_SITE_URL:
        raise ScoutError("upstream_error", "The sandbox market isn't set up yet.")


def crawl(*, max_pages: int = thresholds.MAX_PAGES, budget_s: float = thresholds.APIFY_BUDGET_S) -> list[Item]:
    """One crawl of the sandbox market. Returns its listings, or raises ScoutError."""
    check_ready()
    site = config.PUBLIC_SITE_URL or ""
    timeout = max(1.0, float(budget_s))
    t0 = time.monotonic()
    try:
        with httpx.Client(timeout=timeout, transport=TRANSPORT, follow_redirects=False) as client:
            resp = client.post(APIFY_URL, params=request_params(), headers=config.apify_headers(), json=request_body(site, max_pages))
    except httpx.TimeoutException:
        log.info("b15 scout: upstream_timeout after %.0f ms", (time.monotonic() - t0) * 1000)
        raise ScoutError("upstream_timeout", "Apify didn't finish the crawl in time.") from None
    except httpx.HTTPError as exc:
        log.info("b15 scout: upstream_error (%s)", type(exc).__name__)
        raise ScoutError("upstream_error", "Apify couldn't be reached.") from None
    status = resp.status_code
    if status == 408:
        log.info("b15 scout: upstream_timeout (408)")
        raise ScoutError("upstream_timeout", "Apify didn't finish the crawl in time.")
    if status not in (200, 201):
        log.info("b15 scout: upstream_error (status %d)", status)
        raise ScoutError("upstream_error", f"Apify answered with an error (status {status}).")
    try:
        raw = resp.json()
    except ValueError:
        raise ScoutError("upstream_error", "Apify's answer wasn't a list of pages.") from None
    if not isinstance(raw, list):
        raise ScoutError("upstream_error", "Apify's answer wasn't a list of pages.")
    items = clean_items(raw, site, cap=max_pages)
    log.info("b15 scout: %d items, %d kept, %.0f ms", len(raw), len(items), (time.monotonic() - t0) * 1000)
    return items
