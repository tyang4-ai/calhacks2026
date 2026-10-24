# SpacetimeDB TypeScript client SDK, part 1: setup, DbConnection, subscriptions, query builder

> Source: https://github.com/clockworklabs/SpacetimeDB/blob/v2.13.0/docs/docs/00200-core-concepts/00600-clients/00700-typescript-reference.md
> Fetched: 2026-10-24.
>
> From the clockworklabs/SpacetimeDB repo at tag v2.13.0 (Oct 19, 2026), the release that install.spacetimedb.com installs today.
> Only the TypeScript tabs are kept. The Rust, C#, C++ and Unreal versions are on spacetimedb.com.
> The SDK reference is split in two files. Part 2 (typescript-client-sdk-2-events-cache-reducers.md) has events, the client cache, reducers and identity.
> Left out: React and other framework integrations, and the ErrorContext, SubscriptionEventContext and ReducerEventContext type pages (they mirror EventContext).

The SpacetimeDB client SDK for TypeScript contains all the tools you need to build clients for SpacetimeDB modules using Typescript, either in the browser or with NodeJS.

Before diving into the reference, you may want to review:

- Generating Client Bindings - How to generate TypeScript bindings from your module
- Connecting to SpacetimeDB - Establishing and managing connections
- SDK API Reference - Core concepts that apply across all SDKs

| Name                                                              | Description                                                                                                                            |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Project setup                                   | Configure your TypeScript project to use the SpacetimeDB TypeScript client SDK.                                                        |
| Generate module bindings             | Use the SpacetimeDB CLI to generate module-specific types and interfaces.                                                              |
| `DbConnection` type                         | A connection to a remote database.                                                                                                     |
| `DbContext` interface                     | Methods for interacting with the remote database. Implemented by `DbConnection` and various event context types. |
| `EventContext` type                         | `DbContext` available in row callbacks.                                                  |
| `ReducerEventContext` type           | `DbContext` available in reducer callbacks.                                    |
| `SubscriptionEventContext` type | `DbContext` available in subscription-related callbacks.                              |
| `ErrorContext` type                         | `DbContext` available in error-related callbacks.                                                              |
| Access the client cache               | Make local queries against subscribed rows, and register row callbacks to run when subscribed rows change.       |
| Observe and invoke reducers       | Send requests to the database to run reducers, and register callbacks to run when notified of reducers.                                |
| React Integration                           | React hooks and components for SpacetimeDB (`spacetimedb/react`).                                                                      |
| Identify a client                           | Types for identifying users and client connections.                                                                                    |
| Query Builder API                           | Type-safe query builder for subscriptions using the `tables` export.                                                                   |
| Framework Integrations                 | React, SolidJS, Vue, and Svelte hooks for reactive SpacetimeDB data.                                                                   |

## Project setup

First, create a new client project, and add the following to your `tsconfig.json` file:

```json
{
  "compilerOptions": {
    //You can use any target higher than this one
    //https://www.typescriptlang.org/tsconfig#target
    "target": "es2015"
  }
}
```

Then add the SpacetimeDB SDK to your dependencies:

```bash
cd client
npm install spacetimedb
```

> WARNING! The `@clockworklabs/spacetimedb-sdk` package has been deprecated in favor of the `spacetimedb` package as of SpacetimeDB version 1.4.0. If you are using the old SDK package, you will need to switch to `spacetimedb`. You will also need a SpacetimeDB CLI version of 1.4.0+ to generate bindings for the new `spacetimedb` package.

You should have this folder layout starting from the root of your project:

```bash
quickstart-chat
├── client
│   ├── node_modules
│   ├── public
│   └── src
└── server
    └── src
```

### Tip for utilities/scripts

If want to create a quick script to test your module bindings from the command line, you can use [https://www.npmjs.com/package/tsx](https://www.npmjs.com/package/tsx) to execute TypeScript files.

Then you create a `script.ts` file and add the imports, code and execute with:

```bash
npx tsx src/script.ts
```

## Generate module bindings

Each SpacetimeDB client depends on some bindings specific to your module. Create a `module_bindings` directory in your project's `src` directory and generate the Typescript interface files using the Spacetime CLI. From your project directory, run:

```bash
mkdir -p client/src/module_bindings
spacetime generate --lang typescript \
    --out-dir client/src/module_bindings \
    --module-path PATH-TO-MODULE-DIRECTORY
```

Import the `module_bindings` in your client's _main_ file:

```typescript
import * as moduleBindings from './module_bindings/index';
```

You may also need to import some definitions from the SDK library:

```typescript
import { Identity, ConnectionId, Event, ReducerEvent } from 'spacetimedb';
```

## Type `DbConnection`

```typescript
DbConnection;
```

A connection to a remote database is represented by the `DbConnection` type. This type is generated per-module, and contains information about the types, tables and reducers defined by your module.

| Name                                                      | Description                                                                                      |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Connect to a database           | Construct a `DbConnection`.                                                                      |
| Access tables and reducers | Access subscribed rows in the client cache, request reducer invocations, and register callbacks. |

### Connect to a database

```typescript
class DbConnection {
  public static builder(): DbConnectionBuilder;
}
```

Construct a `DbConnection` by calling `DbConnection.builder()` and chaining configuration methods, then calling `.build()`. You must at least specify `withUri`, to supply the URI of the SpacetimeDB to which you published your module, and `withDatabaseName`, to supply the human-readable SpacetimeDB domain name or the raw `Identity` which identifies the database.

| Name                                                      | Description                                                                          |
|-----------------------------------------------------------|--------------------------------------------------------------------------------------|
| `withUri` method                       | Set the URI of the SpacetimeDB instance which hosts the remote database.             |
| `withDatabaseName` method     | Set the name or `Identity` of the remote database.                                   |
| `withConfirmedReads` method | Enable or disable confirmed reads.                                                   |
| `onConnect` callback               | Register a callback to run on the first successful connection.          |
| `onAutomaticReconnect` callback | Register a callback to run after each successful automatic reconnect. |
| `onConnectError` callback     | Register a callback to run if the connection is rejected or the host is unreachable. |
| `onDisconnect` callback         | Register a callback to run when the connection ends.                                 |
| `withToken` method                   | Supply a token to authenticate with the remote database.                             |
| `withAutomaticReconnect` method | Keep the connection and subscriptions usable across connection loss. |
| `withTokenProvider` method | Refresh credentials before reconnecting. |
| `build` method                           | Finalize configuration and connect.                                                  |

#### Method `withUri`

```typescript
class DbConnectionBuilder {
  public withUri(uri: string): DbConnectionBuilder;
}
```

Configure the URI of the SpacetimeDB instance or cluster which hosts the remote database.

#### Method `withDatabaseName`

```typescript
class DbConnectionBuilder {
  public withDatabaseName(nameOrIdentity: string): DbConnectionBuilder;
}
```

Configure the SpacetimeDB domain name or hex string encoded `Identity` of the remote database which identifies it within the SpacetimeDB instance or cluster.

#### Method `withConfirmedReads`

```typescript
class DbConnectionBuilder {
  public withConfirmedReads(confirmedReads: boolean): DbConnectionBuilder;
}
```

Configure the connection to request confirmed reads.

When enabled, the server will send query results only after they are confirmed to be durable, i.e. persisted to disk on one or more replicas depending on the replication settings of the database. When set to `false`, the server will send results as soon as transactions are committed in memory.

Procedures called over this connection inherit the same setting. With confirmed reads enabled, each successful transaction block waits for durability before procedure code continues.

If this method is not called, the server chooses the default.

#### Callback `onConnect`

```typescript
class DbConnectionBuilder {
  public onConnect(
    callback: (ctx: DbConnection, identity: Identity, token: string) => void
  ): DbConnectionBuilder;
}
```

Chain a call to `.onConnect(callback)` to your builder to register a callback to run when your new `DbConnection` successfully initiates its connection to the remote database. The callback accepts three arguments: a reference to the `DbConnection`, the `Identity` by which SpacetimeDB identifies this connection, and a private access token which can be saved and later passed to `withToken` to authenticate the same user in future connections.

`onConnect` fires once per `DbConnection` object, on its first successful connection. You can register subscriptions and row callbacks here, or once after `build()`. Automatic reconnects preserve those registrations and invoke `onAutomaticReconnect` instead.

#### Callback `onAutomaticReconnect`

```typescript
class DbConnectionBuilder {
  public onAutomaticReconnect(
    callback: (ctx: DbConnection, identity: Identity, token: string) => void
  ): DbConnectionBuilder;
}
```

Called after each successful automatic reconnect enabled by `withAutomaticReconnect`. It receives the same `DbConnection` object, its identity, and the token used for the new connection, including any token refreshed by `withTokenProvider`. It does not fire for the initial connection or failed reconnect attempts, and `onConnect` does not fire again on automatic reconnect.

Use this callback to update connection status or restore application state that must be sent to the server after every reconnect. Register a shared handler for both `onConnect` and `onAutomaticReconnect` for work needed on every successful connection, such as persisting the current token.

The callback runs before subscription replay. Cached data may still be stale; wait for subscription `onApplied` callbacks when you need refreshed data. Existing subscriptions and row listeners survive automatically, so do not register them again here. Reconnection and subscription replay do not require an `onAutomaticReconnect` callback.

To remove a registered callback, call `conn.removeOnAutomaticReconnect(callback)` with the same function.

#### Callback `onConnectError`

```typescript
class DbConnectionBuilder {
  public onConnectError(
    callback: (
      ctx: ErrorContext,
      error: Error,
      nextReconnectAttempt?: number,
      nextReconnectDelayMs?: number
    ) => void
  ): DbConnectionBuilder;
}
```

Called when the initial connection or a reconnect attempt fails before it is established. When another attempt is scheduled, `nextReconnectAttempt` is its one-based number and `nextReconnectDelayMs` is the delay in milliseconds. Both are `undefined` when the SDK will not retry. Initial connection failures are never retried by the core SDK.

#### Callback `onDisconnect`

```typescript
class DbConnectionBuilder {
  public onDisconnect(
    callback: (
      ctx: ErrorContext,
      error?: Error,
      nextReconnectAttempt?: number,
      nextReconnectDelayMs?: number
    ) => void
  ): DbConnectionBuilder;
}
```

Called when an established connection is lost, or when the application calls `disconnect`. With automatic reconnection enabled, the trailing parameters describe the next attempt and delay in milliseconds. Both are `undefined` when no retry is scheduled. An explicit `disconnect()` also passes `undefined` for `error`, including when called between reconnect attempts.

#### Method `withToken`

```typescript
class DbConnectionBuilder {
  public withToken(token?: string): DbConnectionBuilder;
}
```

Chain a call to `.withToken(token)` to your builder to provide an OpenID Connect compliant JSON Web Token to authenticate with, or to explicitly select an anonymous connection. If this method is not called or `undefined` is passed, SpacetimeDB will generate a new `Identity` and sign a new private access token for the connection.

#### Method `withAutomaticReconnect`

```typescript
class DbConnectionBuilder {
  public withAutomaticReconnect(options?: AutomaticReconnectOptions): this;
}

type AutomaticReconnectOptions = {
  minDelayMs?: number; // default 1000
  maxDelayMs?: number; // default 30000
};
```

Enable automatic reconnection after an established connection drops. This is opt-in for plain TypeScript connections and requires a server with session IDs and batch subscription support.

The SDK keeps the same connection object, table handles, subscription handles, and registered callbacks. Each new connection has a fresh `ConnectionId`, while the SDK retains the authentication token to preserve the client's `Identity`, including for anonymous clients.

Retries continue until `disconnect()` or a recognized terminal failure, such as a changed identity, rejected credentials with no remaining refresh attempt, or a fatal protocol error. The delay starts at `minDelayMs` and doubles after each failed attempt up to `maxDelayMs`, with ±50% jitter clamped to those bounds. With the defaults, the base delays are 1, 2, 4, 8, 16, and 30 seconds. A successful connection resets the backoff. Initial connection failures do not retry. Browser resume events also check for silently closed sockets and bring scheduled retries forward.

To keep clients from overwhelming a database with rapid retries, `minDelayMs` is never lower than 500 ms and `maxDelayMs` is never lower than 1 second or lower than `minDelayMs`. Values below these floors are raised to them and a warning is logged.

```typescript
import { DbConnection, tables } from './module_bindings';

const conn = DbConnection.builder()
  .withUri('http://localhost:3000')
  .withDatabaseName('my-database')
  .withAutomaticReconnect()
  .onConnect((_conn, identity) => {
    console.log('Connected:', identity.toHexString());
  })
  .onAutomaticReconnect((_conn, identity) => {
    console.log('Reconnected:', identity.toHexString());
  })
  .onDisconnect((_ctx, error, attempt, delayMs) => {
    if (attempt !== undefined) {
      console.log(`Disconnected; retry ${attempt} in ${delayMs} ms`, error);
    } else {
      console.log('Connection ended', error);
    }
  })
  .onConnectError((_ctx, error, attempt, delayMs) => {
    if (attempt !== undefined) {
      console.log(`Connect failed; retry ${attempt} in ${delayMs} ms`, error);
    } else {
      console.error('Connection failed; no retry scheduled', error);
    }
  })
  .build();

conn.db.player.onInsert((_ctx, player) => console.log(player));
conn.subscriptionBuilder()
  .onApplied(() => console.log('Subscription applied'))
  .subscribe(tables.player);
```

While reconnecting:

- `conn.isActive` is `false` and `conn.isReconnecting` is `true`.
- Cache reads still return the last known rows, which may be stale.
- Reducer and procedure calls fail immediately with `DisconnectedError` and are not sent. Calls already in flight fail with `UnknownCallResultError`: they may have executed, so retrying them could repeat an effect.
- New subscriptions are retained for the next connection. Unsubscribing ends the handle locally and removes it from replay.

On reconnect, the SDK replays subscriptions in one batch and reconciles the cache before notifying row and subscription callbacks. Unchanged rows produce no row callbacks; changed rows produce the usual insert, update, or delete callbacks. Each replayed subscription fires `onApplied` again, or `onError` if rejected. `onAutomaticReconnect` precedes subscription replay, so wait for `onApplied` when you need refreshed data.

#### Method `withTokenProvider`

```typescript
class DbConnectionBuilder {
  public withTokenProvider(provider: () => Promise<string>): this;
}
```

Supply fresh credentials for reconnect attempts. This method does not enable automatic reconnection by itself, and the provider is not called for the initial connection. Obtain the initial token first and pass it to `withToken`:

```typescript
const initialToken = await auth.getAccessToken();
const conn = DbConnection.builder()
  .withUri('https://maincloud.spacetimedb.com')
  .withDatabaseName('my-database')
  .withToken(initialToken)
  .withAutomaticReconnect()
  .withTokenProvider(() => auth.getAccessToken())
  .build();
```

Here `auth` is your application's authentication client. Its method should return a usable token, refreshing it through your identity provider when necessary. The returned token must identify the same user; use a new connection for sign-in or account changes.

Before each reconnect attempt, the SDK reads the retained JWT's `exp` and `iat` claims. It calls the provider when the remaining validity is at most 5% of the token's lifetime, with a minimum margin of 30 seconds. Without `iat`, it uses the 30-second margin. If expiry cannot be read, it calls the provider on every attempt.

A recognized rejection of the retained token forces a refresh on the next attempt. Rejection of a freshly supplied token is terminal. If the provider throws or rejects, the attempt fails and the SDK retries with backoff. A token exchange service outage is also retryable.

Refresh happens before reconnecting, not on a periodic timer while connected. The SDK retains tokens in memory; persistence across page reloads remains the application's responsibility. If your application persists tokens, save the token from both `onConnect` and `onAutomaticReconnect` so that successful reconnects also save refreshed credentials.

#### Method `build`

```typescript
class DbConnectionBuilder {
  public build(): DbConnection;
}
```

After configuring the connection and registering callbacks, attempt to open the connection.

### Access tables and reducers

#### Field `db`

```typescript
class DbConnection {
  public db: RemoteTables;
}
```

The `db` field of the `DbConnection` provides access to the subscribed view of the remote database's tables. See Access the client cache.

#### Field `reducers`

```typescript
class DbConnection {
  public reducers: RemoteReducers;
}
```

The `reducers` field of the `DbConnection` provides access to reducers exposed by the remote module. See Observe and invoke reducers.

## Interface `DbContext`

```typescript
interface DbContext<
    DbView,
    Reducers,
>
```

`DbConnection`, `EventContext`, `ReducerEventContext`, `SubscriptionEventContext` and `ErrorContext` all implement `DbContext`. `DbContext` has fields and methods for inspecting and configuring your connection to the remote database.

The `DbContext` interface is implemented by connections and contexts to _every_ module. This means that its `DbView` and `Reducers` are generic types.

| Name                                                  | Description                                                  |
| ----------------------------------------------------- | ------------------------------------------------------------ |
| `db` field                               | Access subscribed rows of tables and register row callbacks. |
| `reducers` field                   | Request reducer invocations and register reducer callbacks.  |
| `disconnect` method             | End the connection.                                          |
| Subscribe to queries         | Register subscription queries to receive updates about matching rows. |
| Read connection metadata | Access the connection's `Identity` and `ConnectionId`        |

#### Field `db`

```typescript
interface DbContext {
  db: DbView;
}
```

The `db` field of a `DbContext` provides access to the subscribed view of the remote database's tables. See Access the client cache.

#### Field `reducers`

```typescript
interface DbContext {
  reducers: Reducers;
}
```

The `reducers` field of a `DbContext` provides access to reducers exposed by the remote module. See Observe and invoke reducers.

### Method `disconnect`

```typescript
interface DbContext {
  disconnect(): void;
}
```

Close the `DbConnection`. With automatic reconnection enabled, this cancels any scheduled or pending reconnect and fires `onDisconnect` with no error or retry parameters. The connection cannot be restarted; build a new one to connect again.

### Subscribe to queries

| Name                                                    | Description                                                 |
| ------------------------------------------------------- | ----------------------------------------------------------- |
| `SubscriptionBuilder` type | Builder-pattern constructor to register subscribed queries. |
| `SubscriptionHandle` type   | Manage an active subscription.                              |

#### Type `SubscriptionBuilder`

```typescript
SubscriptionBuilder;
```

| Name                                                                           | Description                                                     |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| `ctx.subscriptionBuilder()` constructor | Begin configuring a new subscription.                           |
| `onApplied` callback                                    | Register a callback to run when matching rows become available. |
| `onError` callback                                        | Register a callback to run if the subscription fails.           |
| `subscribe` method                                        | Finish configuration and subscribe to one or more queries.       |
| `subscribeToAllTables` method                  | Convenience method to subscribe to the entire database.         |

##### Constructor `ctx.subscriptionBuilder()`

```typescript
interface DbContext {
  subscriptionBuilder(): SubscriptionBuilder;
}
```

Subscribe to queries by calling `ctx.subscriptionBuilder()` and chaining configuration methods, then calling `.subscribe(queries)`.

##### Callback `onApplied`

```typescript
class SubscriptionBuilder {
  public onApplied(
    callback: (ctx: SubscriptionEventContext) => void
  ): SubscriptionBuilder;
}
```

Register a callback to run when the subscription is applied and the matching rows are inserted into the client cache.

##### Callback `onError`

```typescript
class SubscriptionBuilder {
  public onError(
    callback: (ctx: ErrorContext, error: Error) => void
  ): SubscriptionBuilder;
}
```

Register a callback to run if the subscription is rejected or unexpectedly terminated by the server. This is most frequently caused by passing an invalid query to `subscribe`.

##### Method `subscribe`

```typescript
class SubscriptionBuilder {
  // Subscribe using raw SQL strings
  subscribe(queries: string | string[]): SubscriptionHandle;

  // Subscribe using query builders (recommended)
  subscribe(query: TableRef | TableRef[]): SubscriptionHandle;
}
```

Subscribe to a set of queries. Use query builders as the default for type-safe, auto-completing queries. Raw SQL strings are also supported for advanced use cases.

```typescript
import { tables } from './module_bindings';

// Query builder (recommended) — type-safe, auto-completing
conn.subscriptionBuilder().subscribe(tables.user);
conn.subscriptionBuilder().subscribe([tables.user, tables.message]);
conn.subscriptionBuilder().subscribe(
  tables.user.where(r => r.online.eq(true))
);
```

For raw SQL subscription syntax, see the SpacetimeDB SQL Reference.

##### Method `subscribeToAllTables`

```typescript
class SubscriptionBuilder {
  subscribeToAllTables(): void;
}
```

Subscribe to all rows from all public tables, including public event tables. This method is provided as a convenience for simple clients. The subscription initiated by `subscribeToAllTables` cannot be canceled after it is initiated. You should `subscribe` to specific queries if you need fine-grained control over the lifecycle of your subscriptions.

## Query Builder API

The TypeScript SDK provides a type-safe query builder as the recommended way to define subscriptions. Query builders give you auto-completion and compile-time type checking.

### The `tables` export

Your generated `module_bindings` exports a `tables` object. Each property on `tables` corresponds to a public table in your module. These table refs serve double duty: they are both table references _and_ query builders.

```typescript
import { tables } from './module_bindings';

// `tables.user` selects all rows from `user`
// `tables.message` selects all rows from `message`
```

### Building queries with `where`

Call `.where()` on a table ref to add a filter. The predicate function receives a row expression with typed column accessors:

```typescript
// All users
tables.user

// Online users only
tables.user.where(r => r.online.eq(true))

// Users with a specific name
tables.user.where(r => r.name.eq('Alice'))
```

### Column operators

Each column accessor on the row expression supports the following comparison operators:

| Operator | Description              | Example                          |
| -------- | ------------------------ | -------------------------------- |
| `eq`     | Equal to                 | `r.online.eq(true)`              |
| `ne`     | Not equal to             | `r.name.ne('Anonymous')`         |
| `lt`     | Less than                | `r.age.lt(18)`                   |
| `lte`    | Less than or equal to    | `r.level.lte(5)`                 |
| `gt`     | Greater than             | `r.score.gt(100)`                |
| `gte`    | Greater than or equal to | `r.requiredLevel.gte(10)`        |

### Boolean combinators

Combine multiple conditions using instance methods or standalone functions:

```typescript
// Instance methods — chain on a boolean expression
tables.user.where(r => r.age.gte(18).and(r.age.lt(65)))
tables.user.where(r => r.online.eq(true).or(r.name.eq('Admin')))
tables.user.where(r => r.online.eq(true).not())

// Standalone functions — useful for combining many conditions
import { and, or, not } from './module_bindings';

tables.user.where(r => and(r.age.gte(18), r.age.lt(65)))
tables.user.where(r => or(r.online.eq(true), r.name.eq('Admin')))
tables.user.where(r => not(r.online.eq(true)))
```

### Semijoins

Semijoins match rows across two tables and return rows from one side:

- `leftSemijoin(...)` returns rows from the left side that match at least one row on the right.
- `rightSemijoin(...)` returns rows from the right side that match at least one row on the left.
- The join predicate is built from indexed row expressions and should compare indexed columns.
- Filters before a semijoin apply to the pre-join source side. Filters after a semijoin apply to the returned side.

```typescript
const leftSide = tables.player
  .where(p => p.score.gte(1000))
  .leftSemijoin(tables.playerLevel, (p, pl) => p.id.eq(pl.playerId))
  .where(p => p.online.eq(true));

const rightSide = tables.player
  .where(p => p.score.gte(1000))
  .rightSemijoin(tables.playerLevel, (p, pl) => p.id.eq(pl.playerId))
  .where(pl => pl.level.gte(10));
```

### Using query builders with subscriptions

Query builders can be passed directly to `subscribe`:

```typescript
import { tables } from './module_bindings';

// Subscribe to a single table (all rows)
conn.subscriptionBuilder().subscribe(tables.user);

// Subscribe to a filtered query
conn.subscriptionBuilder().subscribe(
  tables.user.where(r => r.online.eq(true))
);

// Subscribe to multiple queries
conn.subscriptionBuilder().subscribe([
  tables.user,
  tables.message,
]);
```

#### Type `SubscriptionHandle`

```typescript
SubscriptionHandle;
```

A `SubscriptionHandle` represents a subscribed query or a group of subscribed queries.

The `SubscriptionHandle` does not contain or provide access to the subscribed rows. Subscribed rows of all subscriptions by a connection are contained within that connection's `ctx.db`. See Access the client cache.

| Name                                                | Description                                                                                                      |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `isEnded` method                 | Determine whether the subscription has ended.                                                                    |
| `isActive` method               | Determine whether the subscription is active and its matching rows are present in the client cache.              |
| `unsubscribe` method         | Discard a subscription.                                                                                          |
| `unsubscribeThen` method | Discard a subscription, and register a callback to run when its matching rows are removed from the client cache. |

##### Method `isEnded`

```typescript
class SubscriptionHandle {
  public isEnded(): boolean;
}
```

Returns true if this subscription has been terminated due to an unsubscribe call or an error.

##### Method `isActive`

```typescript
class SubscriptionHandle {
  public isActive(): boolean;
}
```

Returns true if this subscription has been applied and has not yet been unsubscribed.

##### Method `unsubscribe`

```typescript
class SubscriptionHandle {
  public unsubscribe(): void;
}
```

Terminate this subscription, causing matching rows to be removed from the client cache. Any rows removed from the client cache this way will have `onDelete` callbacks run for them.

Unsubscribing is an asynchronous operation. Matching rows are not removed from the client cache immediately. Use `unsubscribeThen` to run a callback once the unsubscribe operation is completed.

Throws an error if the subscription has already ended, either due to a previous call to `unsubscribe` or `unsubscribeThen`, or due to an error.

##### Method `unsubscribeThen`

```typescript
class SubscriptionHandle {
  public unsubscribeThen(onEnd: (ctx: SubscriptionEventContext) => void): void;
}
```

Terminate this subscription, and run the `onEnd` callback when the subscription is ended and its matching rows are removed from the client cache. Any rows removed from the client cache this way will have `onDelete` callbacks run for them.

Returns an error if the subscription has already ended, either due to a previous call to `unsubscribe` or `unsubscribeThen`, or due to an error.

### Read connection metadata

#### Field `isActive`

```typescript
interface DbContext {
  isActive: boolean;
}
```

Whether the connection is currently active. With automatic reconnection enabled, this remains `false` until the server's initial connection message arrives, and becomes `false` again during an outage. It does not indicate whether subscriptions have finished applying.

#### Field `isReconnecting`

```typescript
class DbConnection {
  readonly isReconnecting: boolean;
}
```

`true` after losing an established connection while the SDK is waiting for or attempting a reconnect. It is `false` during the initial connection, after a successful reconnect, and after the connection ends. This field is on `DbConnection`, not the general `DbContext` interface.
