# Agent Builder API reference: agents

> Sources:
> - https://www.elastic.co/docs/api/doc/kibana/group/endpoint-agent-builder
> - https://github.com/elastic/kibana/blob/main/oas_docs/output/kibana.serverless.yaml
> Fetched: 2026-10-24.
>
> Generated from the Kibana Serverless OpenAPI spec (main branch, Oct 24, 2026) for every path under `/api/agent_builder/agents`.
> Each operation lists its parameters, the request body fields, and the example requests and responses from the spec.
> Every call needs `Authorization: ApiKey <key>`. POST, PUT and DELETE also need `kbn-xsrf: true`. In a non-default space, prefix the path with `/s/<space_id>`.

### GET `/api/agent_builder/agents`

**List agents.** List all available agents. Use this endpoint to retrieve complete agent information including their current configuration and assigned tools. To learn more about agents, refer to the [agents documentation](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/agent-builder-agents).

[Required authorization] Route required privileges: agentBuilder:read.

Parameters:
- `include_hidden` (query, boolean): When true, hidden agents (such as built-in system agents) are included in the response.

Example response 200 (Example response that returns one built-in Elastic agent and one created by the user):
```json
{
  "results": [
    {
      "access_control": null,
      "configuration": {
        "tools": [
          {
            "tool_ids": [
              "platform.core.search",
              "platform.core.list_indices",
              "platform.core.get_index_mapping",
              "platform.core.get_document_by_id"
            ]
          }
        ]
      },
      "description": "Elastic AI Agent",
      "id": "elastic-ai-agent",
      "name": "Elastic AI Agent",
      "permissions": {
        "update_access_control": false,
        "update_agent": false,
        "update_approvals": false
      },
      "type": "chat"
    },
    {
      "access_control": {
        "access_mode": "private",
        "entries": [
          {
            "name": "alice",
            "role": "manager",
            "type": "user"
          }
        ]
      },
      "avatar_color": "#BFDBFF",
      "avatar_symbol": "SI",
      "configuration": {
        "instructions": "You are a custom agent that wants to help searching data using all indices starting with prefix \"content-\".",
        "tools": [
          {
            "tool_ids": [
              "platform.core.search",
              "platform.core.list_indices",
              "platform.core.get_index_mapping",
              "platform.core.get_document_by_id"
            ]
          }
        ]
      },
      "description": "Hi! I can help you search the data within the indices starting with \"content-\" prefix.",
      "id": "created-agent-id",
      "labels": [
        "custom-indices",
        "department-search"
      ],
      "name": "Search Index Helper",
      "permissions": {
        "update_access_control": true,
        "update_agent": true,
        "update_approvals": true
      },
      "type": "chat"
    }
  ]
}
```

### POST `/api/agent_builder/agents`

**Create an agent.** Create a new agent. Use this endpoint to define the agent's behavior, appearance, and capabilities through comprehensive configuration options. To learn more about agents, refer to the [agents documentation](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/agent-builder-agents).

[Required authorization] Route required privileges: agentBuilder:manageAgents.

Parameters:
- `kbn-xsrf` (header, string, required): A required header to protect against CSRF attacks

Request body:
- `access_control`, object
  - `access_mode`, string, required, one of `public`, `shared`, `private`: Access-control mode: `public` (any privileged user can read/write), `shared` (any privileged user can read, only owner can write), `private` (only owner can read/write). Agents created without an access-control mode default to `private`.
- `avatar_color`, string: Optional hex color code for the agent avatar.
- `avatar_symbol`, string: Optional symbol/initials for the agent avatar.
- `configuration`, object, required: Configuration settings for the agent.
  - `ai_indices`, array of string: Array of AI indices to associate with the agent.
  - `approvals`, object: Auto-approval defaults applied to every run of this agent.
    - `auto_approved_apis`, object: Destructive Elasticsearch or Kibana APIs this agent may call without a user confirmation, keyed by backend.
      - `elasticsearch`, array of string: Elasticsearch APIs pre-approved for every run of this agent. Each entry is an exact identifier formed from the namespace and name (for example `indices.create`), a namespace wildcard (for example `indices.*`), or `*` for every Elasticsearch API. Entries are not checked against the known APIs, and one that matches no API has no effect.
      - `kibana`, array of string: Kibana APIs pre-approved for every run of this agent. Each entry is an exact identifier formed from the namespace and name (for example `alerting.delete-alerting-rule-id`), a namespace wildcard (for example `alerting.*`), or `*` for every Kibana API. Entries are not checked against the known APIs, and one that matches no API has no effect.
  - `connector_ids`, array of string: Array of connector IDs to associate with the agent.
  - `enable_elastic_capabilities`, boolean: When true, enables built-in Elastic capabilities for the agent.
  - `instructions`, string: Optional system instructions that define the agent behavior.
  - `plugin_ids`, array of string: Array of plugin IDs to assign to the agent.
  - `post_execution_workflow_ids`, array of string
  - `skill_ids`, array of string: Array of skill IDs to be available to the agent.
  - `subagent_ids`, array of string: Allowlist of subagent IDs this agent may spawn. Missing or empty disables the `run_subagent` tool. Use '_self' to enable self-fork.
  - `tools`, array of object, required
    - `tool_ids`, array of string, required: Array of tool IDs that the agent can use.
  - `workflow_ids`, array of string
- `description`, string, required: Description of what the agent does.
- `id`, string, required: Unique identifier for the agent.
- `labels`, array of string: Optional labels for categorizing and organizing agents.
- `name`, string, required: Display name for the agent.

Example request (Example request for creating a custom agent with special prompt and tools):
```json
{
  "avatar_color": "#BFDBFF",
  "avatar_symbol": "SI",
  "configuration": {
    "instructions": "You are a custom agent that wants to help searching data using all indices starting with prefix \"content-\".",
    "tools": [
      {
        "tool_ids": [
          "platform.core.search",
          "platform.core.list_indices",
          "platform.core.get_index_mapping",
          "platform.core.get_document_by_id"
        ]
      }
    ]
  },
  "description": "Hi! I can help you search the data within the indices starting with \"content-\" prefix.",
  "id": "created-agent-id",
  "labels": [
    "custom-indices",
    "department-search"
  ],
  "name": "Search Index Helper"
}
```

Example response 200 (Example response returning the definition of an agent created as a result of the request):
```json
{
  "avatar_color": "#BFDBFF",
  "avatar_symbol": "SI",
  "configuration": {
    "instructions": "You are a custom agent that wants to help searching data using all indices starting with prefix \"content-\".",
    "tools": [
      {
        "tool_ids": [
          "platform.core.search",
          "platform.core.list_indices",
          "platform.core.get_index_mapping",
          "platform.core.get_document_by_id"
        ]
      }
    ]
  },
  "description": "Hi! I can help you search the data within the indices starting with \"content-\" prefix.",
  "id": "created-agent-id",
  "labels": [
    "custom-indices",
    "department-search"
  ],
  "name": "Search Index Helper",
  "type": "chat"
}
```

### POST `/api/agent_builder/agents/{agent_id}/consumption`

**Get agent consumption data.** Returns paginated, per-conversation token consumption data for a given agent. Includes input/output token counts, round counts, LLM call counts, and warnings for conversations with high token usage. Requires the manageAgents privilege. To learn more about monitoring agent token usage, refer to the [monitor usage documentation](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/monitor-usage).

[Required authorization] Route required privileges: agentBuilder:manageAgents.

Parameters:
- `kbn-xsrf` (header, string, required): A required header to protect against CSRF attacks
- `agent_id` (path, string, required): The unique identifier of the agent.

Request body:
- `has_warnings`, boolean: Filter to conversations with or without high-token warnings.
- `search`, string: Free-text search filter on conversation title.
- `search_after`, array of object: Cursor for pagination. Pass the search_after value from the previous response.
- `size`, number, default `25`: Number of results per page.
- `sort_field`, string, one of `updated_at`, `total_tokens`, `round_count`, default `"updated_at"`: Field to sort results by.
- `sort_order`, string, one of `asc`, `desc`, default `"desc"`: Sort direction.
- `usernames`, array of string: Filter results to conversations by these usernames.

Example request (Get consumption data for an agent with default pagination):
```json
{
  "size": 25,
  "sort_field": "updated_at",
  "sort_order": "desc"
}
```

Example request (Get consumption data filtered by username with warnings):
```json
{
  "has_warnings": true,
  "size": 10,
  "sort_field": "total_tokens",
  "sort_order": "desc",
  "usernames": [
    "elastic",
    "admin"
  ]
}
```

Example response 200 (Example response with per-conversation token usage data):
```json
{
  "aggregations": {
    "total_with_warnings": 0,
    "usernames": [
      "elastic",
      "admin"
    ]
  },
  "results": [
    {
      "conversation_id": "conv-abc123",
      "created_at": "2025-03-01T10:00:00Z",
      "llm_calls": 8,
      "round_count": 5,
      "title": "Help me search my data",
      "token_usage": {
        "input_tokens": 15000,
        "output_tokens": 3000,
        "total_tokens": 18000
      },
      "updated_at": "2025-03-01T10:15:00Z",
      "user": {
        "id": "uid-1",
        "username": "elastic"
      },
      "warnings": []
    },
    {
      "conversation_id": "conv-def456",
      "created_at": "2025-03-02T14:00:00Z",
      "llm_calls": 20,
      "round_count": 12,
      "title": "Analyze server logs",
      "token_usage": {
        "input_tokens": 250000,
        "output_tokens": 8000,
        "total_tokens": 258000
      },
      "updated_at": "2025-03-02T14:30:00Z",
      "user": {
        "id": "uid-2",
        "username": "admin"
      },
      "warnings": [
        {
          "input_tokens": 250000,
          "round_id": "round-7",
          "type": "high_input_tokens"
        }
      ]
    }
  ],
  "search_after": [
    1709391000000,
    "2025-03-02T14:30:00Z"
  ],
  "total": 2
}
```

### GET `/api/agent_builder/agents/{id}`

**Get an agent by ID.** Get a specific agent by ID. Use this endpoint to retrieve the complete agent definition including all configuration details and tool assignments. To learn more about agents, refer to the [agents documentation](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/agent-builder-agents).

[Required authorization] Route required privileges: agentBuilder:read.

Parameters:
- `id` (path, string, required): The unique identifier of the agent to retrieve.

Example response 200 (Example response that an agent created by the user that will query elasticsearch indices starting with 'content-' prefix to answer the questions.):
```json
{
  "access_control": {
    "access_mode": "private",
    "entries": [
      {
        "name": "alice",
        "role": "manager",
        "type": "user"
      }
    ]
  },
  "avatar_color": "#BFDBFF",
  "avatar_symbol": "SI",
  "configuration": {
    "instructions": "You are a custom agent that wants to help searching data using all indices starting with prefix \"content-\".",
    "tools": [
      {
        "tool_ids": [
          "platform.core.search",
          "platform.core.list_indices",
          "platform.core.get_index_mapping",
          "platform.core.get_document_by_id"
        ]
      }
    ]
  },
  "description": "Hi! I can help you search the data within the indices starting with \"content-\" prefix.",
  "id": "created-agent-id",
  "labels": [
    "custom-indices",
    "department-search"
  ],
  "name": "Search Index Helper",
  "permissions": {
    "update_access_control": true,
    "update_agent": true,
    "update_approvals": true
  },
  "type": "chat"
}
```

### PUT `/api/agent_builder/agents/{id}`

**Update an agent.** Update an existing agent configuration. Use this endpoint to modify any aspect of the agent's behavior, appearance, or capabilities. To learn more about agents, refer to the [agents documentation](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/agent-builder-agents).

[Required authorization] Route required privileges: agentBuilder:manageAgents.

Parameters:
- `kbn-xsrf` (header, string, required): A required header to protect against CSRF attacks
- `id` (path, string, required): The unique identifier of the agent to update.

Request body:
- `access_control`, object
  - `access_mode`, string, required, one of `public`, `shared`, `private`: Access-control mode: `public` (any privileged user can read/write), `shared` (any privileged user can read, only owner can write), `private` (only owner can read/write). Agents created without an access-control mode default to `private`.
- `avatar_color`, string: Updated hex color code for the agent avatar.
- `avatar_symbol`, string: Updated symbol/initials for the agent avatar.
- `configuration`, object: Updated configuration settings for the agent.
  - `ai_indices`, array of string: Array of AI indices to associate with the agent.
  - `approvals`, object: Auto-approval defaults applied to every run of this agent.
    - `auto_approved_apis`, object: Destructive Elasticsearch or Kibana APIs this agent may call without a user confirmation, keyed by backend.
      - `elasticsearch`, array of string: Elasticsearch APIs pre-approved for every run of this agent. Each entry is an exact identifier formed from the namespace and name (for example `indices.create`), a namespace wildcard (for example `indices.*`), or `*` for every Elasticsearch API. Entries are not checked against the known APIs, and one that matches no API has no effect.
      - `kibana`, array of string: Kibana APIs pre-approved for every run of this agent. Each entry is an exact identifier formed from the namespace and name (for example `alerting.delete-alerting-rule-id`), a namespace wildcard (for example `alerting.*`), or `*` for every Kibana API. Entries are not checked against the known APIs, and one that matches no API has no effect.
  - `connector_ids`, array of string: Array of connector IDs to associate with the agent.
  - `enable_elastic_capabilities`, boolean: When true, enables built-in Elastic capabilities for the agent.
  - `instructions`, string: Updated system instructions that define the agent behavior.
  - `plugin_ids`, array of string: Array of plugin IDs to assign to the agent.
  - `post_execution_workflow_ids`, array of string
  - `skill_ids`, array of string: Array of skill IDs to be available to the agent.
  - `subagent_ids`, array of string: Allowlist of subagent IDs this agent may spawn. Missing or empty disables the `run_subagent` tool. Use '_self' to enable self-fork.
  - `tools`, array of object
    - `tool_ids`, array of string, required: Array of tool IDs that the agent can use.
  - `workflow_ids`, array of string
- `description`, string: Updated description of what the agent does.
- `labels`, array of string: Updated labels for categorizing and organizing agents.
- `name`, string: Updated display name for the agent.

Example request (Example request for updating custom agent):
```json
{
  "avatar_color": "#BFDBFF",
  "avatar_symbol": "SI",
  "configuration": {
    "instructions": "You are a custom agent that wants to help searching data using all indices starting with prefix \"content-\".",
    "tools": [
      {
        "tool_ids": [
          "platform.core.search",
          "platform.core.list_indices",
          "platform.core.get_index_mapping",
          "platform.core.get_document_by_id"
        ]
      }
    ]
  },
  "description": "Updated description - Search for anything in \"content-*\" indices!",
  "id": "created-agent-id",
  "labels": [
    "custom-indices",
    "department-search",
    "elastic-employees"
  ],
  "name": "Search Index Helper"
}
```

Example response 200 (Example response returning the agent definition with the changes applied from the request):
```json
{
  "avatar_color": "#BFDBFF",
  "avatar_symbol": "SI",
  "configuration": {
    "instructions": "You are a custom agent that wants to help searching data using all indices starting with prefix \"content-\".",
    "tools": [
      {
        "tool_ids": [
          "platform.core.search",
          "platform.core.list_indices",
          "platform.core.get_index_mapping",
          "platform.core.get_document_by_id"
        ]
      }
    ]
  },
  "description": "Updated description - Search for anything in \"content-*\" indices!",
  "id": "created-agent-id",
  "labels": [
    "custom-indices",
    "department-search",
    "elastic-employees"
  ],
  "name": "Search Index Helper",
  "type": "chat"
}
```

### DELETE `/api/agent_builder/agents/{id}`

**Delete an agent.** Delete an agent by ID. This action cannot be undone. To learn more about agents, refer to the [agents documentation](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/agent-builder-agents).

[Required authorization] Route required privileges: agentBuilder:manageAgents.

Parameters:
- `kbn-xsrf` (header, string, required): A required header to protect against CSRF attacks
- `id` (path, string, required): The unique identifier of the agent to delete.

Example response 200 (Example response showing that deletion of the agent has been successful):
```json
{
  "success": true
}
```

### GET `/api/agent_builder/agents/{id}/access_control`

**Get an agent's access control list.** Get the access control for a specific agent. Callers without permission to manage access control receive `permissions.update_access_control: false` and only their own entry. To learn more about agents, refer to the [agents documentation](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/agent-builder-agents).

[Required authorization] Route required privileges: agentBuilder:read.

Parameters:
- `id` (path, string, required): The unique identifier of the agent whose access control to retrieve.

Example response 200 (Example response for a caller without manage permission — only the caller's own entry is returned.):
```json
{
  "access_control": {
    "access_mode": "private",
    "entries": [
      {
        "added_at": "2026-02-11T10:15:00.000Z",
        "id": "u_bob_profile_uid",
        "role": "user",
        "type": "user"
      }
    ]
  },
  "permissions": {
    "update_access_control": false
  }
}
```

Example response 200 (Example response for a caller who can manage access control — the agent has two grantees keyed on their Kibana user profile uid.):
```json
{
  "access_control": {
    "access_mode": "private",
    "entries": [
      {
        "added_at": "2026-02-11T10:15:00.000Z",
        "id": "u_alice_profile_uid",
        "role": "editor",
        "type": "user"
      },
      {
        "added_at": "2026-02-11T10:15:00.000Z",
        "id": "u_bob_profile_uid",
        "role": "user",
        "type": "user"
      }
    ]
  },
  "permissions": {
    "update_access_control": true
  }
}
```

Example response 404 (agentNotFoundResponseExample):
```json
{
  "attributes": {
    "trace_id": "8d4f2a3b-1c5e-4a9b-9f0d-2e6c1a3d4f5e"
  },
  "error": "Not Found",
  "message": "Agent custom-agent-id not found",
  "statusCode": 404
}
```

### PUT `/api/agent_builder/agents/{id}/access_control`

**Update an agent's access control list.** Replace the per-agent access-control entries. Each entry grants one user a role on this agent. Identify the user by their Kibana user profile uid (`id`). Entries created before profile uids were adopted may use `name` (deprecated) instead. The agent owner, cluster admins, and anyone access control grants Manager can call this endpoint. Each call replaces the entire entries list — the most recent successful update wins. To learn more about agents, refer to the [agents documentation](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/agent-builder-agents).

[Required authorization] Route required privileges: agentBuilder:manageAgents.

Parameters:
- `kbn-xsrf` (header, string, required): A required header to protect against CSRF attacks
- `id` (path, string, required): The unique identifier of the agent whose access control to update.

Request body:
- `entries`, array of object, required: Access-control entries to apply to the agent. Each entry has a `type` (for example `user`), a `role`, and either an `id` (the principal user profile uid, preferred) or a deprecated `name` (username).
  - `id`, string: Stable identifier of the user to grant access to (Kibana user profile uid). Preferred over `name`.
  - `name`, string: Case-sensitive Kibana username of the user to grant access to. Still supported, but `id` is preferred for new grants because a username cannot distinguish same-named users across authentication realms.
  - `role`, string, required, one of `user`, `editor`, `manager`: Role granted to the principal. Roles are hierarchical: `user` allows viewing, listing, reading, and running the agent; `editor` adds updating the agent configuration; `manager` adds deleting the agent and managing its access control.
  - `type`, string, required, one of `user`

Example request (Submit an empty entries list to remove all custom grants. Access then falls back to the agent's access-control mode.):
```json
{
  "entries": []
}
```

Example request (Example request granting two users access to the agent by their Kibana user profile uid — Alice as Editor (can update the agent configuration), Bob as User (can run the agent).):
```json
{
  "entries": [
    {
      "id": "u_alice_profile_uid",
      "role": "editor",
      "type": "user"
    },
    {
      "id": "u_bob_profile_uid",
      "role": "user",
      "type": "user"
    }
  ]
}
```

Example response 200 (Example response returning the persisted access control after the update.):
```json
{
  "access_mode": "private",
  "entries": [
    {
      "added_at": "2026-02-11T10:15:00.000Z",
      "id": "u_alice_profile_uid",
      "role": "editor",
      "type": "user"
    },
    {
      "added_at": "2026-02-11T10:15:00.000Z",
      "id": "u_bob_profile_uid",
      "role": "user",
      "type": "user"
    }
  ]
}
```

Example response 400 (The built-in Elastic default agent (`elastic-ai-agent`) cannot have custom access control — its access is governed by the platform, not per-agent grants.):
```json
{
  "attributes": {
    "trace_id": "8d4f2a3b-1c5e-4a9b-9f0d-2e6c1a3d4f5e"
  },
  "error": "Bad Request",
  "message": "The default agent (elastic-ai-agent) does not support custom access controls.",
  "statusCode": 400
}
```

Example response 400 (Request body exceeds the 100-entry maximum.):
```json
{
  "error": "Bad Request",
  "message": "[request body.entries]: array size is [101], but cannot be greater than [100]",
  "statusCode": 400
}
```

Example response 404 (agentNotFoundResponseExample):
```json
{
  "attributes": {
    "trace_id": "8d4f2a3b-1c5e-4a9b-9f0d-2e6c1a3d4f5e"
  },
  "error": "Not Found",
  "message": "Agent custom-agent-id not found",
  "statusCode": 404
}
```
