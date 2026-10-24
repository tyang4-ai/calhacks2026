# Apify Actor apify/cheerio-scraper: input, output, price

> Sources:
> - https://apify.com/apify/cheerio-scraper
> - https://apify.com/apify/cheerio-scraper/input-schema
> - https://apify.com/apify/cheerio-scraper/api/endpoints
> - https://help.apify.com/en/articles/3470975-how-to-estimate-compute-unit-usage-for-your-project
> - https://apify.com/apify/website-content-crawler (for the compute unit price and the comparison below)
> Fetched: 2026-10-24.
>
> These pages could only be read through a fetch tool that summarizes, so the field table below is a summary of the Actor's input schema and says so. The JSON input example and the page function are copied from the Actor's API page and its README, with the page's display markers removed. Everything else is labeled as a summary.

## Why this Actor

B15's Scout crawls Cindia's own sandbox market at `PUBLIC_SITE_URL/market/` and needs each page's title and text. Cheerio Scraper is the smallest Apify Actor that does that: it downloads each page over plain HTTP, parses it with Cheerio (no browser), runs one JavaScript `pageFunction` on it, and saves whatever that function returns as one dataset item. It follows links that match a selector and a glob, so one start URL covers the market's index and its listing pages.

The other candidate, `apify/website-content-crawler`, returns `text` and `markdown` without a page function, but its default crawler type switches to a headless browser, it has many more settings, and its page says to use another Actor for a single URL. For static pages on our own site, Cheerio Scraper is simpler and cheaper.

## Calling it

- Actor name for the API: `apify/cheerio-scraper`, written `apify~cheerio-scraper` in URL paths. The console uses the internal ID `YrQuEkowkNCLdk4j2`.
- Run it with `POST https://api.apify.com/v2/actors/apify~cheerio-scraper/run-sync-get-dataset-items` (see `run-sync-get-dataset-items.md` in this folder). The POST body is the Actor input. Only POST passes input.
- Send the token as `Authorization: Bearer <token>` (see `api-authentication-and-limits.md`), never as `?token=`, although the Actor's API page shows the query form.
- Add `clean=true` to the query string. Without it every item also carries `#error` and `#debug` fields (the request ID, URLs, method, retry count, error messages and status code).
- Add `timeout=<seconds>` to bound the run. The sync call itself gives up after 300 seconds with a 408.

## Input fields

From the Actor's input schema page (https://apify.com/apify/cheerio-scraper/input-schema), read through a fetch tool on 2026-10-24. This table is a summary of the schema, with the key names, types and defaults as the page gives them:

| Key | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `startUrls` | array | yes | none | Fixed list of URLs to scrape, each `{ "url": "https://..." }`. Each URL must start with `http://` or `https://` |
| `pageFunction` | string | yes | none | JavaScript source of one async function, run on each loaded page. It returns the data to save |
| `proxyConfiguration` | object | yes | `{"useApifyProxy": true}` | Proxy settings: `useApifyProxy` (boolean), `apifyProxyGroups` (string array), `proxyUrls` (string array) |
| `linkSelector` | string | no | none listed (new scrapers get `a[href]`) | CSS selector for the links to follow. Empty means page links are ignored |
| `globs` | array | no | `[]` | Glob patterns, each `{ "glob": "..." }`, that a found link must match to be enqueued |
| `pseudoUrls` | array | no | `[]` | Regex-style URL patterns in `[]` brackets, another way to filter enqueued links |
| `excludes` | array | no | `[]` | Glob patterns for links that must never be enqueued |
| `maxCrawlingDepth` | integer, min 0 | no | `0` | How many links deep from the start URLs. `0` means no limit |
| `maxPagesPerCrawl` | integer, min 0 | no | `0` | Most pages to load. `0` means no limit |
| `maxResultsPerCrawl` | integer, min 0 | no | `0` | Most items to save. `0` means no limit |
| `maxConcurrency` | integer, min 1 | no | `50` | Most pages processed at once |
| `pageLoadTimeoutSecs` | integer, min 1 | no | `60` | Seconds to load a page before it counts as failed and is retried |
| `pageFunctionTimeoutSecs` | integer, min 1 | no | `60` | Seconds the page function may run |
| `maxRequestRetries` | integer, min 0 | no | `3` | Retries per page after a load error or a page function exception |
| `respectRobotsTxtFile` | boolean | no | `false` | Check `robots.txt` before each page. The crawler sends no specific user agent, and crawl-delay isn't supported |
| `ignoreSslErrors` | boolean | no | `false` | Ignore TLS certificate errors |
| `forceResponseEncoding` | boolean | no | `false` | Use the `suggestResponseEncoding` fallback even when the site declares an encoding |
| `debugLog` | boolean | no | `false` | Put debug messages in the run log |
| `customData` | object | no | `{}` | Any object, passed to the page function as `context.customData` |

The page also lists `keepUrlFragments` (boolean, `false`), `proxyRotation` (`RECOMMENDED`, `PER_REQUEST` or `UNTIL_FAILURE`), `sessionPoolName`, `initialCookies`, `additionalMimeTypes` (`[]`), `suggestResponseEncoding`, `preNavigationHooks`, `postNavigationHooks` and `datasetName`, `keyValueStoreName` and `requestQueueName`. Cindia needs none of them.

## Input example (from the Actor's API page)

Copied from https://apify.com/apify/cheerio-scraper/api/endpoints, with the page's display markers removed:

```json
{
  "startUrls": [
    {
      "url": "https://crawlee.dev/js"
    }
  ],
  "respectRobotsTxtFile": true,
  "globs": [
    {
      "glob": "https://crawlee.dev/js/*/*"
    }
  ],
  "pseudoUrls": [],
  "excludes": [
    {
      "glob": "/**/*.{png,jpg,jpeg,pdf}"
    }
  ],
  "linkSelector": "a[href]",
  "pageFunction": "async function pageFunction(context) {\n    const { $, request, log } = context;\n\n    // The \"$\" property contains the Cheerio object which is useful\n    // for querying DOM elements and extracting data from them.\n    const pageTitle = $('title').first().text();\n\n    // The \"request\" property contains various information about the web page loaded. \n    const url = request.url;\n    \n    // Use \"log\" object to print information to Actor log.\n    log.info('Page scraped', { url, pageTitle });\n\n    // Return an object with the data extracted from the page.\n    // It will be stored to the resulting dataset.\n    return {\n        url,\n        pageTitle\n    };\n}",
  "proxyConfiguration": {
    "useApifyProxy": true
  },
  "initialCookies": [],
  "additionalMimeTypes": [],
  "customData": {}
}
```

## Output: one dataset item per object the page function returns

From the Actor's page (summary): for each object `pageFunction` returns, the Actor pushes one record into the dataset. Returning nothing saves nothing for that page. The README's example item is:

```json
{ "message": "Hello world!", "#error": false, "#debug": { "requestId": "fvwscO2UJLdr10B", "url": "https://www.example.com/", "loadedUrl": "https://www.example.com/", "method": "GET", "retryCount": 0, "errorMessages": null, "statusCode": 200 } }
```

With `clean=true` on the API call, the `#error` and `#debug` fields are left out, so the items hold only what the page function returned.

## Price

- Model: pay per usage. The Actor itself is free, and a run pays for Apify platform compute (Actor page, summary).
- A compute unit (CU) is 1 GB of memory for 1 hour. Apify's help article says: "Average cheerio consumption - 3000 pages per 1 CU" (Oct 25, 2024).
- The Website Content Crawler page gives the baseline as $0.25 per CU, and about $0.2 per 1,000 pages with the raw HTTP crawler (summary).
- So a 30-page crawl of the sandbox market costs a small fraction of a cent. The free plan's $5 a month covers thousands of such scans. This is our arithmetic, not Apify's.

## How Cindia calls it (not from Apify's docs)

B15's Scout, in httpx, with the token in the header. `PUBLIC_SITE_URL` comes from `server/config.py`.

```python
PAGE_FUNCTION = """async function pageFunction(context) {
  const { $, request } = context;
  const title = $('title').first().text().trim().slice(0, 300);
  const text = $('main').text().replace(/\\s+/g, ' ').trim().slice(0, 2000);
  return { url: request.url, title, text };
}"""

market = PUBLIC_SITE_URL.rstrip("/") + "/market/"
body = {
    "startUrls": [{"url": market}],
    "linkSelector": "a[href]",
    "globs": [{"glob": market + "**"}],
    "maxCrawlingDepth": 1,
    "maxPagesPerCrawl": 30,
    "maxConcurrency": 5,
    "maxRequestRetries": 1,
    "pageLoadTimeoutSecs": 15,
    "pageFunction": PAGE_FUNCTION,
    "proxyConfiguration": {"useApifyProxy": False},
}
r = httpx.post(
    "https://api.apify.com/v2/actors/apify~cheerio-scraper/run-sync-get-dataset-items",
    params={"timeout": 40, "format": "json", "clean": "true"},
    headers=config.apify_headers(),   # Bearer token, or {} when a network secret adds it
    json=body,
    timeout=45,
)
items = r.json() if r.status_code == 201 else []   # each item: { "url", "title", "text" }
```

Notes for B15:
- The globs pin the crawl to our own `/market/` pages, so it never leaves the sandbox market.
- The public site's `robots.txt` disallows every crawler so search engines stay off it. `respectRobotsTxtFile` stays at its default `false`, because the Scout crawls only our own site.
- `proxyConfiguration` is required. Send `{"useApifyProxy": false}` for our own site. If a run rejects that, send the default `{"useApifyProxy": true}` instead.
- `text` comes from the page's `<main>`, so the market pages put each listing's title, seller line, claim and description inside `<main>`.
