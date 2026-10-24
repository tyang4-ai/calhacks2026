# Apify API v2: run an Actor synchronously and get its dataset items

> Sources:
> - https://docs.apify.com/api/v2/act-run-sync-get-dataset-items-post
> - https://docs.apify.com/api/v2/act-run-sync-get-dataset-items-get
> - https://github.com/apify/apify-docs/blob/master/apify-api/openapi/paths/actors/acts@%7BactorId%7D@run-sync-get-dataset-items.yaml
> - https://docs.apify.com/academy/api/run-actor-and-retrieve-data-via-api
> Fetched: 2026-10-24.
>
> Rendered from Apify's OpenAPI spec (apify/apify-docs repo, master branch, Oct 23, 2026), with the parameter definitions resolved, plus the synchronous-flow section of the Apify Academy tutorial.
> The canonical path prefix is `/v2/actors/`. The older `/v2/acts/` prefix still works and is deprecated. The Actor ID in the path uses a tilde: `apify~google-search-scraper`.

### POST `/v2/actors/{actorId}/run-sync-get-dataset-items`

**Run Actor synchronously and get dataset items.**

Runs a specific Actor and returns its dataset items.

The POST payload including its `Content-Type` header is passed as `INPUT` to
the Actor (usually `application/json`).
The HTTP response contains the Actors dataset items, while the format of
items depends on specifying dataset items' `format` parameter.

You can send all the same options in parameters as the [Get Dataset
Items] API endpoint.

The Actor is started with the default options; you can override them using
URL query parameters.
If the Actor run exceeds 300 seconds,
the HTTP response will return the 408 status code (Request Timeout).

Beware that it might be impossible to maintain an idle HTTP connection for a
long period of time,
due to client timeout or network conditions. Make sure your HTTP client is
configured to have a long enough connection timeout.
If the connection breaks, you will not receive any information about the run
and its status.

To run the Actor asynchronously, use the [Run
Actor] API endpoint instead.

| Parameter | In | Type | Meaning |
|---|---|---|---|
| `actorId` | path | string | Actor ID or the username of the Actor owner and the Actor name, separated by a tilde (`~`). Example: `compass~google-maps-extractor`. |
| `timeout` | query | number | Optional timeout for the run, in seconds. By default, the run uses the timeout from its configuration. Example: `60`. |
| `memory` | query | number | Memory limit for the run, in megabytes. You can set the amount of memory to a power of 2 with a minimum of 128. By default, the run uses the memory limit from its configuration. Don't change this value unless the Actor's documentation recommends it or you're aware of the consequences. Example: `256`. |
| `maxItems` | query | number | Specifies the maximum number of dataset items that will be charged for pay-per-result Actors. This does NOT guarantee that the Actor will return only this many items. It only ensures you won't be charged for more than this number of items. Only works for pay-per-result Actors. Value can be accessed in the actor run using `ACTOR_MAX_PAID_DATASET_ITEMS` environment variable. Example: `1000`. |
| `maxTotalChargeUsd` | query | number | Specifies the maximum total cost of the run. Use it to cap the total amount charged for all pricing models. You can access the maximum cost in your Actor by using the `ACTOR_MAX_TOTAL_CHARGE_USD` environment variable. Example: `5`. |
| `restartOnError` | query | boolean | Determines whether the run will be restarted if it fails. Example: `False`. |
| `build` | query | string | Specifies the Actor build to run. It can be either a build tag or build number. By default, the run uses the build from its configuration (typically `latest`). Example: `0.1.234`. |
| `webhooks` | query | string | Specifies optional webhooks associated with the Actor run, which can be used to receive a notification e.g. when the Actor finished or failed. The value is a Base64-encoded JSON array whose items follow the WebhookRepresentation schema. For more information, see [Webhooks documentation](https://docs.apify.com/platform/integrations/webhooks). Example: `dGhpcyBpcyBqdXN0IGV4YW1wbGUK...`. |
| `format` | query | string | Format of the results, possible values are: `json`, `jsonl`, `csv`, `html`, `xlsx`, `xml` and `rss`. The default value is `json`. Example: `json`. |
| `clean` | query | boolean | If `true` or `1` then the API endpoint returns only non-empty items and skips hidden fields (i.e. fields starting with the # character). The `clean` parameter is just a shortcut for `skipHidden=true` and `skipEmpty=true` parameters. Note that since some objects might be skipped from the output, that the result might contain less items than the `limit` value. Example: `False`. |
| `offset` | query | number | Number of items that should be skipped at the start. The default value is `0`. Example: `0`. |
| `limit` | query | number | Maximum number of items to return. By default there is no limit. |
| `fields` | query | string | A comma-separated list of fields which should be picked from the items, only these fields will remain in the resulting record objects. Note that the fields in the outputted items are sorted the same way as they are specified in the `fields` query parameter. You can use this feature to effectively fix the output format. Example: `myValue,myOtherValue`. |
| `outputFields` | query | string | A comma-separated list of output field names that positionally rename the fields specified in the `fields` parameter. For example, `?fields=headline,url&outputFields=title,link` renames `headline` to `title` and `url` to `link` in the output. The number of names in `outputFields` must match the number of names in `fields`. Requires the `fields` parameter to be specified as well. Example: `title,link`. |
| `omit` | query | string | A comma-separated list of fields which should be omitted from the items. Example: `myValue,myOtherValue`. |
| `unwind` | query | string | A comma-separated list of fields which should be unwound, in order which they should be processed. Each field should be either an array or an object. If the field is an array then every element of the array will become a separate record and merged with parent object. If the unwound field is an object then it is merged with the parent object. If the unwound field is missing or its value is neither an array nor an object and therefore cannot be merged with a parent object then the item gets preserved as it is. Note that the unwound items ignore the `desc` parameter. Example: `myValue,myOtherValue`. |
| `flatten` | query | string | A comma-separated list of fields which should transform nested objects into flat structures. For example, with `flatten="foo"` the object `{"foo":{"bar": "hello"}}` is turned into `{"foo.bar": "hello"}`. The original object with properties is replaced with the flattened object. Example: `myValue`. |
| `desc` | query | boolean | By default, results are returned in the same order as they were stored. To reverse the order, set this parameter to `true` or `1`. Example: `True`. |
| `attachment` | query | boolean | If `true` or `1` then the response will define the `Content-Disposition: attachment` header, forcing a web browser to download the file rather than to display it. By default this header is not present. Example: `True`. |
| `delimiter` | query | string | A delimiter character for CSV files, only used if `format=csv`. You might need to URL-encode the character (e.g. use `%09` for tab or `%3B` for semicolon). The default delimiter is a simple comma (`,`). Example: `;`. |
| `bom` | query | boolean | All text responses are encoded in UTF-8 encoding. By default, the `format=csv` files are prefixed with the UTF-8 Byte Order Mark (BOM), while `json`, `jsonl`, `xml`, `html` and `rss` files are not. If you want to override this default behavior, specify `bom=1` query parameter to include the BOM or `bom=0` to skip it. Example: `False`. |
| `xmlRoot` | query | string | Overrides default root element name of `xml` output. By default the root element is `items`. Example: `items`. |
| `xmlRow` | query | string | Overrides default element name that wraps each page or page function result object in `xml` output. By default the element name is `item`. Example: `item`. |
| `skipHeaderRow` | query | boolean | If `true` or `1` then header row in the `csv` format is skipped. Example: `True`. |
| `skipHidden` | query | boolean | If `true` or `1` then hidden fields are skipped from the output, i.e. fields starting with the `#` character. Example: `False`. |
| `skipEmpty` | query | boolean | If `true` or `1` then empty items are skipped from the output. Note that if used, the results might contain less items than the limit value. Example: `False`. |
| `simplified` | query | boolean | If `true` or `1` then, the endpoint applies the `fields=url,pageFunctionResult,errorInfo` and `unwind=pageFunctionResult` query parameters. This feature is used to emulate simplified results provided by the legacy Apify Crawler product and it's not recommended to use it in new integrations. Example: `False`. |
| `view` | query | string | Defines the view configuration for dataset items based on the schema definition. This parameter determines how the data will be filtered and presented. For complete specification details, see the [dataset schema documentation](/storage/dataset-schema). Example: `overview`. |
| `skipFailedPages` | query | boolean | If `true` or `1` then, the all the items with errorInfo property will be skipped from the output. This feature is here to emulate functionality of API version 1 used for the legacy Apify Crawler product and it's not recommended to use it in new integrations. Example: `False`. |
| `feedTitle` | query | string | Overrides the auto-generated RSS channel `<title>` element. Only used when `format=rss`. If not provided, the title defaults to `Dataset <label>`. Example: `Latest posts from r/pasta`. |
| `feedDescription` | query | string | Overrides the auto-generated RSS channel `<description>` element. Only used when `format=rss`. If not provided, the description defaults to `Items in dataset with id "<datasetId>".` Example: `Scraped forum posts`. |

Request body: the Actor input as JSON (`Content-Type: application/json`). It is passed to the Actor as its `INPUT`.

Responses: `201` success: a JSON array of the dataset items (the Actor's results), `400` BadRequest, `401` Unauthorized, `402` PaymentRequired, `403` Forbidden, `404` NotFound, `408` Timeout, `429` TooManyRequests.

### GET `/v2/actors/{actorId}/run-sync-get-dataset-items`

**Run Actor synchronously and get dataset items (GET).**

Runs a specific Actor and returns its dataset items.
The run must finish in 300 seconds
otherwise the API endpoint returns a timeout error.
The Actor is not passed any input.

It allows to send all possible options in parameters from [Get Dataset
Items] API endpoint.

Beware that it might be impossible to maintain an idle HTTP connection for a
long period of time,
due to client timeout or network conditions. Make sure your HTTP client is
configured to have a long enough connection timeout.
If the connection breaks, you will not receive any information about the run
and its status.

To run the Actor asynchronously, use the [Run
Actor] API endpoint instead.

| Parameter | In | Type | Meaning |
|---|---|---|---|
| `actorId` | path | string | Actor ID or the username of the Actor owner and the Actor name, separated by a tilde (`~`). Example: `compass~google-maps-extractor`. |
| `timeout` | query | number | Optional timeout for the run, in seconds. By default, the run uses the timeout from its configuration. Example: `60`. |
| `memory` | query | number | Memory limit for the run, in megabytes. You can set the amount of memory to a power of 2 with a minimum of 128. By default, the run uses the memory limit from its configuration. Don't change this value unless the Actor's documentation recommends it or you're aware of the consequences. Example: `256`. |
| `maxItems` | query | number | Specifies the maximum number of dataset items that will be charged for pay-per-result Actors. This does NOT guarantee that the Actor will return only this many items. It only ensures you won't be charged for more than this number of items. Only works for pay-per-result Actors. Value can be accessed in the actor run using `ACTOR_MAX_PAID_DATASET_ITEMS` environment variable. Example: `1000`. |
| `maxTotalChargeUsd` | query | number | Specifies the maximum total cost of the run. Use it to cap the total amount charged for all pricing models. You can access the maximum cost in your Actor by using the `ACTOR_MAX_TOTAL_CHARGE_USD` environment variable. Example: `5`. |
| `restartOnError` | query | boolean | Determines whether the run will be restarted if it fails. Example: `False`. |
| `build` | query | string | Specifies the Actor build to run. It can be either a build tag or build number. By default, the run uses the build from its configuration (typically `latest`). Example: `0.1.234`. |
| `webhooks` | query | string | Specifies optional webhooks associated with the Actor run, which can be used to receive a notification e.g. when the Actor finished or failed. The value is a Base64-encoded JSON array whose items follow the WebhookRepresentation schema. For more information, see [Webhooks documentation](https://docs.apify.com/platform/integrations/webhooks). Example: `dGhpcyBpcyBqdXN0IGV4YW1wbGUK...`. |
| `format` | query | string | Format of the results, possible values are: `json`, `jsonl`, `csv`, `html`, `xlsx`, `xml` and `rss`. The default value is `json`. Example: `json`. |
| `clean` | query | boolean | If `true` or `1` then the API endpoint returns only non-empty items and skips hidden fields (i.e. fields starting with the # character). The `clean` parameter is just a shortcut for `skipHidden=true` and `skipEmpty=true` parameters. Note that since some objects might be skipped from the output, that the result might contain less items than the `limit` value. Example: `False`. |
| `offset` | query | number | Number of items that should be skipped at the start. The default value is `0`. Example: `0`. |
| `limit` | query | number | Maximum number of items to return. By default there is no limit. |
| `fields` | query | string | A comma-separated list of fields which should be picked from the items, only these fields will remain in the resulting record objects. Note that the fields in the outputted items are sorted the same way as they are specified in the `fields` query parameter. You can use this feature to effectively fix the output format. Example: `myValue,myOtherValue`. |
| `outputFields` | query | string | A comma-separated list of output field names that positionally rename the fields specified in the `fields` parameter. For example, `?fields=headline,url&outputFields=title,link` renames `headline` to `title` and `url` to `link` in the output. The number of names in `outputFields` must match the number of names in `fields`. Requires the `fields` parameter to be specified as well. Example: `title,link`. |
| `omit` | query | string | A comma-separated list of fields which should be omitted from the items. Example: `myValue,myOtherValue`. |
| `unwind` | query | string | A comma-separated list of fields which should be unwound, in order which they should be processed. Each field should be either an array or an object. If the field is an array then every element of the array will become a separate record and merged with parent object. If the unwound field is an object then it is merged with the parent object. If the unwound field is missing or its value is neither an array nor an object and therefore cannot be merged with a parent object then the item gets preserved as it is. Note that the unwound items ignore the `desc` parameter. Example: `myValue,myOtherValue`. |
| `flatten` | query | string | A comma-separated list of fields which should transform nested objects into flat structures. For example, with `flatten="foo"` the object `{"foo":{"bar": "hello"}}` is turned into `{"foo.bar": "hello"}`. The original object with properties is replaced with the flattened object. Example: `myValue`. |
| `desc` | query | boolean | By default, results are returned in the same order as they were stored. To reverse the order, set this parameter to `true` or `1`. Example: `True`. |
| `attachment` | query | boolean | If `true` or `1` then the response will define the `Content-Disposition: attachment` header, forcing a web browser to download the file rather than to display it. By default this header is not present. Example: `True`. |
| `delimiter` | query | string | A delimiter character for CSV files, only used if `format=csv`. You might need to URL-encode the character (e.g. use `%09` for tab or `%3B` for semicolon). The default delimiter is a simple comma (`,`). Example: `;`. |
| `bom` | query | boolean | All text responses are encoded in UTF-8 encoding. By default, the `format=csv` files are prefixed with the UTF-8 Byte Order Mark (BOM), while `json`, `jsonl`, `xml`, `html` and `rss` files are not. If you want to override this default behavior, specify `bom=1` query parameter to include the BOM or `bom=0` to skip it. Example: `False`. |
| `xmlRoot` | query | string | Overrides default root element name of `xml` output. By default the root element is `items`. Example: `items`. |
| `xmlRow` | query | string | Overrides default element name that wraps each page or page function result object in `xml` output. By default the element name is `item`. Example: `item`. |
| `skipHeaderRow` | query | boolean | If `true` or `1` then header row in the `csv` format is skipped. Example: `True`. |
| `skipHidden` | query | boolean | If `true` or `1` then hidden fields are skipped from the output, i.e. fields starting with the `#` character. Example: `False`. |
| `skipEmpty` | query | boolean | If `true` or `1` then empty items are skipped from the output. Note that if used, the results might contain less items than the limit value. Example: `False`. |
| `simplified` | query | boolean | If `true` or `1` then, the endpoint applies the `fields=url,pageFunctionResult,errorInfo` and `unwind=pageFunctionResult` query parameters. This feature is used to emulate simplified results provided by the legacy Apify Crawler product and it's not recommended to use it in new integrations. Example: `False`. |
| `view` | query | string | Defines the view configuration for dataset items based on the schema definition. This parameter determines how the data will be filtered and presented. For complete specification details, see the [dataset schema documentation](/storage/dataset-schema). Example: `overview`. |
| `skipFailedPages` | query | boolean | If `true` or `1` then, the all the items with errorInfo property will be skipped from the output. This feature is here to emulate functionality of API version 1 used for the legacy Apify Crawler product and it's not recommended to use it in new integrations. Example: `False`. |
| `feedTitle` | query | string | Overrides the auto-generated RSS channel `<title>` element. Only used when `format=rss`. If not provided, the title defaults to `Dataset <label>`. Example: `Latest posts from r/pasta`. |
| `feedDescription` | query | string | Overrides the auto-generated RSS channel `<description>` element. Only used when `format=rss`. If not provided, the description defaults to `Items in dataset with id "<datasetId>".` Example: `Scraped forum posts`. |

Responses: `201` success: a JSON array of the dataset items (the Actor's results), `400` BadRequest, `401` Unauthorized, `402` PaymentRequired, `403` Forbidden, `404` NotFound, `405` MethodNotAllowed, `408` Timeout, `429` TooManyRequests.

## From the tutorial: synchronous flow

### Synchronous flow {#synchronous-flow}

If each of your runs will last shorter than 5 minutes, you can use a single [synchronous endpoint](https://usergrid.apache.org/docs/introduction/async-vs-sync.html#synchronous). When running **synchronously**, the connection will be held for _up to_ 5 minutes.

If your synchronous run exceeds the 5-minute time limit, the response will be a run object containing information about the run and the status of `RUNNING`. If that happens, you need to restart the run asynchronously and wait for the run to finish.

#### Synchronous runs with dataset output {#synchronous-runs-with-dataset-output}

Most Actor runs will store their data in the default dataset. The Apify API provides **run-sync-get-dataset-items** endpoints for Actors and tasks, which allow you to run an Actor and receive the items from the default dataset once the run has finished.

Here is a Node.js example of calling a task via the API and logging the dataset items to the console:

```js
// Use your favorite HTTP client
import got from 'got';

// Specify your API token
// (find it at https://console.apify.com/settings/integrations)
const myToken = '<YOUR_APIFY_TOKEN>';

// Start apify/google-search-scraper Actor
// and pass some queries into the JSON body
const response = await got({
    url: `https://api.apify.com/v2/actors/apify~google-search-scraper/run-sync-get-dataset-items?token=${myToken}`,
    method: 'POST',
    json: {
        queries: 'web scraping\nweb crawling',
    },
    responseType: 'json',
});

const items = response.body;

// Log each non-promoted search result for both queries
items.forEach((item) => {
    const { nonPromotedSearchResults } = item;
    nonPromotedSearchResults.forEach((result) => {
        const { title, url, description } = result;
        console.log(`${title}: ${url} --- ${description}`);
    });
});
```

#### Synchronous runs with key-value store output {#synchronous-runs-with-key-value-store-output}

Key-value stores are useful for storing files like images, HTML snapshots, or JSON data. The Apify API provides **run-sync** endpoints for Actors and tasks, which allow you to run a specific task and receive the output. By default, they return the `OUTPUT` record from the default key-value store.


## Example: Google Search Scraper through run-sync, in Python

Not from Apify's docs: a minimal httpx version of the tutorial's Node.js request above, with the token in the header instead of the URL.

```python
import os, httpx

r = httpx.post(
    "https://api.apify.com/v2/actors/apify~google-search-scraper/run-sync-get-dataset-items",
    params={"timeout": 45, "format": "json", "clean": "true"},
    headers={"Authorization": f"Bearer {os.environ['APIFY_TOKEN']}"},  # or let a network secret add it
    json={"queries": "hand-stitched Gu embroidery fan\nGu embroidery peony fan for sale", "maxPagesPerQuery": 1},
    timeout=60,
)
r.raise_for_status()          # 201 on success, 408 if the run passed 300 s
pages = r.json()              # one item per results page per query
hits = [o for page in pages for o in page.get("organicResults", [])][:10]
```
