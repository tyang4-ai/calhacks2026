# SpacetimeDB TypeScript client SDK, part 2: events, client cache, reducers, identity

> Source: https://github.com/clockworklabs/SpacetimeDB/blob/v2.13.0/docs/docs/00200-core-concepts/00600-clients/00700-typescript-reference.md
> Fetched: 2026-10-24.
>
> From the clockworklabs/SpacetimeDB repo at tag v2.13.0 (Oct 19, 2026), the release that install.spacetimedb.com installs today.
> Only the TypeScript tabs are kept. The Rust, C#, C++ and Unreal versions are on spacetimedb.com.
> Part 1 is typescript-client-sdk-1-connect-and-subscribe.md.

## Type `EventContext`

```typescript
EventContext;
```

An `EventContext` is a `DbContext` augmented with a field `event: Event`. `EventContext`s are passed as the first argument to row callbacks `onInsert`, `onDelete` and `onUpdate`.

| Name                                | Description                                                   |
| ----------------------------------- | ------------------------------------------------------------- |
| `event` field       | Enum describing the cause of the current row callback.        |
| `db` field             | Provides access to the client cache.                          |
| `reducers` field | Allows requesting reducers run on the remote database.        |
| `Event` type         | Possible events which can cause a row callback to be invoked. |

### Field `event`

```typescript
class EventContext {
  public event: Event<Reducer>;
}
/* other fields */
```

The `Event` contained in the `EventContext` describes what happened to cause the current row callback to be invoked.

### Field `db`

```typescript
class EventContext {
  public db: RemoteTables;
}
```

The `db` field of the context provides access to the subscribed view of the remote database's tables. See Access the client cache.

### Field `reducers`

```typescript
class EventContext {
  public reducers: RemoteReducers;
}
```

The `reducers` field of the context provides access to reducers exposed by the remote module. See Observe and invoke reducers.

### Type `Event`

```typescript
type Event<Reducer> =
  | { tag: 'Reducer'; value: ReducerEvent<Reducer> }
  | { tag: 'SubscribeApplied' }
  | { tag: 'UnsubscribeApplied' }
  | { tag: 'Error'; value: Error }
  | { tag: 'Transaction' };
```

| Name                                                        | Description                                                                                                                             |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `Reducer` variant                       | A reducer ran in the remote database.                                                                                                   |
| `SubscribeApplied` variant     | A new subscription was applied to the client cache.                                                                                     |
| `UnsubscribeApplied` variant | A previous subscription was removed from the client cache after a call to `unsubscribe`.                         |
| `Error` variant                           | A previous subscription was removed from the client cache due to an error.                                                              |
| `Transaction` variant        | A transaction ran in the remote database, but was not attributed to a known reducer.                                                    |
| `ReducerEvent` type                   | Metadata about a reducer run. Contained in `Event::Reducer` and `ReducerEventContext`. |
| `UpdateStatus` type                   | Completion status of a reducer run.                                                                                                     |
| `Reducer` type                             | Module-specific generated enum with a variant for each reducer defined by the module.                                                   |

#### Variant `Reducer`

```typescript
{
  tag: 'Reducer';
  value: ReducerEvent<Reducer>;
}
```

Event when we are notified that a reducer ran in the remote database. The `ReducerEvent` contains metadata about the reducer run, including its arguments and termination status(#type-updatestatus).

This event is passed to row callbacks resulting from modifications by the reducer.

#### Variant `SubscribeApplied`

```typescript
{
  tag: 'SubscribeApplied';
}
```

Event when our subscription is applied and its rows are inserted into the client cache.

This event is passed to row `onInsert` callbacks resulting from the new subscription.

#### Variant `UnsubscribeApplied`

```typescript
{
  tag: 'UnsubscribeApplied';
}
```

Event when our subscription is removed after a call to `SubscriptionHandle.unsubscribe` or `SubscriptionHandle.unsubscribeThen` and its matching rows are deleted from the client cache.

This event is passed to row `onDelete` callbacks resulting from the subscription ending.

#### Variant `Error`

```typescript
{
  tag: 'Error';
  value: Error;
}
```

Event when a subscription ends unexpectedly due to an error.

This event is passed to row `onDelete` callbacks resulting from the subscription ending.

#### Variant `Transaction`

```typescript
{
  tag: 'Transaction';
}
```

Event when we are notified of a transaction in the remote database which we cannot associate with a known reducer. This may be an ad-hoc SQL query or a reducer for which we do not have bindings.

This event is passed to row callbacks resulting from modifications by the transaction.

### Type `ReducerEvent`

A `ReducerEvent` contains metadata about a reducer run.

```typescript
type ReducerEvent<Reducer> = {
  /**
   * The time when the reducer started running.
   */
  timestamp: Timestamp;

  /**
   * Whether the reducer committed, was aborted due to insufficient energy, or failed with an error message.
   */
  status: UpdateStatus;

  /**
   * The identity of the caller.
   * TODO: Revise these to reflect the forthcoming Identity proposal.
   */
  callerIdentity: Identity;

  /**
   * The connection ID of the caller.
   *
   * May be `null`, e.g. for scheduled reducers.
   */
  callerConnectionId?: ConnectionId;

  /**
   * The amount of energy consumed by the reducer run, in eV.
   * (Not literal eV, but our SpacetimeDB energy unit eV.)
   * May be present or undefined at the implementor's discretion;
   * future work may determine an interface for module developers
   * to request this value be published or hidden.
   */
  energyConsumed?: bigint;

  /**
   * The `Reducer` enum defined by the `moduleBindings`, which encodes which reducer ran and its arguments.
   */
  reducer: Reducer;
};
```

### Type `UpdateStatus`

```typescript
type UpdateStatus =
  | { tag: 'Committed'; value: __DatabaseUpdate }
  | { tag: 'Failed'; value: string }
  | { tag: 'OutOfEnergy' };
```

| Name                                          | Description                                         |
| --------------------------------------------- | --------------------------------------------------- |
| `Committed` variant     | The reducer ran successfully.                       |
| `Failed` variant           | The reducer errored.                                |
| `OutOfEnergy` variant | The reducer was aborted due to insufficient energy. |

#### Variant `Committed`

```typescript
{
  tag: 'Committed';
}
```

The reducer returned successfully and its changes were committed into the database state. An `Event` with `tag: 'Reducer'` passed to a row callback must have this status in its `ReducerEvent`.

#### Variant `Failed`

```typescript
{
  tag: 'Failed';
  value: string;
}
```

The reducer returned an error, panicked, or threw an exception. The `value` is the stringified error message. Formatting of the error message is unstable and subject to change, so clients should use it only as a human-readable diagnostic, and in particular should not attempt to parse the message.

#### Variant `OutOfEnergy`

```typescript
{
  tag: 'OutOfEnergy';
}
```

The reducer was aborted due to insufficient energy balance of the module owner.

### Type `Reducer`

```typescript
type Reducer =
  | { name: 'ReducerA'; args: ReducerA }
  | { name: 'ReducerB'; args: ReducerB }
```

The module bindings contains a type `Reducer` with a variant for each reducer defined by the module. Each variant has a field `args` containing the arguments to the reducer.

## Access the client cache

All `DbContext` implementors, including `DbConnection` and `EventContext`, have fields `.db`, which in turn has methods for accessing tables and views in the client cache.

Each table or view defined by a module has an accessor method, whose name is the table or view name converted to `camelCase`, on this `.db` field. The accessor methods return table handles. Table handles have methods for accessing rows and registering `onInsert` and `onDelete` callbacks. Handles with a known primary key also expose `onUpdate` callbacks. Table handles also offer the ability to find subscribed rows by unique index.

| Name                                                   | Description                                                                      |
| ------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Accessing rows                      | Iterate over or count subscribed rows.                                           |
| `onInsert` callback              | Register a function to run when a row is added to the client cache.              |
| `onDelete` callback              | Register a function to run when a row is removed from the client cache.          |
| `onUpdate` callback              | Register a function to run when a subscribed row is replaced with a new version. |
| Unique index access | Seek a subscribed row by the value in its unique or primary key column.          |
| BTree index access              | Not supported.                                                                   |

### Accessing rows

#### Method `count`

```typescript
class TableHandle {
  public count(): number;
}
```

Returns the number of rows of this table resident in the client cache, i.e. the total number which match any subscribed query.

#### Method `iter`

```typescript
class TableHandle {
  public iter(): Iterable<Row>;
}
```

An iterator over all the subscribed rows in the client cache, i.e. those which match any subscribed query.

The `Row` type will be an autogenerated type which matches the row type defined by the module.

### Callback `onInsert`

```typescript
class TableHandle {
  public onInsert(callback: (ctx: EventContext, row: Row) => void): void;

  public removeOnInsert(callback: (ctx: EventContext, row: Row) => void): void;
}
```

The `onInsert` callback runs whenever a new row is inserted into the client cache, either when applying a subscription or being notified of a transaction. The passed `EventContext` contains an `Event` which can identify the change which caused the insertion, and also allows the callback to interact with the connection, inspect the client cache and invoke reducers.

The `Row` type will be an autogenerated type which matches the row type defined by the module.

`removeOnInsert` may be used to un-register a previously-registered `onInsert` callback.

### Callback `onDelete`

```typescript
class TableHandle {
  public onDelete(callback: (ctx: EventContext, row: Row) => void): void;

  public removeOnDelete(callback: (ctx: EventContext, row: Row) => void): void;
}
```

The `onDelete` callback runs whenever a previously-resident row is deleted from the client cache.

The `Row` type will be an autogenerated type which matches the row type defined by the module.

`removeOnDelete` may be used to un-register a previously-registered `onDelete` callback.

### Callback `onUpdate`

```typescript
class TableHandle {
  public onUpdate(
    callback: (ctx: EventContext, old: Row, new: Row) => void
  ): void;

  public removeOnUpdate(
    callback: (ctx: EventContext, old: Row, new: Row) => void
  ): void;
}
```

The `onUpdate` callback runs whenever an already-resident row in the client cache is updated, i.e. replaced with a new row that has the same primary key.

Only handles with a declared primary key expose `onUpdate` callbacks. Handles for tables or views without a primary key will not have `onUpdate` or `removeOnUpdate` methods. TypeScript view handles expose `onUpdate` callbacks when the returned row type has exactly one column marked with `.primaryKey()`.

The `Row` type will be an autogenerated type which matches the row type defined by the module. Its field names are the module's column names converted to camelCase, so a column declared `trip_id` appears as `tripId`.

`removeOnUpdate` may be used to un-register a previously-registered `onUpdate` callback.

### Unique constraint index access

For each unique constraint on a table, its table handle has a field whose name is the unique column name. This field is a unique index handle. The unique index handle has a method `.find(desiredValue: Col) -> Row | undefined`, where `Col` is the type of the column, and `Row` the type of rows. If a row with `desiredValue` in the unique column is resident in the client cache, `.find` returns it.

### BTree index access

The SpacetimeDB TypeScript client SDK does not support non-unique BTree indexes.

## Observe and invoke reducers

All `DbContext` implementors, including `DbConnection` and `EventContext`, have fields `.reducers`, which in turn has methods for invoking reducers defined by the module and registering callbacks on it.

Each reducer defined by the module has three methods on the `.reducers`:

- An invoke method, whose name is the reducer's name converted to camel case, like `setName`. This requests that the module run the reducer. It returns a `Promise<void>` which rejects with `SenderError` if the reducer fails, so `await` it in a `try`/`catch` to handle errors.
- A callback registration method, whose name is prefixed with `on`, like `onSetName`. This registers a callback to run whenever we are notified that the reducer ran, including successfully committed runs and runs we requested which failed. This method returns a callback id, which can be passed to the callback remove method.
- A callback remove method, whose name is prefixed with `removeOn`, like `removeOnSetName`. This cancels a callback previously registered via the callback registration method.

For example:

```typescript
try {
  await conn.reducers.setName({ name: newName });
} catch (err) {
  if (err instanceof SenderError) {
    console.log(`You made an error: ${err}`);
  } else if (err instanceof InternalError) {
    console.log(`The server had an error: ${err}`);
  }
}
```

## Identify a client

### Type `Identity`

```typescript
Identity
```

A unique public identifier for a client connected to a database.

### Type `ConnectionId`

```typescript
ConnectionId
```

An opaque identifier for a client connection to a database, intended to differentiate between connections from the same `Identity`.
