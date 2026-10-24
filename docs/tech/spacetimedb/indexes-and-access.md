# SpacetimeDB: indexes and access permissions (TypeScript)

> Sources:
> - https://github.com/clockworklabs/SpacetimeDB/blob/v2.13.0/docs/docs/00200-core-concepts/00300-tables/00300-indexes.md
> - https://github.com/clockworklabs/SpacetimeDB/blob/v2.13.0/docs/docs/00200-core-concepts/00300-tables/00400-access-permissions.md
> Fetched: 2026-10-24.
>
> From the clockworklabs/SpacetimeDB repo at tag v2.13.0 (Oct 19, 2026), the release that install.spacetimedb.com installs today.
> Only the TypeScript tabs are kept. The Rust, C#, C++ and Unreal versions are on spacetimedb.com.
> Only `public` tables can be read by anonymous SQL over HTTP or by subscriptions. Cindia's tables should be public.

## Indexes

Indexes accelerate queries by maintaining sorted data structures alongside your tables. Without an index, finding rows that match a condition requires scanning every row. With an index, the database locates matching rows directly.

### When to Use Indexes

Add an index when you frequently query a column with equality or range conditions. Common scenarios include:

- **Filtering by foreign key**: A `player_id` column in an inventory table benefits from an index when you query items belonging to a specific player.
- **Range queries**: An `age` column benefits from an index when you query users within an age range.
- **Sorting**: Columns used in ORDER BY clauses benefit from indexes that maintain sort order.

Indexes consume additional memory and slow down inserts and updates, since the database must maintain the index structure. Add indexes based on your actual query patterns rather than speculatively.

Primary keys and unique constraints automatically create indexes. You do not need to add a separate index for columns that already have these constraints.

### Index Types

SpacetimeDB supports two index types:

| Type | Use Case | Key Types | Multi-Column |
|------|----------|-----------|--------------|
| B-tree | General purpose | Any | Yes |
| Direct | Dense integer sequences | `u8`, `u16`, `u32`, `u64` | No |

#### Supported Column Types

Not all column types can be used as index keys. The following types are supported for B-tree indexes:

| Category | Types |
|----------|-------|
| Integers | `u8`, `u16`, `u32`, `u64`, `u128`, `u256`, `i8`, `i16`, `i32`, `i64`, `i128`, `i256` |
| Boolean | `bool` |
| Strings | `String` |
| Identifiers | `Identity`, `ConnectionId`, `Uuid`, `Hash` |
| Enums | No-payload (C-style) enums annotated with `#[derive(SpacetimeType)]` |

The following types are **not** supported as index keys:

| Type | Reason |
|------|--------|
| `f32`, `f64` | Floating-point values do not have a total ordering (`NaN` is not comparable) |
| `ScheduleAt`, `TimeDuration`, `Timestamp` | Not yet supported ([#2650](https://github.com/clockworklabs/SpacetimeDB/issues/2650)) |
| `Vec<T>`, arrays | Variable-length collections are not indexable |
| Enums with payloads | Only no-payload (C-style) enums are supported |
| Nested structs | Product types cannot be used as index keys |

If you attempt to use an unsupported type as an index key, you will get a compile error. For multi-column indexes, every column in the index must use a supported type.

**Tip: Workaround for floating-point data**

If you need to index floating-point coordinates (for example, `x` and `y` positions), consider storing them as scaled integers. For instance, multiply by 1000 and store as `i32` to get three decimal places of precision while remaining indexable.

Direct indexes have additional restrictions: only `u8`, `u16`, `u32`, `u64`, and no-payload enums are supported.

#### B-tree Indexes

B-trees maintain data in sorted order, enabling both equality lookups (`x = 5`) and range queries (`x > 5`, `x BETWEEN 1 AND 10`). The sorted structure also supports prefix matching on multi-column indexes. B-tree is the default and most commonly used index type.

#### Direct Indexes

Direct indexes use array indexing instead of tree traversal, providing O(1) lookups for unsigned integer keys. SpacetimeDB uses the key value directly as an array offset, eliminating the need to search through a tree structure.

Direct indexes perform well when:
- Keys are dense (few gaps between values)
- Keys start near zero
- Insert patterns are sequential rather than random

Direct indexes perform poorly when:
- Keys are sparse (large gaps between values)
- The first key inserted is a large number
- Insert patterns are highly random

Direct indexes only support single-column indexes on unsigned integer types. Use them for auto-increment primary keys or other dense sequential identifiers where you need maximum lookup performance.

**Note:**

Direct indexes are currently available in Rust and TypeScript. C# support is planned.

```typescript
const position = table(
  { name: 'position', public: true },
  {
    id: t.u32().primaryKey().index('direct'),
    x: t.f32(),
    y: t.f32(),
    z: t.f32(),
  }
);
```

This example from the SpacetimeDB benchmarks uses direct indexes for a million entities with sequential IDs starting at 0, enabling O(1) lookups when joining position and velocity data by entity ID.

For most use cases, B-tree indexes provide good performance without these restrictions. Consider direct indexes only when profiling reveals that index lookups are a bottleneck and your key distribution matches the ideal pattern.

### Single-Column Indexes

A single-column index accelerates queries that filter on one column. You can define the index at the field level or the table level.

#### Field-Level Syntax

The field-level syntax places the index declaration directly on the column:

```typescript
const user = table(
  { name: 'user', public: true },
  {
    id: t.u32().primaryKey(),
    name: t.string().index('btree'),
    age: t.u8().index('btree'),
  }
);
```

#### Table-Level Syntax

The table-level syntax defines indexes separately from columns. This approach allows you to name the index explicitly:

```typescript
const user = table(
  {
    name: 'user',
    public: true,
    indexes: [
      { accessor: 'idxAge', algorithm: 'btree', columns: ['age'] },
    ],
  },
  {
    id: t.u32().primaryKey(),
    name: t.string(),
    age: t.u8(),
  }
);
```

### Multi-Column Indexes

A multi-column index (also called a composite index) spans multiple columns. The index maintains rows sorted by the first column, then by the second column within equal values of the first, and so on.

Multi-column indexes support:
- **Full match**: Queries that specify all indexed columns
- **Prefix match**: Queries that specify the leftmost columns in order
- **Range on trailing column**: A prefix of equality conditions followed by a range on the next column

For indexes with three or more columns, the same rule applies: provide any leftmost prefix of exact
values, optionally followed by a range on the next column. You cannot put a range in the middle and
then continue with more exact values.

A multi-column index on `(player_id, level)` accelerates these queries:
- `player_id = 123` (prefix match on first column)
- `player_id = 123 AND level = 5` (full match)
- `player_id = 123 AND level > 5` (prefix match with range)

The same index does not accelerate a query on `level` alone, since `level` is not a prefix of the index.

```typescript
const score = table(
  {
    name: 'score',
    public: true,
    indexes: [
      { accessor: 'byPlayerAndLevel', algorithm: 'btree', columns: ['playerId', 'level'] },
    ],
  },
  {
    playerId: t.u32(),
    level: t.u32(),
    points: t.i64(),
  }
);
```

### Querying with Indexes

SpacetimeDB generates type-safe accessor methods for each index. These methods accept filter arguments and return matching rows.

#### Equality Queries

Pass a single value to find rows where the indexed column equals that value:

```typescript
// Find users with a specific name
for (const user of ctx.db.user.name.filter('Alice')) {
  console.log(`Found user: ${user.id}`);
}
```

#### Range Queries

Pass a `Range` object to find rows where the indexed column falls within bounds. The `Range` constructor accepts `from` and `to` bounds, each specified as `{ tag: 'included', value }`, `{ tag: 'excluded', value }`, or `{ tag: 'unbounded' }`:

```typescript
import { Range } from 'spacetimedb/server';

// Find users aged 18 to 65 (inclusive)
for (const user of ctx.db.user.age.filter(
  new Range({ tag: 'included', value: 18 }, { tag: 'included', value: 65 })
)) {
  console.log(`${user.name} is ${user.age}`);
}

// Find users aged 18 or older (from 18 inclusive, unbounded above)
for (const user of ctx.db.user.age.filter(
  new Range({ tag: 'included', value: 18 }, { tag: 'unbounded' })
)) {
  console.log(`${user.name} is an adult`);
}

// Find users younger than 18 (unbounded below, to 18 exclusive)
for (const user of ctx.db.user.age.filter(
  new Range({ tag: 'unbounded' }, { tag: 'excluded', value: 18 })
)) {
  console.log(`${user.name} is a minor`);
}
```

#### Multi-Column Queries

For multi-column indexes, pass a tuple of values. You can specify exact values for prefix columns and optionally a range for the trailing column:

```typescript
import { Range } from 'spacetimedb/server';

// Find all scores for player 123 (prefix match on first column)
for (const score of ctx.db.score.byPlayerAndLevel.filter(123)) {
  console.log(`Level ${score.level}: ${score.points} points`);
}

// Find scores for player 123 at levels 1-10 (inclusive)
for (const score of ctx.db.score.byPlayerAndLevel.filter([
  123,
  new Range({ tag: 'included', value: 1 }, { tag: 'included', value: 10 })
])) {
  console.log(`Level ${score.level}: ${score.points} points`);
}

// Find the exact score for player 123 at level 5
for (const score of ctx.db.score.byPlayerAndLevel.filter([123, 5])) {
  console.log(`Points: ${score.points}`);
}
```

### Deleting with Indexes

Indexes also accelerate deletions. Instead of scanning the entire table to find rows to delete, you can delete directly by index value:

```typescript
import { Range } from 'spacetimedb/server';

// Delete all users named "Alice"
const deleted = ctx.db.user.name.delete('Alice');
console.log(`Deleted ${deleted} user(s)`);

// Delete users younger than 18
const deletedMinors = ctx.db.user.age.delete(
  new Range({ tag: 'unbounded' }, { tag: 'excluded', value: 18 })
);
console.log(`Deleted ${deletedMinors} minor(s)`);
```

### Index Design Guidelines

**Choose columns based on query patterns.** Index the columns that appear in your WHERE clauses and JOIN conditions. An unused index wastes memory.

**Consider column order in multi-column indexes.** Place the most selective column (the one that narrows results most) first, followed by columns used in range conditions. An index on `(country, city)` works for queries on `country` alone or `country AND city`, but not for queries on `city` alone.

**Avoid redundant indexes.** A multi-column index on `(a, b)` makes a separate index on `(a)` redundant, since the multi-column index handles prefix queries. However, an index on `(b)` is not redundant if you query `b` independently.

**Balance read and write performance.** Each index speeds up reads but slows down writes. Tables with high write volume and few reads may benefit from fewer indexes.

### Next Steps

- Learn about Constraints for primary keys and unique indexes
- See Access Permissions for querying tables from reducers

## Table Access Permissions

SpacetimeDB controls data access through table visibility and context-based permissions. Tables can be public or private, and different execution contexts (reducers, views, clients) have different levels of access.

### Public and Private Tables

Tables are **private** by default. Private tables can only be accessed by reducers and views running on the server. Clients cannot query, subscribe to, or see private tables.

**Public** tables are exposed to clients for read access through subscriptions and queries. Clients can see public table data but can only modify it by calling reducers.

```typescript
// Private table (default) - only accessible from server-side code
const internalConfig = table(
  { name: 'internal_config' },
  {
    key: t.string().primaryKey(),
    value: t.string(),
  }
);

// Public table - clients can subscribe and query
const player = table(
  { name: 'player', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    name: t.string(),
    score: t.u64(),
  }
);
```

Use private tables for:
- Internal configuration or state that clients should not see
- Sensitive data like password hashes or API keys
- Intermediate computation results

Use public tables for:
- Data that clients need to display or interact with
- Game state, user profiles, or other user-facing data

### Reducers - Read-Write Access

Reducers receive a `ReducerContext` which provides full read-write access to all tables (both public and private). They can perform all CRUD operations: insert, read, update, and delete.

```typescript
export const example = spacetimedb.reducer((ctx) => {
  // Insert
  ctx.db.user.insert({ id: 0n, name: 'Alice', email: 'alice@example.com' });

  // Read: iterate all rows
  for (const user of ctx.db.user.iter()) {
    console.log(user.name);
  }

  // Read: find by unique column
  const foundUser = ctx.db.user.id.find(123);
  if (foundUser) {
    // Update
    foundUser.name = 'Bob';
    ctx.db.user.id.update(foundUser);
  }

  // Delete
  ctx.db.user.id.delete(456);
});
```

### Procedures with Transactions - Read-Write Access

Procedures receive a `ProcedureContext` and can access tables through transactions. Unlike reducers, procedures must explicitly open a transaction to read from or modify the database.

```typescript
export const updateUserProcedure = spacetimedb.procedure({ userId: t.u64(), newName: t.string() }, t.unit(), (ctx, { userId, newName }) => {
  // Must explicitly open a transaction
  ctx.withTx(ctx => {
    // Full read-write access within the transaction
    const user = ctx.db.user.id.find(userId);
    if (user) {
      user.name = newName;
      ctx.db.user.id.update(user);
    }
  });
  // Transaction is committed when the function returns
  return {};
});

```

See the Procedures documentation for more details on using procedures, including making HTTP requests to external services.

### Views - Read-Only Access

Views receive a `ViewContext` or `AnonymousViewContext` which provides read-only access to all tables (both public and private). They can query tables through indexed lookups, but cannot scan full tables or insert, update, or delete rows.

```typescript
export const findUsersByName = spacetimedb.view(
  { name: 'findUsersByName', public: true },
  t.array(user.rowType),
  (ctx) => {
    // Can read and filter
    return Array.from(ctx.db.user.name.filter('Alice'));

    // Cannot insert, update, or delete
    // ctx.db.user.insert(...) // ❌ Method not available
  });
```

See the Views documentation for more details on defining and querying views.

### Using Views for Fine-Grained Access Control

While table visibility controls whether clients can access a table at all, views provide fine-grained control over which rows and columns clients can see. Views can read from private tables and expose only the data appropriate for each client.

**Note:**

Views can only access table data through indexed lookups, not by scanning all rows. This restriction ensures views remain performant. See the Views documentation for details.

#### Filtering Rows by Caller

Use views with `ViewContext` to return only the rows that belong to the caller. The view accesses the caller's identity through `ctx.sender()` and uses it to look up rows via an index.

```typescript
import { table, t, schema } from 'spacetimedb/server';

// Private table containing all messages
const message = table(
  { name: 'message' },  // Private by default
  {
    id: t.u64().primaryKey().autoInc(),
    sender: t.identity().index('btree'),
    recipient: t.identity().index('btree'),
    content: t.string(),
    timestamp: t.timestamp(),
  }
);

const spacetimedb = schema({ message });
export default spacetimedb;

// Public view that only returns messages the caller can see
export const myMessages = spacetimedb.view(
  { name: 'my_messages', public: true },
  t.array(message.rowType),
  (ctx) => {
    // Look up messages by index where caller is sender or recipient
    const sent = Array.from(ctx.db.message.sender.filter(ctx.sender));
    const received = Array.from(ctx.db.message.recipient.filter(ctx.sender));
    return [...sent, ...received];
  }
);
```

Clients querying `my_messages` will only see their own messages, even though all messages are stored in the same table.

#### Hiding Sensitive Columns

Use views to return a custom type that omits sensitive columns. The view reads from a table with sensitive data and returns a projection containing only the columns clients should see.

```typescript
import {schema, t, table} from 'spacetimedb/server';

// Private table with sensitive data
const userAccount = table(
  { name: 'user_account' },  // Private by default
  {
    id: t.u64().primaryKey().autoInc(),
    identity: t.identity().unique(),
    username: t.string(),
    email: t.string(),
    passwordHash: t.string(),  // Sensitive
    apiKey: t.string(),        // Sensitive
    createdAt: t.timestamp(),
  }
);

const spacetimedb = schema({ userAccount });
export default spacetimedb;

// Public type without sensitive columns
const publicUserProfile = t.row('PublicUserProfile', {
  id: t.u64(),
  username: t.string(),
  createdAt: t.timestamp(),
});

// Public view that returns the caller's profile without sensitive data
export const myProfile = spacetimedb.view(
  { name: 'my_profile', public: true },
  t.option(publicUserProfile),
  (ctx) => {
    // Look up the caller's account by their identity (unique index)
    const user = ctx.db.userAccount.identity.find(ctx.sender);
    if (!user) return null;
    return {
      id: user.id,
      username: user.username,
      createdAt: user.createdAt,
      // email, passwordHash, and apiKey are not included
    };
  }
);
```

Clients can query `my_profile` to see their username and creation date, but never see their email address, password hash, or API key.

#### Combining Both Techniques

Views can combine row filtering and column projection. This example returns colleagues in the same department as the caller, with salary information hidden:

```typescript
import { table, t, schema } from 'spacetimedb/server';

// Private table with all employee data
const employee = table(
  { name: 'employee' },
  {
    id: t.u64().primaryKey(),
    identity: t.identity().unique(),
    name: t.string(),
    department: t.string().index('btree'),
    salary: t.u64(),           // Sensitive
  }
);

const spacetimedb = schema({ employee });
export default spacetimedb;

// Public type for colleagues (no salary)
const colleague = t.row('Colleague', {
  id: t.u64(),
  name: t.string(),
  department: t.string(),
});

// View that returns colleagues in the caller's department, without salary info
export const myColleagues = spacetimedb.view(
  { name: 'my_colleagues', public: true },
  t.array(colleague),
  (ctx) => {
    // Find the caller's employee record by identity (unique index)
    const me = ctx.db.employee.identity.find(ctx.sender);
    if (!me) return [];

    // Look up employees in the same department
    return Array.from(ctx.db.employee.department.filter(me.department)).map(emp => ({
      id: emp.id,
      name: emp.name,
      department: emp.department,
      // salary is not included
    }));
  }
);
```

### Client Access - Read-Only Access

Clients connect to databases and can access public tables and views through subscriptions and queries. They cannot access private tables directly. See the Subscriptions documentation for details on client-side table access.
