# Apify API v2: authentication, response shape, errors, rate limits, plan limits

> Sources:
> - https://docs.apify.com/api/v2
> - https://docs.apify.com/platform/integrations/api
> - https://docs.apify.com/platform/limits
> - https://github.com/apify/apify-docs/blob/master/apify-api/openapi/openapi.yaml
> Fetched: 2026-10-24.
>
> The API introduction is the `info.description` of Apify's OpenAPI spec (apify/apify-docs repo, master branch, Oct 23, 2026). The token and limits pages are from the same repo.
> In-page anchor links of the API reference site are removed.

## API introduction (from the OpenAPI spec)

The Apify API (version 2) provides programmatic access to the [Apify
platform](https://docs.apify.com). The API is organized
around [RESTful](https://en.wikipedia.org/wiki/Representational_state_transfer)
HTTP endpoints.

You can download the complete OpenAPI schema of Apify API in the [YAML](http://docs.apify.com/api/openapi.yaml) or [JSON](http://docs.apify.com/api/openapi.json) formats. The source code is also available on [GitHub](https://github.com/apify/apify-docs/tree/master/apify-api/openapi).

All requests and responses (including errors) are encoded in
[JSON](http://www.json.org/) format with UTF-8 encoding,
with a few exceptions that are explicitly described in the reference.

To access the API, we recommend using one of our API clients:

Stable API clients:
- For [Node.js](https://nodejs.org/en/), we recommend the [`apify-client`](https://docs.apify.com/api/client/js) [NPM
package](https://www.npmjs.com/package/apify-client).
- For [Python](https://www.python.org/), we recommend the [`apify-client`](https://docs.apify.com/api/client/python) [PyPI
package](https://pypi.org/project/apify-client/).

Experimental API clients:
- For [Java](https://www.java.com/), we recommend the `apify-client` [Maven central component](https://central.sonatype.com/artifact/com.apify/apify-client).
- For [Rust](https://rust-lang.org/), we recommend the `apify-client` [crate](https://crates.io/crates/apify-client).
- For [.NET](https://dotnet.microsoft.com/), we recommend the `apify-client` [Nuget package](https://www.nuget.org/packages/Apify.Client).
- For [PHP](https://www.php.net/), we recommend the `apify-client` [Packagist package](https://packagist.org/packages/apify/apify-client).
- For [Go](https://go.dev/), we recommend the `apify-client` [package](https://github.com/apify/apify-client-go/releases).

The clients' functions correspond to the API endpoints and have the same
parameters. This simplifies development of apps that depend on the Apify
platform.

**Important request details:**

- `Content-Type` header: For requests with a JSON body, you must include the `Content-Type: application/json` header.

- Method override: You can override the HTTP method using the `method` query parameter. This is useful for clients that can only send `GET` requests. For example, to call a `POST` endpoint, append `?method=POST` to the URL of your `GET` request.

### Authentication

**You can find your API token on the
[Integrations](https://console.apify.com/settings/integrations) page in the
Apify Console.**

To use your token in a request, either:

- Add the token to your request's `Authorization` header as `Bearer <token>`.
E.g., `Authorization: Bearer xxxxxxx`.
[More info](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Authorization).
(Recommended).
- Add it as the `token` parameter to your request URL. (Less secure).

Using your token in the request header is more secure than using it as a URL
parameter because URLs are often stored
in browser history and server logs. This creates a chance for someone
unauthorized to access your API token.

**Never share your API token or password with untrusted parties!**

For more information, see our
[integrations](https://docs.apify.com/platform/integrations) documentation.

### Basic usage

To run an Actor, send a POST request to the [Run
Actor] endpoint using either the
Actor ID code (e.g. `vKg4IjxZbEYTYeW8T`) or its name (e.g.
`janedoe~my-actor`):

`https://api.apify.com/v2/actors/[actor_id]/runs`

If the Actor is not runnable anonymously, you will receive a 401 or 403
[response code](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status).
This means you need to add your [secret API
token](https://console.apify.com/account#/integrations) to the request's
`Authorization` header ([recommended]) or as a
URL query parameter `?token=[your_token]` (less secure).

Optionally, you can include the query parameters described in the [Run
Actor] section to customize your
run.

If you're using Node.js, the best way to run an Actor is using the
`Apify.call()` method from the [Apify
SDK](https://sdk.apify.com/docs/api/apify#apifycallactid-input-options). It
runs the Actor using the account you are currently logged into (determined
by the [secret API token](https://console.apify.com/account#/integrations)).
The result is an [Actor run
object](https://sdk.apify.com/docs/typedefs/actor-run) and its output (if
any).

A typical workflow is as follows:

1. Run an Actor or task using the [Run
Actor] or [Run
task] API endpoints.
2. Monitor the Actor run by periodically polling its progress using the [Get
run] API
endpoint.
3. Fetch the results from the [Get
items] API endpoint using the
`defaultDatasetId`, which you receive in the Run request response.
Additional data may be stored in a key-value store. You can fetch them from
the [Get record] API endpoint
using the `defaultKeyValueStoreId` and the store's `key`.

**Note**: Instead of periodic polling, you can also run your
[Actor] or
[task]
synchronously. This will ensure that the request waits for 300 seconds (5
minutes) for the run to finish and returns its output. If the run takes
longer, the request will time out and throw an error.

### Legacy `/v2/acts/` URL prefix

The `/v2/acts/` prefix is deprecated but still fully functional, and
such endpoint routes to the same handler as its `/v2/actors/...` counterpart.
New integrations should use the canonical /v2/actors/ prefix,
but existing clients keep working without changes.

### Response structure

Most API endpoints return a JSON object with the `data` property:

```
{
    "data": {
        ...
    }
}
```

However, there are a few explicitly described exceptions, such as
[Get dataset items] or
Key-value store [Get record]
API endpoints, which return data in other formats.
In case of an error, the response has the HTTP status code in the range of
4xx or 5xx and the `data` property is replaced with `error`. For example:

```
{
    "error": {
        "type": "record-not-found",
        "message": "Store was not found."
    }
}
```

See [Errors] for more details.

### Errors

The Apify API uses common HTTP status codes: `2xx` range for success, `4xx`
range for errors caused by the caller
(invalid requests) and `5xx` range for server errors (these are rare).
Each error response contains a JSON object defining the `error` property,
which is an object with
the `type` and `message` properties that contain the error code and a
human-readable error description, respectively.

For example:

```
{
    "error": {
        "type": "record-not-found",
        "message": "Store was not found."
    }
}
```

Here is the table of the most common errors that can occur for many API
endpoints:

| status | type | message |
|---|---|---|
| `400` | `invalid-request` | POST data must be a JSON object |
| `400` | `invalid-value` | Invalid value provided: Comments required |
| `400` | `invalid-record-key` | Record key contains invalid character |
| `401` | `token-not-provided` | Authentication token was not provided |
| `404` | `record-not-found` | Store was not found |
| `429` | `rate-limit-exceeded` | You have exceeded the rate limit of ... requests per second |
| `405` | `method-not-allowed` | This API endpoint can only be accessed using the following HTTP methods: OPTIONS, POST |

### Rate limiting

All API endpoints limit the rate of requests in order to prevent overloading of Apify servers by misbehaving clients.

There are two kinds of rate limits - a global rate limit and a per-resource rate limit.

#### Global rate limit

The global rate limit is set to _250 000 requests per minute_.
For [authenticated] requests, it is counted per user,
and for unauthenticated requests, it is counted per IP address.

#### Per-resource rate limit

The default per-resource rate limit is _60 requests per second per resource_, which in this context means a single Actor, a single Actor run, a single dataset, single key-value store etc.
The default rate limit is applied to every API endpoint except a few select ones, which have higher rate limits.
Each API endpoint returns its rate limit in `X-RateLimit-Limit` header.

These endpoints have a rate limit of _35 requests per second per resource_:

* Batch ([add],
  [delete])
  operations on requests in request queues
* [List and lock head] of a request queue

These endpoints have a rate limit of _100 requests per second per resource_:

* Download records from a key-value store as a ZIP archive

These endpoints have a rate limit of _200 requests per second per resource_:

* CRUD ([get],
  [put],
  [delete])
  operations on key-value store records
* [Get list of keys] in a key-value store

These endpoints have a rate limit of _350 requests per second per resource_:

* CRUD
  ([add],
  [get],
  [update],
  [delete])
  operations on requests in request queues
* Request lock operations
  ([prolong],
  [delete])
  in request queues

These endpoints have a rate limit of _400 requests per second per resource_:

* [Run Actor]
* [Run Actor task asynchronously]
* [Run Actor task synchronously]
* [Metamorph Actor run]
* [Push items] to dataset

#### Rate limit exceeded errors

If the client is sending too many requests, the API endpoints respond with the HTTP status code `429 Too Many Requests`
and the following body:

```
{
    "error": {
        "type": "rate-limit-exceeded",
        "message": "You have exceeded the rate limit of ... requests per second"
    }
}
```

#### Retrying rate-limited requests with exponential backoff

If the client receives the rate limit error, it should wait a certain period of time and then retry the request.
If the error happens again, the client should double the wait period and retry the request,
and so on. This algorithm is known as _exponential backoff_
and it can be described using the following pseudo-code:

1. Define a variable `DELAY=500`
2. Send the HTTP request to the API endpoint
3. If the response has status code not equal to `429` then you are done. Otherwise:
   * Wait for a period of time chosen randomly from the interval `DELAY` to `2*DELAY` milliseconds
   * Double the future wait period by setting `DELAY = 2*DELAY`
   * Continue with step 2

If all requests sent by the client implement the above steps,
the client will automatically use the maximum available bandwidth for its requests.

Note that the Apify API clients [for JavaScript](https://docs.apify.com/api/client/js)
and [for Python](https://docs.apify.com/api/client/python)
use the exponential backoff algorithm transparently, so that you do not need to worry about it.


## API tokens (Apify API integration page)

### API token

To access the Apify API in your integrations, you need to authenticate using your secret API token. You can find it on the [API & Integrations](https://console.apify.com/settings/integrations) page in Apify Console. Give your token a reasonable description, and never use one token for several services, much like you shouldn't use the same password for different accounts.

!Integrations page in Apify Console

**Caution: Protect your API token**

Do not share the API token with untrusted parties, or use it directly from client-side code,
unless you fully understand the consequences! You can also consider  limiting the permission scope of the token, so that it can only access what it really needs.

### Authentication

You can authenticate the Apify API in two ways. You can either pass the token via the `Authorization` HTTP header or the URL `token` query parameter. We always recommend you use the authentication via the HTTP header as this method is more secure.

Note that some API endpoints, such as Get list of key-value store keys,
do not require an authentication token because they contain a hard-to-guess identifier that effectively serves as an authentication key.

### Expiration

API tokens include security features to protect your account and data. You can set an expiration date for your API tokens, ensuring they become invalid after a specified period. This is particularly useful for temporary access or when working with third-party services.

!Creating token with expiration date in Apify Console

### Rotation

If you suspect that a token has been compromised or accidentally exposed, you can rotate it through Apify Console. When rotating a token, you have the option to keep the old token active for 24 hours, allowing you to update your applications with the new token before the old one becomes invalid. After the rotation period, the token will be regenerated, and any applications connected to the old token will need to be updated with the new token to continue functioning.

!Rotate token in Apify Console

For better security awareness, the UI marks tokens identified as compromised, making it easy to identify and take action on them.

!Leaked token in Apify Console

### API tokens with limited permissions {#limited-permissions}

By default, tokens can access all data in your account. If that is not desirable, you can choose to limit the permissions of your token, so that it can only access data needed for the particular use case. We call these tokens **scoped**.

**A scoped token can access only those resources that you'll explicitly allow it to.**

**Info: Actor modification restrictions**

We do not allow scoped tokens to create or modify Actors. If you do need to create or modify Actors through the Apify API, use an unscoped token.

#### How to create a scoped token

Scoped tokens behave like standard API tokens and are managed through the [API & Integrations](https://console.apify.com/settings/integrations) page in Apify Console. When creating a token (or updating an existing one), simply toggle "Limit token permissions" to make the token scoped.

Once the token is scoped, you can specify the token's permissions.

!Toggle "Limit token permissions" to make a token scoped

#### Account-level vs resource-specific permissions

We support two different types of permissions for tokens:

- **Account-level permissions**: These will apply to all resources in the entire account. For example, you can use these to allow the token to run _all_ your Actors.

- **Resource-specific permissions**: These will apply only to specific, existing resources. For example, you can use these to allow the token to read from a particular dataset.

**Tip: Combine permission types**

A single token can combine both types. You can create a token that can _read_ any data storage, but _write_ only to one specific key-value store.

!An example scoped token that combines account-level permissions and resource-specific permissions

#### Allow tokens to create resources

If you need to create new resources with the token (for example, create a new task, or storage), you need to explicitly allow that as well.

Once you create a new resource with the token, _the token will gain full access to that resource_, regardless of other permissions. It is not possible to create a token that can create a dataset, but not write to it.

**Tip: Dynamic resource creation**

This is useful if you want to for example create a token that can dynamically create & populate datasets, but without the need to access other datasets in your account.

#### Permission dependencies

Some permissions require other permissions to be granted alongside them. These are called _permission dependencies_.

##### Automatic dependencies

The form enforces certain dependencies automatically. For example, when you grant the **Write** permission for a dataset, the **Read** permission is automatically selected. This ensures that when you can write to a dataset you can also read from it.

!The Write permission depends on Read for a dataset

##### Manual dependencies

Other dependencies are more complicated, so it is up to you to ensure that the token is configured correctly.

Specifically:

- To create or update a Schedule, the token needs access not only to the Schedule itself, but also to the Actor (the **Run** permission) or task (the **Read** permission) that is being scheduled.
- Similarly, to create, update or run a task, the token needs the **Run** permission on the task's Actor itself.

**Tip: Schedule creation example**

Let's say that you have an Actor and you want to programmatically create schedules for that Actor. Then you can create a token that has the account level **Create** permission on schedules, but only the resource-specific **Run** permission on the Actor. Such a token has exactly the permissions it needs, and nothing more.

#### Actor execution

When you run an Actor, Apify creates a new, short-lived run API token, and injects it into the Actor environment. This applies to scoped tokens as well, so when you run an Actor with a scoped token, **the Actor is executed with a different token with a different scope.**

In the scoped token configuration you can choose what scope the run API token gets, effectively determining what the Actor can access during its run.

Apify currently supports two modes:

- **Full access**: Allow Actors to access all your account's data.
- **Restricted access**: Restrict what Actors can access using the scope of this Actor.

!Choose permission mode for running Actors with a scoped token

##### Full access: Allow Actors to access all your account's data

When you run an Actor with a scoped token in this mode, Apify will inject an _unscoped_ token to the Actor runtime.

This way you can be sure that once you give a token the permission to run an Actor, it will just work, and you don't have to worry about the exact permissions the Actor might need. However, this also means that you need to trust the Actor.

**Tip: Third-party integration**

Use this mode if you want to integrate with a 3rd-party service to run your Actors. Create a scoped token that can only run the Actor you need, and share it with the service. Even if the token is leaked, it can't be used to access your other data.

##### Restricted access: Restrict what Actors can access using the scope of this Actor

When you run an Actor with a scoped token in this mode, Apify will inject a token with the same scope as the scope of the original token.

This way you can be sure that Actors won't accidentally - or intentionally - access any data they shouldn't. However, Actors might not function properly if the scope is not sufficient.

**Caution: Standby mode limitation**

Restricted access mode is not supported for Actors running in Standby mode. While you can send standby requests using a scoped token configured with restricted access, functionality is not guaranteed.

**Tip: Transitive restrictions**

This restriction is _transitive_, which means that if the Actor runs another Actor, its access will be restricted as well.

##### Default run storages

When Apify runs an Actor, it automatically creates a set of default storages (a dataset, a key-value store and request queue) that the Actor can use in runtime.

You can configure whether the scoped token you are going use to run the Actor should get access to these default storages.

!Configure whether the trigger token gets write access to the run default storages.

If it’s **on**, the token can implicitly access the default storage of the Actor runs it triggers, or in general, of any Actor run in your account that falls within its scope. This is useful if you want to allow a third-party service to run an Actor and then read the Actor’s output (think AI agents).

If the toggle is **off**, the token can still trigger and inspect runs, but access to the default storages is restricted:

- For accounts with **Restricted general resource access**, the token cannot read or write to default storages. Learn more about restricted general resource access.
- For accounts with **Unrestricted general resource access**, the default storages can still be read anonymously using their IDs, but writing is prevented.

**Tip: Clean up run data**

Let's say your Actor produces a lot of data that you want to delete just after the Actor finishes. If you enable this toggle, your scoped token will be allowed to do that.

#### Schedules

You can use scoped tokens to schedule Actor and Tasks. Each schedule invocation triggers a new Actor run, creating and injecting a new run API token into the Actor.

However, **this token is always unscoped, which means that the scheduled Actor has access to all your account data**, regardless of the scope of the token that scheduled it.

#### Webhooks configuration

If you allow a token to run an Actor, it'll also be able to manage the Actor's webhooks (similarly for tasks).

If you set up a webhook pointing to the Apify API, the Apify platform will automatically inject a token when dispatching that webhook. However, if you set up such a webhook with a scoped token, **that webhook will be dispatched with a token with the same limited permissions**.

Therefore, you need to make sure the token has sufficient permissions not only to set up the webhook, but also to perform the actual operation.

**Tip: Webhook permissions**

Let's say you want to create a webhook that pushes an item to a dataset every time an Actor successfully finishes. Then such a scoped token needs to be allowed to both run the Actor (to create the webhook), and write to that dataset.

#### Troubleshooting

##### How do I allow a token to run a task?

Tasks don't have a dedicated **Run** permission. Instead, you should configure the token with the following permissions:

- **Run** on the Actor that the task is executing
- **Read** on the task

See the following example:

!Scoped token configured to run a task

Refer to this section to understand how permission dependencies work.

##### My run failed and I can see `insufficient permissions` in the logs

When a run fails with insufficient permissions in the logs, it typically means the Actor is using a scoped token with **Restricted access** configured.

!Scoped token with Restricted access

What is happening is that the Actor is trying to access a resource (such as a dataset, or a key-value store) or perform an operation that it does not have sufficient permissions for.

If you know what it is, you can add the permission to the scope of your token. If you don't, you can switch the permission mode on the token to **Full access**. This means that the Actor will be able to access all your account data.

Refer to Actor execution section to understand how executing Actors with scoped tokens works.


## Platform limits

The tables below demonstrate the Apify platform's default resource limits. For API limits such as rate limits and max payload size, see the API documentation.

### Actor runtime limits

| Description | Limit for plan |
|---|---|
| Free | Starter | Scale | Business |
| Build memory size | 4,096&nbsp;MB |
| Run minimum memory | 128&nbsp;MB | 128&nbsp;MB |
| Run maximum memory | 16,384&nbsp;MB | 32,768&nbsp;MB |
| Maximum combined memory of all running jobs | 16,384&nbsp;MB | 65,536&nbsp;MB | 262,144&nbsp;MB | 524,288&nbsp;MB |
| Build timeout | 1800&nbsp;secs |
| Build/run disk size | 2× job memory limit |
| Memory per CPU core | 4,096&nbsp;MB |
| Maximum log size | 10,485,760&nbsp;characters |
| Maximum number of metamorphs | 10 metamorphs per run |

### Apify platform limits

| Description | Limit for plan |
|---|---|
| Free | Starter | Scale | Business |
| Maximum number of dataset columns for tabular formats (XLSX, CSV, ...) | 2000&nbsp;columns |
| Maximum size of Actor input schema | 500&nbsp;kB |
| Maximum number of Actors per user | 500 |
| Maximum number of tasks per user | 5000 |
| Maximum number of schedules per user | 100 |
| Maximum number of webhooks per user | 100 |
| Maximum number of Actors per schedule | 10 |
| Maximum number of tasks per schedule | 10 |
| Maximum number of concurrent Actor runs per user | 25 | 32 | 128 | 256 |

### Usage limit

To protect you from accidental overspending, the Apify platform introduces usage limits based on your billing plan. For details, see Limits.

### Increase limits

On paid accounts, there's an option to increase the Actor runtime limits and Apify platform limits. For details, [contact support](http://apify.com/contact).
