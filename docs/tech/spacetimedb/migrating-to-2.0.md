# SpacetimeDB: migrating from 1.x to 2.0 (what changed)

> Source: https://github.com/clockworklabs/SpacetimeDB/blob/v2.13.0/docs/docs/00300-resources/00100-how-to/00600-migrating-to-2.0.md
> Fetched: 2026-10-24.
>
> From the clockworklabs/SpacetimeDB repo at tag v2.13.0 (Oct 19, 2026), the release that install.spacetimedb.com installs today.
> Only the TypeScript tabs are kept. The Rust, C#, C++ and Unreal versions are on spacetimedb.com.
> Read this when code written from memory uses the 1.x API (for example `name:` on a table instead of the schema key, or old SDK imports).

This guide covers the breaking changes between SpacetimeDB 1.0 and 2.0 and how to update your code.

## Overview of Changes

SpacetimeDB 2.0 introduces a new WebSocket protocol (v2) and SDK with several breaking changes aimed at simplifying the programming model and improving security:

1. **Reducer callbacks removed** -- replaced by event tables and per-call `_then()` callbacks
2. **`light_mode` removed** -- no longer necessary since reducer events are no longer broadcast
3. **`CallReducerFlags` removed** -- `NoSuccessNotify` and `set_reducer_flags()` are gone
4. **Event tables introduced** -- a new table type for publishing transient events to subscribers
5. **Confirmed reads enabled by default** -- subscription updates and SQL results are only sent after the transaction is confirmed durable

## Reducer Callbacks

### What changed

In 1.0, you could register global callbacks on reducers that would fire whenever *any* client called that reducer and you were subscribed to affected rows:

```typescript
// 1.0 -- REMOVED in 2.0
conn.reducers.onDealDamage((ctx, { target, amount }) => {
  console.log(`Someone called dealDamage with args: (${target}, ${amount})`);
});
```

In 2.0, global reducer callbacks no longer exist. The server does not broadcast reducer argument data to other clients. Instead, you have two options:

### Option A: Per-call result callbacks (`_then()`)

If you only need to know the result of a reducer *you* called, you can await the result or use the `_then()` variant:

```typescript
try {
  await ctx.reducers.dealDamage({ target, amount });
  console.log(`You called dealDamage with args: (${target}, ${amount})`);
} catch (err) {
  if (err instanceof SenderError) {
    console.log(`You made an error: ${err}`)
  } else if (err instanceof InternalError) {
    console.log(`The server had an error: ${err}`);
  }
}
```

### Option B: Event tables (recommended for most use cases)

If you need *other* clients to observe that something happened (the primary use case for 1.0 reducer callbacks), create an event table and insert into it from your reducer.

**Server (module) -- before:**
```typescript
// 1.0 -- NO LONGER VALID in 2.0 (reducer args were automatically broadcast)
spacetimedb.reducer('deal_damage', { target: t.identity(), amount: t.u32() }, (ctx, { target, amount }) => {
  // update game state
});
```

**Server (module) -- after:**
```typescript
// 2.0 server -- explicitly publish events via an event table
const damageEvent = table({ name: 'damage_event', event: true }, {
    target: t.identity(),
    amount: t.u32(),
})
// schema() takes an object: schema({ damageEvent }), never schema(damageEvent)
const spacetimedb = schema({ damageEvent });

export const dealDamage = spacetimedb.reducer({ target: t.identity(), amount: t.u32() }, (ctx, { target, amount }) => {
  ctx.db.damageEvent.insert({ target, amount });
});
```

**Client -- before:**
```typescript
// 1.0 -- NO LONGER VALID in 2.0 (global reducer callback)
conn.reducers.onDealDamage((ctx, { target, amount }) => {
    playDamageAnimation(target, amount);
});
```

**Client -- after:**
```typescript
// 2.0 client -- event table callback
// Note that although this callback fires, the `damageEvent`
// table will never have any rows present in the client cache
conn.db.damageEvent().onInsert((ctx, { target, amount }) => {
    playDamageAnimation(target, amount);
});
```

### Why event tables are better

- **Security**: You control exactly what data is published. In 1.0, reducer arguments were broadcast to any subscriber of affected rows, which could accidentally leak sensitive data.
- **Flexibility**: Multiple reducers can insert the same event type. In 1.0, events were tied 1:1 to a specific reducer.
- **Transactional**: Events are only published if the transaction commits. In 1.0, workarounds using scheduled reducers were not transactional.
- **Row-level security**: RLS rules apply to event tables, so you can control which clients see which events.
- **Queryable**: Event tables can be subscribed to with query builders (or SQL), and can be filtered per-client.

### Event table details

- Event tables are always empty outside of a transaction. They don't accumulate rows.
- On the client, `count()` always returns 0 and `iter()` is always empty.
- Only `on_insert` callbacks are generated (no `on_delete` or `on_update`).
- The `event` keyword in `#[table(..., event)]` marks the table as transient.
- Event tables can be subscribed to with subscribe-all helpers or explicit typed queries, but clients observe them only through insert callbacks.

## Event Type Changes

### What changed

In 1.0, table callbacks received `{ tag: 'Reducer'; value: ReducerEvent<Reducer> }` with full reducer information when a reducer caused a table change. Non-callers could also receive `{ tag: 'UnknownTransaction' }`.

In 2.0, the event model is simplified:

- **The caller** sees `{ tag: 'Reducer'; value: ReducerEvent<Reducer> }` with `type ReducerEvent = { timestamp, status, reducer }` in response to their own reducer calls.
- **Other clients** see `{ tag: 'Transaction' }` (no reducer details).
- `{ tag: 'UnknownTransaction' }` is removed.

```typescript
// 2.0 -- checking who caused a table change
conn.db.myTable().onInsert((ctx, row) => {
  if (ctx.event.tag === 'Reducer') {
    // This client called the reducer that caused this insert.
    console.log(`Our reducer: ${ctx.event.value.reducer}`);
  }
  if (ctx.event.tag === 'Transaction') {
    // Another client's action caused this insert.
  }
});
```

If you need metadata about reducers invoked by other clients, update your reducer code to emit an event using an event table.

## Subscription API

In 2.0, the subscription API is largely the same, but you can now subscribe to the database with a typed query builder:

```typescript
// 1.0 -- NO LONGER VALID in 2.0
ctx.subscriptionBuilder()
  .onApplied(ctx => { /* ... */ })
  .onError((ctx, err) => { /* ... */ })
  .subscribe(["SELECT * FROM my_table"]);
```

```typescript
// 2.0 -- Typed query builder
import { tables } from './module_bindings';
ctx.subscriptionBuilder()
  .onApplied(ctx => { /* ... */ })
  .onError((ctx, err) => { /* ... */ })
  .subscribe([tables.myTable]);
```

Use explicit queries when you want to subscribe to event tables without subscribing to every public table:

```typescript
// Subscribe explicitly to an event table:
import { tables } from "./module_bindings";
ctx.subscriptionBuilder()
    .onApplied((ctx) => { /* ... */ })
    .subscribe([tables.damageEvent]);
```

## Table Name Canonicalization

### What changed

SpacetimeDB 2.0 no longer equates the canonical name of your tables and indexes with the accessor method you use in module or client code. The canonical name is largely an internal detail, but you may encounter it when making SQL queries, or in the migration plans printed by `spacetime publish`.

### Updating source code: Change `name` to `accessor` in table definitions

The `name` option for table definitions is now used to overwrite the canonical name, and is optional. The name of the key passed to the `schema` function controls the method names you write in your module and client source code.

By default, the canonical name is derived from the accessor by converting it to snake case.

To migrate a 1.0 table definition to 2.0, pass an object to the `schema` function. Always use `schema({ table1 })` or `schema({ t1, t2 })` — never pass a single table directly.

**Warning: TypeScript: `schema()` takes exactly one argument — an object**

Use `schema({ table })` or `schema({ t1, t2 })`. **Never** use `schema(table)` or `schema(t1, t2, t3)`.

```typescript
// 1.0 -- NO LONGER VALID in 2.0
const myTable = table({ name: "my_table", public: true });
const spacetimedb = schema(myTable); // NO LONGER VALID in 2.0
```

```typescript
// 2.0
const myTable = table({ public: true });
const spacetimedb = schema({ myTable }); // NOTE! We are passing `{ myTable }`, not `myTable`
export default spacetimedb; // You must now also export the schema from your module.
```

### Auto-migrating existing databases

The new default behavior for canonicalizing names may not be compatible with existing 1.0 databases, as it may change the casing of table names, which would require a manual migration.

#### Option 1: Disable case conversion

To avoid this manual migration, configure the case conversion policy in your module to not convert, which will result in the same table names as a 1.0 module:

```typescript
export const moduleSettings: ModuleSettings = {
  caseConversionPolicy: CaseConversionPolicy.None,
};
```

#### Option 2: overwrite the name of individual tables

Alternatively, manually specify the correct canonical name of each table:

```typescript
import { table, schema, t } from 'spacetimedb/server';

const myTable = table(
  {
    name: 'MyTable',
    public: true,
    indexes: [{ accessor: 'position', columns: ['x', 'y'] }],
  },
  {
    id: t.u32().primaryKey().autoInc(),
    x: t.u32(),
    y: t.u32(),
  }
);
```

## Clients connect with database name

When constructing a `DbConnection` to a remote database, you now use `withDatabaseName` to provide the database name, rather than `withModuleName`. This is a more accurate terminology.

```typescript
// 1.0 -- NO LONGER CORRECT
const conn = DbConnection.builder()
    .withUri("https://maincloud.spacetimedb.com")
    .withModuleName("my-database")
    // other options...
    .build();

// 2.0
const conn = DbConnection.builder()
    .withUri("https://maincloud.spacetimedb.com")
    .withDatabaseName("my-database")
    // other options...
    .build()
```

## `sender` Is Now A Method, Not A Field

This change does not apply to TypeScript, where properties are indistinguishable from fields.

## Only Primary Keys Have Update Methods

In 2.0 modules, only columns with a `.primaryKey()` constraint expose an `update` method, whereas previously, `.unique()` constraints also provided that method. The previous behavior led to confusion, as only updates which preserved the value in the primary key column resulted in `onUpdate` callbacks being invoked on the client.

```typescript
const myTable = table({ name: 'my_table' }, {
    id: t.u32().unique(),
    name: t.string(),
})

// 1.0 -- REMOVED in 2.0
spacetimedb.reducer('my_reducer', ctx => {
    ctx.db.myTable.id.update({
        id: 1,
        name: "Foobar",
    });
})

// 2.0 -- Perform a delete followed by an insert
// OR change the `.unique()` constraint into `.primaryKey()` constraint
spacetimedb.reducer(ctx => {
    ctx.db.myTable.id.delete(1);
    ctx.db.myTable.insert({
        id: 1,
        name: "Foobar"
    });
})
```

## Scheduled Functions Are Now Private

Scheduled reducers and procedures are now private by default, meaning that only the database owner and team collaborators can bypass the schedule table to invoke them manually.

### Remove authorization logic from scheduled functions

Because scheduled reducers and procedures are now private, it's no longer necessary to explicitly check that the sender is the database itself.

```typescript
// 1.0 -- NO LONGER VALID in 2.0
const myTimer = table({ name: "my_timer", scheduled: 'runMyTimer' }, {
  scheduledId: t.u64(),
  scheduledAt: t.scheduleAt(),
});
const spacetimedb = schema(myTimer);

// 1.0 - SUPERFLUOUS IN 2.0
spacetimedb.reducer('runMyTimer', myTimer.rowType, (ctx, timer) => {
  if (ctx.sender != ctx.identity) {
    throw SenderError(`'runMyTimer' should only be invoked by the database!`);
  }
  // Do stuff
})
```

```typescript
const myTimer = table({ name: 'my_timer', scheduled: (): any => runMyTimer }, {
  scheduledId: t.u64().primaryKey().autoInc(),
  scheduledAt: t.scheduleAt(),
});
const spacetimedb = schema({ myTimer }); // schema({ table }), never schema(table)

// 2.0 -- Can only be called by the database
export const runMyTimer = spacetimedb.reducer({ arg: myTimer.rowType }, (ctx, { arg }) => {
  // Do stuff
})
```

### Define wrappers for functions that are both scheduled and invoked by clients

In the rare event that you have a reducer or procedure which is intended to be invoked by both clients and a schedule table, define a new public reducer or procedure which wraps the scheduled function.

```typescript
const myTimer = table({ name: 'my_timer', scheduled: (): any => runMyTimerPrivate }, {
  scheduledId: t.u64().primaryKey().autoInc(),
  scheduledAt: t.scheduleAt(),
});
const spacetimedb = schema({ myTimer }); // schema({ table }), never schema(table)

export const runMyTimerPrivate = spacetimedb.reducer({ arg: myTimer.rowType }, (ctx, { arg }) => {
  // Do stuff...
});

export const runMyTimer = spacetimedb.reducer({ arg: myTimer.rowType }, (ctx, { arg }) => {
  // Same logic as runMyTimerPrivate — extract to a helper if needed
});
```

## Private Items Are Not Code-Generated By Default

Starting in SpacetimeDB 2.0, `spacetime generate` will not generate bindings for private tables or functions by default. These bindings were confusing, as only clients authenticated as the database owner or a collaborator could access them, with most clients seeing an error when trying to subscribe to a private table or invoke a private function.

### Pass `--include-private` to `spacetime generate`

For clients which rely on generated bindings to private tables or functions, pass the `--include-private` flag to the `spacetime generate` CLI command.

## Light Mode

### What changed

In 1.0, `light_mode` prevented the server from sending reducer event data to a client (unless that client was the caller):

```typescript
// 1.0 -- REMOVED in 2.0
DbConnection.builder()
    .withLightMode(true)
    // ...
```

In 2.0, the server never broadcasts reducer argument data to any client, so `light_mode` is no longer necessary. Simply remove the call:

```typescript
// 2.0
DbConnection.builder()
    .withUri(uri)
    .withDatabaseName(name)
    // no withLightMode needed
    .build()
```

## CallReducerFlags

### What changed

In 1.0, you could suppress success notifications for individual reducer calls:

```typescript
// 1.0 -- REMOVED in 2.0
ctx.setReducerFlags(CallReducerFlags.NoSuccessNotify);
ctx.reducers.myReducer(args);
```

In 2.0, the success notification is lightweight (just `requestId` and `timestamp`, no reducer args or full event data), so there is no need to suppress it. Remove any `setReducerFlags` calls and `CallReducerFlags` imports.

## Confirmed Reads Enabled by Default

### What changed

In 1.0, subscription updates and SQL query results were sent to the client immediately, before the underlying transaction was confirmed to be durable. This meant a client could observe a row that was later lost if the server crashed before persisting it.

In 2.0, **confirmed reads are enabled by default**. The server waits until a transaction is confirmed durable before sending updates to clients. This ensures that any data a client receives will survive a server restart.

### Impact

- **Slightly higher latency**: Subscription updates and SQL results may arrive a few milliseconds later, as the server waits for durability confirmation before sending them.
- **Stronger consistency**: Clients will never observe data that could be lost due to a crash.
- **No code changes required**: This is a server-side default change. Existing client code works without modification.

### Opting out

If your application prioritizes low latency over durability guarantees (for example, a real-time game where occasional data loss on crash is acceptable), you can opt out by passing `confirmed=false` in the connection URL:

```typescript
DbConnection.builder()
    .withUri("https://maincloud.spacetimedb.com")
    .withDatabaseName("my-database")
    .withConfirmedReads(false) // opt out of confirmed reads
    .build()
```

For the CLI:

```bash
# SQL without confirmed reads
spacetime sql <database> "SELECT * FROM my_table"
# The --confirmed flag is no longer needed (it is the default)
```

## Quick Migration Checklist

- [ ] Remove all `ctx.reducers.on_<reducer>()` calls
  - Replace with `_then()` callbacks for your own reducer calls
  - Unreal: replace with generated `On<Reducer>` delegates on the calling connection
  - Replace with event tables + `on_insert` for cross-client notifications
- [ ] Migrate Unreal subscription SQL strings to typed queries where appropriate
  - Use `Conn->SubscriptionBuilder()->AddQuery(...)->Subscribe()` instead of `Subscribe({ TEXT("SELECT ...") })`
- [ ] Update `Event::UnknownTransaction` matches to `Event::Transaction`
- [ ] For each reducer whose args you were observing from other clients:
  1. Create an `#[table(..., event)]` on the server
  2. Insert into it from the reducer
  3. Subscribe to it on the client
  4. Use `on_insert` instead of the old reducer callback
- [ ] Replace `name =` with `accessor =` in table and index definitions
- [ ] **TypeScript:** Use `schema({ table })` or `schema({ t1, t2 })` — never `schema(table)` or `schema(t1, t2, t3)`
- [ ] Set your module's case conversion policy to `None`
- [ ] Change `with_module_name` to `with_database_name`
- [ ] Change `ctx.sender` to `ctx.sender()`
  - Only necessary in Rust and C++ modules.
- [ ] Remove `update` calls on non-primary key unique indexes
  - When leaving the primary key value unchanged, update using the primary key index
  - When altering the primary key value, delete and insert
- [ ] Remove superfluous auth logic from scheduled functions which are not called by clients
- [ ] Define wrappers around scheduled functions which are called by clients
- [ ] Use `spacetime generate --include-private` if you rely on bindings for private tables or functions
- [ ] Remove `with_light_mode()` from `DbConnectionBuilder`
  - Unreal: no action if you are already on the 2.0 Unreal SDK; there is no public `WithLightMode(...)`
- [ ] Remove `set_reducer_flags()` calls and `CallReducerFlags` imports
  - Unreal: no action if you are already on the 2.0 Unreal SDK; there is no public reducer-flags API
- [ ] Remove `unstable::CallReducerFlags` from imports
- [ ] Note that confirmed reads are now enabled by default (no action needed unless you want to opt out with `.withConfirmedReads(false)`)
