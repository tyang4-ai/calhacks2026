# SpacetimeDB: reducers, reducer context, lifecycle, errors (TypeScript)

> Sources:
> - https://github.com/clockworklabs/SpacetimeDB/blob/v2.13.0/docs/docs/00200-core-concepts/00200-functions/00300-reducers/00300-reducers.md
> - https://github.com/clockworklabs/SpacetimeDB/blob/v2.13.0/docs/docs/00200-core-concepts/00200-functions/00300-reducers/00400-reducer-context.md
> - https://github.com/clockworklabs/SpacetimeDB/blob/v2.13.0/docs/docs/00200-core-concepts/00200-functions/00300-reducers/00500-lifecycle.md
> - https://github.com/clockworklabs/SpacetimeDB/blob/v2.13.0/docs/docs/00200-core-concepts/00200-functions/00300-reducers/00600-error-handling.md
> Fetched: 2026-10-24.
>
> From the clockworklabs/SpacetimeDB repo at tag v2.13.0 (Oct 19, 2026), the release that install.spacetimedb.com installs today.
> Only the TypeScript tabs are kept. The Rust, C#, C++ and Unreal versions are on spacetimedb.com.
> The exported const name becomes the reducer name, and its canonical name is snake_case. Call it over HTTP at `/v1/database/<db>/call/<snake_case_name>`.

## Overview

Reducers are functions that modify database state in response to client requests or system events. They are the **only** way to mutate tables in SpacetimeDB - all database changes must go through reducers.

### Defining Reducers

Reducers are defined in your module code and automatically exposed as callable functions to connected clients.

Use the `spacetimedb.reducer` function:

```typescript
import { schema, table, t } from 'spacetimedb/server';

const user = table(
  { name: 'user', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    name: t.string().index('btree'),
    email: t.string().unique(),
  }
);

const spacetimedb = schema({ user });
export default spacetimedb;

export const createUser = spacetimedb.reducer({ name: t.string(), email: t.string() }, (ctx, { name, email }) => {
  // Validate input
  if (name === '') {
    throw new Error('Name cannot be empty');
  }

  // Modify tables
  ctx.db.user.insert({
    id: 0n,  // auto-increment will assign
    name,
    email
  });
});
```

The exported const name becomes the reducer name. Pass an argument type object followed by a handler function taking `(ctx, args)`. For reducers with no arguments, pass only the handler function.

### Transactional Execution

Every reducer runs inside a database transaction. This provides important guarantees:

- **Isolation**: Reducers don't see changes from other concurrent reducers
- **Atomicity**: Either all changes succeed or all are rolled back
- **Consistency**: Failed reducers leave the database unchanged

If a reducer throws an exception or returns an error, all of its changes are automatically rolled back.

### Accessing Tables

Reducers have full read-write access to all tables (both public and private) through the `ReducerContext`. The examples below assume a `user` table with `id` (primary key), `name` (indexed), and `email` (unique) columns.

#### Inserting Rows

```typescript
ctx.db.user.insert({
  id: 0n,  // auto-increment will assign
  name: 'Alice',
  email: 'alice@example.com'
});
```

#### Finding Rows by Unique Column

Use `find` on a unique or primary key column to retrieve a single row:

```typescript
const user = ctx.db.user.id.find(123);
if (user) {
  console.log(`Found: ${user.name}`);
}

const byEmail = ctx.db.user.email.find('alice@example.com');
```

#### Filtering Rows by Indexed Column

Use `filter` on an indexed column to retrieve multiple matching rows:

```typescript
for (const user of ctx.db.user.name.filter('Alice')) {
  console.log(`User ${user.id}: ${user.email}`);
}
```

#### Updating Rows

Find a row, modify it, then call `update` on the same unique column:

```typescript
const user = ctx.db.user.id.find(123);
if (user) {
  user.name = 'Bob';
  ctx.db.user.id.update(user);
}
```

#### Deleting Rows

Delete by unique column value or by indexed column value:

```typescript
// Delete by primary key
ctx.db.user.id.delete(123);

// Delete all matching an indexed column
const deleted = ctx.db.user.name.delete('Alice');
console.log(`Deleted ${deleted} row(s)`);
```

#### Iterating All Rows

Use `iter` to iterate over all rows in a table:

```typescript
for (const user of ctx.db.user.iter()) {
  console.log(`${user.id}: ${user.name}`);
}
```

#### Counting Rows

Use `count` to get the number of rows in a table:

```typescript
const total = ctx.db.user.count();
console.log(`Total users: ${total}`);
```

For more details on querying with indexes, including range queries and multi-column indexes, see Indexes.

### Reducer Isolation

Reducers run in an isolated environment and **cannot** interact with the outside world:

- ❌ No network requests
- ❌ No file system access
- ❌ No system calls
- ✅ Only database operations

If you need to interact with external systems, use Procedures instead. Procedures can make network calls and perform other side effects, but they have different execution semantics and limitations.

**Warning: Global and Static Variables Are Undefined Behavior**

Relying on global variables, static variables, or module-level state to persist across reducer calls is **undefined behavior**. SpacetimeDB does not guarantee that values stored in these locations will be available in subsequent reducer invocations.

This is undefined for several reasons:

1. **Fresh execution environments.** SpacetimeDB may run each reducer in a fresh WASM or JS instance.
2. **Module updates.** Publishing a new module creates a fresh execution environment. This is necessary for hot-swapping modules while transactions are in flight.
3. **Concurrent execution.** SpacetimeDB reserves the right to execute multiple reducers concurrently in separate execution environments (e.g., with MVCC).
4. **Crash recovery.** Instance memory is not persisted across restarts.
5. **Non-transactional updates.** If you modify global state and then roll back the transaction, the modified value may remain for subsequent transactions.
6. **Replay safety.** If a serializability anomaly is detected, SpacetimeDB may re-execute your reducer with the same arguments, causing modifications to global state to occur multiple times.

Reducers are designed to be free of side effects. They should only modify tables. Always store state in tables to ensure correctness and durability.

```rust
// ❌ Undefined behavior: may or may not persist or correctly update across reducer calls
static mut COUNTER: u64 = 0;

// ✅ Store state in a table instead
#[spacetimedb::table(accessor = counter)]
pub struct Counter {
    #[primary_key]
    id: u32,
    value: u64,
}
```

### Scheduling Procedures

Reducers cannot call procedures directly (procedures may have side effects incompatible with transactional execution). Instead, schedule a procedure to run by inserting into a schedule table:

```typescript
import { ScheduleAt } from 'spacetimedb';
import { schema, t, table } from 'spacetimedb/server';

// Define a schedule table for the procedure
const fetchSchedule = table(
  { name: 'fetch_schedule' },
  {
    scheduledId: t.u64().primaryKey().autoInc(),
    scheduledAt: t.scheduleAt(),
    url: t.string(),
  }
);

const spacetimedb = schema({ fetchSchedule });
export default spacetimedb;

// The procedure to be scheduled, bound to the schedule table with `onSchedule`.
// A scheduled procedure must return `t.unit()`.
export const fetchExternalData = spacetimedb.procedure(
  { onSchedule: fetchSchedule },
  { arg: fetchSchedule.rowType },
  t.unit(),
  (ctx, { arg }) => {
    const response = ctx.http.fetch(arg.url);
    // Process response...
    return {};
  }
);

// From a reducer, schedule the procedure by inserting into the schedule table
export const queueFetch = spacetimedb.reducer({ url: t.string() }, (ctx, { url }) => {
  ctx.db.fetchSchedule.insert({
    scheduledId: 0n,
    scheduledAt: ScheduleAt.interval(0n), // Run immediately
    url,
  });
});
```

See Schedule Tables for more scheduling options.

### Next Steps

- Learn about Tables to understand data storage
- Explore Procedures for side effects beyond the database
- Review Subscriptions for real-time client updates

## Reducer Context

Every reducer receives a special context parameter as its first argument. This context provides read-write access to the database, information about the caller, and additional utilities like random number generation.

The reducer context is required for accessing tables, executing database operations, and retrieving metadata about the current reducer invocation.

### Accessing the Database

The primary purpose of the reducer context is to provide access to the module's database tables.

```typescript
import { schema, table, t } from 'spacetimedb/server';

const user = table(
  { name: 'user', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    name: t.string(),
  }
);

const spacetimedb = schema({ user });
export default spacetimedb;

export const createUser = spacetimedb.reducer({ name: t.string() }, (ctx, { name }) => {
  ctx.db.user.insert({ id: 0n, name });
});
```

### Caller Information

The context provides information about who invoked the reducer and when.

#### Sender Identity

Every reducer invocation has an associated caller identity.

```typescript
import { schema, table, t } from 'spacetimedb/server';

const player = table(
  { name: 'player', public: true },
  {
    identity: t.identity().primaryKey(),
    name: t.string(),
    score: t.u32(),
  }
);

const spacetimedb = schema({ player });
export default spacetimedb;

export const updateScore = spacetimedb.reducer({ newScore: t.u32() }, (ctx, { newScore }) => {
  // Get the caller's identity
  const caller = ctx.sender;

  // Find and update their player record
  const existingPlayer = ctx.db.player.identity.find(caller);
  if (existingPlayer) {
    ctx.db.player.identity.update({
      ...existingPlayer,
      score: newScore,
    });
  }
});
```

#### Connection ID

The connection ID identifies the specific client connection that invoked the reducer. This is useful for tracking sessions or implementing per-connection state.

**Note:**

The connection ID is present only when the reducer invocation is associated with a client connection. Reducers invoked by `init`, scheduled reducers, and some CLI or internal calls may not have one. Client-connected and client-disconnected reducers receive the connection ID for the connection being opened or closed.

#### Timestamp

The timestamp indicates when the reducer was invoked. This value is consistent throughout the reducer execution and is useful for timestamping events or implementing time-based logic.

### Random Number Generation

The context provides access to a random number generator that is deterministic and reproducible. This ensures that reducer execution is consistent across all nodes in a distributed system.

**Warning:**

Never use external random number generators (like `Random` in C# without using the context). These are non-deterministic and will cause different nodes to produce different results, breaking consensus.

Use the context-provided random API for any reducer logic that needs random values:

```typescript
const fraction = ctx.random();                         // [0.0, 1.0)
const roll = ctx.random.integerInRange(1, 6);          // inclusive
const bytes = ctx.random.fill(new Uint8Array(16));
```

### Module Identity

The context provides access to the module's own identity, which is useful when a reducer needs to refer to the database itself.

Scheduled reducers and procedures are private by default in SpacetimeDB 2.x, so you do not need to compare the sender against the module identity to prevent ordinary clients from calling them directly. If you need both a scheduled function and a client-callable entry point, keep the scheduled function private and define a separate public reducer that wraps the shared logic.

```typescript
import { schema, table, t } from 'spacetimedb/server';

const scheduledTask = table(
  { name: 'scheduled_task' },
  {
    taskId: t.u64().primaryKey().autoInc(),
    scheduledAt: t.scheduleAt(),
    message: t.string(),
  }
);

const spacetimedb = schema({ scheduledTask });
export default spacetimedb;

export const sendReminder = spacetimedb.reducer(
  { onSchedule: scheduledTask },
  { arg: scheduledTask.rowType },
  (_ctx, { arg }) => {
    console.log(`Reminder: ${arg.message}`);
  }
);
```

### Context Properties Reference

| Property       | Type                       | Description                                     |
| -------------- | -------------------------- | ----------------------------------------------- |
| `db`           | `DbView`                   | Access to the module's database tables          |
| `sender`       | `Identity`                 | Identity of the caller                          |
| `senderAuth`   | `AuthCtx`                  | Authorization context for the caller (includes JWT claims and internal call detection) |
| `connectionId` | `ConnectionId \| null`     | Connection ID of the caller, if available       |
| `timestamp`    | `Timestamp`                | Time when the reducer was invoked               |
| `random`       | `Random`                   | Random number generator (deterministic, seeded by SpacetimeDB) |

## Lifecycle Reducers

Special reducers handle system events during the database lifecycle.

### Init Reducer

Runs once when the module is first published or when the database is cleared.

```typescript
export const init = spacetimedb.init((ctx) => {
  console.log('Database initializing...');

  // Set up default data
  if (ctx.db.settings.count() === 0n) {
    ctx.db.settings.insert({
      key: 'welcome_message',
      value: 'Hello, SpacetimeDB!'
    });
  }
});
```

The `init` reducer:
- Cannot take arguments beyond `ReducerContext`
- Runs when publishing with `spacetime publish`
- Runs when clearing with `spacetime publish -c`
- Failure prevents publishing or clearing

**Tip: Module Owner**

In the `init` reducer, `ctx.sender()` is the **module owner** — the identity of the user who published the database. This is the only place where the owner identity is automatically provided, so if you need to reference it later (e.g. for authorization), store it in a table during `init`:

```typescript
const config = table({ name: 'config' }, {
  ownerIdentity: t.identity().primaryKey(),
});

export const init = spacetimedb.init((ctx) => {
  ctx.db.config.insert({ ownerIdentity: ctx.sender });
});
```

You can then check `ctx.sender()` against the stored owner identity in other reducers to restrict admin-only operations.

### Client Connected

Runs when a client establishes a connection.

```typescript
export const onConnect = spacetimedb.clientConnected((ctx) => {
  console.log(`Client connected: ${ctx.sender}`);

  // TypeScript exposes this as ConnectionId | null, so guard it before use.
  const connId = ctx.connectionId;
  if (connId === null) {
    throw new Error('client connection ID missing');
  }

  // Initialize client session
  ctx.db.sessions.insert({
    connectionId: connId,
    identity: ctx.sender,
    connectedAt: ctx.timestamp
  });
});
```

The `client_connected` reducer:
- Cannot take arguments beyond `ReducerContext`
- Receives the connection ID for the connection being opened. The API exposes
  it as nullable or optional, so guard or unwrap it before use.
- Failure disconnects the client
- Runs for each distinct connection (WebSocket, HTTP call)

### Client Disconnected

Runs when a client connection terminates.

```typescript
export const onDisconnect = spacetimedb.clientDisconnected((ctx) => {
  console.log(`Client disconnected: ${ctx.sender}`);

  // TypeScript exposes this as ConnectionId | null, so guard it before use.
  const connId = ctx.connectionId;
  if (connId === null) {
    throw new Error('client connection ID missing');
  }

  // Clean up client session
  ctx.db.sessions.connectionId.delete(connId);
});
```

The `client_disconnected` reducer:
- Cannot take arguments beyond `ReducerContext`
- Receives the connection ID for the connection being closed. The API exposes
  it as nullable or optional, so guard or unwrap it before use.
- Failure is logged but doesn't prevent disconnection
- Runs when connection ends (close, timeout, error)

### Scheduled Reducers

Reducers can be triggered at specific times using schedule tables. See Schedule Tables for details on:

- Defining schedule tables
- Triggering reducers at specific timestamps
- Running reducers periodically
- Canceling scheduled executions

**Info: Scheduled Reducer Context**

Scheduled reducer calls originate from SpacetimeDB itself, not from a client. Therefore:
- `ctx.sender()` will be the module's own identity
- The connection ID will be absent (`null` in TypeScript, `null` in C#, `None` in Rust, and `std::nullopt` in C++)

## Error Handling

### Error Handling

Reducers distinguish between two types of errors:

#### Sender Errors

Errors caused by invalid client input. These are expected and should be handled gracefully.

Throw a `SenderError`:

```typescript
import { SenderError } from 'spacetimedb/server';

export const transferCredits = spacetimedb.reducer(
  { toUser: t.identity(), amount: t.u32() },
  (ctx, { toUser, amount }) => {
    const fromUser = ctx.db.users.identity.find(ctx.sender);
    if (!fromUser) {
      throw new SenderError('User not found');
    }

    if (fromUser.credits < amount) {
      throw new SenderError('Insufficient credits');
    }

    // ... perform transfer
  }
);

// Alternative: return error object
export const transferCreditsResult = spacetimedb.reducer(
  { toUser: t.u64(), amount: t.u32() },
  (ctx, { toUser, amount }) => {
    // ...validation...
    if (error) {
      return { tag: 'err', value: 'Insufficient credits' };
    }
    // ...
  }
);
```

#### Programmer Errors

Unexpected errors caused by bugs in module code. These should be fixed by the developer.

Regular errors (not `SenderError`):

```typescript
export const processData = spacetimedb.reducer(
  { data: t.array(t.u8()) },
  (ctx, { data }) => {
    // Regular Error indicates a bug
    if (data.length === 0) {
      throw new Error('Unexpected empty data');
    }

    // ...
  }
);
```

Programmer errors are logged and visible in your project dashboard. Consider setting up alerting to be notified when these occur.
