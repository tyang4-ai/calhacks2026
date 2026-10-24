# Agent Builder API reference: converse

> Sources:
> - https://www.elastic.co/docs/api/doc/kibana/group/endpoint-agent-builder
> - https://github.com/elastic/kibana/blob/main/oas_docs/output/kibana.serverless.yaml
> Fetched: 2026-10-24.
>
> Generated from the Kibana Serverless OpenAPI spec (main branch, Oct 24, 2026) for every path under `/api/agent_builder/converse`.
> Each operation lists its parameters, the request body fields, and the example requests and responses from the spec.
> Every call needs `Authorization: ApiKey <key>`. POST, PUT and DELETE also need `kbn-xsrf: true`. In a non-default space, prefix the path with `/s/<space_id>`.

### POST `/api/agent_builder/converse`

**Send chat message.** Send a message to an agent and receive a complete response. This synchronous endpoint waits for the agent to fully process your request before returning the final result. Use this for simple chat interactions where you need the complete response. To learn more about agent chat, refer to the [agent chat documentation](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/chat).

[Required authorization] Route required privileges: agentBuilder:read.

Parameters:
- `kbn-xsrf` (header, string, required): A required header to protect against CSRF attacks

Request body:
- `_execution_mode`, string, one of `local`, `task_manager`: define how to execute the agent (local execution or via task_manager)
- `access_control`, object: Optional conversation access control. Defaults to private.
  - `access_mode`, string, required, one of `private`, `public`: Access mode to apply when creating a new conversation. Set to public to make the conversation visible to other users who can access the underlying agent. This setting is ignored when continuing an existing conversation.
- `action`, string, one of `regenerate`: Deprecated and ignored. The "regenerate" action has been removed; the field is still accepted for backward compatibility.
- `agent_id`, string, default `"elastic-ai-agent"`: The ID of the agent to chat with. Defaults to the default Elastic AI agent.
- `attachments`, array of object: Optional attachments to send with the message.
  - `data`, object: Payload of the attachment. Required unless `origin` is provided (content is resolved once at send time).
  - `description`, string: Human-readable label for the attachment.
  - `group_id`, string: Stable identifier for the logical group this attachment belongs to. Attachments sharing the same group_id were submitted together as a single logical entity.
  - `hidden`, boolean: When true, the attachment will not be displayed in the UI.
  - `id`, string: Optional id for the attachment.
  - `origin`, string: Origin string (for example, saved object ID) for by-reference attachments. When provided without `data`, the content is resolved once using the attachment type’s `resolve` hook.
  - `type`, string, required: Type of the attachment.
- `browser_api_tools`, array of object: Optional browser API tools to be registered as LLM tools with browser.* namespace. These tools execute on the client side.
  - `description`, string, required: Description of what the browser API tool does.
  - `id`, string, required: Unique identifier for the browser API tool.
  - `schema`, object, required: JSON Schema defining the tool parameters (JsonSchema7Type).
- `configuration_overrides`, object: Runtime configuration overrides. These override the stored agent configuration for this execution only.
  - `enable_elastic_capabilities`, boolean: Whether to enable built-in Elastic skills for this execution.
  - `instructions`, string: Custom instructions for the agent.
  - `skill_ids`, array of string: Skill IDs to enable for this execution, replacing the stored skill list. Note: only fully restricts the available skill set when enable_elastic_capabilities is also set to false.
  - `tools`, array of object: Tool selection to enable for this execution.
    - `tool_ids`, array of string, required
- `connector_id`, string: Optional connector ID for the agent to use for model routing. Mutually exclusive with `inference_id`; omit or use only one.
- `conversation_id`, string: Optional existing conversation ID to continue a previous conversation.
- `execution_id`, string: Optional client-generated execution ID. Provide it to address this execution later (for example, to abort it). Must be unique; defaults to a server-generated ID.
- `inference_id`, string: Optional inference endpoint ID for model routing (public alias for the same internal identifier as `connector_id`). Mutually exclusive with `connector_id`.
- `input`, string: The user input message to send to the agent.
- `project_routing`, string: Cross-project search routing expression resolved from the header project picker, applied to the run's searches. Serverless (CPS) only; ignored elsewhere.
- `prompts`, object: Use this field to respond to a `confirmation`, `authorization`, or `ask_user_question` prompt. Send an `allow` boolean to answer a `confirmation` prompt, an `authorized` boolean to answer an `authorization` prompt, or an `answers` array (one entry per question) to answer an `ask_user_question` prompt.
- `read_only`, boolean: When true, the created conversation is presented as read-only in the UI: its history is shown but no message input is offered. This carries no authorization meaning — the conversation can still be continued through the API. This setting is ignored when continuing an existing conversation.
- `reasoning_level`, string, one of `none`, `minimal`, `low`, `medium`, `high`, `xhigh`: Reasoning effort level for the LLM. One of: none, minimal, low, medium, high, xhigh. Support depends on the underlying model and provider.

Example request (Example request to create a public conversation):
```json
{
  "access_control": {
    "access_mode": "public"
  },
  "agent_id": "elastic-ai-agent",
  "connector_id": "my-connector-id",
  "input": "What is Elasticsearch?"
}
```

Example request (Example request to send a message to the agent as a part of the conversation):
```json
{
  "agent_id": "elastic-ai-agent",
  "connector_id": "my-connector-id",
  "input": "What is Elasticsearch?"
}
```

Example request (Example using inference_id (mutually exclusive with connector_id)):
```json
{
  "agent_id": "elastic-ai-agent",
  "inference_id": "my-inference-endpoint-id",
  "input": "What is Elasticsearch?"
}
```

Example response 200 (Example response containing the chain of events representing a conversation with the agent):
```json
{
  "access_control": {
    "access_mode": "private"
  },
  "conversation_id": "696ccd6d-4bff-4b26-a62e-522ccf2dcd16",
  "response": {
    "message": "Elasticsearch is a distributed, RESTful search and analytics engine capable of addressing a growing number of use cases. As the heart of the Elastic Stack, it centrally stores your data for lightning fast search, fine‑tuned relevancy, and powerful analytics that scale with ease."
  },
  "steps": [
    {
      "reasoning": "Searching for official documentation or content that explains what Elasticsearch is",
      "type": "reasoning"
    },
    {
      "params": {
        "query": "what is elasticsearch definition overview introduction"
      },
      "progression": [
        {
          "message": "Selecting the best target for this query"
        }
      ],
      "results": [
        {
          "data": {
            "message": "Could not figure out which index to use"
          },
          "type": "error"
        }
      ],
      "tool_call_id": "tooluse_shOdUwKIRwC9YhqGzeg0cQ",
      "tool_id": "platform.core.search",
      "type": "tool_call"
    }
  ]
}
```

### POST `/api/agent_builder/converse/async`

**Send chat message (streaming).** Send a message to an agent and receive real-time streaming events. This asynchronous endpoint provides live updates as the agent processes your request, allowing you to see intermediate steps and progress. Use this for interactive experiences where you want to monitor the agent's thinking process.

## Event types

The endpoint emits Server-Sent Events (SSE) with the following custom event types:

`conversation_id_set`

Sets the conversation ID.

Schema:
```json
{
  "conversation_id": "uuid"
}
```

---

`conversation_created`

Fires when a new conversation is persisted and assigned an ID.

Schema:
```json
{
  "conversation_id": "uuid",
  "title": "conversation title"
}
```

---

`conversation_updated`

Fires when a conversation is updated.

Schema:
```json
{
  "conversation_id": "uuid",
  "title": "updated conversation title"
}
```

---

`reasoning`

Handles reasoning-related data.

Schema:
```json
{
  "reasoning": "plain text reasoning content",
  "transient": false
}
```

---

`tool_call`

Triggers when a tool is invoked.

Schema:
```json
{
  "tool_call_id": "uuid",
  "tool_id": "tool_name",
  "params": {}
}
```

---

`tool_progress`

Reports progress of a running tool.

Schema:
```json
{
  "tool_call_id": "uuid",
  "message": "progress message"
}
```

---

`tool_result`

Returns results from a completed tool call.

Schema:
```json
{
  "tool_call_id": "uuid",
  "tool_id": "tool_name",
  "results": []
}
```

**Note:** `results` is an array of `ToolResult` objects.

---

`message_chunk`

Streams partial text chunks.

Schema:
```json
{
  "message_id": "uuid",
  "text_chunk": "partial text"
}
```

---

`message_complete`

Indicates message stream is finished.

Schema:
```json
{
  "message_id": "uuid",
  "message_content": "full text content of the message"
}
```

---

`thinking_complete`

Marks the end of the thinking/reasoning phase.

Schema:
```json
{
  "time_to_first_token": 0
}
```

**Note:** `time_to_first_token` is in milliseconds.

---

`round_complete`

Marks end of one conversation round.

Schema:
```json
{
  "round": {}
}
```

**Note:** `round` contains the full round json object.

---

## Event flow

A typical conversation round emits events in this sequence:

1. `reasoning` (potentially multiple, some transient)
2. `tool_call` (if tools are used)
3. `tool_progress` (zero or more progress updates)
4. `tool_result` (when tool completes)
5. `thinking_complete`
6. `message_chunk` (multiple, as text streams)
7. `message_complete`
8. `round_complete`

[Required authorization] Route required privileges: agentBuilder:read.

Parameters:
- `kbn-xsrf` (header, string, required): A required header to protect against CSRF attacks

Request body:
- `_execution_mode`, string, one of `local`, `task_manager`: define how to execute the agent (local execution or via task_manager)
- `access_control`, object: Optional conversation access control. Defaults to private.
  - `access_mode`, string, required, one of `private`, `public`: Access mode to apply when creating a new conversation. Set to public to make the conversation visible to other users who can access the underlying agent. This setting is ignored when continuing an existing conversation.
- `action`, string, one of `regenerate`: Deprecated and ignored. The "regenerate" action has been removed; the field is still accepted for backward compatibility.
- `agent_id`, string, default `"elastic-ai-agent"`: The ID of the agent to chat with. Defaults to the default Elastic AI agent.
- `attachments`, array of object: Optional attachments to send with the message.
  - `data`, object: Payload of the attachment. Required unless `origin` is provided (content is resolved once at send time).
  - `description`, string: Human-readable label for the attachment.
  - `group_id`, string: Stable identifier for the logical group this attachment belongs to. Attachments sharing the same group_id were submitted together as a single logical entity.
  - `hidden`, boolean: When true, the attachment will not be displayed in the UI.
  - `id`, string: Optional id for the attachment.
  - `origin`, string: Origin string (for example, saved object ID) for by-reference attachments. When provided without `data`, the content is resolved once using the attachment type’s `resolve` hook.
  - `type`, string, required: Type of the attachment.
- `browser_api_tools`, array of object: Optional browser API tools to be registered as LLM tools with browser.* namespace. These tools execute on the client side.
  - `description`, string, required: Description of what the browser API tool does.
  - `id`, string, required: Unique identifier for the browser API tool.
  - `schema`, object, required: JSON Schema defining the tool parameters (JsonSchema7Type).
- `configuration_overrides`, object: Runtime configuration overrides. These override the stored agent configuration for this execution only.
  - `enable_elastic_capabilities`, boolean: Whether to enable built-in Elastic skills for this execution.
  - `instructions`, string: Custom instructions for the agent.
  - `skill_ids`, array of string: Skill IDs to enable for this execution, replacing the stored skill list. Note: only fully restricts the available skill set when enable_elastic_capabilities is also set to false.
  - `tools`, array of object: Tool selection to enable for this execution.
    - `tool_ids`, array of string, required
- `connector_id`, string: Optional connector ID for the agent to use for model routing. Mutually exclusive with `inference_id`; omit or use only one.
- `conversation_id`, string: Optional existing conversation ID to continue a previous conversation.
- `execution_id`, string: Optional client-generated execution ID. Provide it to address this execution later (for example, to abort it). Must be unique; defaults to a server-generated ID.
- `inference_id`, string: Optional inference endpoint ID for model routing (public alias for the same internal identifier as `connector_id`). Mutually exclusive with `connector_id`.
- `input`, string: The user input message to send to the agent.
- `project_routing`, string: Cross-project search routing expression resolved from the header project picker, applied to the run's searches. Serverless (CPS) only; ignored elsewhere.
- `prompts`, object: Use this field to respond to a `confirmation`, `authorization`, or `ask_user_question` prompt. Send an `allow` boolean to answer a `confirmation` prompt, an `authorized` boolean to answer an `authorization` prompt, or an `answers` array (one entry per question) to answer an `ask_user_question` prompt.
- `read_only`, boolean: When true, the created conversation is presented as read-only in the UI: its history is shown but no message input is offered. This carries no authorization meaning — the conversation can still be continued through the API. This setting is ignored when continuing an existing conversation.
- `reasoning_level`, string, one of `none`, `minimal`, `low`, `medium`, `high`, `xhigh`: Reasoning effort level for the LLM. One of: none, minimal, low, medium, high, xhigh. Support depends on the underlying model and provider.

Example request (Example request to create a public conversation):
```json
{
  "access_control": {
    "access_mode": "public"
  },
  "agent_id": "elastic-ai-agent",
  "input": "Hello"
}
```

Example request (Example request to send a message to the agent as a part of the conversation):
```json
{
  "agent_id": "elastic-ai-agent",
  "conversation_id": "c250305b-1929-4248-b568-b9e3f065fda5",
  "input": "Hello"
}
```

Example request (Example using inference_id (mutually exclusive with connector_id)):
```json
{
  "agent_id": "elastic-ai-agent",
  "inference_id": "my-inference-endpoint-id",
  "input": "Hello"
}
```
