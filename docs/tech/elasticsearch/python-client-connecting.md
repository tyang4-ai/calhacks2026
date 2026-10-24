# Elasticsearch Python client: connecting with an API key

> Sources:
> - https://www.elastic.co/docs/reference/elasticsearch/clients/python/getting-started
> - https://www.elastic.co/docs/reference/elasticsearch/clients/python/connecting
> - https://www.elastic.co/docs/reference/elasticsearch/clients/python/configuration
> Fetched: 2026-10-24.
>
> From the elastic/elasticsearch-py repo at tag v9.5.1 (the current release, Sep 9, 2026). Self-managed cluster sections are left out.
> Serverless takes the same client: pass the project's Elasticsearch endpoint URL as `hosts` and `api_key=`. Serverless has no username and password login.
> Cindia cloud-session note (not from Elastic): the default urllib3 node class ignores HTTPS_PROXY. In the Claude Code cloud VM, build the client with `node_class="requests"`, which reads HTTPS_PROXY and REQUESTS_CA_BUNDLE. See docs/v2/apis-and-accounts.md.

This page guides you through the installation process of the Python client, shows you how to instantiate the client, and how to perform basic Elasticsearch operations with it.

### Requirements
* [Python](https://www.python.org/) 3.10 or later
* [`pip`](https://pip.pypa.io/en/stable/), installed by default alongside Python

### Installation
To install the latest version of the client, run the following command:

**Standard Python:**

```shell
python -m pip install elasticsearch
```

**Async Python:**

```shell
python -m pip install "elasticsearch[async]"
```

Refer to the [*Installation*](https://www.elastic.co/docs/reference/installation) page to learn more.

### Connecting
You can connect to the Elastic Cloud using an API key and the Elasticsearch endpoint.

**Standard Python:**

```py
import os
from elasticsearch import Elasticsearch

client = Elasticsearch(
    "https://...",  # Elasticsearch endpoint
    api_key=os.environ["ELASTIC_API_KEY"],
)
```

**Async Python:**

```py
import os
from elasticsearch import AsyncElasticsearch

client = AsyncElasticsearch(
    "https://...",  # Elasticsearch endpoint
    api_key=os.environ["ELASTIC_API_KEY"],
)
```

Your Elasticsearch endpoint can be found on the **My deployment** page of your deployment:

![Finding Elasticsearch endpoint](https://www.elastic.co/docs/reference/elasticsearch/clients/python/images/es-endpoint.jpg)

You can generate an API key on the **Management** page under Security.

![Create API key](https://www.elastic.co/docs/reference/elasticsearch/clients/python/images/create-api-key.png)

For other connection options, refer to the [*Connecting*](https://www.elastic.co/docs/reference/connecting) section.

### Operations
Time to use Elasticsearch! This section walks you through the basic, and most important, operations of Elasticsearch. For more operations and more advanced examples, refer to the [*Examples*](https://www.elastic.co/docs/reference/examples) page.

#### Creating an index
This is how you create the `my_index` index:

**Standard Python:**

```py
client.indices.create(index="my_index")
```

**Async Python:**

```py
await client.indices.create(index="my_index")
```

Optionally, you can first define the expected types of your features with a custom mapping.

**Standard Python:**

```py
mappings = {
    "properties": {
        "foo": {"type": "text"},
        "bar": {
            "type": "text",
            "fields": {
                "keyword": {
                    "type": "keyword",
                    "ignore_above": 256,
                }
            },
        },
    }
}

client.indices.create(index="my_index", mappings=mappings)
```

**Async Python:**

```py
mappings = {
    "properties": {
        "foo": {"type": "text"},
        "bar": {
            "type": "text",
            "fields": {
                "keyword": {
                    "type": "keyword",
                    "ignore_above": 256,
                }
            },
        },
    }
}

await client.indices.create(index="my_index", mappings=mappings)
```

#### Indexing documents
This indexes a document with the index API:

**Standard Python:**

```py
client.index(
    index="my_index",
    id="my_document_id",
    document={
        "foo": "foo",
        "bar": "bar",
    }
)
```

**Async Python:**

```py
await client.index(
    index="my_index",
    id="my_document_id",
    document={
        "foo": "foo",
        "bar": "bar",
    }
)
```

You can also index multiple documents at once with the bulk helper function:

**Standard Python:**

```py
from elasticsearch import helpers

def generate_docs():
    for i in range(10):
        yield {
            "_index": "my_index",
            "foo": f"foo {i}",
            "bar": "bar",
        }

helpers.bulk(client, generate_docs())
```

**Async Python:**

```py
from elasticsearch import helpers

async def generate_docs():
    for i in range(10):
        yield {
            "_index": "my_index",
            "foo": f"foo {i}",
            "bar": "bar",
        }

async def bulk_example():
    await helpers.async_bulk(client, generate_docs())
```

These helpers are the recommended way to perform bulk ingestion. While it is also possible to perform bulk ingestion using `client.bulk` directly, the helpers handle retries, ingesting chunk by chunk and more. Refer to the [*Client helpers*](https://www.elastic.co/docs/reference/client-helpers) page for more details.

#### Getting documents
You can get documents by using the following code:

**Standard Python:**

```py
client.get(index="my_index", id="my_document_id")
```

**Async Python:**

```py
await client.get(index="my_index", id="my_document_id")
```

#### Searching documents
This is how you can create a single match query with the Python client:

**Standard Python:**

```py
client.search(index="my_index", query={
    "match": {
        "foo": "foo"
    }
})
```

**Async Python:**

```py
await client.search(index="my_index", query={
    "match": {
        "foo": "foo"
    }
})
```

#### Updating documents
This is how you can update a document, for example to add a new field:

**Standard Python:**

```py
client.update(
    index="my_index",
    id="my_document_id",
    doc={
        "foo": "bar",
        "new_field": "new value",
    }
)
```

**Async Python:**

```py
await client.update(
    index="my_index",
    id="my_document_id",
    doc={
        "foo": "bar",
        "new_field": "new value",
    }
)
```

#### Deleting documents
**Standard Python:**

```py
client.delete(index="my_index", id="my_document_id")
```

**Async Python:**

```py
await client.delete(index="my_index", id="my_document_id")
```

#### Deleting an index
**Standard Python:**

```py
client.indices.delete(index="my_index")
```

**Async Python:**

```py
await client.indices.delete(index="my_index")
```

## Further reading
* Use [*Client helpers*](https://www.elastic.co/docs/reference/client-helpers) for a more comfortable experience with the APIs.


## Connecting
This page contains the information you need to connect the Client with Elasticsearch.

### Connecting to Elastic Cloud
[Elastic Cloud](https://www.elastic.co/docs/deploy-manage/deploy/elastic-cloud/cloud-hosted) is the easiest way to get started with Elasticsearch. When connecting to Elastic Cloud with the Python Elasticsearch client you should always use the `cloud_id` parameter to connect. You can find this value within the "Manage Deployment" page after you’ve created a cluster (look in the top-left if you’re in Kibana).

We recommend using a Cloud ID whenever possible because your client will be automatically configured for optimal use with Elastic Cloud including HTTPS and HTTP compression.

**Standard Python:**

```python
import os
from elasticsearch import Elasticsearch

# Password for the 'elastic' user generated by Elasticsearch
ELASTIC_PASSWORD = os.environ['ELASTIC_PASSWORD']

# Found in the 'Manage Deployment' page
CLOUD_ID = "deployment-name:dXMtZWFzdDQuZ2Nw..."

# Create the client instance
client = Elasticsearch(
    cloud_id=CLOUD_ID,
    basic_auth=("elastic", ELASTIC_PASSWORD)
)

# Successful response!
client.info()
# {'name': 'instance-0000000000', 'cluster_name': ...}
```

**Async Python:**

```python
import asyncio
import os
from elasticsearch import AsyncElasticsearch

# Password for the 'elastic' user generated by Elasticsearch
ELASTIC_PASSWORD = os.environ['ELASTIC_PASSWORD']

# Found in the 'Manage Deployment' page
CLOUD_ID = "deployment-name:dXMtZWFzdDQuZ2Nw..."

async def main():
    # Create the client instance
    client = AsyncElasticsearch(
        cloud_id=CLOUD_ID,
        basic_auth=("elastic", ELASTIC_PASSWORD)
    )

    # Successful response!
    await client.info()
    # {'name': 'instance-0000000000', 'cluster_name': ...}

asyncio.run(main())
```

### Authentication
This section contains code snippets to show you how to connect to various Elasticsearch providers. All authentication methods are supported on the client constructor or via the per-request `.options()` method:

**Standard Python:**

```python
import os
from elasticsearch import Elasticsearch

# Authenticate from the constructor
client = Elasticsearch(
    "https://localhost:9200",
    ca_certs="/path/to/http_ca.crt",
    basic_auth=("username", os.environ["ELASTIC_PASSWORD"])
)

# Authenticate via the .options() method:
client.options(
    basic_auth=("username", os.environ["ELASTIC_PASSWORD"])
).indices.get(index="*")

# You can persist the authenticated client to use
# later or use for multiple API calls:
auth_client = client.options(api_key=os.environ["ELASTIC_API_KEY"])
for i in range(10):
    auth_client.index(
        index="example-index",
        document={"field": i}
    )
```

**Async Python:**

```python
import asyncio
import os
from elasticsearch import AsyncElasticsearch

async def main():
    # Authenticate from the constructor
    client = AsyncElasticsearch(
        "https://localhost:9200",
        ca_certs="/path/to/http_ca.crt",
        basic_auth=("username", os.environ["ELASTIC_PASSWORD"])
    )

    # Authenticate via the .options() method:
    await client.options(
        basic_auth=("username", os.environ["ELASTIC_PASSWORD"])
    ).indices.get(index="*")

    # You can persist the authenticated client to use
    # later or use for multiple API calls:
    auth_client = client.options(api_key=os.environ["ELASTIC_API_KEY"])
    for i in range(10):
        await auth_client.index(
            index="example-index",
            document={"field": i}
        )

asyncio.run(main())
```

#### HTTP Basic authentication (Username and Password)
HTTP Basic authentication uses the `basic_auth` parameter by passing in a username and password within a tuple:

**Standard Python:**

```python
import os
from elasticsearch import Elasticsearch

# Adds the HTTP header 'Authorization: Basic <base64 username:password>'
client = Elasticsearch(
    "https://localhost:9200",
    ca_certs="/path/to/http_ca.crt",
    basic_auth=("username", os.environ["ELASTIC_PASSWORD"])
)
```

**Async Python:**

```python
import os
from elasticsearch import AsyncElasticsearch

# Adds the HTTP header 'Authorization: Basic <base64 username:password>'
client = AsyncElasticsearch(
    "https://localhost:9200",
    ca_certs="/path/to/http_ca.crt",
    basic_auth=("username", os.environ["ELASTIC_PASSWORD"])
)
```

#### HTTP Bearer authentication
HTTP Bearer authentication uses the `bearer_auth` parameter by passing the token as a string. This authentication method is used by [Service Account Tokens](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-create-service-token) and [Bearer Tokens](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-token).

**Standard Python:**

```python
import os
from elasticsearch import Elasticsearch

# Adds the HTTP header 'Authorization: Bearer token-value'
client = Elasticsearch(
    "https://localhost:9200",
    bearer_auth=os.environ["ELASTIC_TOKEN"]
)
```

**Async Python:**

```python
import os
from elasticsearch import AsyncElasticsearch

# Adds the HTTP header 'Authorization: Bearer token-value'
client = AsyncElasticsearch(
    "https://localhost:9200",
    bearer_auth=os.environ["ELASTIC_TOKEN"]
)
```

#### API Key authentication
You can configure the client to use Elasticsearch's API Key for connecting to your cluster. These can be generated through the [Elasticsearch Create API key API](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-create-api-key) or [Kibana Stack Management](https://www.elastic.co/docs/deploy-manage/api-keys/elasticsearch-api-keys#create-api-key).

**Standard Python:**

```python
from elasticsearch import Elasticsearch

# Adds the HTTP header 'Authorization: ApiKey <base64 api_key.id:api_key.api_key>'
client = Elasticsearch(
    "https://localhost:9200",
    ca_certs="/path/to/http_ca.crt",
    api_key=os.environ["ELASTIC_API_KEY"],
)
```

**Async Python:**

```python
from elasticsearch import AsyncElasticsearch

# Adds the HTTP header 'Authorization: ApiKey <base64 api_key.id:api_key.api_key>'
client = AsyncElasticsearch(
    "https://localhost:9200",
    ca_certs="/path/to/http_ca.crt",
    api_key=os.environ["ELASTIC_API_KEY"],
)
```


#### Verifying server certificates
The typical route to verify a cluster certificate is via a "CA bundle" which can be specified via the `ca_certs` parameter. If no options are given and the [certifi package](https://github.com/certifi/python-certifi) is installed then certifi’s CA bundle is used by default.

If you have your own CA bundle to use you can configure via the `ca_certs` parameter:

**Standard Python:**

```python
client = Elasticsearch(
    "https://...",
    ca_certs="/path/to/certs.pem"
)
```

**Async Python:**

```python
client = AsyncElasticsearch(
    "https://...",
    ca_certs="/path/to/certs.pem"
)
```

If using a generated certificate or certificate with a known fingerprint you can use the `ssl_assert_fingerprint` to specify the fingerprint which tries to match the server’s leaf certificate during the TLS handshake. If there is any matching certificate the connection is verified, otherwise a `TlsError` is raised.

In Python 3.9 and earlier only the leaf certificate will be verified but in Python 3.10+ private APIs are used to verify any certificate in the certificate chain. This helps when using certificates that are generated on a multi-node cluster.

**Standard Python:**

```python
client = Elasticsearch(
    "https://...",
    ssl_assert_fingerprint=(
        "315f5bdb76d078c43b8ac0064e4a0164612b1fce77c869345bfc94c75894edd3"
    )
)
```

**Async Python:**

```python
client = AsyncElasticsearch(
    "https://...",
    ssl_assert_fingerprint=(
        "315f5bdb76d078c43b8ac0064e4a0164612b1fce77c869345bfc94c75894edd3"
    )
)
```

To disable certificate verification use the `verify_certs=False` parameter. This option should be avoided in production, instead use the other options to verify the clusters' certificate.

**Standard Python:**

```python
client = Elasticsearch(
    "https://...",
    verify_certs=False
)
```

**Async Python:**

```python
client = AsyncElasticsearch(
    "https://...",
    verify_certs=False
)
```

### HTTP compression
Compression of HTTP request and response bodies can be enabled with the `http_compress` parameter. If enabled then HTTP request bodies will be compressed with `gzip` and HTTP responses will include the `Accept-Encoding: gzip` HTTP header. By default compression is disabled.

**Standard Python:**

```python
client = Elasticsearch(
    ...,
    http_compress=True  # Enable compression!
)
```

**Async Python:**

```python
client = AsyncElasticsearch(
    ...,
    http_compress=True  # Enable compression!
)
```

HTTP compression is recommended to be enabled when requests are traversing the network. Compression is automatically enabled when connecting to Elastic Cloud.

### Request timeouts
Requests can be configured to timeout if taking too long to be serviced. The `request_timeout` parameter can be passed via the client constructor or the client `.options()` method. When the request times out the node will raise a `ConnectionTimeout` exception which can trigger retries.

Setting `request_timeout` to `None` will disable timeouts.

**Standard Python:**

```python
client = Elasticsearch(
    ...,
    request_timeout=10  # 10 second timeout
)

# Search request will timeout in 5 seconds
client.options(request_timeout=5).search(...)
```

**Async Python:**

```python
client = AsyncElasticsearch(
    ...,
    request_timeout=10  # 10 second timeout
)

async def example():
    # Search request will timeout in 5 seconds
    await client.options(request_timeout=5).search(...)
```

#### API and server timeouts
There are API-level timeouts to take into consideration when making requests which can cause the request to timeout on server-side rather than client-side. You may need to configure both a transport and API level timeout for long running operations.

In the example below there are three different configurable timeouts for the `cluster.health` API all with different meanings for the request:

**Standard Python:**

```python
client.options(
    # Amount of time to wait for an HTTP response to start.
    request_timeout=30
).cluster.health(
    # Amount of time to wait to collect info on all nodes.
    timeout=30,
    # Amount of time to wait for info from the master node.
    master_timeout=10,
)
```

**Async Python:**

```python
async def example():
    await client.options(
        # Amount of time to wait for an HTTP response to start.
        request_timeout=30
    ).cluster.health(
        # Amount of time to wait to collect info on all nodes.
        timeout=30,
        # Amount of time to wait for info from the master node.
        master_timeout=10,
    )
```

### Retries
Requests can be retried if they don’t return with a successful response. This provides a way for requests to be resilient against transient failures or overloaded nodes.

The maximum number of retries per request can be configured via the `max_retries` parameter. Setting this parameter to 0 disables retries. This parameter can be set in the client constructor or per-request via the client `.options()` method:

**Standard Python:**

```python
client = Elasticsearch(
    ...,
    max_retries=5
)

# For this API request we disable retries with 'max_retries=0'
client.options(max_retries=0).index(
    index="blogs",
    document={
        "title": "..."
    }
)
```

**Async Python:**

```python
client = AsyncElasticsearch(
    ...,
    max_retries=5
)

async def example():
    # For this API request we disable retries with 'max_retries=0'
    await client.options(max_retries=0).index(
        index="blogs",
        document={
            "title": "..."
        }
)
```

#### Retrying on connection errors and timeouts
Connection errors are automatically retried if retries are enabled. Retrying requests on connection timeouts can be enabled or disabled via the `retry_on_timeout` parameter. This parameter can be set on the client constructor or via the client `.options()` method:

**Standard Python:**

```python
client = Elasticsearch(
    ...,
    retry_on_timeout=True
)
client.options(retry_on_timeout=False).info()
```

**Async Python:**

```python
client = AsyncElasticsearch(
    ...,
    retry_on_timeout=True
)

async def example():
    await client.options(retry_on_timeout=False).info()
```

#### Retrying status codes
By default if retries are enabled `retry_on_status` is set to `(429, 502, 503, 504)`. This parameter can be set on the client constructor or via the client `.options()` method. Setting this value to `()` will disable the default behavior.

**Standard Python:**

```python
client = Elasticsearch(
    ...,
    retry_on_status=()
)

# Retry this API on '500 Internal Error' statuses
client.options(retry_on_status=[500]).index(
    index="blogs",
    document={
        "title": "..."
    }
)
```

**Async Python:**

```python
client = AsyncElasticsearch(
    ...,
    retry_on_status=()
)

async def example():
    # Retry this API on '500 Internal Error' statuses
    await client.options(retry_on_status=[500]).index(
        index="blogs",
        document={
            "title": "..."
        }
)
```

#### Exponential backoff
By default, retries are executed in quick succession, without any pause between them.
If desired, the client can be configured to use an exponential backoff strategy that
spaces out the retries to give the server more time to recover from a transient
failure.

The exponential backoff algorithm used by the client is called "Equal Jitter." It is
described in detail in the [Exponential Backoff And Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/) article, published in the AWS
Architecture blog.

Exponential backoff delays between retries are configured with the `retry_backoff_base`
and `retry_backoff_cap` arguments. As with other configuration options, these can be
given in the client's constructor to be used in all calls made with the client, or
passed in the client's `.options()` method for use only with specific calls.

**Standard Python:**

```python
client = Elasticsearch(
    ...,
    max_retries=5,
    retry_backoff_base=1,
    retry_backoff_cap=20,
)
```

**Async Python:**

```python
client = AsyncElasticsearch(
    ...,
    max_retries=5,
    retry_backoff_base=1,
    retry_backoff_cap=20,
)
```

The `retry_backoff_base` and `retry_backoff_cap` arguments are of type float, and
given in seconds. They control the starting delay configuration and the maximum
allowed delay respectively.

The default for these two arguments is 0, which effectively turns off the backoff
strategy. Both arguments must be greater than 0 for delays between retries to be
used.

The `retry_backoff_base` argument determines the maximum possible delay before the
first retry attempt, with the actual delay reduced from that by a randomly generated
amount (the "jitter"). In successive retry attempts, the base value is grown
exponentially, so that with each retry attempt the pauses get longer.

The `retry_backoff_cap` argument prevents the exponential growth of
`retry_backoff_base` from making the pauses extremely large when too many retries
need to be attempted.

In the preceding example, the first retry attempt is going to be issued after a pause
of no more than 1 second. For a second retry attempt the pause is going to be up
to 2 seconds. The follow up retries will be capped at 4, 8 and 16 seconds. If more
retries are needed after that, then they'll all be 20 seconds or less, and this will
continue until the call succeeds or the maximum number of retries is reached.

For more details about the "Equal Jitter" algorithm, consult the blog article
linked above.

#### Ignoring status codes
By default an `ApiError` exception will be raised for any non-2XX HTTP requests that exhaust retries, if any. If you’re expecting an HTTP error from the API but aren’t interested in raising an exception you can use the `ignore_status` parameter via the client `.options()` method.

A good example where this is useful is setting up or cleaning up resources in a cluster in a robust way:

**Standard Python:**

```python
client = Elasticsearch(...)

# API request is robust against the index not existing:
resp = client.options(ignore_status=404).indices.delete(index="delete-this")
resp.meta.status  # Can be either '2XX' or '404'

# API request is robust against the index already existing:
resp = client.options(ignore_status=[400]).indices.create(
    index="create-this",
    mapping={
        "properties": {"field": {"type": "integer"}}
    }
)
resp.meta.status  # Can be either '2XX' or '400'
```

**Async Python:**

```python
client = AsyncElasticsearch(...)

async def example():
    # API request is robust against the index not existing:
    resp = await client.options(ignore_status=404).indices.delete(index="delete-this")
    resp.meta.status  # Can be either '2XX' or '404'

    # API request is robust against the index already existing:
    resp = await client.options(ignore_status=[400]).indices.create(
        index="create-this",
        mapping={
            "properties": {"field": {"type": "integer"}}
        }
    )
    resp.meta.status  # Can be either '2XX' or '400'
```

When using the `ignore_status` parameter the error response will be returned serialized like a non-error response. In these cases it can be useful to inspect the HTTP status of the response. To do this you can inspect the `resp.meta.status`.
