# SpacetimeDB cheat sheet (TypeScript)

> Source: https://github.com/clockworklabs/SpacetimeDB/blob/v2.13.0/docs/docs/00200-core-concepts/00100-databases/00500-cheat-sheet.md
> Fetched: 2026-10-24.
>
> From the clockworklabs/SpacetimeDB repo at tag v2.13.0 (Oct 19, 2026), the release that install.spacetimedb.com installs today.
> Only the TypeScript tabs are kept. The Rust, C#, C++ and Unreal versions are on spacetimedb.com.

Quick reference for SpacetimeDB module syntax across Rust, C#, TypeScript, and C++.

## Project Setup

```bash
spacetime init --lang typescript --project-path my-project my-project
cd my-project
spacetime login
spacetime publish <DATABASE_NAME>
```

## Tables

```typescript
import { table, t, schema } from 'spacetimedb/server';

// Basic table
const player = table(
  { name: 'player', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    username: t.string().unique(),
    score: t.i32().index('btree'),
  }
);

// Multi-column index
const score = table(
  {
    name: 'score',
    indexes: [{
      accessor: 'idx',
      algorithm: 'btree',
      columns: ['playerId', 'level'],
    }],
  },
  {
    playerId: t.u64(),
    level: t.u32(),
  }
);

// Custom types
const status = t.enum('Status', ['Active', 'Inactive']);
```

## Reducers

```typescript
import { schema } from 'spacetimedb/server';

const spacetimedb = schema({ player });
export default spacetimedb;

// Basic reducer
export const createPlayer = spacetimedb.reducer({ username: t.string() }, (ctx, { username }) => {
  ctx.db.player.insert({ id: 0n, username, score: 0 });
});

// With error handling
export const updateScore = spacetimedb.reducer({ id: t.u64(), points: t.i32() }, (ctx, { id, points }) => {
  const player = ctx.db.player.id.find(id);
  if (!player) throw new Error('Player not found');
  player.score += points;
  ctx.db.player.id.update(player);
});

// Query examples
const player = ctx.db.player.id.find(123n);           // Find by primary key
const players = ctx.db.player.username.find('Alice'); // Find by unique index
const players = ctx.db.player.score.filter(100);      // Filter by BTree index
const all = ctx.db.player.iter();                     // Iterate all
ctx.db.player.id.delete(123n);                        // Delete by primary key
```

## Lifecycle Reducers

```typescript
export const init = spacetimedb.init(ctx => { /* ... */ });

export const onConnect = spacetimedb.clientConnected(ctx => { /* ... */ });

export const onDisconnect = spacetimedb.clientDisconnected(ctx => { /* ... */ });
```

## Schedule Tables

**Important: TypeScript: ScheduleAt import**

`ScheduleAt` is imported from `'spacetimedb'`, **not** from `'spacetimedb/server'`. Use: `import { ScheduleAt } from 'spacetimedb';`

```typescript
const reminder = table(
  { name: 'reminder' },
  {
    id: t.u64().primaryKey().autoInc(),
    message: t.string(),
    scheduledAt: t.scheduleAt(),
  }
);

// `onSchedule` binds the reducer to the schedule table
export const sendReminder = spacetimedb.reducer(
  { onSchedule: reminder },
  { arg: reminder.rowType },
  (ctx, { arg }) => {
    console.log(`Reminder: ${arg.message}`);
  }
);
```

## Procedures

```typescript
export const fetchData = spacetimedb.procedure(
  { url: t.string() },
  t.string(),
  (ctx, { url }) => {
    const response = ctx.http.fetch(url);
    const data = response.text();

    ctx.withTx(ctx => {
      ctx.db.cache.insert({ data });
    });

    return data;
  }
);
```

## Views

```typescript
// Return single row
export const myPlayer = spacetimedb.view({ name: 'my_player', public: true }, t.option(player.rowType), ctx => {
  return ctx.db.player.identity.find(ctx.sender);
});

// Return potentially multiple rows
export const topPlayers = spacetimedb.view({ name: 'top_players', public: true }, t.array(player.rowType), ctx => {
  return ctx.db.player.score.filter(1000);
});

// Procedural view with update callbacks.
// The returned row type has exactly one `.primaryKey()` column.
export const topPlayersWithUpdates = spacetimedb.view({ name: 'top_players_with_updates', public: true }, t.array(player.rowType), ctx => {
  return ctx.db.player.score.filter(1000);
});

// Perform a generic filter using the query builder.
// Equivalent to `SELECT * FROM player WHERE score < 1000`.
export const bottomPlayers = spacetimedb.view({ name: 'bottom_players', public: true }, t.array(player.rowType), ctx => {
  return ctx.from.player.where(p => p.score.lt(1000))
});

// Count rows in a table.
export const playerCount = spacetimedb.anonymousView({ name: 'player_count', public: true }, t.array(t.row('PlayerCount', {
  count: t.u64(),
})), ctx => {
  return [{ count: ctx.db.player.count() }];
});
```

## Context Properties

```typescript
ctx.db                  // Database access
ctx.sender              // Identity of caller
ctx.connectionId        // ConnectionId | null
ctx.timestamp           // Timestamp
ctx.databaseIdentity    // Module's identity
```

## Logging

```typescript
console.error(`Error: ${msg}`);
console.warn(`Warning: ${msg}`);
console.log(`Info: ${msg}`);
console.debug(`Debug: ${msg}`);
```

## Common Mistakes

1. **ScheduleAt import** — Import `ScheduleAt` from `'spacetimedb'`, not `'spacetimedb/server'`.
2. **Schema-first** — Create `const spacetimedb = schema({...})` before reducers/init/clientConnected.
3. **`schema()` shape** — Use `schema({ table })` or `schema({ a, b })`, not `schema(table)` or `schema(a, b)`.
4. **Reducer naming** — Reducer names come from exports: `export const doThing = spacetimedb.reducer(...)`. Do not pass a string name.
5. **No `ReducerContext` import** — Use the `ctx` parameter; do not import `ReducerContext`.
6. **Export rules** — Only export schema, reducers, init, clientConnected, clientDisconnected, views. Keep helpers local.
7. **Use `spacetimedb/server`** — For modules, use `spacetimedb/server` (builder API), not `spacetimedb-sdk` (client decorators).
8. **`t.object` not `t.struct`** — Use `t.object('Name', {...})` for product types.
9. **`autoInc` not `autoIncrement`** — Use `.autoInc()` on column builders.
10. **Row fields are camelCase** — Generated client row fields convert snake_case column names: `trip_id` → `row.tripId`.
11. **Await reducer calls** — Client reducer calls return `Promise<void>` that rejects with `SenderError` on failure; `await` or `.catch()` them.
12. **Throw `SenderError` in reducers** — A plain `Error` surfaces as an internal error, not a reducer error.

## Common CLI Commands

```bash
# Development
spacetime start                          # Start local server
spacetime dev                            # Interactive development mode
spacetime login                          # Authenticate

# Module management
spacetime build                          # Build module
spacetime publish <NAME>                 # Publish module
spacetime publish <NAME> --delete-data         # Reset database
spacetime delete <NAME>                  # Delete database

# Database operations
spacetime logs <NAME>                    # View logs
spacetime logs --follow <NAME>           # Stream logs
spacetime sql <NAME> "SELECT * FROM t"   # Run SQL query
spacetime describe <NAME>                # Show schema (human-readable)
spacetime describe <NAME> --json         # Show schema as JSON (machine-readable)
spacetime call <NAME> reducer arg1 arg2  # Call reducer

# Code generation
spacetime generate --lang rust --out-dir src/module_bindings --module-path spacetimedb
spacetime generate --lang csharp --out-dir module_bindings --module-path spacetimedb
spacetime generate --lang typescript --out-dir src/module_bindings --module-path spacetimedb
```

## Common Types

```typescript
// Type builders
t.bool(), t.string(), t.f32(), t.f64()
t.i8(), t.i16(), t.i32(), t.i64(), t.i128()
t.u8(), t.u16(), t.u32(), t.u64(), t.u128()

// Collections
t.option(T), t.array(T)

// SpacetimeDB types
t.identity(), t.connectionId(), t.timestamp(), t.timeDuration(), t.scheduleAt()

// Structured types
t.object('Name', { field: t.type() })
t.enum('Name', ['Variant1', 'Variant2'])
```
