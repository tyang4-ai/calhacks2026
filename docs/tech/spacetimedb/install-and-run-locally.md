# SpacetimeDB: install the CLI and run a local server

> Sources:
> - https://spacetimedb.com/install
> - https://github.com/clockworklabs/SpacetimeDB/blob/v2.13.0/docs/docs/00100-intro/00100-getting-started/00100-getting-started.md
> - https://github.com/clockworklabs/SpacetimeDB/blob/v2.13.0/docs/docs/00300-resources/00100-how-to/00100-deploy/00200-self-hosting.md
> - https://github.com/clockworklabs/SpacetimeDB/blob/v2.13.0/docs/docs/00300-resources/00200-reference/00100-cli-reference/00200-standalone-config.md
> - https://github.com/clockworklabs/SpacetimeDB/blob/v2.13.0/docs/docs/00300-resources/00100-how-to/00050-troubleshooting.md
> Fetched: 2026-10-24.
>
> From the clockworklabs/SpacetimeDB repo at tag v2.13.0 (Oct 19, 2026), the release that install.spacetimedb.com installs today.
> Only the TypeScript tabs are kept. The Rust, C#, C++ and Unreal versions are on spacetimedb.com.
> The local server listens on port 3000 by default (`spacetime start`). Cindia's contracts use that port.

## Install the CLI (from the install page and the repo's agent setup guide)

On macOS and Linux (the docs' agent setup guide, `docs/static/agent-setup.md`):

```bash
curl -sSf https://install.spacetimedb.com | sh -s -- --yes
```

The installer puts `spacetime` under your home directory. Check it with `spacetime --version`. The self-hosting page below shows the same script with `--root-dir` to choose the install folder. On Windows, use the PowerShell command shown on https://spacetimedb.com/install.

## Getting Started

**Tip: Coming from Convex?**

Most Convex concepts have a direct SpacetimeDB counterpart: mutations are reducers, actions are procedures, queries are views and subscriptions, HTTP actions are HTTP handlers, scheduled functions are schedule tables, and components are submodules. Migrating from Convex maps the rest and walks through a migration.

### Installation

You can get started by first installing the `spacetime` CLI tool. The `spacetime` CLI tool makes it extremely easy to manage your databases and deployments.

### Log in to SpacetimeDB

SpacetimeDB authenticates users using a GitHub or Google login, to prevent unauthorized access (e.g. somebody else publishing over your module). Log in to SpacetimeDB using:

```bash
spacetime login
```

This will open a browser and ask you to log in via GitHub or Google. If you forget this step, any commands that require login (like `spacetime publish`) will ask you to log in when you run them.

### Running SpacetimeDB Locally

To develop SpacetimeDB databases locally, you will need to run the Standalone version of the server.

After installing the SpacetimeDB CLI, run the start command:

```bash
spacetime start
```

The server listens on port `3000` by default, customized via `--listen-addr`.

💡 Standalone mode will run in the foreground.
⚠️ SSL is not supported in standalone mode.

## Self-hosting

This tutorial will guide you through setting up SpacetimeDB on an Ubuntu 24.04 server, securing it with HTTPS using Nginx and Let's Encrypt, and configuring a systemd service to keep it running.

### Prerequisites

- A fresh Ubuntu 24.04 server (VM or cloud instance of your choice)
- A domain name (e.g., `example.com`)
- `sudo` privileges on the server

### Step 1: Create a Dedicated User for SpacetimeDB

For security purposes, create a dedicated `spacetimedb` user to run SpacetimeDB:

```sh
sudo mkdir /stdb
sudo useradd --system spacetimedb
sudo chown -R spacetimedb:spacetimedb /stdb
```

Install SpacetimeDB as the new user:

```sh
sudo -u spacetimedb bash -c 'curl -sSf https://install.spacetimedb.com | sh -s -- --root-dir /stdb --yes'
```

Because this installation uses `--root-dir /stdb`, include `--root-dir /stdb` when invoking `spacetime` for this installation. Otherwise, the CLI looks in its default directories rather than `/stdb`. The service and update commands below include the option for this reason.

### Step 2: Create a Systemd Service for SpacetimeDB

To ensure SpacetimeDB runs on startup, create a systemd service file:

```sh
sudo nano /etc/systemd/system/spacetimedb.service
```

Add the following content:

```systemd
[Unit]
Description=SpacetimeDB Server
After=network.target

[Service]
ExecStart=/stdb/spacetime --root-dir=/stdb start --listen-addr='127.0.0.1:3000'
Restart=always
User=spacetimedb
WorkingDirectory=/stdb

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```sh
sudo systemctl enable spacetimedb
sudo systemctl start spacetimedb
```

Check the status:

```sh
sudo systemctl status spacetimedb
```

### Step 3: Install and Configure Nginx

#### Install Nginx

```sh
sudo apt update
sudo apt install nginx -y
```

#### Configure Nginx Reverse Proxy

Create a new Nginx configuration file:

```sh
sudo nano /etc/nginx/sites-available/spacetimedb
```

Add the following configuration, remember to change `example.com` to your own domain:

```nginx
server {
    listen 80;
    server_name example.com;

    #########################################
    # By default SpacetimeDB is completely open so that anyone can publish to it. If you want to block
    # users from creating new databases you should keep this section commented out. Otherwise, if you
    # want to open it up (probably for dev environments) then you can uncomment this section and then
    # also comment out the location / section below.
    #########################################
    # location / {
    #     proxy_pass http://localhost:3000;
    #     proxy_http_version 1.1;
    #     proxy_set_header Upgrade $http_upgrade;
    #     proxy_set_header Connection "Upgrade";
    #     proxy_set_header Host $host;
    # }

    # Anyone can subscribe to any database.
    # Note: This is the only section *required* for the websocket to function properly. Clients will
    # be able to create identities, call reducers, and subscribe to tables through this websocket.
    location ~ ^/v1/database/[^/]+/subscribe$ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }

    # Uncomment this section to allow all HTTP reducer calls
    # location ~ ^/v1/[^/]+/call/[^/]+$ {
    #     proxy_pass http://localhost:3000;
    #     proxy_http_version 1.1;
    #     proxy_set_header Upgrade $http_upgrade;
    #     proxy_set_header Connection "Upgrade";
    #     proxy_set_header Host $host;
    # }

    # Uncomment this section to allow all HTTP sql requests
    # location ~ ^/v1/[^/]+/sql$ {
    #     proxy_pass http://localhost:3000;
    #     proxy_http_version 1.1;
    #     proxy_set_header Upgrade $http_upgrade;
    #     proxy_set_header Connection "Upgrade";
    #     proxy_set_header Host $host;
    # }

    # NOTE: This is required for the typescript sdk to function, it is optional
    # for the rust and the C# SDKs.
    location /v1/identity {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }

    # Block all other routes explicitly. Only localhost can use these routes. If you want to open your
    # server up so that anyone can publish to it you should comment this section out.
    location / {
        allow 127.0.0.1;
        deny all;
    }
}
```

This configuration by default blocks all connections other than `/v1/identity` and `/v1/database/<database-name>/subscribe` which only allows the most basic functionality. This will prevent all remote users from publishing to your SpacetimeDB instance.

Enable the configuration:

```sh
sudo ln -s /etc/nginx/sites-available/spacetimedb /etc/nginx/sites-enabled/
```

Restart Nginx:

```sh
sudo systemctl restart nginx
```

#### Configure Firewall

Ensure your firewall allows HTTPS traffic:

```sh
sudo ufw allow 'Nginx Full'
sudo ufw reload
```

### Step 4: Secure with Let's Encrypt

#### Install Certbot

```sh
sudo apt install certbot python3-certbot-nginx -y
```

#### Obtain an SSL Certificate

Run this command to request a new SSL cert from Let's Encrypt. Remember to replace `example.com` with your own domain:

```sh
sudo certbot --nginx -d example.com
```

Certbot will automatically configure SSL for Nginx. Restart Nginx to apply changes:

```sh
sudo systemctl restart nginx
```

#### Auto-Renew SSL Certificates

Certbot automatically installs a renewal timer. Verify that it is active:

```sh
sudo systemctl status certbot.timer
```

### Step 5: Verify Installation

On your local machine, add this new server to your CLI config. Make sure to replace `example.com` with your own domain:

```bash
spacetime server add self-hosted --url https://example.com
```

If you have `/` restriction uncommented in Step 3 then you won't be able to publish to this instance unless you copy your module to the host first and then publish. We recommend something like this:

```bash
spacetime build
scp target/wasm32-unknown-unknown/release/spacetime_module.wasm ubuntu@<host>:/home/ubuntu/
ssh ubuntu@<host> spacetime publish -s local --bin-path spacetime_module.wasm <database-name>
```

You could put the above commands into a shell script to make publishing to your server easier and faster. It's also possible to integrate a script like this into Github Actions to publish on some event (like a PR merging into master).

### Step 6: Updating SpacetimeDB Version

To update SpacetimeDB to the latest version, first stop the service:

```sh
sudo systemctl stop spacetimedb
```

Then upgrade SpacetimeDB:

```sh
sudo -u spacetimedb -i -- spacetime --root-dir=/stdb version upgrade
```

To install a specific version, use:

```sh
sudo -u spacetimedb -i -- spacetime --root-dir=/stdb install <version-number>
```

Finally, restart the service:

```sh
sudo systemctl start spacetimedb
```

### Step 7: Troubleshooting

#### SpacetimeDB Service Fails to Start

Check the logs for errors:

```sh
sudo journalctl -u spacetimedb --no-pager | tail -20
```

Verify that the `spacetimedb` user has the correct permissions:

```sh
sudo ls -lah /stdb/spacetime
```

If needed, add the executable permission:

```sh
sudo chmod +x /stdb/spacetime
```

#### Let's Encrypt Certificate Renewal Issues

Manually renew the certificate and check for errors:

```sh
sudo certbot renew --dry-run
```

#### Nginx Fails to Start

Test the configuration:

```sh
sudo nginx -t
```

If errors are found, check the logs:

```sh
sudo journalctl -u nginx --no-pager | tail -20
```

## Standalone Configuration

A local database instance (as started by `spacetime start`) can be configured in `{data-dir}/config.toml`, where `{data-dir}` is the database's data directory. This directory is printed when you run `spacetime start`:

<pre class="shiki"><span>spacetimedb-standalone version: 1.0.0
spacetimedb-standalone path: /home/user/.local/share/spacetime/bin/1.0.0/spacetimedb-standalone
database running in data directory <b>/home/user/.local/share/spacetime/data</b></span></pre>

On Linux and macOS, this directory is by default `~/.local/share/spacetime/data`. On Windows, it's `%LOCALAPPDATA%\SpacetimeDB\data`.

### `config.toml`

- `certificate-authority`

- `logs`

- `module-http`

- `commitlog`

- `websocket`

#### `certificate-authority`

```toml
[certificate-authority]
jwt-priv-key-path = "/path/to/id_ecdsas"
jwt-pub-key-path = "/path/to/id_ecdsas.pub"
```

The `certificate-authority` table lets you configure the public and private keys used by the database to sign tokens.

#### `module-http`

```toml
[module-http]
enabled = false
```

The `module-http` table controls outbound HTTP requests initiated by database modules. Requests are enabled by default.
Setting `enabled` to `false` blocks outbound requests from procedures and module HTTP handlers. Inbound HTTP handlers remain unaffected.
Changing this setting requires restarting the server.

#### `logs`

```toml
[logs]
level = "error"
directives = [
    "spacetimedb=warn",
    "spacetimedb_standalone=info",
]
```

##### `logs.level`

Can be one of `"error"`, `"warn"`, `"info"`, `"debug"`, `"trace"`, or `"off"`, case-insensitive. Only log messages of the specified level or higher will be output; e.g. if set to `warn`, only `error` and `warn`-level messages will be logged.

##### `logs.directives`

A list of filtering directives controlling what messages get logged, which overwrite the global `logs.level`. See [`tracing documentation`](https://docs.rs/tracing-subscriber/0.3/tracing_subscriber/filter/struct.EnvFilter.html#directives) for syntax. Note that this is primarily intended as a debugging tool, and log message fields and targets are not considered stable.

#### `commitlog`

```toml
[commitlog]
log-format-version = 1
max-segment-size = 1073741824 # 1GiB
offset-index-interval-bytes = 4096
offset-index-require-segment-fsync = true
preallocate-segments = false
write-buffer-size = 131072 # 128KiB
```

The `commitlog` table configures local durability. These settings are advanced and may affect recovery behavior, disk usage, memory usage, and write throughput. Omitted fields use the server's built-in defaults.

##### `commitlog.log-format-version`

The maximum supported commitlog format version, also used for writing.

**Caution:**

This setting should not normally be changed from the commitlog crate's default. A reason to change it could be to make the server accept an older, incompatible commitlog.

##### `commitlog.max-segment-size`

The maximum size in bytes to which commitlog segments should be allowed to grow.

##### `commitlog.offset-index-interval-bytes`

Number of bytes written to the commitlog after which an entry is added to the offset index.

##### `commitlog.offset-index-require-segment-fsync`

If `true`, require that the segment must be synced to disk before an index entry is added.

Setting this to `false` will update the index every `offset-index-interval-bytes`, even if the commitlog was not synced. This means that the index could contain non-existent entries in the event of a crash.

Setting this to `true` will update the index when the commitlog is synced, and `offset-index-interval-bytes` have been written. This means that the index could contain fewer index entries than strictly every `offset-index-interval-bytes`.

**Note:**

The commitlog operates correctly under both settings, but the choice can have performance implications.

##### `commitlog.preallocate-segments`

If `true`, preallocate disk space for commitlog segments up to `commitlog.max-segment-size`. This has no effect unless commitlog fallocate support is enabled.

##### `commitlog.write-buffer-size`

Size in bytes of the memory buffer holding commit data before flushing to storage.

#### `websocket`

```toml
[websocket]
ping-interval = "15s"
idle-timeout = "30s"
close-handshake-timeout = "250ms"
incoming-queue-length = 2048
```

##### `websocket.ping-interval`

Interval at which the server will send `Ping` frames to keep the connection alive.
Should be smaller than `websocket.idle-timeout` to be effective.

Values are strings of any format the [`humantime`] crate can parse.

##### `websocket.idle-timeout`

If the server hasn't received any data from the client (including `Pong` responses to previous `Ping`s it sent), it will consider the client unresponsive and close the connection.
Should be greater than `websocket.ping-interval` to be effective.

Values are strings of any format the [`humantime`] crate can parse.

##### `websocket.close-handshake-timeout`

Time the server waits for the client to respond to a graceful connection close. If the client doesn't respond within this timeout, the connection is dropped.

Values are strings of any format the [`humantime`] crate can parse.

##### `websocket.incoming-queue-length`

Maximum number of client messages the server will queue up in case it is not able to process them quickly enough. When the queue length exceeds this value, the server will start disconnecting clients.
Note that the limit is per client, not across all clients of a particular database.

[`humantime`]: https://crates.io/crates/humantime

## Troubleshooting

This is a list of common problems when using SpacetimeDB and how to fix them.

### Credentials

#### CLI login not accepted by server

If your CLI operations fail with the error `Invalid Token: InvalidSignature`, it's likely because you logged in with `--server-issued-login` from a different SpacetimeDB server. It's also possible your server's signing keys have changed, most likely due to the server having been reset.

Log out to remove the invalid token, then log in again. Logging in with GitHub or Google will prevent this happening again, as those identities are portable and valid with any SpacetimeDB server, including Maincloud.

```bash
spacetime logout
spacetime login
```

**Danger:**

`spacetime logout` will discard your previous server-issued token, resulting in you no longer being able to manage any databases you previously published owned by that identity. If you still need access to the server-issued token, view it with `spacetime login show --token` and save it. You can then log back in with that token using `spacetime login --token`.

#### Lost access to a local database after `spacetime login`

If commands like `spacetime publish`, `spacetime call` or `spacetime delete` stop working for a local database after you ran `spacetime login`, the database is probably owned by a server-issued identity that the login replaced.

This happens when you publish to a local server before logging in. If the CLI has no token and doesn't log you in with spacetimedb.com (for example because you passed `-y`), it logs in directly to the local server instead and prints:

```
We have logged in directly to your target server.
WARNING: This login will NOT work for any other servers.
```

The database you publish is then owned by that server-issued identity. The CLI keeps only one login. A later `spacetime login` discards the server-issued token as soon as it starts, without asking and before you finish logging in, and the new identity isn't the database's owner.

To avoid this, run `spacetime login` before you publish anything. A GitHub or Google login works with any SpacetimeDB server, including your local one and Maincloud, so one login can own your local and Maincloud databases.

If you have already published with a server-issued identity and want to switch to your spacetimedb.com login:

1. Save the server-issued token: `spacetime login show --token`.
2. Run `spacetime login`.
3. To manage the old database, log back in with the saved token (`spacetime login --token <token>`), or delete the database while logged in with it and publish it again with your spacetimedb.com login. Deleting a database deletes its data.

If the server-issued token is already gone, it can't be recovered. Publish the module again under a new database name.

#### Client connection rejected

If SpacetimeDB rejects connections from your application's client, it's most likely because you're supplying a token that was issued by a different SpacetimeDB server, or has expired. Clear the invalid token:

| Client SDK                       | How to clear                                                                                                                                                                                            |
|----------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Rust (native)                    | Delete the credentials file for your application from within `~/.spacetimedb_client_credentials`. Check where you construct the `spacetimedb_sdk::credentials::File` to find which file to delete.      |
| C# (native)                      | Delete the `auth_token=` line from your app's saved settings, by default located in `~/.spacetime_csharp_sdk/settings.ini`. Check your call to `AuthToken.Init` to find the directory and/or file name. |
| TypeScript, Rust or C# (browser) | Clear cookies.                                                                                                                                                                                          |
| Unity                            | Clear PlayerPrefs by selecting **Edit -> Clear All PlayerPrefs**                                                                                                                                        |
| Unreal                           | Delete the file `Saved/Config/WindowsEditor/GameUserSettings.ini` in your Unreal project.                                                                                                               |

### In Modules

#### Identity seen by reducers never changes

In module code, `ctx.identity()` (or `Ctx.Identity()`) reads the identity of the database, not of the connected client. Call `ctx.sender()`/`Ctx.Sender()` instead to read the identity of the client which requested the current function call.

As of SpacetimeDB 2.3.0, the `identity` method is a  deprecated alias for `ctx.database_identity()`/`ctx.databaseIdentity()`/`Ctx.DatabaseIdentity()`.

#### Code changes not taking effect

If you've made changes to your module code that aren't taking effect, you likely need to publish the new version of the code to the database. Use the `spacetime publish` CLI command, or run `spacetime dev`, which will watch your project and automatically call `spacetime publish` whenever you make changes.

### In Clients

#### Connection completely unresponsive

If your `DbConnection` is completely unresponsive, with function calls never receiving responses and subscriptions never being applied, you may have one of several issues:

##### Connection rejected

Your client may have failed to connect to the remote server, or may have been disconnected soon after starting. Make sure you register `on_connect_error`/`onConnectError`/`OnConnectError` and `on_disconnect`/`onDisconnect`/`OnDisconnect` callbacks when building your `DbConnection`, and check if they're being invoked with errors.

##### Connection not advancing

You may need to advance your connection by calling one of the following methods:

| Client SDK          | Method                                            | Description                                                                                                                      |
|---------------------|---------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------|
| Rust (native only)  | `conn.run_threaded()`                             | Spawn a thread to continuously advance the connection.                                                                           |
| Rust (browser only) | `conn.run_background_task()`                      | Spawn a task to continuously advance the connection.                                                                             |
| Rust                | `conn.run_async()`                                | A `Future` which you can `await` or poll to advance the connection.                                                              |
| Rust                | `conn.frame_tick()`                               | In single-threaded games, call this every frame to advance the connection.                                                       |
| C#                  | `Conn.FrameTick()`                                | In native C# clients, call this from your game or application update loop. If you use a separate loop, keep `Conn.Db` access on that same thread or synchronize access. |
| Unity               | `SpacetimeDBNetworkManager` or `Conn.FrameTick()` | The Unity package can advance connections automatically when a single `SpacetimeDBNetworkManager` component is present in the scene. If you manage the loop yourself, call `FrameTick()` every frame. |
| Unreal              | `Conn->FrameTick()` or `Conn->SetAutoTicking(true)` | Call `FrameTick()` every frame, or enable auto-ticking once after building the connection.                                        |
| TypeScript          | N/a                                               | The TypeScript client SDK advances connections automatically.                                                                    |

#### Rows never appear

If rows from a table or view never appear and row callbacks are never invoked, you may need to add a subscription, or a subscription may have failed.

##### Add a subscription

In order for rows to be visible to a client, you must subscribe to a table or view. See Subscriptions.

##### Check for subscription errors

If you've subscribed to a subscription but never see any rows, your subscription may have failed. Ensure you're registering an `on_error`/`onError`/`OnError` callback with the subscription builder, and check if it is invoked.

#### Insert, update or delete callback not invoked when row changes

For a table or view with a primary key, a row change may be routed to either the on-insert, on-update or on-delete callback. Each change will only cause one of these callbacks to be invoked, so make sure you've registered all three of them.

**Note:**

Insert, update and delete callbacks on the client don't always correspond 1-to-1 with calls to those methods in the module code.

The client may see an update event when you call delete followed by insert within the same reducer or transaction.

The client may see an insert or a delete event when you call update but either the old or new version of the row doesn't match the client's subscriptions.

For tables without primary keys, only the on-insert and on-delete callbacks will ever be invoked.

#### Row seen by update callback is out of date

If it appears that an on-update callback is observing an old version of a row, you may have mixed up the parameters to that callback. Update callbacks take three parameter: an `EventContext` for interacting with the connection, the old version of the row, and the new version of the row. Make sure the function you register to the callback has 3 arguments:`(ctx, old, new)`.

#### Serialization errors

If you see errors related to serialization, including unexpected EOFs, incorrect lengths or unrecognized tags, it's likely your generated `module_bindings` are out of date. Re-run `spacetime generate` to update them, or use `spacetime dev`, which will watch your module code and automatically call `spacetime generate` whenever you make changes.

#### Reducers, procedures, views not visible to client

Scheduled reducers or procedures won't show up in client codegen. That's expected; clients can't directly invoke them.

If functions that aren't scheduled aren't showing up, or views aren't visible, it's likely your generated `module_bindings` are out of date. Re-run `spacetime generate` to update them, or use `spacetime dev`, which will watch your module code and automatically call `spacetime generate` whenever you make changes.

#### Tables not visible to client

If a table isn't visible in client codegen, and you've already run `spacetime generate` or are using `spacetime dev`, the table may be private. Only tables marked public will be visible to clients and are available for subscriptions. See Defining Tables for how to mark a table public.

#### Compilation or type errors in generated `module_bindings`

If you see errors when compiling or type checking your autogenerated `module_bindings`, it's likely that your SpacetimeDB CLI version doesn't match the client SDK you're using in your client project.

Ensure that your CLI is up to date by running `spacetime version upgrade`, then check your version with `spacetime --version`.

Update to the latest version of the CLI package in your client dependencies:

| Client SDK | Dependency file       | Package name                       |
|------------|-----------------------|------------------------------------|
| Rust       | `Cargo.toml`          | `spacetimedb-sdk`                  |
| TypeScript | `package.json`        | `"spacetimedb"`                    |
| C#         | `<project>.csproj`    | `"SpacetimeDB.ClientSDK"`          |
| Unity      | Unity Package Manager | `com.clockworklabs.spacetimedbsdk` |
| Unreal     | `<Game>.Build.cs`     | `"SpacetimeDbSdk"`                 |
