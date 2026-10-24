# SpacetimeDB: databases, spacetime dev, spacetime publish, Maincloud

> Sources:
> - https://github.com/clockworklabs/SpacetimeDB/blob/v2.13.0/docs/docs/00200-core-concepts/00100-databases.md
> - https://github.com/clockworklabs/SpacetimeDB/blob/v2.13.0/docs/docs/00200-core-concepts/00100-databases/00200-spacetime-dev.md
> - https://github.com/clockworklabs/SpacetimeDB/blob/v2.13.0/docs/docs/00200-core-concepts/00100-databases/00300-spacetime-publish.md
> - https://github.com/clockworklabs/SpacetimeDB/blob/v2.13.0/docs/docs/00300-resources/00100-how-to/00100-deploy/00100-maincloud.md
> Fetched: 2026-10-24.
>
> From the clockworklabs/SpacetimeDB repo at tag v2.13.0 (Oct 19, 2026), the release that install.spacetimedb.com installs today.
> Only the TypeScript tabs are kept. The Rust, C#, C++ and Unreal versions are on spacetimedb.com.
> Publishing to the local server: `spacetime publish --server local cindia` (or set local as the default server). Maincloud needs `spacetime login` first.

## The Database Module

A **module** is a collection of functions and schema definitions, which can be written in TypeScript, C#, Rust, or C++. Modules define the structure of your database and the server-side logic that processes and handles client requests.

A **database** is a running instance of a module. While a module is the code you write (schema and reducers), a database is the actual deployed entity running on a SpacetimeDB **host** with stored data and active connections.

### Module vs Database

Understanding this distinction is important:

- A **module** is the code you write; it defines your schema (tables) and business logic (reducers, procedures, and views). Modules are compiled and deployed to SpacetimeDB. Rust, C#, and C++ modules compile to WebAssembly, while TypeScript modules run on V8.
- A **database** is a *running instance* of a module; it has the module's schema and logic, plus actual stored data.

You can deploy the same module to multiple databases (e.g. separate environments for testing, staging, production), each with its own independent data. When you update your module code and re-publish, SpacetimeDB will update the database's schema/logic — the existing data remains (though for complicated schema changes you may need to handle migrations carefully).

### What's in a Module?

A module contains:

- **Tables** - Define your data structure and storage.
- **Reducers** - Server-side functions that modify your data transactionally.
- **Procedures** - Functions that can perform external operations like HTTP requests and return results.
- **Views** - Read-only computed queries over your data.

The logic is contained within these three categories of server-side functions: reducers (transactional state changes), procedures (functions with external capabilities), and views (read-only queries).

### Supported Languages

SpacetimeDB modules can be written in multiple languages:

TypeScript is fully supported for server modules. TypeScript is ideal for developers familiar with JavaScript/Node.js.

- TypeScript Quickstart Guide

### Database Names

When you publish a module, you give the database a name. Database names must match the regex `/^[a-z0-9]+(-[a-z0-9]+)*$/`, i.e. only lowercase ASCII letters and numbers, separated by dashes.

**Examples of valid names:**

- `my-game-server`
- `chat-app-production`
- `test123`

Each database also receives a unique **identity** (a hex string) when created. Clients can connect using either the name or identity.

### Managing Databases

Modules and databases are administered using the `spacetime` CLI tool.

#### Creating and Updating Databases

Create or update a database by publishing your module:

```bash
spacetime publish <DATABASE_NAME>
```

See `spacetime publish` for details on the publishing workflow.

When you republish to an existing database, SpacetimeDB attempts to automatically migrate the schema. For details on what changes are supported and migration strategies:

- 1.x to 2.0 Upgrade Notes - Required reading before major-version upgrades.
- Automatic Migrations - Learn which schema changes are safe, breaking, or forbidden.
- Incremental Migrations - Advanced pattern for complex schema changes.

For all available publish options, see the `spacetime publish` CLI reference.

#### Deleting a Database

To permanently delete a database and all its data:

```bash
spacetime delete <DATABASE_NAME>
```

You'll be prompted to confirm the deletion. Use `--yes` to skip the confirmation in scripts.

**Warning:**

Deleting a database is permanent and cannot be undone. All data will be lost.

For more options, see the `spacetime delete` CLI reference.

#### Querying with SQL

You can run SQL queries directly against your database:

```bash
spacetime sql <DATABASE_NAME> "SELECT * FROM user"
```

##### Owner Privileges

**Important:** When you run SQL queries as the database owner, you bypass table visibility restrictions. This means you can query private tables that normal clients cannot access.

To test queries as an unprivileged client would see them, use the `--anonymous` flag:

```bash
spacetime sql --anonymous <DATABASE_NAME> "SELECT * FROM user"
```

This executes the query as an anonymous client, respecting table visibility rules.

For more SQL options, see the `spacetime sql` CLI reference.

#### Viewing Logs

View logs from your database:

```bash
spacetime logs <DATABASE_NAME>
```

##### Following Logs in Real-Time

To stream logs as they're generated (similar to `tail -f`):

`spacetime logs --follow <DATABASE_NAME>`

This keeps the connection open and displays new log entries as they occur. Press Ctrl+C to stop following.

##### Limiting Log Output

To view only the last N lines:

```bash
spacetime logs --num-lines 100 <DATABASE_NAME>
```

For more logging options, see the `spacetime logs` CLI reference.

#### Listing Your Databases

To see all databases associated with your identity:

```bash
spacetime list
```

This shows database names, identities, and host servers.

### Managing Databases via the Website

You can also manage your databases through the SpacetimeDB web interface at [spacetimedb.com](https://spacetimedb.com):

- **View metrics** - Monitor database performance, connection counts, and resource usage
- **Browse tables** - Inspect table schemas and data
- **View logs** - Access historical logs with filtering and search
- **Manage access** - Control database permissions and team access
- **Monitor queries** - See subscription queries and reducer calls

**Tip:**

The website provides a graphical interface for many CLI operations, making it easier to visualize and manage your databases.

### Projects and Teams

SpacetimeDB supports organizing databases into projects and managing team access. This allows you to:

- Group related databases together
- Share access with team members
- Manage permissions at the project level

### Learning Path

#### Getting Started

If you're new to SpacetimeDB, follow this recommended learning path:

1. **Create Your First Database Module** - Set up a new module project with `spacetime init` or `spacetime dev`
2. **Build and Publish** - Learn how to compile and deploy your module
3. **Define Tables** - Structure your data with tables, columns, and indexes
4. **Write Reducers** - Create transactional functions that modify your database
5. **Connect a Client** - Build a client application that connects to your database

#### Core Concepts

Once you have the basics down, explore these essential topics:

- **Error Handling** - Handle errors gracefully in reducers
- **Lifecycle Reducers** - Respond to system events like initialization and client connections
- **Automatic Migrations** - Understand how schema changes work
- **Logging** - Debug and monitor your module with logging

#### Advanced Features

Ready to level up? Dive into these advanced capabilities:

- **Procedures** - Make HTTP requests and interact with external services
- **Views** - Create computed, subscribable queries
- **Schedule Tables** - Schedule reducers to run at specific times
- **Incremental Migrations** - Handle complex schema changes
- **SQL Queries** - Query your database with SQL

#### Deployment

When you're ready to go live:

- **Deploy to MainCloud** - Host your database on SpacetimeDB's managed service
- **Self-Hosting** - Run your own SpacetimeDB instance

### Next Steps

- Learn about Tables to define your database schema
- Create Reducers to modify database state
- Understand Subscriptions for real-time data sync
- Review the CLI Reference for all available commands

## `spacetime dev`

This guide covers how to create a new SpacetimeDB database module project.

### Prerequisites

First, [install the SpacetimeDB CLI](https://spacetimedb.com/install).

### Interactive Development with `spacetime dev`

The fastest way to get started developing a database module is with `spacetime dev`. This interactive command guides you through creating a new SpacetimeDB project with hot-reloading - whenever you save changes to your module code, SpacetimeDB automatically rebuilds and republishes your module.

**Caution:**

`spacetime dev` is currently an unstable command and may change in the future.

#### Getting Started

Run the command from your terminal:

```bash
spacetime dev
```

**First Time Setup**

If no SpacetimeDB project is found in the current directory, you'll be guided through creating a new one:

**Step 1: Project Name**
Enter a name for your project (e.g., `my-project`)

**Step 2: Project Path**
Choose where to create the project files (defaults to `./<project-name>`)

**Step 3: Select a Client Type**
Choose how you want to develop:

- **React** - React web app with TypeScript server (recommended for web apps)
- **Use Template** - Choose from built-in templates or clone from GitHub
- **None** - Server module only

**Existing Projects**

If you run `spacetime dev` in a directory with an existing SpacetimeDB project (containing a `spacetimedb/` directory), it will skip setup and enter development mode directly, connecting to your database and watching for file changes.

#### Client Type Options

##### React

Creates a full-stack React web application with:

- TypeScript server module
- React frontend with SpacetimeDB client SDK
- Pre-configured hot-reloading for both client and server

##### Use Template
Choose from several built-in templates:

- `basic-ts` - Basic TypeScript client and server stubs
- `basic-cs` - Basic C# client and server stubs
- `basic-rs` - Basic Rust client and server stubs
- `basic-cpp` - Basic C++ server stubs
- `react-ts` - React web app with TypeScript server
- `chat-console-rs` - Complete Rust chat implementation
- `chat-console-cs` - Complete C# chat implementation
- `chat-react-ts` - Complete TypeScript chat implementation

You can also clone an existing project by entering a GitHub repository (`owner/repo`) or git URL.

##### None

Creates a server module only, without any client code. You'll choose your server language:

- **TypeScript** - Server module in TypeScript
- **Rust** - Server module in Rust
- **C#** - Server module in C#
- **C++** - Server module in C++

The server code will be created in a `spacetimedb/` subdirectory within your project.

#### What Happens Next

After completing setup, `spacetime dev`:

- Starts a local SpacetimeDB server
- Creates a new database
- Builds and publishes your module to the database
- Watches your source files for changes
- Automatically rebuilds and republishes when you save changes
- **Runs your client development server** (if configured)

Your database will be available at `https://maincloud.spacetimedb.com`.

#### Client Development Server

`spacetime dev` can automatically run your client's development server alongside the SpacetimeDB module. This is configured via the `spacetime.json` file in your project root:

```json
{
  "dev": {
    "run": "npm run dev"
  }
}
```

The client command can be:
- Auto-detected from your project (package.json, Cargo.toml, .csproj)
- Configured in `spacetime.json`
- Overridden via CLI flag: `spacetime dev --run "yarn dev"`
- Disabled with: `spacetime dev --server-only`

When you run `spacetime init` with a client template, a default client command is automatically configured in `spacetime.json` based on your project type.

#### Project Structure

After initialization, your project will contain:

```text
my-project/
├── spacetimedb/            # Server module code
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       └── index.ts
├── src/                    # Client code
│   └── module_bindings/    # Generated client bindings
├── package.json
├── tsconfig.json
├── spacetime.json          # SpacetimeDB configuration
└── README.md
```

### Alternative: Manual Project Creation

If you prefer more control over the development workflow, you can create a database module project manually and use the standard build and publish workflow.

#### Create a New Project with `spacetime init`

```bash
spacetime init --lang typescript --project-path ./my-project my-project
cd my-project
```

This creates a new TypeScript project with:

- A `package.json` configured for SpacetimeDB
- A `src/index.ts` with a sample module
- Sample table and reducer definitions

### Next Steps

After creating your database module:

- Learn about Tables, Reducers, and Procedures
- Build and publish your module

## `spacetime publish`

This guide covers how to build and publish your SpacetimeDB module.

### Building Modules

Before you can publish a module to SpacetimeDB, you need to build it for the appropriate runtime:

- **Rust and C#** modules compile to WebAssembly (WASM)
- **TypeScript** modules bundle for V8 JavaScript engine

Navigate to your module directory (typically `spacetimedb/` within your project) and run:

```bash
spacetime build
```

This compiles your module and validates its structure.

**Tip:**

If you're publishing your module, you don't need to run `spacetime build` separately - `spacetime publish` will automatically build your module if needed.

For all build options, see the `spacetime build` CLI reference.

### Publishing Modules

Once you've built your module, you can publish it to create a new database or update an existing one.

#### Prerequisites

Before publishing, authenticate with SpacetimeDB:

```bash
spacetime login
```

This opens a browser window for authentication. Once complete, your credentials are saved locally.

#### Publishing a New Database

To publish your module and create a new database:

```bash
spacetime publish <DATABASE_NAME>
```

This command:

1. Builds your module (if not already built)
2. Creates a new database with the specified name
3. Uploads and installs your module
4. Runs the `init` lifecycle reducer (if defined)
5. Starts accepting client connections

After publishing, SpacetimeDB outputs your database identity. **Save this identity** - you'll need it for administrative tasks.

#### Updating an Existing Database

To update a module that's already published:

```bash
spacetime publish <DATABASE_NAME>
```

SpacetimeDB will:

1. Build your module
2. Attempt to automatically migrate the schema
3. Swap in the new module atomically
4. Maintain active client connections

##### Breaking Changes

If your update includes breaking changes that cannot be automatically migrated:

```bash
spacetime publish --break-clients <DATABASE_NAME>
```

⚠️ **Warning:** This will break existing clients that haven't been updated to match your new schema.

If this publish is a major upgrade from 1.x to 2.0, read 1.x to 2.0 Upgrade Notes first.

##### Clearing Data

To completely reset your database and delete all data:

```bash
spacetime publish <DATABASE_NAME> --delete-data
```

⚠️ **Warning:** This permanently deletes all data in your database!

#### Publishing Options

For all available publishing options and flags, see the `spacetime publish` CLI reference.

#### Environment Variables

Modules can declare environment variables for configuration and secrets. Each publish supplies the complete set of values from the target's `env` configuration and declared shell variables. Required values must be supplied on every publish; omitted optional values are removed. The module and its environment update atomically.

See Environment Variables for declarations, reading values in module code, publishing examples, and private tables for secrets that need to change without republishing.

### Next Steps

After publishing:

- Learn about connecting a client to your database
- Learn about Tables, Reducers, and Procedures

## Maincloud

Maincloud is SpacetimeDB's fully managed serverless platform. It handles infrastructure, scaling, replication, and backups so you can focus on building your application. Maincloud scales to zero when your database is idle, so you only pay for what you use.

For pricing details, see the [pricing page](https://spacetimedb.com/pricing).

### Prerequisites

1. Install the SpacetimeDB CLI: [Install SpacetimeDB](https://spacetimedb.com/install)
2. Log in to link your CLI identity with your web account:

```bash
spacetime login
```

This opens a browser window where you sign in with your GitHub or Google account. Once authenticated, your CLI identity is linked to your Maincloud account, and any databases you publish will appear on the web dashboard.

**Tip:**

If you previously published a database without logging in first, your CLI identity will not be linked to your web account. Run `spacetime logout` followed by `spacetime login` to re-authenticate.

### Publishing to Maincloud

After creating your module (see Getting Started), publish it to Maincloud:

```bash
spacetime publish my-database --server maincloud
```

SpacetimeDB compiles your module, uploads it, runs your `init` reducer (if defined), and outputs the database identity. Save this identity for administrative tasks.

To update an existing module, run the same command. SpacetimeDB hot-swaps the module code without disconnecting clients. See Automatic Migrations for details on schema changes during updates.

To clear all data and start fresh:

```bash
spacetime publish my-database --server maincloud --delete-data
```

### Connecting Clients to Maincloud

To connect your client application to a module running on Maincloud, use `https://maincloud.spacetimedb.com` as the host URL and pass the database name to `withDatabaseName` / `WithDatabaseName`:

```ts
DbConnection.builder()
  .withUri("https://maincloud.spacetimedb.com")
  .withDatabaseName("my-database")
  .build();
```

### Viewing Your Database on the Web Dashboard

After publishing, you can manage your database through the web dashboard at [spacetimedb.com](https://spacetimedb.com).

#### Finding your database

There are two ways to navigate to your database:

1. **Direct URL**: Go to `https://spacetimedb.com/my-database` or `https://spacetimedb.com/@my-username/my-database` (replacing `my-database` with your database name).
2. **Profile page**: Click your profile picture in the top-right corner of [spacetimedb.com](https://spacetimedb.com) and select "My profile". All of your published databases are listed there. You can also navigate directly to `https://spacetimedb.com/@your-username`.

#### Dashboard features

The database dashboard gives you access to:

- **Overview**: View your database identity, name, status (Running or Paused), table and reducer counts, and energy usage. The overview also shows stats for the past 24 hours including CCU, rows per table, and transactions.
- **Usage breakdown**: See this month's energy consumption broken down by bytes scanned, bytes written, index seeks, CPU instructions, bandwidth, and table storage.
- **Logs**: View your module's log output in real time.
- **SQL console**: Run ad-hoc SQL queries against your database.
- **SpacetimeAuth**: Enable and configure the built-in authentication provider (see SpacetimeAuth).

### Database Lifecycle

Maincloud databases have two states:

- **Running** (green dot on dashboard): The database is actively serving requests. Any client connection, reducer call, or dashboard visit will keep it in this state.
- **Paused** (pause icon on dashboard): The database is suspended. All data is preserved, but the database is not serving requests and does not consume energy.

#### Automatic suspension (Free tier)

On the Free tier, Maincloud automatically pauses databases after a period of inactivity (no client connections, no reducer calls). A paused database resumes automatically when it receives a connection or request. Startup time is typically less than one second.

On the Pro and Team tiers, databases are never automatically suspended as long as you have pay-as-you-go enabled or have not exceeded your self-set spending limit. If you want to ensure your database is always available, upgrade to the [Pro or Team tier](https://spacetimedb.com/pricing).

#### Manual pause and resume

You can manually pause and resume your database from the web dashboard:

1. Navigate to your database on [spacetimedb.com](https://spacetimedb.com).
2. In the left sidebar, check the **Status** field to see if your database is Running or Paused.
3. Click **Pause Database** to suspend the database, or **Start Database** to resume it.

Pausing a database stops all energy usage for that database. This is useful if you want to keep your data but are not actively using the database.

### Deleting a Database

To permanently delete a database and all its data:

```bash
spacetime delete my-database --server maincloud
```

This action cannot be undone.

### Next Steps

- **Explore the dashboard**: Visit [spacetimedb.com](https://spacetimedb.com) to view your database, check logs, and run queries.
- **Set up authentication**: Enable SpacetimeAuth or connect a third-party OIDC provider to authenticate your users.
- **Connect a client**: Follow a quickstart guide to build a client that connects to your Maincloud database.
- **Monitor your usage**: Check your energy consumption and plan limits on the [pricing page](https://spacetimedb.com/pricing).
