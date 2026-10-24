# Elastic Agent Builder Kibana APIs

> Source: https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/kibana-api
> Fetched: 2026-10-24.
>
> From the elastic/docs-content repo, main branch. The page shows each call in Dev Tools Console form and as curl. Only the Console form is kept.
> To send a Console example over HTTP: replace `kbn://` with `$KIBANA_URL/`, send `Authorization: ApiKey <key>`, and on POST, PUT and DELETE also send `kbn-xsrf: true` and `Content-Type: application/json`.
> Exact request and response schemas: api-agents.md, api-tools.md and api-converse.md in this folder.

This page provides a quick overview of the main Kibana API endpoints for Elastic Agent Builder. For complete details including all available parameters, request/response schemas, and error handling, refer to the [Kibana API reference](https://www.elastic.co/docs/api/doc/kibana/group/endpoint-agent-builder).

These APIs enable you to programmatically work with Elastic Agent Builder abstractions such as agents, tools, and skills.

**Tip:**

New to the Elastic Agent Builder APIs? Try our hands-on [API tutorial](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/agent-builder-api-tutorial) that walks you through creating custom tools and agents step-by-step.

## Using the APIs

The examples in this documentation use Dev Tools [Console](https://www.elastic.co/docs/explore-analyze/query-filter/tools/console) syntax.
```console
GET kbn://api/agent_builder/tools
```

To use these APIs with tools like `curl`, replace the `kbn://` protocol with your Kibana URL.

**Note:**

Set the required environment variables before running curl commands:
```bash
export KIBANA_URL="your-kibana-url"
export API_KEY="your-api-key"
```

```bash
curl -X GET "${KIBANA_URL}/api/agent_builder/tools" \
     -H "Authorization: ApiKey ${API_KEY}"
```
**Tip:**

Need an API key? Refer to [Create API keys for Elastic Agent Builder APIs](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/api-keys) for complete read-only and management examples.

### Working with spaces

To run APIs in non-default [spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces), you must include the space identifier in the URL when making API calls with `curl` or other external tools. Insert `/s/<space_name>` before `/api/agent_builder` in your requests.

For example, to list tools in a space named `my-space`:

```bash
curl -X GET "${KIBANA_URL}/s/my-space/api/agent_builder/tools" \
     -H "Authorization: ApiKey ${API_KEY}"
```

The default space does not require the `/s/default` prefix.

Dev Tools [Console](https://www.elastic.co/docs/explore-analyze/query-filter/tools/console) automatically uses your current space context and does not require the `/s/<space_name>` prefix.

### Use APIs with data from multiple projects
_Applies to: stack: unavailable; serverless: ga_

  When you have projects [linked](https://www.elastic.co/docs/deploy-manage/cross-project-search-config/cps-config-link-and-manage) through [cross-project search](https://www.elastic.co/docs/explore-analyze/cross-project-search), Elastic Agent Builder APIs that search your data use the [default cross-project search scope](https://www.elastic.co/docs/deploy-manage/cross-project-search-config/cps-config-access-and-scope#cps-default-search-scope) for the space in the request URL. Requests without `/s/<space-name>` use the default space.

To override that default, include a `project_routing` expression in the body of the [send chat message API](https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-agent-builder-converse) or the [send chat message (streaming) API](https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-agent-builder-converse-async). The [run a tool API](https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-agent-builder-tools-execute) uses the space default and does not accept this field. For routing expression syntax, refer to [cross project search project routing](https://www.elastic.co/docs/explore-analyze/cross-project-search/cross-project-search-project-routing). For an example, refer to Chat and conversations.

## Available APIs

The following sections provide quick examples for each API endpoint grouped by resource type.

### Tools APIs

Use these APIs to create, list, update, delete, and run tools.

**Example:** List all tools

This example uses the [list tools API](https://www.elastic.co/docs/api/doc/kibana/operation/operation-get-agent-builder-tools).

```console
GET kbn://api/agent_builder/tools
```

**Example:** Create a tool

This example uses the [create a tool API](https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-agent-builder-tools).

```console
POST kbn://api/agent_builder/tools
{
  "id": "example-esql-tool",
  "type": "esql",
  "description": "An ES|QL query tool for analyzing financial trades with time filtering",
  "tags": ["analytics", "finance", "updated"],
  "configuration": {
    "query": "FROM financial_trades | WHERE execution_timestamp >= ?startTime | STATS trade_count=COUNT(*), avg_price=AVG(execution_price) BY symbol | SORT trade_count DESC | LIMIT ?limit",
    "params": {
      "startTime": {
        "type": "date",
        "description": "Start time for the analysis in ISO format"
      },
      "limit": {
        "type": "integer",
        "description": "Maximum number of results to return"
      }
    }
  }
}
```

**Example:** Create a tool with [default values](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools/esql-tools#default-values-for-optional-parameters) for optional parameters (stack: ga 9.3)

This example creates an ES|QL tool with optional parameters that have default values, which are automatically used when the agent doesn't provide them.

```console
POST kbn://api/agent_builder/tools
{
  "id": "sales-analysis-tool",
  "type": "esql",
  "description": "Analyze sales data with optional time filtering and automatic defaults for unspecified parameters",
  "tags": ["analytics", "sales"],
  "configuration": {
    "query": "FROM sales | WHERE timestamp >= ?start_date AND region == ?region | STATS total_sales=SUM(amount) BY product | LIMIT ?limit",
    "params": {
      "start_date": {
        "type": "date",
        "description": "Start date for analysis. When not provided by the agent, defaults to '2024-01-01T00:00:00Z'",
        "optional": true,
        "defaultValue": "2024-01-01T00:00:00Z"
      },
      "region": {
        "type": "string",
        "description": "Sales region to filter by. If omitted, defaults to 'ALL' to include all regions",
        "optional": true,
        "defaultValue": "ALL"
      },
      "limit": {
        "type": "integer",
        "description": "Maximum results to return. When not specified, automatically limits to 50 results",
        "optional": true,
        "defaultValue": 50
      }
    }
  }
}
```

**Tip:**

If you're using Spaces, you need to prefix `/api/agent_builder` with `/s/<space_name>`. Refer to Working with Spaces.

**Example:** Get a tool by ID

This example uses the [get a tool by ID API](https://www.elastic.co/docs/api/doc/kibana/operation/operation-get-agent-builder-tools-toolid).

```console
GET kbn://api/agent_builder/tools/{id}
```

**Example:** Delete a tool by ID

This example uses the [delete a tool by ID API](https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete-agent-builder-tools-toolid).

```console
DELETE kbn://api/agent_builder/tools/{id}
```

**Example:** Update a tool by ID

This example uses the [update a tool API](https://www.elastic.co/docs/api/doc/kibana/operation/operation-put-agent-builder-tools-toolid).

```console
PUT kbn://api/agent_builder/tools/{toolId}
{
  "description": "Updated ES|QL query tool for analyzing financial trades with time filtering",
  "tags": ["analytics", "finance", "updated"],
  "configuration": {
    "query": "FROM financial_trades | WHERE execution_timestamp >= ?startTime | STATS trade_count=COUNT(*), avg_price=AVG(execution_price) BY symbol | SORT trade_count DESC | LIMIT ?limit",
    "params": {
      "startTime": {
        "type": "date",
        "description": "Start time for the analysis in ISO format"
      },
      "limit": {
        "type": "integer",
        "description": "Maximum number of results to return"
      }
    }
  }
}
```

**Example:** Run a tool

This example uses the [execute a tool API](https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-agent-builder-tools-execute).

```console
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "platform.core.search",
  "tool_params": {
    "query": "can you find john doe's email from the employee index?"
  }
}
```

### Skills APIs

Use these APIs to create, list, update, and delete skills.

**Example:** List all skills

This example uses the [list skills API](https://www.elastic.co/docs/api/doc/kibana/operation/operation-get-agent-builder-skills).

```console
GET kbn://api/agent_builder/skills
```

**Example:** Create a skill

This example uses the [create a skill API](https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-agent-builder-skills).

```console
POST kbn://api/agent_builder/skills
{
  "id": "my-log-triage-skill",
  "name": "Log Triage",
  "description": "Guides triage of application log errors: classify by severity, identify the affected service and host, and suggest remediation steps. Use when a user asks to investigate or summarize log errors.",
  "content": "## When to Use This Skill\n\nUse this skill when:\n- A user asks to investigate or summarize log errors\n- A user wants to understand the cause of application failures\n\n## Log Triage Process\n\n### 1. Identify the affected service\n- Query recent error logs using `platform.core.execute_esql`\n- Extract `service.name`, `host.name`, and `log.level` fields\n\n### 2. Classify by severity\n- Group errors by type and frequency\n- Note any spike in error rate\n\n### 3. Suggest remediation\n- Summarize the most common errors\n- Suggest next steps based on error patterns",
  "tool_ids": [
    "platform.core.execute_esql",
    "platform.core.generate_esql",
    "platform.core.list_indices"
  ]
}
```

**Example:** Create a skill with referenced content

This example uses the [create a skill API](https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-agent-builder-skills) with `referenced_content` to attach supporting files the agent can read selectively.

```console
POST kbn://api/agent_builder/skills
{
  "id": "my-log-triage-skill",
  "name": "Log Triage",
  "description": "Guides triage of application log errors. Use when a user asks to investigate or summarize log errors.",
  "content": "## Log Triage Process\n\nFor example ES|QL queries, see `./queries`.",
  "tool_ids": ["platform.core.execute_esql"],
  "referenced_content": [
    {
      "name": "queries",
      "relativePath": "./queries",
      "content": "# Example Queries\n\n## Recent errors by service\n```esql\nFROM logs-* | WHERE log.level == \"error\" | STATS count = COUNT(*) BY service.name | SORT count DESC | LIMIT 10\n```"
    }
  ]
}
```

**Example:** Get a skill by ID

This example uses the [get a skill by ID API](https://www.elastic.co/docs/api/doc/kibana/operation/operation-get-agent-builder-skills-skillid).

```console
GET kbn://api/agent_builder/skills/{skillId}
```

**Example:** Update a skill

This example uses the [update a skill API](https://www.elastic.co/docs/api/doc/kibana/operation/operation-put-agent-builder-skills-skillid).

```console
PUT kbn://api/agent_builder/skills/{skillId}
{
  "description": "Updated description with more specific trigger conditions.",
  "content": "## When to Use This Skill\n\n(updated instructions)",
  "tool_ids": [
    "platform.core.execute_esql",
    "platform.core.generate_esql"
  ]
}
```

**Example:** Delete a skill

This example uses the [delete a skill API](https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete-agent-builder-skills-skillid).

```console
DELETE kbn://api/agent_builder/skills/{skillId}
```

### Agents APIs

Use these APIs to create, list, update, and delete agents, and to track token consumption.

**Example:** List all agents

This example uses the [list agents API](https://www.elastic.co/docs/api/doc/kibana/operation/operation-get-agent-builder-agents).

```console
GET kbn://api/agent_builder/agents
```

**Example:** Create an agent

This example uses the [create an agent API](https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-agent-builder-agents).

**Applies to { stack: ga 9.5+, serverless: ga }:**

`access_control` is an object that takes a level in its `access_mode` property, as in `"access_control": { "access_mode": "shared" }`.

**Applies to { stack: ga =9.4 }:**

`visibility` takes the level directly, as in `"visibility": "shared"`.

(stack: ga 9.6+) (serverless: ga) If you omit `access_control`, the agent is private: only you and administrators can view and edit it.

(stack: ga 9.5+) (serverless: ga) You can't grant individual users access when you create an agent. On create, `access_control` accepts only `access_mode`, and including `entries` returns a validation error. To grant access, call `PUT /api/agent_builder/agents/{id}/access_control` after the agent exists.

(stack: preview 9.6+) (serverless: preview) To assign [connectors](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/connectors) to the agent, list their IDs in `configuration.connector_ids`. If you omit `connector_ids`, the agent can't run any connectors.

```console
POST kbn://api/agent_builder/agents
{
  "id": "new-agent-id",
  "name": "Search Index Helper",
  "description": "Hi! I can help you search the data within the indices starting with \"content-\" prefix.",
  "labels": ["custom-indices", "department-search"],
  "avatar_color": "#BFDBFF",
  "avatar_symbol": "SI",
  "access_control": { "access_mode": "shared" },
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
  }
}
```

**Example:** Get an agent by ID

This example uses the [get an agent by ID API](https://www.elastic.co/docs/api/doc/kibana/operation/operation-get-agent-builder-agents-id).

```console
GET kbn://api/agent_builder/agents/{id}
```

**Example:** Update an agent by ID

This example uses the [update an agent API](https://www.elastic.co/docs/api/doc/kibana/operation/operation-put-agent-builder-agents-id).

```console
PUT kbn://api/agent_builder/agents/{id}
{
  "name": "Search Index Helper",
  "description": "Updated description - Search for anything in \"content-*\" indices!",
  "labels": ["custom-indices", "department-search", "elastic-employees"],
  "avatar_color": "#BFDBFF",
  "avatar_symbol": "SI",
  "configuration": {
    "instructions": "You are a custom agent that wants to help searching data using all indices starting with prefix \"content-\".",
    "tools": [{
      "tool_ids": [
        "platform.core.search",
        "platform.core.list_indices",
        "platform.core.get_index_mapping",
        "platform.core.get_document_by_id"
      ]
    }]
  }
}
```

**Example:** Delete an agent by ID

This example uses the [delete an agent by ID API](https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete-agent-builder-agents-id).

```console
DELETE kbn://api/agent_builder/agents/{id}
```

### Token consumption

_Applies to: stack: preview =9.4_

Use this API to retrieve per-conversation token usage data for a given agent. This endpoint requires the `manageAgents` privilege and provides cross-user visibility into token consumption across all conversations for the specified agent.

The response includes input and output token counts, round counts, LLM call counts, and warnings for conversations with high token usage. No message content or tool results are exposed.

**Note:**

This API provides visibility into token usage but does not support setting token limits or quotas.

To understand how token usage is calculated and how to view per-response totals in the UI, refer to [Monitor token usage](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/monitor-usage).

**Example:** Get token consumption for an agent

This example uses the [get agent consumption data API](https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-agent-builder-agents-agent-id-consumption) with default pagination.

```console
POST kbn://api/agent_builder/agents/elastic-ai-agent/consumption
{
  "size": 25,
  "sort_field": "updated_at",
  "sort_order": "desc"
}
```

**Example:** Filter consumption data by username and warnings

This example filters results to specific users and conversations that have high-token warnings, sorted by total token count.

```console
POST kbn://api/agent_builder/agents/elastic-ai-agent/consumption
{
  "size": 10,
  "sort_field": "total_tokens",
  "sort_order": "desc",
  "usernames": ["elastic", "admin"],
  "has_warnings": true
}
```

**Example:** Paginate through consumption results

To paginate, pass the `search_after` value from the previous response.

```console
POST kbn://api/agent_builder/agents/elastic-ai-agent/consumption
{
  "size": 10,
  "sort_field": "updated_at",
  "sort_order": "desc",
  "search_after": [1709391000000, "2025-03-02T14:30:00Z"]
}
```

### Chat and conversations

Use these APIs to send messages to agents and manage conversation history.

**Example:** Chat with an agent

This example uses the [send chat message API](https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-agent-builder-converse).

```console
POST kbn://api/agent_builder/converse
{
  "input": "What is Elasticsearch?",
  "agent_id": "elastic-ai-agent"
}
```

**Example:** Chat with an agent and stream events

This example uses the [send chat message (streaming) API](https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-agent-builder-converse-async).

```console
POST kbn://api/agent_builder/converse/async
{
  "input": "Hello again let's have an async chat",
  "agent_id": "elastic-ai-agent",
  "conversation_id": "<CONVERSATION_ID>"
}
```

**Example:** Route a request to a specific model (stack: ga 9.4+)

By default, a request uses the default model for Elastic Agent Builder, as set on the **Feature settings** page. To override the model for a single request, pass either `connector_id` or `inference_id` in the request body:

* `inference_id` takes an [inference endpoint](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/models#add-an-inference-endpoint) ID. Use this parameter for new integrations.
* `connector_id` takes a [connector](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/models#configure-a-connector) ID. Generative AI connectors are deprecated.

Both parameters route the request to the same underlying model and are mutually exclusive. If you send both, the request fails with a `400` error.

```console
POST kbn://api/agent_builder/converse
{
  "input": "What is Elasticsearch?",
  "agent_id": "elastic-ai-agent",
  "inference_id": "my-inference-endpoint-id"
}
```

**Example:** Scope a chat across projects (serverless: ga)

By default, the [cross-project search](https://www.elastic.co/docs/explore-analyze/cross-project-search) scope is the [default scope](https://www.elastic.co/docs/deploy-manage/cross-project-search-config/cps-config-access-and-scope#cps-default-search-scope) for the space in the request URL. Requests without `/s/<space-name>` use the CPS scope from the default space.

Include a `project_routing` expression in the body to override the space's CPS scope. The `_alias:my_search_project` expression in this example searches only the project with that alias. For routing expression syntax, refer to [cross project search project routing](https://www.elastic.co/docs/explore-analyze/cross-project-search/cross-project-search-project-routing).

This example uses the [send chat message API](https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-agent-builder-converse).

```console
POST kbn://api/agent_builder/converse
{
  "input": "Show recent errors",
  "agent_id": "elastic-ai-agent",
  "project_routing": "_alias:my_search_project"
}
```

**Example:** Create a conversation (stack: ga 9.6+) (serverless: ga)

This example uses the [create a conversation API](https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-agent-builder-conversations).

Every field is optional. If you omit `agent_id`, the conversation uses the default Elastic AI Agent. If you omit `title`, the conversation is named `New conversation`. If you omit `access_control`, the conversation is private to you.

```console
POST kbn://api/agent_builder/conversations
{
  "agent_id": "elastic-ai-agent"
}
```

The response includes the conversation's `access_control` and your `permissions` on it:

```json
{
  "id": "8e5fd2c3-04d7-4b1a-b295-5d486afd8584",
  "agent_id": "elastic-ai-agent",
  "title": "New conversation",
  "access_control": {
    "access_mode": "private",
    "entries": []
  },
  "permissions": {
    "rename": true,
    "delete": true,
    "update_access_control": true
  }
}
```

To share the conversation at creation time, include an `access_control` object with the same shape
as the update conversation access control example.

**Example:** List conversations

This example uses the [list conversations API](https://www.elastic.co/docs/api/doc/kibana/operation/operation-get-agent-builder-conversations).

```console
GET kbn://api/agent_builder/conversations
```

**Example:** Get conversation by ID

This example uses the [get conversation by ID API](https://www.elastic.co/docs/api/doc/kibana/operation/operation-get-agent-builder-conversations-conversation-id).

```console
GET kbn://api/agent_builder/conversations/{conversation_id}
```

**Example:** Delete conversation by ID

This example uses the [delete conversation by ID API](https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete-agent-builder-conversations-conversation-id).

```console
DELETE kbn://api/agent_builder/conversations/{conversation_id}
```

**Example:** Update conversation access control  (stack: ga 9.6+) (serverless: ga)

This example uses the [update conversation access control API](https://www.elastic.co/docs/api/doc/kibana/operation/operation-put-agent-builder-conversations-conversation-id-access-control).

Share a conversation with specific users, or make it readable by anyone who can access its agent. Only the conversation owner can call this endpoint. To learn what members can do, refer to [Conversation access control](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/permissions#conversation-access-control).

Each request replaces the entire access control. To stop sharing, send `private` with an empty `entries` list.

The `id` of each entry is a Kibana user profile ID, not a username.

```console
PUT kbn://api/agent_builder/conversations/{conversation_id}/access_control
{
  "access_mode": "private",
  "entries": [
    {
      "type": "user",
      "id": "<USER_PROFILE_UID>",
      "role": "member"
    }
  ]
}
```

To make a conversation readable by anyone who can access its agent, set `access_mode` to `public` and send an empty `entries` list:

```console
PUT kbn://api/agent_builder/conversations/{conversation_id}/access_control
{
  "access_mode": "public",
  "entries": []
}
```

Keep these constraints in mind:

- `entries` is required. Send an empty list when `access_mode` is `public`, or to unshare.
- `entries` must be empty when `access_mode` is `public`.
- A conversation can have at most 100 members.
- Each user can appear only once. Repeated IDs are rejected.
- `member` is the only supported role, and `user` is the only supported entry type.
- An entry that names the owner is accepted but not stored.
- Entry IDs are not validated. An ID that does not match a real user profile is stored and simply never grants access to anyone.
- If you do not own the conversation, the request fails with a `404` error rather than a permissions error.

### Get A2A agent card configuration

Use this API to retrieve the A2A agent card configuration for a specific agent.

**Important:**

You shouldn't use the REST APIs to interact with the A2A endpoint, apart from getting the A2A agent card configuration.
To learn more about using the A2A protocol, refer to [a2a server](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/a2a-server).

**Example:** Get A2A agent card configuration

```console
GET kbn://api/agent_builder/a2a/{agentId}.json
```

## API reference

For the full API documentation, refer to the [Kibana API reference](https://www.elastic.co/docs/api/doc/kibana/group/endpoint-agent-builder).

## Tutorial

Try the hands-on [API tutorial](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/agent-builder-api-tutorial) to get a feel for the flow of working with Agent Builder programmatically.
