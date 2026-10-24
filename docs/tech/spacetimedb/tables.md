# SpacetimeDB: tables, column types, auto-increment, constraints (TypeScript)

> Sources:
> - https://github.com/clockworklabs/SpacetimeDB/blob/v2.13.0/docs/docs/00200-core-concepts/00300-tables.md
> - https://github.com/clockworklabs/SpacetimeDB/blob/v2.13.0/docs/docs/00200-core-concepts/00300-tables/00200-column-types.md
> - https://github.com/clockworklabs/SpacetimeDB/blob/v2.13.0/docs/docs/00200-core-concepts/00300-tables/00230-auto-increment.md
> - https://github.com/clockworklabs/SpacetimeDB/blob/v2.13.0/docs/docs/00200-core-concepts/00300-tables/00240-constraints.md
> Fetched: 2026-10-24.
>
> From the clockworklabs/SpacetimeDB repo at tag v2.13.0 (Oct 19, 2026), the release that install.spacetimedb.com installs today.
> Only the TypeScript tabs are kept. The Rust, C#, C++ and Unreal versions are on spacetimedb.com.
> In 2.x the key you give a table in `schema({...})` is its accessor. Its SQL name is that key in snake_case, unless you set `name`.

## Tables

Tables are the way to store data in SpacetimeDB. All data in SpacetimeDB is stored in memory for extremely low latency and high throughput access. SpacetimeDB also automatically persists all data to disk.

### Why Tables

Tables are the fundamental unit of data organization in SpacetimeDB, just as files are the fundamental unit in Unix. However, tables possess greater generality than files. Unix requires a separate *filesystem* concept to organize and describe files. SpacetimeDB, by contrast, describes itself: it stores the representation of tables and their schemas in tables called **system tables** (such as `st_table` and `st_column`).

You can query these system tables directly:

```sql
SELECT * FROM st_table;
SELECT * FROM st_column;
```

**Warning:**

You can query system tables, but you should not modify them directly. Make schema changes through the normal definition mechanisms in your module code.

#### Tables and Data-Oriented Design

The relational model underlying tables represents the logical endpoint of [data-oriented design](https://spacetimedb.com/blog/databases-and-data-oriented-design). Patterns such as Entity Component Systems (ECS) implement a strict subset of relational capabilities. Tables give you the full power of relational theory: over fifty years of proven techniques for organizing and querying data efficiently.

The central principle of data-oriented design holds that **the purpose of any program is to transform data from one form to another**. Tables provide a principled, universal representation for that data, giving you:

- **Efficient access patterns** through indexes
- **Data integrity** through constraints
- **Flexible queries** through relational operations
- **Real-time synchronization** through subscriptions

For further discussion of this philosophy, see The Zen of Spacetime.

#### Physical and Logical Independence

A core goal of the relational model is separating *logical* access patterns from *physical* data representation. When you write a subscription query, you express *what* data you need, not *how* the database should retrieve it. This separation allows SpacetimeDB to change the physical representation of your data for performance reasons without requiring you to rewrite your queries.

The clearest example is indexing. When you add an index to a column, you change how SpacetimeDB physically organizes that data. It builds an additional data structure to accelerate lookups. But your subscription queries continue to work unchanged. The same query that previously scanned the entire table now uses the index automatically. You improve performance by modifying the schema, not the queries.

This independence extends beyond indexes. SpacetimeDB can change internal storage formats, memory layouts, and access algorithms across versions. Your queries remain stable because they operate at the logical level (rows and columns) rather than the physical level of bytes and pointers.

#### Table Decomposition

A common concern when designing relational schemas is whether to consolidate data into fewer large tables or distribute it across many smaller ones. In traditional SQL databases, joins require verbose query syntax and incur significant execution cost. This friction pushes developers toward denormalized schemas with fewer, wider tables.

SpacetimeDB operates under different constraints. Your reducers interact with tables through programmatic APIs rather than SQL strings. A join operation reduces to an index lookup: you retrieve a row from one table, extract a key value, and use that key to find related rows in another table. With all data resident in memory, these lookups often complete in nanoseconds.

Consider the following schema for a game application:

**Consolidated approach (not recommended):**

```
Player
├── id
├── name
├── position_x, position_y, velocity_x, velocity_y  (updates: 60Hz)
├── health, max_health, mana, max_mana              (updates: occasional)
├── total_kills, total_deaths, play_time            (updates: rare)
└── audio_volume, graphics_quality                  (updates: very rare)
```

**Decomposed approach (recommended):**

```
Player          PlayerState         PlayerStats         PlayerSettings
├── id     ←──  ├── player_id       ├── player_id       ├── player_id
└── name        ├── position_x      ├── total_kills     ├── audio_volume
                ├── position_y      ├── total_deaths    └── graphics_quality
                ├── velocity_x      └── play_time
                └── velocity_y

PlayerResources
├── player_id
├── health
├── max_health
├── mana
└── max_mana
```

The decomposed approach yields several advantages:

1. **Reduced bandwidth**: Clients subscribing to player positions do not receive updates when settings change. For an application with 1000 concurrent players updating positions at 60Hz, this reduction is substantial.

2. **Cache efficiency**: Data with similar update frequencies resides in contiguous memory. Updating a player's position does not require loading or invalidating cache lines containing lifetime statistics.

3. **Semantic clarity**: Each table maintains a single responsibility. `PlayerState` handles the performance-critical gameplay loop. `PlayerStats` serves leaderboard queries. `PlayerSettings` supports the options interface.

4. **Schema evolution**: You can add columns to `PlayerStats` without affecting the structure or performance characteristics of `PlayerState`.

The guiding principle: **organize data by access pattern, not by the entity it describes**. Keep data you read together in the same table. Separate data you read at different times or frequencies.

### Defining Tables

Tables are defined in your module code with a name, columns, and optional configuration.

Use the `table` function to declare a new table:

```typescript
import { schema, table, t } from 'spacetimedb/server';

const people = table(
  { name: 'people', public: true },
  {
    id: t.u32().primaryKey().autoInc(),
    name: t.string().index('btree'),
    email: t.string().unique(),
  }
);

const spacetimedb = schema({ people });
export default spacetimedb;
```

The first argument to `table()` defines table options, and the second defines columns. Pass your tables to `schema()` as an object: `schema({ people })` or `schema({ table1, table2 })`. Never use `schema(table)` or `schema(t1, t2, t3)`.

#### Creating the schema (TypeScript)

After defining tables, pass them to `schema()` as a single object. The object keys become the accessor names in `ctx.db`:

```typescript
const people = table({ name: 'people', public: true }, { /* columns */ });
const products = table({ name: 'products', public: true }, { /* columns */ });

const spacetimedb = schema({ people, products });
export default spacetimedb;
```

Use `schema({ table1 })` or `schema({ t1, t2 })`. Never use `schema(table)` or `schema(t1, t2, t3)`.

For a compact list of TypeScript gotchas, see the cheat sheet.

### Table Naming and Accessors

The table name you specify determines how you access the table in your code and in SQL. Understanding this relationship is essential for writing correct SpacetimeDB modules.

**Note: Table names in SQL**

The table `name` in your schema is used **verbatim** in SQL queries and subscriptions. There is no automatic pluralization or case conversion. If you define `name: 'position'`, SQL uses `position`; if you define `name: 'positions'`, SQL uses `positions`. Ensure your schema names match what your SQL queries expect.

#### How Accessor Names Are Derived

The accessor is the key passed to `schema({...})`, verbatim. By convention the key matches the table `name`:

```typescript
// Table definition
const playerScores = table(
  { name: 'player_scores', public: true },
  { /* columns */ }
);

const spacetimedb = schema({ playerScores });

// Accessor is the schema key, verbatim
ctx.db.playerScores.insert({ /* ... */ });
```

| Schema Key | Accessor |
|------------|----------|
| `user` | `ctx.db.user` |
| `player_scores` | `ctx.db.player_scores` |
| `game_session` | `ctx.db.game_session` |

#### Recommended Naming Conventions

Use idiomatic naming conventions for each language:

| Language | Convention | Example Table | Example Accessor |
|----------|------------|---------------|------------------|
| **TypeScript** | snake_case | `'player_score'` | `ctx.db.player_score` |
| **C#** | PascalCase | `Accessor = "PlayerScore"` | `ctx.Db.PlayerScore` |
| **Rust** | lower_snake_case | `name = player_score` | `ctx.db.player_score()` |
| **C++** | lower_snake_case | `player_score` | `ctx.db[player_score]` |

These conventions align with each language's standard style guides and make your code feel natural within its ecosystem.

### Table Visibility

Tables can be **private** (default) or **public**:

- **Private tables**: Visible only to reducers and the database owner. Clients cannot access them.
- **Public tables**: Exposed for client read access through subscriptions. Writes still occur only through reducers.

```typescript
const publicTable = table({ name: 'user', public: true }, { /* ... */ });
const privateTable = table({ name: 'secret', public: false }, { /* ... */ });
```

For more fine-grained access control, you can use view functions to expose computed subsets of your data to clients. Views allow you to filter rows, select specific columns, or join data from multiple tables before exposing it.

See Access Permissions for complete details on table visibility and access patterns.

### Multiple Tables for the Same Type

You can create multiple tables that share the same row type by applying multiple table attributes to a single struct. Each table stores its own independent set of rows, but all tables share the same schema.

In TypeScript, define separate table variables that share the same column schema:

```typescript
import { table, t } from 'spacetimedb/server';

// Define the shared column schema
const playerColumns = {
  identity: t.identity().primaryKey(),
  playerId: t.i32().unique().autoInc(),
  name: t.string(),
};

// Create two tables with the same schema
const player = table({ name: 'player', public: true }, playerColumns);
const loggedOutPlayer = table({ name: 'logged_out_player' }, playerColumns);
```

This pattern is useful for:

- **State management**: Separate active users from inactive users, online players from offline players
- **Archiving**: Move old records to an archive table while keeping the same schema
- **Staging**: Hold pending records in one table before moving them to a main table

**Note: Shared Constraints**

Column attributes like `[PrimaryKey]`, `[Unique]`, `[AutoInc]`, and `[Index]` apply to **all tables** defined on the type. Each table will have its own independent primary key, unique constraints, and indexes with the same structure.

### Constraints

Tables support several constraints to enforce data integrity:

- **Primary keys** uniquely identify each row and define how updates and deletes work
- **Unique constraints** ensure no two rows share the same value for a column

See Constraints for details.

### Auto-Increment

Auto-increment columns automatically generate unique integer values for new rows. SpacetimeDB implements auto-increment using sequences, which provide crash-safe value generation with configurable parameters.

See Auto-Increment for details.

### Schedule Tables

Tables can trigger reducers at specific times by including a scheduling column. This allows you to schedule future actions like sending reminders, expiring content, or running periodic maintenance.

See Schedule Tables for details.

### Next Steps

- Column Types - Supported column types and performance considerations
- Constraints - Primary keys and unique constraints
- Auto-Increment - Automatic ID generation with sequences
- Default Values - Schema evolution with column defaults
- Indexes - Speed up queries with single and multi-column indexes
- Access Permissions - Public vs private tables
- Schedule Tables - Time-based reducer execution
- Performance - Best practices for table design

## Column Types

Columns define the structure of your tables. SpacetimeDB supports primitive types, composite types for complex data, and special types for database-specific functionality.

### Representing Collections

When modeling data that contains multiple items, you have two choices: store the collection as a column (using `Vec`, `List`, or `Array`) or store each item as a row in a separate table. This decision affects how you query, update, and subscribe to that data.

**Use a collection column when:**
- The items form an atomic unit that you always read and write together
- Order is semantically important and frequently accessed by position
- The collection is small and bounded (e.g., a fixed-size inventory)
- The items are values without independent identity

**Use a separate table when:**
- Items have independent identity and lifecycle
- You need to query, filter, or index individual items
- The collection can grow unbounded
- Clients should receive updates for individual item changes, not the entire collection
- You want to enforce referential integrity between items and other data

Consider a game inventory with ordered pockets. A `Vec<Item>` preserves pocket order naturally, but if you need to query "all items owned by player X" across multiple players, a separate `inventory_item` table with a `pocket_index` column allows that query efficiently. The right choice depends on your dominant access patterns.

### Binary Data and Files

SpacetimeDB includes optimizations for storing binary data as `Vec<u8>` (Rust), `List<byte>` (C#), `t.array(t.u8())` (TypeScript), or `std::vector<uint8_t>` (C++). You can store files, images, serialized data, or other binary blobs directly in table columns.

This approach works well when:
- The binary data is associated with a specific row (e.g., a user's avatar image)
- You want the data to participate in transactions and subscriptions
- The data size is reasonable (up to several megabytes per row)

For very large files or data that changes independently of other row fields, consider external storage with a reference stored in the table.

### Type Performance

SpacetimeDB optimizes reading and writing by taking advantage of memory layout. Several factors affect performance:

**Prefer smaller types.** Use the smallest integer type that fits your data range. A `u8` storing values 0-255 uses less memory and bandwidth than a `u64` storing the same values. This reduces storage, speeds up serialization, and improves cache efficiency.

**Prefer fixed-size types.** Fixed-size types (`u32`, `f64`, fixed-size structs) allow SpacetimeDB to compute memory offsets directly. Variable-size types (`String`, `Vec<T>`) require additional indirection. When performance matters, consider fixed-size alternatives:
- Use `[u8; 32]` instead of `Vec<u8>` for fixed-length hashes or identifiers
- Use an enum with a fixed set of variants instead of a `String` for categorical data

**Consider column ordering.** Types require alignment in memory. A `u64` aligns to 8-byte boundaries, while a `u8` aligns to 1-byte boundaries. When smaller types precede larger ones, the compiler may insert padding bytes to satisfy alignment requirements. Ordering columns from largest to smallest alignment can reduce padding and improve memory density.

For example, a struct with fields `(u8, u64, u8)` may require 24 bytes due to padding, while `(u64, u8, u8)` requires only 16 bytes. This optimization is not something to follow religiously, but it can help performance in memory-intensive scenarios.

These optimizations apply across all supported languages.

### Type Reference

| Category | Type | TypeScript Type | Description |
|----------|------|-----------------|-------------|
| Primitive | `t.bool()` | `boolean` | Boolean value |
| Primitive | `t.string()` | `string` | UTF-8 string |
| Primitive | `t.f32()` | `number` | 32-bit floating point |
| Primitive | `t.f64()` | `number` | 64-bit floating point |
| Primitive | `t.i8()` | `number` | Signed 8-bit integer |
| Primitive | `t.u8()` | `number` | Unsigned 8-bit integer |
| Primitive | `t.i16()` | `number` | Signed 16-bit integer |
| Primitive | `t.u16()` | `number` | Unsigned 16-bit integer |
| Primitive | `t.i32()` | `number` | Signed 32-bit integer |
| Primitive | `t.u32()` | `number` | Unsigned 32-bit integer |
| Primitive | `t.i64()` | `bigint` | Signed 64-bit integer |
| Primitive | `t.u64()` | `bigint` | Unsigned 64-bit integer |
| Primitive | `t.i128()` | `bigint` | Signed 128-bit integer |
| Primitive | `t.u128()` | `bigint` | Unsigned 128-bit integer |
| Primitive | `t.i256()` | `bigint` | Signed 256-bit integer |
| Primitive | `t.u256()` | `bigint` | Unsigned 256-bit integer |
| Composite | `t.object(name, obj)` | `{ [K in keyof Obj]: T<Obj[K]> }` | Product/object type for nested data. Use `t.object`, not `t.struct` (which does not exist). |
| Composite | `t.enum(name, variants)` | `{ tag: 'variant' } \| { tag: 'variant', value: T }` | Sum/enum type (tagged union) |
| Composite | `t.array(element)` | `T<Element>[]` | Array of elements |
| Composite | `t.option(value)` | `Value \| undefined` | Optional value |
| Composite | `t.unit()` | `{}` | Zero-field product type |
| Special | `t.identity()` | `Identity` | Unique identity for authentication |
| Special | `t.connectionId()` | `ConnectionId` | Client connection identifier |
| Special | `t.timestamp()` | `Timestamp` | Absolute point in time (microseconds since Unix epoch) |
| Special | `t.timeDuration()` | `TimeDuration` | Relative duration in microseconds |
| Special | `t.scheduleAt()` | `ScheduleAt` | Column type for scheduling reducer execution |

### Complete Example

The following example demonstrates a table using primitive, composite, and special types:

```typescript
import { table, t } from 'spacetimedb/server';

// Define a nested object type for coordinates
const Coordinates = t.object('Coordinates', {
  x: t.f64(),
  y: t.f64(),
  z: t.f64(),
});

// Define an enum for status
const Status = t.enum('Status', {
  Active: t.unit(),
  Inactive: t.unit(),
  Suspended: t.object('SuspendedInfo', { reason: t.string() }),
});

const player = table(
  { name: 'player', public: true },
  {
    // Primitive types
    id: t.u64().primaryKey().autoInc(),
    name: t.string(),
    level: t.u8(),
    experience: t.u32(),
    health: t.f32(),
    score: t.i64(),
    isOnline: t.bool(),

    // Composite types
    position: Coordinates,
    status: Status,
    inventory: t.array(t.u32()),
    guildId: t.option(t.u64()),

    // Special types
    owner: t.identity(),
    connection: t.option(t.connectionId()),
    createdAt: t.timestamp(),
    playTime: t.timeDuration(),
  }
);
```

Auto-increment columns automatically generate unique integer values for new rows. When you insert a row with a zero value in an auto-increment column, SpacetimeDB assigns the next value from an internal sequence.

### Defining Auto-Increment Columns

```typescript
const post = table(
  { name: 'post', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    title: t.string(),
  }
);

const spacetimedb = schema({ post });
export default spacetimedb;

export const addPost = spacetimedb.reducer({ title: t.string() }, (ctx, { title }) => {
  // Pass 0 for the auto-increment field
  const inserted = ctx.db.post.insert({ id: 0n, title });
  // inserted.id now contains the assigned value
  console.log(`Created post with id: ${inserted.id}`);
});
```

Use the `.autoInc()` method on a column builder (not `autoIncrement`, which does not exist).

Auto-increment columns must be integer types: `t.i8()`, `t.u8()`, `t.i16()`, `t.u16()`, `t.i32()`, `t.u32()`, `t.i64()`, `t.u64()`, `t.i128()`, `t.u128()`, `t.i256()`, or `t.u256()`.

### Trigger Value

The auto-increment mechanism activates when you insert a row with a **zero value** in the auto-increment column. If you insert a non-zero value, SpacetimeDB uses that value directly without generating a new one.

```rust
// Triggers auto-increment: id will be assigned automatically
ctx.db.post().insert(Post { id: 0, title: "Hello".into() })?;

// Does NOT trigger auto-increment: id will be 42
ctx.db.post().insert(Post { id: 42, title: "World".into() })?;
```

This behavior allows you to migrate existing data with known IDs while still using auto-increment for new rows.

### Sequences

SpacetimeDB implements auto-increment using **sequences**, a mechanism loosely modeled after PostgreSQL sequences. A sequence is an internal counter that generates a series of integer values according to configurable parameters.

#### Sequence Parameters

Each sequence has the following parameters:

| Parameter | Description |
|-----------|-------------|
| `start` | The first value the sequence generates |
| `min_value` | The minimum value in the sequence range |
| `max_value` | The maximum value in the sequence range |
| `increment` | The step between consecutive values (can be negative) |

For auto-increment columns, SpacetimeDB creates a sequence with sensible defaults based on the column type. For example, a `u64` column gets a sequence starting at 1 with a maximum of 2^64 - 1.

#### Wrapping Behavior

When a sequence reaches its maximum value, it wraps around to the minimum value and continues. For a sequence with `min_value = 1`, `max_value = 10`, and `increment = 1`, the values cycle as: 1, 2, 3, ..., 9, 10, 1, 2, 3, ...

Sequences with negative increments wrap in the opposite direction. A sequence with `min_value = 1`, `max_value = 10`, and `increment = -1` starting at 5 produces: 5, 4, 3, 2, 1, 10, 9, 8, ...

#### Crash Recovery

Sequences implement a crash recovery mechanism to ensure values are never reused after a database restart. Rather than persisting the current value after every increment, sequences allocate values in batches of **4096**.

When a sequence needs a new value and has exhausted its current allocation, it:

1. Calculates the next batch of 4096 values
2. Persists the allocation boundary to disk
3. Returns values from the allocated range

If the database crashes or restarts, it resumes from the next allocation boundary. This may skip values that were allocated but never used, but guarantees that no value is ever assigned twice.

**Example:**

```typescript
const user = table(
  { name: 'user', public: true },
  {
    userId: t.u64().autoInc(),
    name: t.string(),
  }
);

export const insertUser = spacetimedb.reducer({ name: t.string() }, (ctx, { name }) => {
  ctx.db.user.insert({ userId: 0n, name });
});
```

```bash
# Insert 3 users
$ spacetime call mydb insert_user Alice
$ spacetime call mydb insert_user Bob
$ spacetime call mydb insert_user Carol

$ spacetime sql mydb "SELECT * FROM user"
 user_id | name
---------+-------
 1       | Alice
 2       | Bob
 3       | Carol

# Database restarts...

# Insert another user
$ spacetime call mydb insert_user Dave

$ spacetime sql mydb "SELECT * FROM user"
 user_id | name
---------+-------
 1       | Alice
 2       | Bob
 3       | Carol
 4097    | Dave    # Jumped to next allocation boundary
```

This design trades potential gaps in the sequence for durability and performance. Internally, sequences use a 128-bit integer counter to track allocations across all column types.

#### Uniqueness Considerations

Sequences generate values in a deterministic order, but wrapping means the same value can appear multiple times over the lifetime of a sequence. If your auto-increment column is also a primary key or has a unique constraint, inserting a duplicate value will fail.

For most applications, the range of a 64-bit integer is large enough that wrapping never occurs in practice. However, if you use a smaller type like `u8` or `u16`, or if your application has very high insert volume, plan for the possibility of sequence exhaustion.

#### Concurrency and Gaps

Sequences do not guarantee sequential ordering. Gaps can appear in auto-increment values for several reasons:

1. **Crash recovery**: The batch allocation mechanism may skip values that were allocated but never used before a crash.

2. **Concurrent transactions**: SpacetimeDB currently executes transactions serially, but reserves the right to execute them concurrently in future versions. With concurrent execution, two transactions inserting into the same table may receive interleaved sequence values.

Even within a single reducer, you should not assume that consecutive inserts produce consecutive values. For example:

```rust
let a = ctx.db.post().insert(Post { id: 0, title: "First".into() })?;
let b = ctx.db.post().insert(Post { id: 0, title: "Second".into() })?;
// a.id might be 1 and b.id might be 3, not necessarily 1 and 2
```

If your application requires strictly sequential numbering without gaps, maintain that counter explicitly in a separate table rather than relying on auto-increment:

```rust
use spacetimedb::{ReducerContext, Table};

#[derive(Clone)]
#[spacetimedb::table(accessor = counter, public)]
pub struct Counter {
    #[primary_key]
    name: String,
    value: u64,
}

#[spacetimedb::table(accessor = invoice, public)]
pub struct Invoice {
    #[primary_key]
    invoice_number: u64,
    amount: u64,
}

#[spacetimedb::reducer]
fn create_invoice(ctx: &ReducerContext, amount: u64) -> Result<(), String> {
    // Get or create the counter
    let mut counter = ctx.db.counter().name().find(&"invoice".to_string())
        .unwrap_or(Counter { name: "invoice".to_string(), value: 0 });

    // Increment and update
    counter.value += 1;
    ctx.db.counter().name().update(counter.clone());

    // Use the counter value as the invoice number
    ctx.db.invoice().insert(Invoice {
        invoice_number: counter.value,
        amount,
    });

    Ok(())
}
```

This pattern guarantees sequential values because the counter update and row insert occur within the same transaction.

### Combining with Other Attributes

Auto-increment columns are commonly combined with primary keys:

```rust
#[spacetimedb::table(accessor = post, public)]
pub struct Post {
    #[primary_key]
    #[auto_inc]
    id: u64,
    // ...
}
```

Auto-increment columns can also be combined with unique constraints:

```rust
#[spacetimedb::table(accessor = item, public)]
pub struct Item {
    #[primary_key]
    name: String,
    #[unique]
    #[auto_inc]
    item_number: u32,
}
```

Auto-increment **cannot** be combined with default values, since both attempt to populate the column automatically.

## Constraints

Constraints enforce data integrity rules on your tables. SpacetimeDB supports primary key and unique constraints.

### Primary Keys

A primary key uniquely identifies each row in a table. It represents the identity of a row and determines how updates and deletes are handled.

```typescript
import { table, t } from 'spacetimedb/server';

const user = table(
  { name: 'user', public: true },
  {
    id: t.u64().primaryKey(),
    name: t.string(),
    email: t.string(),
  }
);
```

Use the `.primaryKey()` method on a column builder to mark it as the primary key.

#### Primary Key Rules

- **One per table**: A table can have at most one primary key column.
- **Immutable identity**: The primary key defines the row's identity. Changing a primary key value is treated as deleting the old row and inserting a new one.
- **Unique by definition**: Primary keys are automatically unique. No two rows can have the same primary key value.

Because of the unique constraint, SpacetimeDB implements primary keys using a **unique index**. This index is created automatically.

#### Multi-Column Primary Keys

SpacetimeDB does not yet support multi-column (composite) primary keys. If you need to look up rows by multiple columns, use a multi-column btree index combined with an auto-increment primary key:

```typescript
const inventory = table(
  {
    name: 'inventory',
    public: true,
    indexes: [
      { accessor: 'byUserItem', algorithm: 'btree', columns: ['userId', 'itemId'] },
    ],
  },
  {
    id: t.u64().primaryKey().autoInc(),
    userId: t.u64(),
    itemId: t.u64(),
    quantity: t.u32(),
  }
);
```

This gives you efficient lookups by the column combination while using a simple auto-increment value as the primary key.

#### Updates and Primary Keys

When you update a row, SpacetimeDB uses the primary key to determine whether it's a modification or a replacement:

- **Same primary key**: The row is updated in place. Subscribers see an update event.
- **Different primary key**: The old row is deleted and a new row is inserted. Subscribers see a delete event followed by an insert event.

```typescript
export const updateUserName = spacetimedb.reducer({ id: t.u64(), newName: t.string() }, (ctx, { id, newName }) => {
  const user = ctx.db.user.id.find(id);
  if (user) {
    // This is an update — primary key (id) stays the same
    ctx.db.user.id.update({ ...user, name: newName });
  }
});
```

#### Tables Without Primary Keys

Tables don't require a primary key. Without one, the entire row acts as the primary key:

- Rows are identified by their complete content
- Updates require matching all fields
- Duplicate rows are not possible. Inserting an identical row has no effect

SpacetimeDB always maintains set semantics regardless of whether you define a primary key. The difference is what defines uniqueness: a primary key column, or the entire row.

Primary keys add indexing overhead. If your table is only accessed by iterating over all rows (no lookups by key), omitting the primary key can improve performance.

#### Common Primary Key Patterns

**Auto-incrementing IDs**: Combine `primaryKey()` with `autoInc()` for automatically assigned unique identifiers:

```rust
#[spacetimedb::table(accessor = post, public)]
pub struct Post {
    #[primary_key]
    #[auto_inc]
    id: u64,
    title: String,
    content: String,
}
```

**Identity as primary key**: Use the caller's identity as the primary key for user-specific data:

```rust
#[spacetimedb::table(accessor = user_profile, public)]
pub struct UserProfile {
    #[primary_key]
    identity: Identity,
    display_name: String,
    bio: String,
}
```

This pattern ensures each identity can only have one profile and makes lookups by identity efficient.

### Unique Columns

Mark columns as unique to ensure no two rows can have the same value for that column.

```typescript
const user = table(
  { name: 'user', public: true },
  {
    id: t.u32().primaryKey(),
    email: t.string().unique(),
    username: t.string().unique(),
  }
);
```

Use the `.unique()` method on a column builder.

Unlike primary keys, you can have multiple unique columns on a single table. Unique columns also create an index that enables efficient lookups.

### Primary Keys vs Unique Columns

Both primary keys and unique columns enforce uniqueness, but they serve different purposes:

| Aspect | Primary Key | Unique Column |
|--------|-------------|---------------|
| Purpose | Row identity | Data integrity |
| Count per table | One | Multiple allowed |
| Update behavior | Delete + Insert | In-place update |
| Required | No | No |
