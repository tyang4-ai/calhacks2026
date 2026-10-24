# Elasticsearch Python client: bulk helpers

> Sources:
> - https://www.elastic.co/docs/reference/elasticsearch/clients/python/client-helpers
> - https://github.com/elastic/elasticsearch-py/blob/v9.5.1/elasticsearch/helpers/actions.py
> Fetched: 2026-10-24.
>
> The guide page from the elastic/elasticsearch-py repo at tag v9.5.1, then the docstrings of `streaming_bulk`, `parallel_bulk` and `bulk` from the same tag.
> Serverless note from Elastic's docs: writes are batched over about 200 ms, so pass `refresh="wait_for"` (or call `es.indices.refresh`) before searching freshly seeded documents.

You can find here a collection of simple helper functions that abstract some specifics of the raw API.

## Bulk helpers
There are several helpers for the bulk API since its requirement for specific formatting and other considerations can make it cumbersome if used directly.

All bulk helpers accept an instance of `Elasticsearch` class and an iterable `action` (any iterable, can also be a generator, which is ideal in most cases since it allows you to index large datasets without the need of loading them into memory). For asynchronous Python, use the bulk helpers with the `async_` prefix and pass an `AsyncElasticsearch` instance as first argument.

The items in the iterable `action` should be the documents we wish to index in several formats. The most common one is the same as returned by `search()`, for example:

```yaml
{
  '_index': 'index-name',
  '_id': 42,
  '_routing': 5,
  'pipeline': 'my-ingest-pipeline',
  '_source': {
    "title": "Hello World!",
    "body": "..."
  }
}
```

Alternatively, if `_source` is not present, it pops all metadata fields from the doc and use the rest as the document data:

```yaml
{
  "_id": 42,
  "_routing": 5,
  "title": "Hello World!",
  "body": "..."
}
```

The `bulk()` api accepts `index`, `create`, `delete`, and `update` actions. Use the `_op_type` field to specify an action (`_op_type` defaults to `index`):

```yaml
{
  '_op_type': 'delete',
  '_index': 'index-name',
  '_id': 42,
}
{
  '_op_type': 'update',
  '_index': 'index-name',
  '_id': 42,
  'doc': {'question': 'The life, universe and everything.'}
}
```

## Scan
Simple abstraction on top of the `scroll()` API - a simple iterator that yields all hits as returned by underlining scroll requests.

By default scan does not return results in any pre-determined order. To have a standard order in the returned documents (either by score or explicit sort definition) when scrolling, use `preserve_order=True`. This may be an expensive operation and will negate the performance benefits of using `scan`.

**Standard Python:**

```py
from elasticsearch.helpers import scan

es = Elasticsearch(hosts=['https://localhost:9200'])

scan(
    es,
    query={"query": {"match": {"title": "python"}}},
    index="orders-*"
)
```

**Async Python:**

```py
from elasticsearch.helpers import async_scan

es = AsyncElasticsearch(hosts=['https://localhost:9200'])

async def main():
    await async_scan(
        es,
        query={"query": {"match": {"title": "python"}}},
        index="orders-*"

asyncio.run(main())
```


## Function reference (docstrings)

### `streaming_bulk`

```python
def streaming_bulk(client: Elasticsearch, actions: Iterable[_TYPE_BULK_ACTION_WITH_META], chunk_size: int = 500, max_chunk_bytes: int = 100 * 1024 * 1024, flush_after_seconds: Optional[float] = None, raise_on_error: bool = True, expand_action_callback: Callable[ [_TYPE_BULK_ACTION], _TYPE_BULK_ACTION_HEADER_AND_BODY ] = expand_action, raise_on_exception: bool = True, max_retries: int = 0, initial_backoff: float = 2, max_backoff: float = 600, yield_ok: bool = True, ignore_status: Union[int, Collection[int]] = (), retry_on_status: Union[int, Collection[int]] = (429,), span_name: str = "helpers.streaming_bulk", *args: Any, **kwargs: Any,)
```

Streaming bulk consumes actions from the iterable passed in and yields
results per action. For non-streaming usecases use
:func:`~elasticsearch.helpers.bulk` which is a wrapper around streaming
bulk that returns summary information about the bulk operation once the
entire input is consumed and sent.

If you specify `max_retries` it will also retry any documents that were
rejected with a `429` status code. Use `retry_on_status` to
configure which status codes will be retried. To do this it will wait
(**by calling time.sleep which will block**) for `initial_backoff` seconds
and then, every subsequent rejection for the same chunk, for double the time
every time up to `max_backoff` seconds.

- `client`: instance of :class:`~elasticsearch.Elasticsearch` to use
- `actions`: iterable containing the actions to be executed
- `chunk_size`: number of docs in one chunk sent to es (default: 500)
- `max_chunk_bytes`: the maximum size of the request in bytes (default: 100MB)
- `flush_after_seconds`: time in seconds after which a chunk is written even
    if hasn't reached `chunk_size` or `max_chunk_bytes`. Set to 0 to not use a
    timeout-based flush. (default: 0)
- `raise_on_error`: raise `BulkIndexError` containing errors (as `.errors`)
    from the execution of the last chunk when some occur. By default we raise.
- `raise_on_exception`: if `False` then don't propagate exceptions from
    call to `bulk` and just report the items that failed as failed.
- `expand_action_callback`: callback executed on each action passed in,
    should return a tuple containing the action line and the data line
    (`None` if data line should be omitted).
- `retry_on_status`: HTTP status code that will trigger a retry.
    (if `None` is specified only status 429 will retry).
- `max_retries`: maximum number of times a document will be retried when
    retry_on_status (defaulting to `429`) is received,
    set to 0 (default) for no retries
- `initial_backoff`: number of seconds we should wait before the first
    retry. Any subsequent retries will be powers of `initial_backoff *
    2**retry_number`
- `max_backoff`: maximum number of seconds a retry will wait
- `yield_ok`: if set to False will skip successful documents in the output
- `ignore_status`: list of HTTP status code that you want to ignore

### `bulk`

```python
def bulk(client: Elasticsearch, actions: Iterable[_TYPE_BULK_ACTION], stats_only: bool = False, ignore_status: Union[int, Collection[int]] = (), *args: Any, **kwargs: Any,)
```

Helper for the :meth:`~elasticsearch.Elasticsearch.bulk` api that provides
a more human friendly interface - it consumes an iterator of actions and
sends them to elasticsearch in chunks. It returns a tuple with summary
information - number of successfully executed actions and either list of
errors or number of errors if `stats_only` is set to `True`. Note that
by default we raise a `BulkIndexError` when we encounter an error so
options like `stats_only` only apply when `raise_on_error` is set to
`False`.

When errors are being collected original document data is included in the
error dictionary which can lead to an extra high memory usage. If you need
to process a lot of data and want to ignore/collect errors please consider
using the :func:`~elasticsearch.helpers.streaming_bulk` helper which will
just return the errors and not store them in memory.


- `client`: instance of :class:`~elasticsearch.Elasticsearch` to use
- `actions`: iterator containing the actions
- `stats_only`: if `True` only report number of successful/failed
    operations instead of just number of successful and a list of error responses
- `ignore_status`: list of HTTP status code that you want to ignore

Any additional keyword arguments will be passed to
:func:`~elasticsearch.helpers.streaming_bulk` which is used to execute
the operation, see :func:`~elasticsearch.helpers.streaming_bulk` for more
accepted parameters.

### `parallel_bulk`

```python
def parallel_bulk(client: Elasticsearch, actions: Iterable[_TYPE_BULK_ACTION], thread_count: int = 4, chunk_size: int = 500, max_chunk_bytes: int = 100 * 1024 * 1024, flush_after_seconds: Optional[float] = None, queue_size: int = 4, expand_action_callback: Callable[ [_TYPE_BULK_ACTION], _TYPE_BULK_ACTION_HEADER_AND_BODY ] = expand_action, ignore_status: Union[int, Collection[int]] = (), *args: Any, **kwargs: Any,)
```

Parallel version of the bulk helper run in multiple threads at once.

- `client`: instance of :class:`~elasticsearch.Elasticsearch` to use
- `actions`: iterator containing the actions
- `thread_count`: size of the threadpool to use for the bulk requests
- `chunk_size`: number of docs in one chunk sent to es (default: 500)
- `max_chunk_bytes`: the maximum size of the request in bytes (default: 100MB)
- `flush_after_seconds`: time in seconds after which a chunk is written even
    if hasn't reached `chunk_size` or `max_chunk_bytes`. Set to 0 to not use a
    timeout-based flush. (default: 0)
- `raise_on_error`: raise `BulkIndexError` containing errors (as `.errors`)
    from the execution of the last chunk when some occur. By default we raise.
- `raise_on_exception`: if `False` then don't propagate exceptions from
    call to `bulk` and just report the items that failed as failed.
- `expand_action_callback`: callback executed on each action passed in,
    should return a tuple containing the action line and the data line
    (`None` if data line should be omitted).
- `queue_size`: size of the task queue between the main thread (producing
    chunks to send) and the processing threads.
- `ignore_status`: list of HTTP status code that you want to ignore
