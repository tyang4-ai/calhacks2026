# Elastic Agent Builder: overview, get started, models, limits

> Sources:
> - https://www.elastic.co/docs/explore-analyze/ai-features/elastic-agent-builder
> - https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/get-started
> - https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/models
> - https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/limitations-known-issues
> Fetched: 2026-10-24.
>
> From the elastic/docs-content repo, main branch (Oct 24, 2026). Agent Builder is GA on Serverless.
> On Serverless the default model is an Elastic Managed LLM, so no model key is needed. Trial projects have restricted LLM token usage.

Elastic Agent Builder is an AI conversational platform that lets you create AI agents that answer questions and take actions over your Elasticsearch data using natural language. Agents combine LLM reasoning and context engineering with built-in and custom tools that query your indices, so responses are grounded in your data. Key use cases include:

- **Chat with your Elasticsearch data immediately** using the chat interface, preconfigured agents, and built-in tools available out of the box.
- **Build custom agents and tools** tailored to your specific use cases using the UI or APIs.
- **Import tools from external MCP servers** to give your agents additional capabilities.
- **Expose tools and agents to external systems** like Claude Desktop, Cursor, and LangChain apps through the MCP server, A2A server, and REST APIs.

**Learn more in key capabilities**

## Get started

To get started you need an Elastic deployment and you might need to enable the feature.

[**Get started with Elastic Agent Builder**](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/get-started)

**:**

This feature requires the appropriate Elastic Stack [subscription](https://www.elastic.co/pricing) or Serverless [project feature tier](https://www.elastic.co/docs/deploy-manage/deploy/elastic-cloud/project-settings).

## Key capabilities

- **Elasticsearch relevance and security**: Leverage Elasticsearch's search capabilities for precise context retrieval, with [secure data access controls](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/permissions).
- **Built-in agents and tools**: Get started immediately with pre-configured [agents](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/builtin-agents-reference) and [tools](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools/builtin-tools-reference) available out of the box.
- **Chat UI**: [Chat with agents](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/chat) in real time using natural language.
- **Custom and external tools**: Build targeted [custom tools](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools/custom-tools) to deliver precise context, or import external tools through the [Model Context Protocol](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools/mcp-tools).
- **Skills**: Extend agents with domain-specific expertise using [built-in skills](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/builtin-skills-reference) or [custom skills](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/custom-skills) that bundle knowledge and tools for specific task domains.
- **Custom agents**: Create [agents with tailored instructions](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/custom-agents) and toolsets for specific use cases.
- **MCP and A2A servers**: Expose tools and agents to external clients through the [MCP server](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/mcp-server) and [A2A server](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/a2a-server).
- **Kibana REST APIs**: Work with Agent Builder functionalities [programmatically](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/kibana-api), including agents, tools, and conversations.
- **[Elastic Workflows](https://www.elastic.co/docs/explore-analyze/workflows) integration**: Automate complex processes within your deployment using the Elastic-native automation engine. Your agents can [trigger workflows](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/agents-and-workflows) and [workflows can invoke agents](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/agents-and-workflows) in their steps.

## Key concepts

The Elastic Agent Builder framework consists of four key components: Agent Chat, Agents, Skills, and Tools.

### Agent Chat

**Agent Chat** is the synchronous chat interface for interacting with agents through natural language. The chat UI enables real-time communication where you can ask questions, request data analysis, and receive immediate responses from your configured agents. You can also chat with agents programmatically.

[**Learn more about Agent Chat**](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/chat)

### Agents

Agents are powered by custom LLM instructions and the ability to use tools to answer questions, take action, or support workflows. Each agent translates natural language requests into specific actions using the tools assigned to it. Choose from a set of built-in agents, or create your own.

[**Learn more about agents**](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/agent-builder-agents)

### Skills

Skills are reusable instruction sets that give agents specialized expertise for particular task domains. A skill bundles knowledge content and tools so the agent knows how to approach a specific type of task. Skills load selectively based on the user's query, keeping agent configurations clean while enabling deep domain expertise. Choose from a set of built-in skills, or create your own.

[**Learn more about skills**](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/skills)

### Tools
Tools are modular, reusable functions that agents use to search, retrieve, and manipulate Elasticsearch data. Tools are the primary mechanism for connecting agent capabilities to your data. Choose from a set of built-in tools, or create your own and assign them to your custom agents.

[**Learn more about tools**](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools)

## Model selection

On Elastic Cloud Hosted and Elastic Cloud Serverless, Elastic Agent Builder comes with preconfigured models ready to use. You can also configure other model providers using inference endpoints, including local LLMs deployed on your infrastructure.

For solution-specific ratings of models tested on Elastic Security AI chat and AI-powered features, refer to the [LLM performance matrix for Elastic Security](https://www.elastic.co/docs/solutions/security/ai/large-language-model-performance-matrix).

[**Learn more about model selection**](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/models)

## Programmatic interfaces

Elastic Agent Builder provides APIs and LLM integration options for programmatic access and automation.
These interfaces enable you to build integrations with other applications and extend Elastic Agent Builder's capabilities to fit your specific requirements.

[**Learn more about programmatic access**](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/programmatic-access)

## Permissions and access control

Configure security roles and API keys to control who can use agents, which tools they can access, and what data they can query.

[**Learn more about permissions and access control**](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/permissions)

## Monitor usage

Understand how tokens are calculated and accumulated during agent execution to predict the impact on your usage and costs.

[**Learn more about token usage**](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/monitor-usage)

## Troubleshooting

Find solutions to common problems when working with Elastic Agent Builder.

[**Learn more about troubleshooting**](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/troubleshooting)

## Limitations and known issues

Understand current limitations and known issues with Elastic Agent Builder.

[**Learn more about limitations and known issues**](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/limitations-known-issues)


## Get started with Elastic Agent Builder

To start using Elastic Agent Builder you need to deploy Elasticsearch and Kibana.

If you don't already have an Elastic deployment, you can start a [free trial](https://cloud.elastic.co/registration) or refer to [deploy](https://www.elastic.co/docs/deploy-manage/deploy#choosing-your-deployment-type).

**Important:**

This feature requires the appropriate Elastic Stack [subscription](https://www.elastic.co/pricing) or Serverless [project feature tier](https://www.elastic.co/docs/deploy-manage/deploy/elastic-cloud/project-settings#project-features-add-ons).

#### Access Elastic Agent Builder

**Applies to stack: ga 9.4+:**

On non-serverless deployments, Elastic Agent Builder availability depends on the navigation mode of your Kibana space:

**Elasticsearch solution view**

Elastic Agent Builder is enabled by default, replacing AI Assistant. You can access it from multiple entry points:
- Select the **Agent Builder** card on the Elasticsearch home page.
- Click **Agents** in the navigation menu.
- Click the **AI Agent** button in the top-right header to start a conversation from any page.
- Open the **Agent builder** API tutorial from the Kibana **Getting started** page, under **Explore the API**.

**product.observability and product.security solution views**

Elastic Agent Builder is enabled by default, replacing AI Assistant. You can access it from two entry points:
- Click **Agents** in the navigation menu.
- Click the **AI Agent** button in the top-right header to start a conversation from any page.

**Classic view**

Elastic Agent Builder appears in the side navigation under Elasticsearch. You can choose Agent Builder as your assistant through the initial selector or the [chat experience switch](https://www.elastic.co/docs/explore-analyze/ai-features/ai-chat-experiences/ai-agent-or-ai-assistant#switch-between-chat-experiences).

You can also search for **Agents** in the [global search field](https://www.elastic.co/docs/explore-analyze/find-and-organize/find-apps-and-objects).

**Applies to serverless: ga:**

Elastic Agent Builder is the default chat experience in all serverless project types.

**Elasticsearch Serverless**

You can access Elastic Agent Builder from multiple entry points in the UI:

- Select the **Elastic Agent** card on the Elasticsearch home page.
- Click **Agents** in the navigation menu.
- Click the **AI Agent** button in the top-right header to start a conversation from any page.
- Open the **Build a chat tool with Agent Builder** API tutorial from the Kibana **Getting started** page, under **Explore the API**.

**Elastic Observability Serverless and Elastic Security Serverless**

Elastic Agent Builder is enabled by default, replacing AI Assistant. Click the **AI Agent** button in the top-right header to start a conversation from any page.

You can also search for **Agents** in the [global search field](https://www.elastic.co/docs/explore-analyze/find-and-organize/find-apps-and-objects).

**Previous versions**

On non-serverless deployments, Elastic Agent Builder availability depends on the navigation mode of your Kibana space:

**Elasticsearch solution view**

Elastic Agent Builder is enabled by default, replacing Search Assistant. You can access it from multiple entry points:
- Select the **Agent Builder** card on the Elasticsearch home page.
- Click **Agents** in the navigation menu.
- Click the **AI Agent** button in the top-right header to start a conversation from any page.
- Open the **Agent builder** API tutorial from the Kibana **Getting started** page, under **Explore the API**.

**product.observability and product.security solution views**

You must [switch from AI Assistant to Agent Builder](https://www.elastic.co/docs/explore-analyze/ai-features/ai-chat-experiences/ai-agent-or-ai-assistant#switch-between-chat-experiences) to enable the feature. Once enabled, find **Agents** in the navigation menu.

**Classic view**

Elastic Agent Builder appears in the side navigation under Elasticsearch. You can choose Agent Builder as your assistant through the initial selector or the [chat experience switch](https://www.elastic.co/docs/explore-analyze/ai-features/ai-chat-experiences/ai-agent-or-ai-assistant#switch-between-chat-experiences).

You can also search for **Agents** in the [global search field](https://www.elastic.co/docs/explore-analyze/find-and-organize/find-apps-and-objects).

**Note:**

To learn about required privileges for Elastic Agent Builder, refer to [Permissions and access control](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/permissions).

#### Ingest data into Elasticsearch

If you already have data in Elasticsearch, skip ahead to start a conversation.

If you need to add data first, choose the path that fits:

**Use sample data**

If you're not ready to add your own data, you can:

- Load [sample data](https://www.elastic.co/docs/manage-data/ingest/sample-data) in Kibana.
- Generate synthetic financial data using [this Python tool](https://github.com/jeffvestal/synthetic-financial-data?tab=readme-ov-file#synthetic-financial-data-generator-). (This requires your [Elasticsearch URL and an API key](https://www.elastic.co/docs/solutions/elasticsearch-solution-project/search-connection-details)).
- Follow the [Elastic Agent Builder API tutorial](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/agent-builder-api-tutorial), which includes sample book data.

**Bring your own data**

If you already have data, you can:

- [Upload a file](https://www.elastic.co/docs/manage-data/ingest/upload-data-files) in the Kibana UI for quick testing.
- Learn about your [ingestion options](https://www.elastic.co/docs/manage-data/ingest) if you'd like to ingest larger datasets.

#### Start a conversation

The **Agent Chat** UI provides a conversational interface where you can interact with agents and explore your data using natural language. The default `Elastic AI Agent` is ready to use immediately.

Use chat to ask questions, request data analysis, try [built-in skills](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/builtin-skills-reference), or [create dashboards and visualizations](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/agent-builder-dashboards-and-visualizations). You can also invoke a specific skill with a slash command, inspect the agent's reasoning and tool calls, and confirm any proposed write actions before changes are applied.

Learn more in [Agent Chat](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/chat).

#### Enable experimental features (optional)

Some Elastic Agent Builder features are experimental and hidden by default. Turn on the `agentBuilder:experimentalFeatures` [advanced setting](https://www.elastic.co/docs/reference/kibana/advanced-settings#kibana-general-settings) in Kibana to try them before they're generally available.

#### Configure model (optional)

On Elastic Cloud Hosted and Elastic Cloud Serverless, Elastic Agent Builder comes with preconfigured models ready to use. To review recommended models, switch models, or add your own, refer to [model selection and configuration](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/models).

#### Build skills, tools, and agents

After you test the default `Elastic AI Agent`, create a [custom skill](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/custom-skills) for a specific workflow. Skills package task-specific instructions, context, and the tools needed to complete the workflow.

Add [tools](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools) when the skill needs to retrieve data, run queries, call APIs, or take action. Create a [custom agent](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/custom-agents#create-a-new-agent) when you need a distinct persona, system prompt, model configuration, or set of enabled skills. You don't need a separate agent for every workflow: a single agent can use skill descriptions to choose the right skills and tools for the user's request. Note that custom agents don't include [Elastic capabilities](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/agent-builder-agents#elastic-capabilities) by default — enable the toggle to assign all Elastic-built tools, skills, and plugins automatically.

To build programmatically, try the [Elastic Agent Builder API tutorial](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/agent-builder-api-tutorial) or explore the [Kibana APIs](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/programmatic-access).

**Tip:**

For solution-specific guidance, refer to [Agent Builder for Observability](https://www.elastic.co/docs/solutions/observability/ai/agent-builder-observability) and [Agent Builder for Elastic Security](https://www.elastic.co/docs/solutions/security/ai/agent-builder/agent-builder).


### Default model configuration

**Applies to { ess:, serverless: }:**

You can get started with zero setup using Elastic Managed LLMs. These are built-in LLMs running on the [Elastic Inference Service (EIS)](https://www.elastic.co/docs/explore-analyze/elastic-inference/eis). This managed service requires no additional API key management.

**Note:**

Learn more about [Elastic Managed LLMs](https://www.elastic.co/docs/reference/kibana/connectors-kibana/elastic-managed-llm) and [pricing](https://www.elastic.co/pricing).

**Applies to {ece:, eck, self: preview =9.2, ga 9.3+}:**

These deployments do not include a preconfigured model. To use Elastic Agent Builder, you have two options:

- [Connect to the Elastic Inference Service (EIS) using Cloud Connect](https://www.elastic.co/docs/explore-analyze/elastic-inference/connect-self-managed-cluster-to-eis) (recommended) (stack: ga 9.3+)
- Configure your own model using an inference endpoint, or a Generative AI connector (stack: deprecated 9.5) (serverless: deprecated)

### Select a model for a single request

_Applies to: stack: ga 9.4+; serverless: ga_

When you call an agent through the [Converse API](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/kibana-api#chat-and-conversations), you can override the model used for that request. Pass one of the following in the request body:

* `inference_id`: the ID of an inference endpoint. Use this parameter for new integrations.
* `connector_id`: the ID of a connector. Generative AI connectors are deprecated.

Both parameters route the request to the same underlying model and are mutually exclusive. If you send both, the request fails with a `400` error. If you omit both, the request uses the default model for Elastic Agent Builder, as set on the **Feature settings** page.

For an example request, refer to [Route a request to a specific model](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/kibana-api#chat-and-conversations).

### Model requirements

Elastic Agent Builder requires models with strong reasoning and tool-calling capabilities. State-of-the-art models perform significantly better than smaller or older models.

Agent Builder relies on advanced LLM capabilities including:

- **Function calling**: Models must accurately select appropriate tools and construct valid parameters from natural language requests.
- **Multi-step reasoning**: Agents need to plan, execute, and adapt based on tool results across multiple iterations.
- **Structured output**: Models must produce properly formatted responses that the agent framework can parse.

While Elastic Agent Builder can be configured to use LLMs from many different vendors, not all LLMs are robust enough for reliable agent workflows.

#### Recommended models

The following models are known to work well with Elastic Agent Builder. These categories represent a spectrum from maximum reasoning capability to maximum throughput. Choose based on your latency, cost, and complexity requirements.

| Category | Model examples | Use cases | Trade-offs |
|---|---|---|---|
| Extended reasoning | - Gemini 3.1 Pro <br>- Claude 4.6 Opus | Open-ended exploration, multi-step planning, complex analysis, and ES|QL-heavy dashboard generation | Higher latency and cost. Best for latency-insensitive, batch, async, or dashboard workflows that need fewer corrections. |
| Balanced performance | - GPT-5.2 <br>- Claude 4.6 Sonnet | General-purpose agents requiring reliable tool orchestration and data retrieval and synthesis | Moderate cost. Suitable for real-time and interactive use. For ES|QL-heavy dashboard generation, use an extended reasoning model. |
| High throughput | - Claude 4.5 Haiku <br>- Gemini 3.0 Flash | Latency-sensitive pipelines and high-concurrency scenarios with well-scoped tasks | Lower reasoning depth. Ideal for high-volume workloads with well-defined tasks. |

**Note:**

Elastic Agent Builder automatically routes some low-effort tasks to a high-throughput model. Refer to Fast model for low-effort tasks.

**Tip:**

For agents working with large documents or conversation histories, consider models with extended context windows. For example, Claude 4.6 Sonnet and Gemini 3.1 Pro support up to 1M tokens. Check your model provider's documentation for specific context limits.

**Note:**

For [dashboards and visualizations](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/agent-builder-dashboards-and-visualizations), choose a higher-tier model when the workflow depends on complex ES|QL generation. Current testing shows Claude 4.6 Opus generates more reliable dashboard ES|QL than Claude 4.6 Sonnet.

#### Incompatible models

Smaller or less capable models may produce errors like:

```console-response
Error: Invalid function call syntax
```

```console-response
Error executing agent: No tool calls found in the response.
```

Although any chat-completion-compatible model can technically be configured, use state-of-the-art models for reliable agent performance.

**Note:**

Smaller or "mini" model variants are not recommended for Elastic Agent Builder as they lack the necessary capabilities for reliable agent workflows.


## Limitations and known issues in Elastic Agent Builder

This section lists the limitations and known issues in Elastic Agent Builder.

**:**

This feature requires the appropriate Elastic Stack [subscription](https://www.elastic.co/pricing) or Serverless [project feature tier](https://www.elastic.co/docs/deploy-manage/deploy/elastic-cloud/project-settings).

### Limitations

**Tip:**

Elastic Agent Builder is automatically enabled on all deployment types as of 9.4. For instructions about enabling Elastic Agent Builder in earlier versions, refer to [Get started](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/get-started#access-agent-builder).

#### Cross-cluster search support

In version 9.4+, [index search tools](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools/index-search-tools) support [cross-cluster search (CCS)](https://www.elastic.co/docs/explore-analyze/cross-cluster-search). Index search tools only search remote clusters when you explicitly configure a cross-cluster pattern like `remote_cluster:logs-*`. Without a remote pattern, the tool resolves indices locally. To learn how to configure a tool for remote clusters, refer to [Index search tools](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools/index-search-tools#common-patterns).

In previous versions, only [ES|QL tools](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools/esql-tools) support CCS. To search remote clusters, use a custom ES|QL tool and instruct your agent to query `remote_cluster:index_name`.

#### A2A streaming not supported

The [A2A server](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/a2a-server) does not currently support streaming operations. All agent interactions use the synchronous `message/send` method, which returns a complete response only after task execution completes.

#### Human-in-the-loop prompts require an interactive conversation

[Human-in-the-loop prompts](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/chat#human-in-the-loop-prompts) work only in interactive Elastic Agent Builder conversations. A sub-agent execution cannot collect a response to these prompts, whether the sub-agent runs in the foreground or the background, so Elastic Agent Builder declines any action that requires confirmation or authorization.

The sub-agent run itself does not fail. The tool call returns an error result and the sub-agent continues, so the sub-agent can report the declined action in its output.

A2A executions behave differently: the action is not declined. Instead, the conversation round remains in the `awaiting_prompt` state, but A2A clients cannot respond to the prompt.

(stack: ga 9.6+) (serverless: ga) The [`execute_api` tool](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools/builtin-tools-reference#http-api-tools) follows the same rule in sub-agent runs and in [workflow `ai.agent` steps](https://www.elastic.co/docs/explore-analyze/workflows/steps/ai-steps#ai-agent): it declines any Elasticsearch or Kibana API operation that requires [confirmation](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/chat#confirm-an-api-operation), unless the operation is approved in advance. You can approve operations in advance in these ways:

* **For every run of an agent:** Add the operations to the agent's [auto-approved APIs](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/custom-agents#auto-approve-api-operations-optional). This approval is stored with the agent, so it applies to every run, including runs from workflows, and to the sub-agents the agent starts.
* **For one workflow step:** List the operations under `approvals.auto_approved_apis` in the `ai.agent` step. This approval applies only to that step and to the sub-agents it starts, in addition to the agent's auto-approved APIs.
* **For one sub-agent run:** Before starting a sub-agent, a parent agent can ask you to approve operations for it. The request can name individual operations, a group such as all `indices` operations, or every such operation on Elasticsearch or Kibana. The outcome depends on your response and any existing auto-approvals:

  * If you approve, the sub-agent can call those operations without another prompt.
  * If you deny, the sub-agent runs without access to them.
  * If all requested operations are already auto-approved, you aren't asked.

  A sub-agent can also call any operation that the parent agent or the sub-agent itself auto-approves.

This limitation is separate from the [`waitForInput`](https://www.elastic.co/docs/explore-analyze/workflows/authoring-techniques/human-in-the-loop) step in Workflows, which pauses a workflow execution for reviewer input.

#### ES|QL limitations

ES|QL tools are subject to the current limitations of the [ES|QL language](https://www.elastic.co/docs/reference/query-languages/esql).

Ensure your cluster version supports the ES|QL features you intend to use.

For a complete list of ES|QL limitations, refer to the [ES|QL limitations documentation](https://www.elastic.co/docs/reference/query-languages/esql/limitations).

### Known issues

#### Troubleshoot incompatible LLMs

The following errors suggest your selected model may not be compatible with Elastic Agent Builder:

```console-response
Error: Invalid function call syntax
```

```console-response
Error executing agent: No tool calls found in the response.
```

To learn more, refer to [models](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/models).

#### Claude 4.6 Sonnet may generate invalid ES|QL for dashboards

Current testing shows that Claude 4.6 Sonnet may generate invalid ES|QL for dashboard and visualization workflows, particularly with reserved keywords, dotted field names such as `system.load.1`, and incorrectly formatted aliases.

**Workaround:** Use a higher-tier model, such as Claude 4.6 Opus, for ES|QL-heavy dashboard generation. To learn more, refer to [Recommended models](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/models#recommended-models).

#### Context length exceeded error
This error occurs when a conversation exceeds the maximum context length supported by the LLM. This typically happens when tools return large responses that consume the available token budget.

To learn more, refer to [Context length exceeded in Elastic Agent Builder conversations](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/troubleshooting/context-length-exceeded).

#### Misinterpreted SQL syntax as ES|QL

The `.execute_esql` tool is designed only for [ES|QL](https://www.elastic.co/docs/reference/query-languages/esql) syntax, not other query languages.

When using SQL syntax with the default agent, it attempts to use the `.execute_esql` tool instead of recognizing the input as SQL.

This results in parsing errors like this:
```console-response
[
  {
    "type": "error",
    "data": {
      "message": "parsing_exception\n\tCaused by:\n\t\tinput_mismatch_exception: null\n\tRoot causes:\n\t\tparsing_exception: line 1:15: mismatched input 'WHERE' expecting {<EOF>, '|', ',', 'metadata'}",
      "stack": "ResponseError: parsing_exception\n\tCaused by:\n\t\tinput_mismatch_exception: null\n\tRoot causes:\n\t\tparsing_exception: line 1:15: mismatched input 'WHERE' expecting {<EOF>, '|', ',', 'metadata'}\n    at KibanaTransport._request (Desktop/Dev/kibana/node_modules/@elastic/elasticsearch/node_modules/@elastic/transport/src/Transport.ts:591:17)\n    at processTicksAndRejections (node:internal/process/task_queues:105:5)\n    at Desktop/Dev/kibana/node_modules/@elastic/elasticsearch/node_modules/@elastic/transport/src/Transport.ts:697:22\n    at KibanaTransport.request (Desktop/Dev/kibana/node_modules/@elastic/elasticsearch/node_modules/@elastic/transport/src/Transport.ts:694:14)"
    }
  }
]
```

#### Disabling a workflow breaks agents that use it
_Applies to: stack: ga 9.4+; serverless: ga_

**Note:**

The selector-visibility half of this issue is fixed on serverless and on 9.5.3 and later.

Disabling a workflow doesn't remove it from the agents or spaces that use it as a [pre-execution workflow](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/agents-and-workflows#pre-execution-workflows), so every message to those agents fails with a **Workflow Failed** error. On 9.4.x, and on 9.5.0 through 9.5.2, the disabled workflow also disappears from the **Workflows** selector, so you can't clear it from the UI without re-enabling the workflow first.

**Workaround:** Re-enable the workflow, clear it from the selector, save, then disable the workflow again. You can also clear it through the API. To learn more, refer to [Disabled pre-execution workflow](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/troubleshooting/pre-execution-workflow-disabled).

#### MCP server URL copy button omits space name

**Note:**

Fixed on serverless and 9.3.

On 9.2 deployments, the **Copy your MCP server URL** button does not include the space name when used from a custom Kibana Space.

**Workaround:** Manually add `/s/<space-name>` to the URL. For example: `https://<deployment>/s/<space-name>/api/agent_builder/mcp`

For more information about Elastic Agent Builder and Spaces, refer to [Permissions and access control](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/permissions#space-scope).

### Related pages

- [Get started](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/get-started)
- [Troubleshooting](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/troubleshooting)
