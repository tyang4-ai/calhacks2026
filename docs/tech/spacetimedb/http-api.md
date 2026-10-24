# SpacetimeDB HTTP API: authorization, identity, /v1/database, SATS-JSON

> Sources:
> - https://github.com/clockworklabs/SpacetimeDB/blob/v2.13.0/docs/docs/00300-resources/00200-reference/00200-http-api/00100-authorization.md
> - https://github.com/clockworklabs/SpacetimeDB/blob/v2.13.0/docs/docs/00300-resources/00200-reference/00200-http-api/00200-identity.md
> - https://github.com/clockworklabs/SpacetimeDB/blob/v2.13.0/docs/docs/00300-resources/00200-reference/00200-http-api/00300-database.md
> - https://github.com/clockworklabs/SpacetimeDB/blob/v2.13.0/docs/docs/00300-resources/00200-reference/00300-internals/00200-sats-json.md
> Fetched: 2026-10-24.
>
> From the clockworklabs/SpacetimeDB repo at tag v2.13.0 (Oct 19, 2026), the release that install.spacetimedb.com installs today.
> Only the TypeScript tabs are kept. The Rust, C#, C++ and Unreal versions are on spacetimedb.com.
> The environment-variable endpoints and headers are left out.
> Key facts for the Python bridge: a reducer call is `POST /v1/database/<db>/call/<reducer>` with a JSON array of the arguments in order. SQL is `POST /v1/database/<db>/sql` with the raw SQL text as the body. It returns `[{"schema": ..., "rows": [...]}]`, where each row is an array in column order. Requests with no Authorization header get a fresh anonymous identity and can read only public tables.

#### Generating identities and tokens

SpacetimeDB can derive an identity from the `sub` and `iss` claims of any [OpenID Connect](https://openid.net/developers/how-connect-works/) compliant [JSON Web Token](https://jwt.io/).

Clients can request a new identity and token signed by the SpacetimeDB host via the `POST /v1/identity` HTTP endpoint. Such a token will not be portable to other SpacetimeDB clusters.

Alternately, a new identity and token will be generated during an anonymous connection via the WebSocket API, and passed to the client as an `IdentityToken` message.

#### `Authorization` headers

Many SpacetimeDB HTTP endpoints either require or optionally accept a token in the `Authorization` header. SpacetimeDB authorization headers are of the form `Authorization: Bearer ${token}`, where `token` is an [OpenID Connect](https://openid.net/developers/how-connect-works/) compliant [JSON Web Token](https://jwt.io/), such as the one returned from the `POST /v1/identity` HTTP endpoint.

All `/v1/database` endpoints support anonymous access. If no `Authorization` header is provided, SpacetimeDB will allocate a new anonymous identity for the request. Anonymous requests can access public information (database info, schemas, names) and can call reducers or run SQL queries, but will only have access to public tables and will be rejected when attempting privileged operations like deleting a database or viewing logs.

## Top level routes

| Route                         | Description                                            |
| ----------------------------- | ------------------------------------------------------ |
| `GET /v1/ping` | No-op. Used to determine whether a client can connect. |

### `GET /v1/ping`

Does nothing and returns no data. Clients can send requests to this endpoint to determine whether they are able to connect to SpacetimeDB.

## `/v1/identity`

The HTTP endpoints in `/v1/identity` allow clients to generate and manage Spacetime public identities and private tokens.

### At a glance

| Route                                                                      | Description                                                        |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `POST /v1/identity`                                    | Generate a new identity and token.                                 |
| `POST /v1/identity/websocket-token`     | Generate a short-lived access token for use in untrusted contexts. |
| `GET /v1/identity/public-key`                 | Get the public key used for verifying tokens.                      |
| `GET /v1/identity/:identity/databases` | List databases owned by an identity.                               |
| `GET /v1/identity/:identity/verify`       | Verify an identity and token.                                      |

### `POST /v1/identity`

Create a new identity.

##### Returns

Returns JSON in the form:

```typescript
{
    "identity": string,
    "token": string
}
```

### `POST /v1/identity/websocket-token`

Generate a short-lived access token which can be used in untrusted contexts, e.g. embedded in URLs.

##### Required Headers

| Name            | Value                                                                         |
| --------------- | ----------------------------------------------------------------------------- |
| `Authorization` | A Spacetime token encoded as Bearer authorization. |

##### Returns

Returns JSON in the form:

```typescript
{
    "token": string
}
```

The `token` value is a short-lived [JSON Web Token](https://datatracker.ietf.org/doc/html/rfc7519).

### `GET /v1/identity/public-key`

Fetches the public key used by the database to verify tokens.

##### Returns

Returns a response of content-type `application/pem-certificate-chain`.

### `GET /v1/identity/:identity/databases`

List all databases owned by an identity.

##### Parameters

| Name        | Value                 |
| ----------- | --------------------- |
| `:identity` | A Spacetime identity. |

##### Returns

Returns JSON in the form:

```typescript
{
    "identities": array<string>
}
```

The `identities` value is an array of zero or more strings, each of which is the identity of a database owned by the identity passed as a parameter.

### `GET /v1/identity/:identity/verify`

Verify the validity of an identity/token pair.

##### Parameters

| Name        | Value                   |
| ----------- | ----------------------- |
| `:identity` | The identity to verify. |

##### Required Headers

| Name            | Value                                                                         |
| --------------- | ----------------------------------------------------------------------------- |
| `Authorization` | A Spacetime token encoded as Bearer authorization. |

##### Returns

Returns no data.

If the token is valid and matches the identity, returns `204 No Content`.

If the token is valid but does not match the identity, returns `400 Bad Request`.

If the token is invalid, or no `Authorization` header is included in the request, returns `401 Unauthorized`.

## `/v1/database`

The HTTP endpoints in `/v1/database` allow clients to interact with Spacetime databases in a variety of ways, including retrieving information, creating and deleting databases, invoking reducers and evaluating SQL queries. These APIs are intended primarily for management, debugging and interactive developer use, and have not been optimized for performance to the same extent as the WebSocket API used by the SpacetimeDB client SDKs.

### At a glance

| Route                                                                                              | Description                                       |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `POST /v1/database`                                                            | Publish a new database given its module code.     |
| `PUT /v1/database/:name_or_identity`                            | Publish to a database given its module code.      |
| `GET /v1/database/:name_or_identity`                            | Get a JSON description of a database.             |
| `DELETE /v1/database/:name_or_identity`                      | Delete a database.                                |
| `GET /v1/database/:name_or_identity/names`                 | Get the names this database can be identified by. |
| `POST /v1/database/:name_or_identity/names`               | Add a new name for this database.                 |
| `PUT /v1/database/:name_or_identity/names`                 | Set the list of names for this database.          |
| `GET /v1/database/:name_or_identity/identity`           | Get the identity of a database.                   |
| `GET /v1/database/:name_or_identity/subscribe`         | Begin a WebSocket connection.                     |
| `POST /v1/database/:name_or_identity/call/:reducer` | Invoke a reducer OR procedure in a database.      |
| `GET /v1/database/:name_or_identity/schema`               | Get the schema for a database.                    |
| `GET /v1/database/:name_or_identity/environment`     | Get environment declarations and stored keys.     |
| `PUT /v1/database/:name_or_identity/environment`     | Replace a database's environment.                 |
| `PATCH /v1/database/:name_or_identity/environment` | Set or delete environment values.                 |
| `GET /v1/database/:name_or_identity/logs`                   | Retrieve logs from a database.                    |
| `POST /v1/database/:name_or_identity/sql`                   | Run a SQL query against a database.               |
| `ANY /v1/database/:name_or_identity/route/{*path}`     | Access database-defined HTTP APIs.                |

### `POST /v1/database`

Publish a new database with no name.

Accessible through the CLI as `spacetime publish`.

##### Optional Headers

| Name                           | Value                                                                                                                                               |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Authorization`                | A Spacetime token as Bearer auth.                                                                 |
| `spacetime-environment`        | One `KEY=VALUE` environment value. Repeat the header for each value. See Publishing with environment values. |
| `spacetime-environment-remove` | Stored environment keys to delete, or `*` to replace the whole environment.                                                                         |

If no `Authorization` header is provided, a new anonymous identity will be created and will own the new database. This is generally not what you want.

##### Data

A WebAssembly module in the [binary format](https://webassembly.github.io/spec/core/binary/index.html). To publish with environment values, see Publishing with environment values.

##### Returns

If the database was successfully published, returns JSON in the form:

```typescript
{ "Success": {
    "database_identity": string,
    "op": "created" | "updated"
} }
```

### `PUT /v1/database/:name_or_identity`

Publish to a database with the specified name or identity. If the name does not exist, creates a new database.

Accessible through the CLI as `spacetime publish`.

##### Query Parameters

| Name    | Value                                                                             |
| ------- | --------------------------------------------------------------------------------- |
| `clear` | A boolean; whether to clear any existing data when updating an existing database. |

##### Optional Headers

| Name                           | Value                                                                                                                                               |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Authorization`                | A Spacetime token as Bearer auth.                                                                 |
| `spacetime-environment`        | One `KEY=VALUE` environment value. Repeat the header for each value. See Publishing with environment values. |
| `spacetime-environment-remove` | Stored environment keys to delete, or `*` to replace the whole environment.                                                                         |

If no `Authorization` header is provided, a new anonymous identity will be created. When updating an existing database, the token must correspond to the database's owner, or the request will be rejected.

##### Data

A WebAssembly module in the [binary format](https://webassembly.github.io/spec/core/binary/index.html). To publish with environment values, see Publishing with environment values.

##### Returns

If the database was successfully published, returns JSON in the form:

```typescript
{ "Success": {
    "domain": null | string,
    "database_identity": string,
    "op": "created" | "updated"
} }
```

If a database with the given name exists, but the identity provided in the `Authorization` header does not have permission to edit it, returns `401 UNAUTHORIZED` along with JSON in the form:

```typescript
{ "PermissionDenied": {
    "name": string
} }
```

#### Publishing with environment values

Both publish endpoints accept environment values in headers, alongside the module in the body. Send one `spacetime-environment` header per value, in the form `KEY=VALUE`:

```
spacetime-environment: API_KEY=development-only-key
spacetime-environment: MODE=development
```

Values are written like shell or `.env` assignments:

- A bare value, such as `API_KEY=abc123`, is taken literally. It cannot contain spaces, tabs, quotes, `,` or `\`.
- A single-quoted value, such as `GREETING='hello, world'`, is taken literally up to the closing quote. It cannot contain `'`.
- A double-quoted value, such as `PEM="line1\nline2"`, supports JSON string escapes, as in `.env` files: `\"`, `\\`, `\n`, `\t`, and `\uXXXX` for other control characters and non-ASCII characters, which cannot appear raw in a header.

Unlike a shell, the server does not expand variables. Values that break these rules, such as `GREETING=hello world`, are rejected with `400 Bad Request`. The server also accepts several values in one header, separated by commas outside quotes.

Formally, in [ABNF](https://www.rfc-editor.org/rfc/rfc5234), using the list syntax (`#`) from [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110#section-5.6.1):

```text
spacetime-environment = #assignment
assignment    = key "=" value
key           = ( ALPHA / "_" ) *( ALPHA / DIGIT / "_" )
value         = bare / single-quoted / double-quoted
bare          = *( %x21 / %x23-26 / %x28-2B / %x2D-5B / %x5D-7E )
                ; visible ASCII except " ' , \
single-quoted = "'" *( HTAB / %x20-26 / %x28-7E ) "'"
                ; taken literally
double-quoted = DQUOTE *( %x20-21 / %x23-5B / %x5D-7E / escape ) DQUOTE
escape        = "\" ( DQUOTE / "\" / "/" / %x62 / %x66 / %x6E / %x72 / %x74 / %x75 4HEXDIG )
                ; \" \\ \/ \b \f \n \r \t \uXXXX, lowercase only, as in JSON
                ; strings (RFC 8259). A \u escape of a UTF-16 high surrogate must be
                ; followed by one of a low surrogate, and a low surrogate cannot
                ; appear on its own.

spacetime-environment-remove = #( "*" / key )
                ; "*" must be the only element
```

Keys are at most 256 bytes and values at most 8 KiB. A key cannot appear twice across all `spacetime-environment` headers.

Supplied values override stored values with the same key, and stored values that are not supplied are kept. To delete stored values, list their keys in a `spacetime-environment-remove` header, separated by commas (`OLD_KEY, _UNUSED`). To replace the whole environment with only the supplied values, send `spacetime-environment-remove: *`. A key cannot be both supplied and removed.

The server validates the resulting environment against the module's declarations and installs the module and the environment in one transaction. All required values must be present, and every declared value must satisfy its declaration. Invalid updates leave the database unchanged.

If a required value is missing, the server returns `400 Bad Request` with JSON that names the missing key, so clients can prompt for it and retry:

```json
{
  "EnvironmentError": { "MissingRequiredEnvironment": { "keys": ["API_KEY"] } }
}
```

A reset (`clear=true`) deletes all stored values, so the request must supply every required value again.

For example, to publish a module to a local server with `curl`, export `SPACETIME_TOKEN` with a token authorized to publish, then run:

```bash
curl --fail-with-body --request PUT \
  'http://127.0.0.1:3000/v1/database/env-example?host_type=wasm' \
  --header "Authorization: Bearer $SPACETIME_TOKEN" \
  --header 'spacetime-environment: API_KEY=development-only-key' \
  --header 'spacetime-environment: MODE=development' \
  --data-binary @module.wasm
```

To change environment values without publishing a module, use `PUT` or `PATCH /v1/database/:name_or_identity/environment`.

### `GET /v1/database/:name_or_identity`

Get a database's identity, owner identity, host type, number of replicas and a hash of its WASM module.

##### Returns

Returns JSON in the form:

```typescript
{
    "database_identity": string,
    "owner_identity": string,
    "host_type": "wasm",
    "initial_program": string
}
```

| Field                 | Type   | Meaning                                                          |
| --------------------- | ------ | ---------------------------------------------------------------- |
| `"database_identity"` | String | The Spacetime identity of the database.                          |
| `"owner_identity"`    | String | The Spacetime identity of the database's owner.                  |
| `"host_type"`         | String | The module host type; currently always `"wasm"`.                 |
| `"initial_program"`   | String | Hash of the WASM module with which the database was initialized. |

### `DELETE /v1/database/:name_or_identity`

Delete a database.

Accessible through the CLI as `spacetime delete <identity>`.

##### Optional Headers

| Name            | Value                                                                               |
| --------------- | ----------------------------------------------------------------------------------- |
| `Authorization` | A Spacetime token as Bearer auth. |

Deleting a database requires ownership. If no `Authorization` header is provided, the request will be treated as anonymous and will be rejected.

### `GET /v1/database/:name_or_identity/names`

Get the names this database can be identified by.

##### Returns

Returns JSON in the form:

```typescript
{ "names": array<string> }
```

where `<names>` is a JSON array of strings, each of which is a name which refers to the database.

### `POST /v1/database/:name_or_identity/names`

Add a new name for this database.

##### Optional Headers

| Name            | Value                                                                               |
| --------------- | ----------------------------------------------------------------------------------- |
| `Authorization` | A Spacetime token as Bearer auth. |

If no `Authorization` header is provided, the request will be treated as anonymous.

##### Data

Takes as the request body a string containing the new name of the database.

##### Returns

If the name was successfully set, returns JSON in the form:

```typescript
{ "Success": {
    "domain": string,
    "database_result": string
} }
```

If the new name already exists but the identity provided in the `Authorization` header does not have permission to edit it, returns JSON in the form:

```typescript
{ "PermissionDenied": {
    "domain": string
} }
```

### `PUT /v1/database/:name_or_identity/names`

Set the list of names for this database.

##### Optional Headers

| Name            | Value                                                                               |
| --------------- | ----------------------------------------------------------------------------------- |
| `Authorization` | A Spacetime token as Bearer auth. |

Setting names requires ownership of the database. If no `Authorization` header is provided, the request will be treated as anonymous and will be rejected.

##### Data

Takes as the request body a list of names, as a JSON array of strings.

##### Returns

If the name was successfully set, returns JSON in the form:

```typescript
{ "Success": null }
```

If any of the new names already exist but the identity provided in the `Authorization` header does not have permission to edit it, returns `401 UNAUTHORIZED` along with JSON in the form:

```typescript
{ "PermissionDenied": null }
```

### `GET /v1/database/:name_or_identity/identity`

Get the identity of a database.

##### Returns

Returns a hex string of the specified database's identity.

### `GET /v1/database/:name_or_identity/subscribe`

Begin a WebSocket connection with a database.

##### Required Headers

For more information about WebSocket headers, see [RFC 6455](https://datatracker.ietf.org/doc/html/rfc6455).

| Name                     | Value                                                                 |
| ------------------------ | --------------------------------------------------------------------- |
| `Sec-WebSocket-Protocol` | `v1.bsatn.spacetimedb` or `v1.json.spacetimedb`                       |
| `Connection`             | `Upgrade`                                                             |
| `Upgrade`                | `websocket`                                                           |
| `Sec-WebSocket-Version`  | `13`                                                                  |
| `Sec-WebSocket-Key`      | A 16-byte value, generated randomly by the client, encoded as Base64. |

The SpacetimeDB binary WebSocket protocol, `v1.bsatn.spacetimedb`, encodes messages as well as reducer and row data using BSATN.
Its messages are defined [here](https://github.com/clockworklabs/SpacetimeDB/blob/master/crates/client-api-messages/src/websocket.rs).

The SpacetimeDB text WebSocket protocol, `v1.json.spacetimedb`, encodes messages according to the SATS-JSON format.

##### Optional Headers

| Name            | Value                                                                               |
| --------------- | ----------------------------------------------------------------------------------- |
| `Authorization` | A Spacetime token as Bearer auth. |

### `POST /v1/database/:name_or_identity/call/:reducer`

Invoke a reducer or procedure in a database.

##### Query Parameters

| Name | Value |
| ---- | ----- |
| `confirmed` | Optional boolean, default `true`. Wait for durability before returning success. For procedure calls, also wait after each successful `withTx`, before procedure code continues. Set to `false` to allow results from state that has committed in memory but may be lost after a crash.

##### Path parameters

| Name       | Value                                 |
| ---------- | ------------------------------------- |
| `:reducer` | The name of the reducer OR procedure. |

##### Optional Headers

| Name            | Value                                                                               |
| --------------- | ----------------------------------------------------------------------------------- |
| `Authorization` | A Spacetime token as Bearer auth. |

If no `Authorization` header is provided, the request will be treated as anonymous. The caller's identity is passed to the reducer via its `ReducerContext`, and the module may accept or reject the call based on that identity.

##### Data

A JSON array of arguments to the reducer.

### `GET /v1/database/:name_or_identity/schema`

Get a schema for a database.

Accessible through the CLI as `spacetime describe <name_or_identity>`.

##### Query Parameters

| Name      | Value                                            |
| --------- | ------------------------------------------------ |
| `version` | The version of `RawModuleDef` to return, e.g. 9. |

##### Optional Headers

| Name            | Value                                                                               |
| --------------- | ----------------------------------------------------------------------------------- |
| `Authorization` | A Spacetime token as Bearer auth. |

No authorization is required to fetch a database's schema. If an `Authorization` header is provided, the response will include `spacetime-identity` and `spacetime-identity-token` headers echoing the caller's identity. If omitted, a new anonymous identity will be allocated for this purpose.

##### Returns

Returns a `RawModuleDef` in JSON form.

<details>
<summary>Example response from `/schema?version=9` for the default module generated by `spacetime init`</summary>

```json
{
  "typespace": {
    "types": [
      {
        "Product": {
          "elements": [
            {
              "name": {
                "some": "name"
              },
              "algebraic_type": {
                "String": []
              }
            }
          ]
        }
      }
    ]
  },
  "tables": [
    {
      "name": "person",
      "product_type_ref": 0,
      "primary_key": [],
      "indexes": [],
      "constraints": [],
      "sequences": [],
      "schedule": {
        "none": []
      },
      "table_type": {
        "User": []
      },
      "table_access": {
        "Private": []
      }
    }
  ],
  "reducers": [
    {
      "name": "add",
      "params": {
        "elements": [
          {
            "name": {
              "some": "name"
            },
            "algebraic_type": {
              "String": []
            }
          }
        ]
      },
      "lifecycle": {
        "none": []
      }
    },
    {
      "name": "identity_connected",
      "params": {
        "elements": []
      },
      "lifecycle": {
        "some": {
          "OnConnect": []
        }
      }
    },
    {
      "name": "identity_disconnected",
      "params": {
        "elements": []
      },
      "lifecycle": {
        "some": {
          "OnDisconnect": []
        }
      }
    },
    {
      "name": "init",
      "params": {
        "elements": []
      },
      "lifecycle": {
        "some": {
          "Init": []
        }
      }
    },
    {
      "name": "say_hello",
      "params": {
        "elements": []
      },
      "lifecycle": {
        "none": []
      }
    }
  ],
  "types": [
    {
      "name": {
        "scope": [],
        "name": "Person"
      },
      "ty": 0,
      "custom_ordering": true
    }
  ],
  "misc_exports": [],
  "row_level_security": []
}
```

</details>

### `GET /v1/database/:name_or_identity/logs`

Retrieve logs from a database.

Accessible through the CLI as `spacetime logs <name_or_identity>`.

##### Query Parameters

| Name        | Value                                                           |
| ----------- | --------------------------------------------------------------- |
| `num_lines` | Number of most-recent log lines to retrieve.                    |
| `follow`    | A boolean; whether to continue receiving new logs via a stream. |

##### Optional Headers

| Name            | Value                                                                               |
| --------------- | ----------------------------------------------------------------------------------- |
| `Authorization` | A Spacetime token as Bearer auth. |

Viewing logs requires ownership of the database. If no `Authorization` header is provided, the request will be treated as anonymous and will be rejected.

##### Returns

Text, or streaming text if `follow` is supplied, containing log lines.

### `POST /v1/database/:name_or_identity/sql`

Run a SQL query against a database.

Accessible through the CLI as `spacetime sql <name_or_identity> <query>`.

##### Optional Headers

| Name            | Value                                                                               |
| --------------- | ----------------------------------------------------------------------------------- |
| `Authorization` | A Spacetime token as Bearer auth. |

If no `Authorization` header is provided, the request will be treated as anonymous and will only have access to public tables. The caller's identity is used to enforce row-level security policies.

##### Data

SQL queries, separated by `;`.

##### Returns

Returns a JSON array of statement results, each of which takes the form:

```typescript
{
    "schema": ProductType,
    "rows": array
}
```

The `schema` will be a JSON-encoded `ProductType` describing the type of the returned rows.

The `rows` will be an array of JSON-encoded `ProductValue`s, each of which conforms to the `schema`.

### `ANY /v1/database/:name_or_identity/route/{*path}`

Access routes defined by a database using HTTP handlers.

## SATS-JSON Data Format

The Spacetime Algebraic Type System JSON format defines how Spacetime `AlgebraicType`s and `AlgebraicValue`s are encoded as JSON. Algebraic types and values are JSON-encoded for transport via the HTTP Databases API and the WebSocket text protocol. Note that SATS-JSON is not self-describing, and so a SATS value represented in JSON requires knowing the value's schema to meaningfully understand it - for example, it's not possible to tell whether a JSON object with a single field is a `ProductValue` with one element or a `SumValue`.

### Values

#### At a glance

| Type             | Description                                                      |
| ---------------- | ---------------------------------------------------------------- |
| `AlgebraicValue` | A value whose type may be any `AlgebraicType`. |
| `SumValue`       | A value whose type is a `SumType`.                   |
| `ProductValue`   | A value whose type is a `ProductType`.           |
| `BuiltinValue`   | A value whose type is a `BuiltinType`.           |
|                  |                                                                  |

#### `AlgebraicValue`

```json
SumValue | ProductValue | BuiltinValue
```

#### `SumValue`

An instance of a `SumType`. `SumValue`s are encoded as a JSON object with a single key, a non-negative integer tag which identifies the variant. The value associated with this key is the variant data. Variants which hold no data will have an empty array as their value.

The tag is an index into the `SumType.variants` array of the value's `SumType`.

```json
{
    "<tag>": AlgebraicValue
}
```

The tag may also be the name of one of the variants.

#### `ProductValue`

An instance of a `ProductType`. `ProductValue`s are encoded as JSON arrays. Each element of the `ProductValue` array is of the type of the corresponding index in the `ProductType.elements` array of the value's `ProductType`.

```json
array<AlgebraicValue>
```

`ProductValue`s may also be encoded as a JSON object with the keys as the field
names of the `ProductValue` and the values as the corresponding
`AlgebraicValue`s.

#### `BuiltinValue`

An instance of a `BuiltinType`. `BuiltinValue`s are encoded as JSON values of corresponding types.

```json
boolean | number | string | array<AlgebraicValue> | map<AlgebraicValue, AlgebraicValue>
```

| `BuiltinType` | JSON type                             |
| ----------------------------- | ------------------------------------- |
| `Bool`                        | `boolean`                             |
| Integer types                 | `number`                              |
| Float types                   | `number`                              |
| `String`                      | `string`                              |
| Array types                   | `array<AlgebraicValue>`               |
| Map types                     | `map<AlgebraicValue, AlgebraicValue>` |

All SATS integer types are encoded as JSON `number`s, so values of 64-bit and 128-bit integer types may lose precision when encoding values larger than 2⁵².

### Types

All SATS types are JSON-encoded by converting them to an `AlgebraicValue`, then JSON-encoding that meta-value.

#### At a glance

| Type                                    | Description                                                                          |
| --------------------------------------- | ------------------------------------------------------------------------------------ |
| `AlgebraicType`       | Any SATS type.                                                                       |
| `SumType`                   | Sum types, i.e. tagged unions.                                                       |
| `ProductType`           | Product types, i.e. structures.                                                      |
| `BuiltinType`           | Built-in and primitive types, including booleans, numbers, strings, arrays and maps. |
| `AlgebraicTypeRef` | An indirect reference to a type, used to implement recursive types.                  |

##### `AlgebraicType`

`AlgebraicType` is the most general meta-type in the Spacetime Algebraic Type System. Any SATS type can be represented as an `AlgebraicType`. `AlgebraicType` is encoded as a tagged union, with variants for `SumType`, `ProductType`, `BuiltinType` and `AlgebraicTypeRef`.

```json
{ "Sum": SumType }
| { "Product": ProductType }
| { "Builtin": BuiltinType }
| { "Ref": AlgebraicTypeRef }
```

##### `SumType`

The meta-type `SumType` represents sum types, also called tagged unions or Rust `enum`s. A sum type has some number of variants, each of which has an `AlgebraicType` of variant data, and an optional string discriminant. For each instance, exactly one variant will be active. The instance will contain only that variant's data.

A `SumType` with zero variants is called an empty type or never type because it is impossible to construct an instance.

Instances of `SumType`s are `SumValue`s, and store a tag which identifies the active variant.

```json
// SumType:
{
    "variants": array<SumTypeVariant>,
}

// SumTypeVariant:
{
    "algebraic_type": AlgebraicType,
    "name": { "some": string } | { "none": [] }
}
```

#### `ProductType`

The meta-type `ProductType` represents product types, also called structs or tuples. A product type has some number of fields, each of which has an `AlgebraicType` of field data, and an optional string field name. Each instance will contain data for all of the product type's fields.

A `ProductType` with zero fields is called a unit type because it has a single instance, the unit, which is empty.

Instances of `ProductType`s are `ProductValue`s, and store an array of field data.

```json
// ProductType:
{
    "elements": array<ProductTypeElement>,
}

// ProductTypeElement:
{
    "algebraic_type": AlgebraicType,
    "name": { "some": string } | { "none": [] }
}
```

#### `BuiltinType`

The meta-type `BuiltinType` represents SATS primitive types: booleans, integers, floating-point numbers, strings, arrays and maps. `BuiltinType` is encoded as a tagged union, with a variant for each SATS primitive type.

SATS integer types are identified by their signedness and width in bits. SATS supports the same set of integer types as Rust, i.e. 8, 16, 32, 64 and 128-bit signed and unsigned integers.

SATS floating-point number types are identified by their width in bits. SATS supports 32 and 64-bit floats, which correspond to [IEEE 754](https://en.wikipedia.org/wiki/IEEE_754) single- and double-precision binary floats, respectively.

SATS array and map types are homogeneous, meaning that each array has a single element type to which all its elements must conform, and each map has a key type and a value type to which all of its keys and values must conform.

```json
{ "Bool": [] }
| { "I8": [] }
| { "U8": [] }
| { "I16": [] }
| { "U16": [] }
| { "I32": [] }
| { "U32": [] }
| { "I64": [] }
| { "U64": [] }
| { "I128": [] }
| { "U128": [] }
| { "F32": [] }
| { "F64": [] }
| { "String": [] }
| { "Array": AlgebraicType }
| { "Map": {
      "key_ty": AlgebraicType,
      "ty": AlgebraicType,
  } }
```

#### `AlgebraicTypeRef`

`AlgebraicTypeRef`s are JSON-encoded as non-negative integers. These are indices into a typespace, like the one returned by the `GET /v1/database/:name_or_identity/schema` HTTP endpoint.
