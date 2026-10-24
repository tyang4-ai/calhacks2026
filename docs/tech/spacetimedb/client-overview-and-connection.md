# SpacetimeDB clients: overview, code generation, connection lifecycle

> Sources:
> - https://github.com/clockworklabs/SpacetimeDB/blob/v2.13.0/docs/docs/00200-core-concepts/00600-clients.md
> - https://github.com/clockworklabs/SpacetimeDB/blob/v2.13.0/docs/docs/00200-core-concepts/00600-clients/00200-codegen.md
> - https://github.com/clockworklabs/SpacetimeDB/blob/v2.13.0/docs/docs/00200-core-concepts/00600-clients/00300-connection.md
> Fetched: 2026-10-24.
>
> From the clockworklabs/SpacetimeDB repo at tag v2.13.0 (Oct 19, 2026), the release that install.spacetimedb.com installs today.
> Only the TypeScript tabs are kept. The Rust, C#, C++ and Unreal versions are on spacetimedb.com.

## Clients

The SpacetimeDB Client SDKs provide a comprehensive interface for building applications that connect to SpacetimeDB databases. Client applications can query data, invoke server-side functions, and receive real-time updates as the database state changes.

### Available SDKs

SpacetimeDB provides client SDKs for multiple languages:

- Rust - (Quickstart)
- C# - (Quickstart)
- TypeScript - (Quickstart)
- Unreal - (Tutorial)

### Getting Started

To build a client application with SpacetimeDB:

1. **Generate client bindings** - Use `spacetime generate` to create type-safe bindings for your database
2. **Connect to your database** - Establish a WebSocket connection to SpacetimeDB
3. **Use the SDK API** - Subscribe to data, invoke functions, and register callbacks

### Core Capabilities

#### Connection Management

The SDKs handle establishing and maintaining WebSocket connections to SpacetimeDB servers. Connections support authentication via tokens (for example, from SpacetimeAuth) and provide lifecycle callbacks for connect, disconnect, and error events.

See Connecting to SpacetimeDB for details.

#### Client-Side Data Cache

Each client maintains a local cache of database rows through subscriptions. Clients define which data they need using typed query builders (or raw SQL when needed), and SpacetimeDB automatically synchronizes changes to the subscribed data. The local cache can be queried without network round-trips, providing fast access to frequently-read data.

#### Real-Time Updates

Clients receive automatic updates when subscribed data changes. The SDKs provide callbacks for observing:

- **Subscription updates** - When subscription queries are applied or fail
- **Row changes** - When rows are inserted, updated, or deleted in the local cache
- **Reducer invocations** - When reducers run on the server
- **Procedure results** - When procedures are called the results are returned via a callback

#### Invoking Server Functions

Clients can invoke server-side functions to modify data or perform operations:

- **Reducers** - Transactional functions that modify database state
- **Procedures** - Functions that can perform external operations like HTTP requests

#### Type Safety

The generated client bindings provide compile-time type safety between your client and server code. Table schemas, function signatures, and return types are all reflected in the generated code, catching errors before runtime.

### Choosing a Language

When selecting a language for your client application, consider these factors:

#### Team Expertise

Choose a language your development team is comfortable with to maximize productivity and reduce development time.

#### Application Type

- **Web applications** - TypeScript integrates seamlessly with browser and Node.js environments
- **Desktop applications** - Rust or C# depending on your platform and requirements
- **Performance-critical applications** - Rust offers the best performance and memory efficiency
- **Unity games** - C# is required for Unity development
- **Unreal games** - C++ and Blueprint are both supported for Unreal clients

#### Platform and Ecosystem

Each language has its own ecosystem of libraries and tools. If your application depends on specific libraries or frameworks, that may influence your choice.

The functionality of the SDKs remains consistent across languages, so transitioning between them primarily involves syntax changes rather than architectural changes. You can even use multiple languages in the same project - for example, C# for a Unity game client and TypeScript for a web administration panel.

### Learning Path

New to SpacetimeDB client development? Follow this progression:

1. **Generate Client Bindings** - Create type-safe interfaces from your module
2. **Connect to SpacetimeDB** - Establish a connection and understand the lifecycle
3. **Use the SDK API** - Learn about subscriptions, reducers, and callbacks
4. **Language Reference** - Dive into language-specific details: Rust, C#, TypeScript, and Unreal Engine

### Next Steps

- To build your first client, follow a **Quickstart guide** for Rust, C#, or TypeScript, or use the Unreal tutorial
- Learn about Databases to understand what you're connecting to
- Explore Subscriptions for efficient data synchronization
- Review Reducers to understand server-side state changes

## Generating Client Bindings

Before you can interact with a SpacetimeDB database from a client application, you must generate client bindings for your **module**. These bindings create type-safe interfaces that allow your client to query tables, invoke reducers, call procedures, and subscribe to tables, and/or views.

### What Are Module Bindings?

Module bindings are auto-generated code that mirrors your module's schema and functions. They provide:

- **Type definitions** matching your module's tables and types
- **Callable functions** for invoking reducers and procedures
- **Query interfaces** for subscriptions and local cache access
- **Callback registration** for observing database changes

The bindings ensure compile-time type safety between your client and server code, catching errors before runtime.

### Generating Bindings

Use the `spacetime generate` command to create bindings from your module:

```bash
mkdir -p src/module_bindings
spacetime generate --lang typescript --out-dir src/module_bindings --module-path PATH-TO-MODULE-DIRECTORY
```

This generates TypeScript files in `src/module_bindings/`. Import them in your client:

```typescript
import * as moduleBindings from './module_bindings';
```

Replace **PATH-TO-MODULE-DIRECTORY** with the path to your module's directory, where the module's `package.json` is located.

### What Gets Generated

The `spacetime generate` command creates client-side representations of your module's components:

#### Tables

For each table in your module, codegen generates:

- **Type/class definitions** with properties for each column
- **Table accessor** on the `DbConnection` for querying the client cache
- **Callback registration** methods for observing insertions, updates, and deletions

For example, a `user` table becomes:

```typescript
// Generated type
export default __t.row({
  id: __t.u64(),
  name: __t.string(),
  emailAddress: __t.string(),
});

// Access via DbConnection
conn.db.user
```

Note that generated names follow each language's conventions, including field names: a column declared as `email_address` in your module becomes `emailAddress` in TypeScript and `EmailAddress` in C#.

See the Tables documentation for details on defining tables in your module.

#### Reducers

For each reducer in your module, codegen generates:

- **Client-callable function** that sends a reducer invocation request to the server
- **Callback registration** method for observing when the reducer runs
- **Type-safe parameters** matching the reducer's signature

For example, a `create_user` reducer becomes:

```typescript
// Call the reducer
await conn.reducers.createUser({ name, email });

// Register a callback to observe reducer invocations
conn.reducers.onCreateUser((ctx, { name, email }) => {
  console.log(`User created: ${name}`);
});
```

See the Reducers documentation for details on defining reducers in your module.

#### Procedures

For each procedure in your module, codegen generates:

- **Client-callable function** that invokes the procedure
- **Return value handling** for procedures that return results
- **Type-safe parameters** matching the procedure's signature

For example, a `fetch_external_data` procedure becomes:

```typescript
// Call the procedure
conn.procedures
  .fetchExternalData(url)
  .then(result => console.log(`Got result: ${result}`))
  .catch(error => console.error(`Error: ${error}`));
```

See the Procedures documentation for details on defining procedures in your module.

#### Views

For each view in your module, codegen generates:

- **Type definitions** for the view's return type
- **Subscription interfaces** for subscribing to view results
- **Query methods** for accessing cached view results
- **Update callbacks** when the view has a known primary key

Views provide subscribable, computed queries over your data.

See the Views documentation for details on defining views in your module.

### Regenerating Bindings

Whenever you modify your module's schema or function signatures, regenerate the client bindings by running `spacetime generate` again. The tool will overwrite the existing generated files with updated code.

If you're actively developing and testing changes, consider adding `spacetime generate` to your build or development workflow.

### Using the Generated Code

Once you've generated the bindings, you're ready to connect to your database and start interacting with it. See:

- Connecting to SpacetimeDB for establishing a connection
- SDK API Reference for using the generated bindings
- Language-specific references: Rust, C#, TypeScript, Unreal

### Troubleshooting

#### Missing module directory

If `spacetime generate` fails to find your module, ensure you're pointing to the directory containing your module's project file (`Cargo.toml`, `.csproj`, or `package.json`).

#### Outdated bindings

If your client doesn't see new tables or reducers, ensure you've regenerated the bindings after updating your module. Generated code is not automatically updated when the module changes.

## Connecting to SpacetimeDB

After generating client bindings for your module, you can establish a connection to your SpacetimeDB database from your client application. The `DbConnection` type provides a persistent WebSocket connection that enables real-time communication with the server.

### Prerequisites

Before connecting, ensure you have:

1. Generated client bindings for your module
2. A published database running on SpacetimeDB (local or on MainCloud)
3. The database's URI and name or identity

### Basic Connection

Create a connection using the `DbConnection` builder pattern:

```typescript
import { DbConnection } from './module_bindings';

const conn = DbConnection.builder()
    .withUri("https://maincloud.spacetimedb.com")
    .withDatabaseName("my_database")
    .withAutomaticReconnect()
    .build();
```

Replace `"https://maincloud.spacetimedb.com"` with your SpacetimeDB host URI, and `"my_database"` with your database's name or identity.

#### Connecting to MainCloud

To connect to a database hosted on MainCloud:

```typescript
const conn = DbConnection.builder()
    .withUri("https://maincloud.spacetimedb.com")
    .withDatabaseName("my_database")
    .withAutomaticReconnect()
    .build();
```

### Authentication with Tokens

To authenticate with a token (for example, from SpacetimeAuth), provide it when building the connection:

```typescript
const conn = DbConnection.builder()
    .withUri("https://maincloud.spacetimedb.com")
    .withDatabaseName("my_database")
    .withToken("your_auth_token_here")
    .withAutomaticReconnect()
    .build();
```

The token is sent to the server during connection and validates your identity. See the SpacetimeAuth documentation for details on obtaining and managing tokens.

### Advancing the Connection

In Rust and TypeScript, the connection processes messages automatically via the browser's event loop or Node.js's event loop. No manual polling is required.

### Connection Lifecycle

#### Connection Callbacks

Register callbacks to observe connection state changes:

```typescript
const HOST = "https://maincloud.spacetimedb.com";
const DB_NAME = "my_database";
const TOKEN_KEY = `${HOST}/${DB_NAME}/auth_token`;

const conn = DbConnection.builder()
    .withUri(HOST)
    .withDatabaseName(DB_NAME)
    .withToken(localStorage.getItem(TOKEN_KEY) ?? undefined)
    .withAutomaticReconnect()
    .onConnect((conn, identity, token) => {
        console.log(`Connected! Identity: ${identity.toHexString()}`);
        // Save token for reconnection — keyed per server/database
        localStorage.setItem(TOKEN_KEY, token);
    })
    .onAutomaticReconnect((_conn, identity, token) => {
        console.log(`Reconnected! Identity: ${identity.toHexString()}`);
        localStorage.setItem(TOKEN_KEY, token);
    })
    .onConnectError((_ctx, error, attempt, delayMs) => {
        console.error('Connection failed:', error);
        if (attempt !== undefined) console.log(`Retry ${attempt} in ${delayMs} ms`);
    })
    .onDisconnect((_ctx, error, attempt, delayMs) => {
        if (attempt !== undefined) {
            console.log(`Connection lost; retry ${attempt} in ${delayMs} ms`, error);
        } else {
            console.log('Connection ended', error);
        }
    })
    .build();
```

#### Disconnecting

Explicitly close the connection when you're done:

```typescript
conn.disconnect();
```

#### Reconnection Behavior

Enable `.withAutomaticReconnect()` to recover after an established connection drops. The SDK retains the connection, cached rows, subscription handles, and callbacks, then restores subscriptions automatically. While `isReconnecting` is `true`, cache reads return the last known data.

Register subscriptions and row callbacks in `onConnect`, which runs only once, or once after `build()`. Successful recovery invokes `onAutomaticReconnect(conn, identity, token)` before subscription replay; wait for subscription `onApplied` callbacks when you need refreshed data. Save authentication tokens in both connection callbacks.

`onDisconnect` and `onConnectError` report the upcoming retry attempt and delay, or `undefined` when no retry is scheduled. Initial connection failures are not retried, and `disconnect()` stops recovery. For expiring credentials, combine `.withToken(initialToken)` with `.withTokenProvider(() => auth.getAccessToken())` to refresh tokens when needed before reconnect attempts.

React, Solid, and Svelte providers enable automatic reconnect through their shared connection manager. Vue and Angular require `.withAutomaticReconnect()` on the provider's builder. Without automatic reconnect, create a new connection after a connection loss. See the TypeScript reference for backoff options, pending-call behavior, and server requirements.

### Connection Identity

Every connection receives a unique identity from the server. Access it through the `on_connect` callback:

```typescript
.onConnect((conn, identity, token) => {
    console.log(`Identity: ${identity.toHexString()}, ConnectionId: ${conn.connectionId}`);
})
```

The identity persists across connections and represents the user, while the connection ID is unique to each connection session.

### Next Steps

Now that you have a connection established, you can:

- Use the SDK API to interact with tables, invoke reducers, and subscribe to data
- Register callbacks for observing database changes
- Call reducers and procedures on the server

For language-specific details, see:

- Rust SDK Reference
- C# SDK Reference
- TypeScript SDK Reference
- Unreal SDK Reference
