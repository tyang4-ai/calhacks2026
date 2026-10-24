# Apify Actor apify/google-search-scraper: input, output, price

> Sources:
> - https://apify.com/apify/google-search-scraper
> - https://github.com/apify/langchain-apify/blob/main/langchain_apify/_client.py
> Fetched: 2026-10-24.
>
> The Store page could only be read through a fetch tool that summarizes, so the field lists below are summaries and say so. The code block is copied verbatim from Apify's open-source LangChain integration.

## Calling it

- Actor name for the API: `apify/google-search-scraper`, written `apify~google-search-scraper` in URL paths. Actor ID: `nFJndFXA5zjCTuudP`.
- Run it through `POST https://api.apify.com/v2/actors/apify~google-search-scraper/run-sync-get-dataset-items` (see run-sync-get-dataset-items.md).

## Input fields

From the Actor's Store page (https://apify.com/apify/google-search-scraper), read through a fetch tool on 2026-10-24. The page's JSON examples show these keys. This list is a summary, not a copy of the input schema:

| Key | Type | Meaning |
|---|---|---|
| `queries` | string | Search terms or Google search URLs, one per line (newline-separated) |
| `maxPagesPerQuery` | integer | Result pages per query. About 10 organic results per page. The page says 10 pages give about 100 results |
| `countryCode` | string | Country, for example `"us"` |
| `languageCode` | string | Search language, for example `"en"` |
| `mobileResults` | boolean | Mobile instead of desktop results. Default `false` |
| `includeUnfilteredResults` | boolean | Default `false`. Not described on the page |
| `saveHtml` | boolean | Save each results page's HTML. Default `false` |
| `saveHtmlToKeyValueStore` | boolean | Put that HTML in the key-value store. Default `false` |
| `maxConcurrency` | integer | Parallel requests. Default `10` |
| `customDataFunction` | string | A JavaScript function that returns extra fields |

The page also describes a results-per-page setting (10 to 100) and location (UULE) options without showing their JSON keys. Apify's own LangChain integration says the Actor has no `resultsPerPage` input (see the code below), so drive the count with `maxPagesPerQuery` and slice. Paid add-ons (AI Mode, AI Overview, Perplexity, ChatGPT, Copilot and Gemini search, paid results, leads enrichment, SEO tools) are off unless you turn them on, and each costs extra.

## Output: one dataset item per results page

From the same Store page (summary):

- Top-level keys of an item: `searchQuery` (with `term`, `url`, `device`, `page`, `type`, `domain`, `countryCode`, `languageCode`, `locationUule`), `relatedQueries`, `paidResults`, `paidProducts`, `organicResults`, `peopleAlsoAsk`, and `aiModeResult` when that add-on runs.
- Keys of each entry in `organicResults`: `title`, `url`, `displayedUrl`, `description`, `emphasizedKeywords`, `siteLinks`, `productInfo`, `type`, `position`.
- Paid results use `adPosition` instead of `position` and carry `"type": "paid"`.
- An older Apify Academy example reads `nonPromotedSearchResults`. That name is from an older output format. Current code reads `organicResults`.

## Price

From the Store page (summary): from $1.80 per 1,000 scraped result pages, pay per event. The free plan's $5 monthly credit covers over 1,000 result pages without add-ons. Add-ons are charged per event on top.

## How Apify's own LangChain integration calls it (verbatim code)

From `langchain_apify/_client.py` in https://github.com/apify/langchain-apify (main branch, fetched 2026-10-24). It shows the input it sends and how it flattens `organicResults`:

```python
    def google_search(
        self,
        query: str,
        max_results: int = _DEFAULT_GOOGLE_MAX_RESULTS,
        country_code: str | None = None,
        language_code: str | None = None,
        timeout_secs: int = _DEFAULT_RUN_TIMEOUT_SECS,
    ) -> tuple[Run, list[dict]]:
        """Run a Google search and return structured results.

        Uses ``apify/google-search-scraper`` with a single query.

        Args:
            query: Search query string.
            max_results: Maximum number of results to return.
            country_code: Two-letter country code for localised results.
            language_code: Two-letter language code.
            timeout_secs: Maximum time to wait for the run to finish.

        Returns:
            A ``(run_details, results)`` tuple. Each result dict has
            ``title``, ``url``, and ``description`` keys.

        Raises:
            RuntimeError: If the Actor run fails.
        """
        # apify/google-search-scraper has no resultsPerPage input; result count
        # is driven by maxPagesPerQuery (~10 results/page). Request enough pages
        # to cover max_results, then slice the flattened results below.
        run_input: dict = {
            'queries': query,
            'maxPagesPerQuery': max(1, (max_results + 9) // 10),
        }
        if country_code is not None:
            run_input['countryCode'] = country_code
        if language_code is not None:
            run_input['languageCode'] = language_code

        run, items = self.run_actor_and_get_items(
            _GOOGLE_SEARCH_ACTOR_ID,
            run_input=run_input,
            timeout_secs=timeout_secs,
            dataset_items_limit=max_results,
        )
        results: list[dict] = [
            {
                'title': organic.get('title', ''),
                'url': organic.get('url', ''),
                'description': organic.get('description', ''),
            }
            for item in items
            for organic in item.get('organicResults', [])
        ]
        return run, results[:max_results]
```
