# SpacetimeDB: subscriptions and their semantics (TypeScript)

> Sources:
> - https://github.com/clockworklabs/SpacetimeDB/blob/v2.13.0/docs/docs/00200-core-concepts/00400-subscriptions.md
> - https://github.com/clockworklabs/SpacetimeDB/blob/v2.13.0/docs/docs/00200-core-concepts/00400-subscriptions/00200-subscription-semantics.md
> Fetched: 2026-10-24.
>
> From the clockworklabs/SpacetimeDB repo at tag v2.13.0 (Oct 19, 2026), the release that install.spacetimedb.com installs today.
> Only the TypeScript tabs are kept. The Rust, C#, C++ and Unreal versions are on spacetimedb.com.
> There is no official Python SDK. From Python, either poll `POST /v1/database/<db>/sql`, open the `v1.json.spacetimedb` WebSocket yourself (see http-api.md), or run `spacetime subscribe` as a subprocess (see cli-reference.md).

## Subscriptions

Subscriptions replicate database rows to your client in real-time. When you subscribe to a query, SpacetimeDB sends you the matching rows immediately and then pushes updates whenever those rows change.

### Quick Start

Here's a complete example showing how to subscribe to data and react to changes:

```typescript
import { DbConnection, tables } from './module_bindings';

// Connect to the database
const conn = DbConnection.builder()
  .withUri('wss://maincloud.spacetimedb.com')
  .withDatabaseName('my_module')
  .onConnect((ctx) => {
    // Subscribe to users and messages using query builders
    ctx.subscriptionBuilder()
      .onApplied(() => {
        console.log('Subscription ready!');
        // Initial data is now in the client cache
        for (const user of ctx.db.user.iter()) {
          console.log(`User: ${user.name}`);
        }
      })
      .subscribe([tables.user, tables.message]);
  })
  .build();

// React to new rows being inserted
conn.db.user.onInsert((ctx, user) => {
  console.log(`New user joined: ${user.name}`);
});

// React to rows being deleted
conn.db.user.onDelete((ctx, user) => {
  console.log(`User left: ${user.name}`);
});

// React to rows being updated
conn.db.user.onUpdate((ctx, oldUser, newUser) => {
  console.log(`${oldUser.name} changed name to ${newUser.name}`);
});
```

**Tip: Typed Query Builders**

Type-safe query builders are available in TypeScript, C#, Rust, and Unreal and are the recommended default. They provide auto-completion and compile-time type checking. For complete API details, see TypeScript, C#, Rust, and Unreal references.

### How Subscriptions Work

1. **Subscribe**: Subscribe with queries to the data you need
2. **Receive initial data**: SpacetimeDB sends all matching rows immediately
3. **Receive updates**: When subscribed rows change, you get real-time updates
4. **React to changes**: Use row callbacks (`onInsert`, `onDelete`, `onUpdate`) to handle changes

The client maintains a local cache of subscribed data. Reading from the cache is instant since it's local memory.

For advanced raw SQL subscription syntax, see the SQL docs.

### Common API Concepts

This page focuses on subscription behavior and usage patterns that apply across SDKs. For exact method signatures and SDK-specific overloads, use the language references.

#### Builder and Lifecycle Callbacks

All SDKs expose a builder API for creating subscriptions:

- Register an applied callback: runs once initial matching rows are present in the local cache.
- Register an error callback: runs if subscription registration fails or a subscription later terminates with an error.
- Subscribe with one or more queries.

In Unreal, inspect the initial subscribed data set in `OnApplied`. Use table callbacks like `OnInsert`, `OnDelete`, and `OnUpdate` for later live changes.

#### Query Forms

All SDKs support subscriptions. Query builders are the recommended default across SDKs, with raw SQL available where needed:

| SDK | Typed Query Builder Support | Entry Point |
| --- | --- | --- |
| TypeScript | Yes | `tables.<table>.where(...)` passed to `subscribe(...)` |
| C# | Yes | `SubscriptionBuilder.AddQuery(...).Subscribe()` |
| Rust | Yes | `subscription_builder().add_query(...).subscribe()` |
| Unreal | Yes | `SubscriptionBuilder.AddQuery(...).Subscribe()` |

Unreal also supports raw SQL subscriptions through `Subscribe(const TArray<FString>& SQL)` when you need direct SQL control.

#### Subscription Handles

Subscribing returns a handle that manages an individual subscription lifecycle.

- `isActive` / `IsActive` / `is_active` indicates that matching rows are currently active in the cache.
- `isEnded` / `IsEnded` / `is_ended` indicates a subscription has ended, either from unsubscribe or error.
- Unsubscribe is asynchronous: rows are removed after the unsubscribe operation is applied.
- `subscribeToAllTables` / `SubscribeToAllTables` / `subscribe_to_all_tables` is a convenience entry point intended for simple clients and is not individually cancelable.

#### API References

- TypeScript subscription API
- TypeScript query builder API
- C# subscription API
- C# query builder API
- Rust subscription API
- Rust query builder API
- Unreal subscription API
- Unreal query builder API

### Best Practices for Optimizing Server Compute and Reducing Serialization Overhead

#### 1. Writing Efficient Subscription Queries

Use the typed query builder to express precise filters and keep subscriptions small. If you use raw SQL subscriptions, see SQL Best Practices.

#### 2. Group Subscriptions with the Same Lifetime Together

Subscriptions with the same lifetime should be grouped together.

For example, you may have certain data that is required for the lifetime of your application,
but you may have other data that is only sometimes required by your application.

By managing these sets as two independent subscriptions,
your application can subscribe and unsubscribe from the latter,
without needlessly unsubscribing and resubscribing to the former.

This will improve throughput by reducing the amount of data transferred from the database to your application.

##### Example

```typescript
import { DbConnection, tables } from './module_bindings';

const conn = DbConnection.builder()
  .withUri('https://maincloud.spacetimedb.com')
  .withDatabaseName('my_module')
  .build();

// Never need to unsubscribe from global subscriptions
const globalSubscriptions = conn
  .subscriptionBuilder()
  .subscribe([
    // Global messages the client should always display
    tables.announcements,
    // A description of rewards for in-game achievements
    tables.badges,
  ]);

// May unsubscribe to shop_items as player advances
const shopSubscription = conn
  .subscriptionBuilder()
  .subscribe([
    tables.shopItems.where(r => r.requiredLevel.lte(5)),
  ]);
```

#### 3. Subscribe Before Unsubscribing

If you want to update or modify a subscription by dropping it and subscribing to a new set,
you should subscribe to the new set before unsubscribing from the old one.

This is because SpacetimeDB subscriptions are zero-copy.
Subscribing to the same query more than once doesn't incur additional processing or serialization overhead.
Likewise, if a query is subscribed to more than once,
unsubscribing from it does not result in any server processing or data serializtion.

##### Example

```typescript
import { DbConnection, tables } from './module_bindings';

const conn = DbConnection.builder()
  .withUri('https://maincloud.spacetimedb.com')
  .withDatabaseName('my_module')
  .build();

// Initial subscription: player at level 5.
const shopSubscription = conn
  .subscriptionBuilder()
  .subscribe([
    // For displaying the price of shop items in the player's currency of choice
    tables.exchangeRates,
    tables.shopItems.where(r => r.requiredLevel.lte(5)),
  ]);

// New subscription: player now at level 6, which overlaps with the previous query.
const newShopSubscription = conn
  .subscriptionBuilder()
  .subscribe([
    // For displaying the price of shop items in the player's currency of choice
    tables.exchangeRates,
    tables.shopItems.where(r => r.requiredLevel.lte(6)),
  ]);

// Unsubscribe from the old subscription once the new one is in place.
if (shopSubscription.isActive()) {
  shopSubscription.unsubscribe();
}
```

#### 4. Avoid Overlapping Queries

This refers to distinct queries that return intersecting data sets,
which can result in the server processing and serializing the same row multiple times.
While SpacetimeDB can manage this redundancy, it may lead to unnecessary inefficiencies.

Consider the following two query builder subscriptions:

```typescript
tables.user
tables.user.where(r => r.id.eq(5))
```

If `User.id` is a unique or primary key column,
the cost of subscribing to both queries is minimal.
This is because the server will use an index when processing the 2nd query,
and it will only serialize a single row for the 2nd query.

In contrast, consider these two query builder subscriptions:

```typescript
tables.user
tables.user.where(r => r.id.ne(5))
```

The server must now process each row of the `User` table twice,
since the 2nd query cannot be processed using an index.
It must also serialize all but one row of the `User` table twice,
due to the significant overlap between the two queries.

By following these best practices, you can optimize your data replication strategy and ensure your application remains efficient and responsive.

## Subscription Semantics

<!--This document was generated by ChatGPT based on a Discord discussion starting https://discord.com/channels/1037340874172014652/1138987509834059867/1354817326490325072 and then manually touched up.-->

This document describes the subscription semantics maintained by the SpacetimeDB host over WebSocket connections. These semantics outline message ordering guarantees, subscription handling, transaction updates, and client cache consistency.

### WebSocket Communication Channels

A single WebSocket connection between a client and the SpacetimeDB host consists of two distinct message channels:

- **Client → Server:** Sends requests such as reducer invocations and subscription queries.
- **Server → Client:** Sends responses to client requests and database transaction updates.

#### Ordering Guarantees

The server maintains the following guarantees:

1. **Sequential Response Ordering:**
   - Responses to client requests are always sent back in the same order the requests were received. If request A precedes request B, the response to A will always precede the response to B, even if A takes longer to process.

2. **Atomic Transaction Updates:**
   - Each database transaction (e.g., reducer invocation, INSERT, UPDATE, DELETE queries) generates exactly zero or one update message sent to clients. These updates are atomic and reflect the exact order of committed transactions.

3. **Atomic Subscription Initialization:**
   - When subscriptions are established, clients receive exactly one response containing all initially matching rows from a consistent database state snapshot taken between two transactions.
   - The state snapshot reflects a committed database state that includes all previous transaction updates received and excludes all future transaction updates.

### Subscription Workflow

When invoking `SubscriptionBuilder::subscribe(QUERIES)` from the client SDK:

1. **Client SDK → Host:**
   - Sends a `Subscribe` message containing the specified QUERIES.

2. **Host Processing:**
   - Captures a snapshot of the committed database state.
   - Evaluates the QUERIES against this snapshot to determine matching rows.

3. **Host → Client SDK:**
   - Sends a `SubscribeApplied` message containing the matching rows.

4. **Client SDK Processing:**
   - Receives and processes the message.
   - Locks the client cache and inserts all rows atomically.
   - Invokes relevant callbacks:
     - `on_insert` callback for each row.
     - `on_applied` callback for the subscription.
**Note:**

       No relative ordering guarantees are made regarding the invocation order of these callbacks.

### Transaction Update Workflow

Upon committing a database transaction:

1. **Transaction Results in a State Delta:**
   - The result of a transaction is a state delta, i.e. an unordered set of inserted and deleted rows.

2. **Host Evaluates Queries:**
   - Evaluates the QUERIES against the state delta to determine matching altered rows.

3. **Host → Client SDK:**
   - Sends a `TransactionUpdate` message if relevant updates exist, containing affected rows and transaction metadata.

4. **Client SDK Processing:**
   - Receives and processes the message.
   - Locks the client cache, applying deletions and insertions atomically.
   - Invokes relevant callbacks:
     - `on_insert`, `on_delete`, `on_update` callbacks for modified rows.
     - Reducer callbacks, if the transaction was the result of a reducer.
**Note:**

       No relative ordering guarantees are made regarding the invocation order of these callbacks.

### Multiple Subscription Sets

If multiple subscription sets are active, updates across these sets are bundled together into a single `TransactionUpdate` message.

### Client Cache Guarantees

- The client cache always maintains a consistent and correct subset of the committed database state.
- Callback functions invoked due to events have guaranteed visibility into a fully updated cache state.
- Reads from the client cache are effectively free as they access locally cached data.
- During callback execution, the client cache accurately reflects the database state immediately following the event-triggering transaction.

#### Pending Callbacks and Cache Consistency

While processing a `TransactionUpdate` message, callbacks are queued within the SDK and deferred until the cache updates (inserts/deletes) from a transaction are fully applied. This ensures all callbacks see the fully consistent state of the cache, preventing callbacks from observing an inconsistent intermediate state.
