# Agent Builder tools: overview, custom tools, index search tools

> Sources:
> - https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools
> - https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools/custom-tools
> - https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools/index-search-tools
> Fetched: 2026-10-24.
>
> From the elastic/docs-content repo, main branch.
> In the API an index search tool is `"type": "index_search"` with `"configuration": {"pattern": "cindia-pieces"}`. Its input schema is one field, `nlQuery`. See api-tools.md.

[Agents](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/agent-builder-agents) use tools to search, retrieve, and take actions on your behalf.

Tools can be thought of as functions: modular, reusable actions that agents can call to interact with your Elasticsearch data. Skills are higher-level capabilities that coordinate tools into domain-specific workflows. To learn more, refer to [Skills](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/skills).

## How agents use tools

Tools enable agents to work with Elasticsearch data. When an agent receives a natural language query, it does the following:

1. Analyzes the semantic intent of the request
2. Selects appropriate tools from its available toolset
3. Maps the request parameters to tool input parameters
4. Executes the tools in sequence as needed
5. Processes the structured output data

Each tool is an atomic operation with a defined signature. Tools accept typed parameters and return structured results in a format the agent can parse, transform, and incorporate into its response generation.

**Note:**

Tool execution and result processing consume tokens. To understand how usage is calculated, refer to [Token usage in Elastic Agent Builder](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/monitor-usage).

## Built-in tools

Elastic Agent Builder ships with a comprehensive set of built-in tools that provide core capabilities for working with your Elasticsearch data. These tools are ready to use. They cannot be modified or deleted.

Built-in tools serve as building blocks for more complex interactions and provide the foundation for agent capabilities.

For the complete list, refer to [Built-in tools reference](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools/builtin-tools-reference).

(stack: ga 9.6+) (serverless: ga) Every agent also has [HTTP API tools](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools/builtin-tools-reference#http-api-tools) for calling Elasticsearch and Kibana APIs. These tools don't appear on the **Tools** page.

**Note:**

Some built-in skills also include inline tools that are only available while that skill is active and are not listed in the tools reference. For details, refer to [Built-in skills reference](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/builtin-skills-reference).

## Custom tools

You can extend the built-in tool catalog with your own custom tool definitions. To learn how to create and manage custom tools, refer to [Custom tools](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools/custom-tools).

## Manage tools

You can view, organize, and manage tools from the **Tools** page in Kibana or programmatically using the [Tools API](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/kibana-api#tools-apis).

**Applies to { stack: ga 9.4+, serverless: ga }:**

    Access the Tools page from **Manage components** at the bottom of the left sidebar, or from **Customize > Tools > Manage all tools** on an agent's page.

**Applies to { stack: ga =9.3 }:**

    Access the Tools page from the key actions menu in the Agent Chat UI.

The Tools page lists each tool by ID and description. Use the search bar or filter by labels to find specific tools. Built-in tools are marked with a lock icon (🔒).

(stack: ga 9.4+) The Tools page also includes a **Manage MCP** dropdown (for MCP server configuration and bulk imports) and a **Manage agents** link for quick navigation to the global agents list.

### Update and delete tools

[Custom tools](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools/custom-tools) can be modified or removed as needed:
1. From the Tools page, find the tool you want to modify.
2. Select the edit icon to update the tool or the delete icon to remove it.
3. For updates, modify the tool properties and save your changes.

**Note:**

Built-in tools cannot be modified or deleted.

## Tools API

For a quick overview of how to work programmatically with tools, refer to [Tools API](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/kibana-api#tools-apis).

Direct tool calls through the Tools API are not subject to Elastic Agent Builder [human-in-the-loop confirmation](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/chat#human-in-the-loop-prompts).

### API reference

For the complete API reference, refer to the [Kibana API reference](https://www.elastic.co/docs/api/doc/kibana/operation/operation-get-agent-builder-tools).

## MCP server access

Tools can also be accessed through the Model Context Protocol (MCP) server, which provides a standardized interface for external clients to use Agent Builder tools.

**Applies to { stack: ga 9.4+, serverless: ga }:**

On the Tools page, open the **Manage MCP** dropdown to access:

- **Copy MCP Server URL**: Copy the MCP server URL for configuring external clients.
- **Bulk import MCP tools**: Import multiple tools from an MCP server at once.
- **Documentation**: Open the MCP documentation.

**Applies to { stack: ga 9.2-9.3 }:**

The **Tools** UI provides a **Copy your MCP server URL** button for easy access.

**Important:**

There is a [known issue](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/limitations-known-issues#mcp-server-url-copy-button-omits-space-name) with the copy button in 9.2.

For detailed MCP server configuration, refer to [MCP server](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/mcp-server).


## Create and manage custom tools in Elastic Agent Builder

You can extend the built-in tool catalog with your own custom tool definitions. Custom tools offer flexibility in how they interact with your data. This flexibility allows you to create tools that match your specific use cases and data access patterns.

### Tool types

Elastic Agent Builder supports several tool types:

- **[ES|QL tools](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools/esql-tools)**: Execute pre-defined ES|QL queries with parameterized inputs for precise, repeatable data retrieval.
- **[Index search tools](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools/index-search-tools)**: Scope searches to specific indices or patterns. The LLM dynamically constructs queries based on user requests.
- **[MCP tools](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools/mcp-tools)**: Connect to external Model Context Protocol servers, enabling agents to use remote tools and services.
- **[Workflow tools](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools/workflow-tools)**: Call pre-defined Workflows directly from the agent chat.

### Create custom tools in the UI

You can create custom tools in the Kibana UI.

To create a custom tool in the UI:

1. Navigate to the Tools page:

**Applies to { stack: ga 9.4+, serverless: ga }:**

    Click **Manage components** at the bottom of the left sidebar, then select **Tools**. You can also reach this page from **Customize > Tools > Manage all tools**.

**Applies to { stack: ga =9.3 }:**

    Navigate to the **Tools** section from the key actions menu in the Agent Chat UI.

2. Click **+ New tool**.

4. Fill in the required fields:
   - **ID**: Enter a unique identifier for your tool (e.g., `get_customer_orders`). Agents use this ID to reference the tool. Refer to Naming conventions for recommended patterns.
   - **Name**: Enter a descriptive name for your tool.
   - **Description**: Write a clear explanation of what the tool does and when it should be used. Refer to Writing effective tool descriptions for guidance.
   - **Type**: Choose a tool type from the list.
   - **Parameters**: For tools with ES|QL queries, define any parameters your query needs.
   - **Labels**: (Optional) Add labels to categorize and organize your tools.
5. Choose how to save your tool:
   - Select **Save** to create the tool.
   - Select **Save and test** to create the tool and immediately open the testing interface

### Create custom tools with API

You can also create and manage tools programmatically. To learn more, refer to [Tools API](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools#tools-api).

### Require confirmation before a tool runs
_Applies to: stack: ga 9.6+; serverless: ga_

An agent can pause and ask you to approve a call to a custom tool before it runs. To learn what these prompts look like in chat, refer to [Human-in-the-loop prompts](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/chat#human-in-the-loop-prompts).

Set **Require user confirmation** in the UI for [workflow tools](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools/workflow-tools) and [MCP tools](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools/mcp-tools), or use the [Tools API](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools#tools-api) for any custom tool type. The API equivalent is the tool's `confirmation.askUser` property, which accepts `never`, `once`, or `always`. A request that retrieves the tool returns the current value.

ES|QL and index search tools accept `confirmation.askUser` through the API, and the agent applies it, but the setting does not appear when you open the tool in the UI. Use the API to check or change it for these tool types.

Confirmation applies only when an agent calls the tool. Calling the tool directly through the Tools API skips it, and [sub-agent executions cannot answer confirmation prompts](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/limitations-known-issues#human-in-the-loop-prompts-require-an-interactive-conversation).

### Test your tools

Before assigning tools to agents, verify they work correctly by testing them. Testing helps ensure your tool returns useful results and handles parameters correctly.

If you didn't select **Save and test** immediately:

1. Find your tool in the Tools list.
2. Click the test icon (play button) associated with your tool.

3. Enter test data based on your tool type:
   - **For ES|QL tools with parameters**: Enter realistic test values for each parameter in the **Inputs** section.
   - **For Index search tools**: Enter a sample search query to test the search functionality.
4. Select **Submit** to run the test.
5. Review the Response section to verify:
   - The tool executes without errors.
   - Results are returned in the expected format.
   - The data matches your expectations.

### Assign tools to agents

To start using a custom tool, you must assign it to a [custom agent](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/custom-agents).

**Applies to { stack: ga 9.4+, serverless: ga }:**

1. Select the agent from the agent selector in the left sidebar.
2. Expand the **Customize** accordion and select **Tools**.
3. Click **Add tool** and select the tools to assign.

**Applies to { stack: ga =9.3 }:**

1. Navigate to the agent configuration page.
2. Select the **Tools** tab.
3. Add the desired tools to the agent.
4. Save the agent configuration.

### Protected namespaces

Some tool ID prefixes are reserved by Elastic for built-in tools and cannot be used for custom tools. Saving a custom tool whose ID begins with a protected prefix fails with the error `Tool ID "<id>" uses a protected namespace.`

The set of protected prefixes has expanded across Elastic Stack versions. The version tag next to each prefix indicates the version in which it was added to the protected list:

- `attachments.*` (stack: ga 9.4+)
- `filestore.*` (stack: ga 9.4+)
- `observability.*` (stack: ga 9.3+)
- `platform.alerting.*` (stack: ga 9.5+)
- `platform.core.*` (stack: ga 9.2+)
- `platform.dashboard.*` (stack: ga 9.3+)
- `platform.sig_events.*` (stack: ga 9.5+)
- `platform.streams.*` (stack: ga 9.4+)
- `platform.workflows.*` (stack: ga 9.4+)
- `search.*` (stack: ga 9.4+)
- `security.*` (stack: ga 9.3+)

**Important:**

The protected namespace list has grown across releases and may expand further. Before upgrading to a new version, check the list against your custom tool IDs and recreate any that might collide under a different namespace. Tools whose namespace becomes protected at upgrade time can no longer be modified or deleted.

### Best practices

Follow these guidelines to create tools that agents can use effectively.

#### Naming conventions

The Tool ID is a critical identifier. Use a namespace prefix to group tools logically, which helps the LLM understand tool relationships and prevents naming collisions.

**Recommended pattern**: `domain.action_entity` or `system.function`

**Examples**:
- `finance.search_ticker`
- `support.get_ticket_details`
- `ecommerce.cancel_order`

Some prefixes are reserved by Elastic for built-in tools and cannot be used for custom tool IDs. Refer to Protected namespaces.

#### Writing effective tool descriptions

A strong description explains what the tool does, when to use it, and what limitations exist. Include these components:

- **Core purpose**: A high-level summary of what the tool actually does.
- **Trigger**: When should this be called?
- **Action**: What specific data does it retrieve or modify?
- **Limitations**: Are there constraints (for example, "returns max 50 rows" or "data is 24 hours old")?
- **Relationships**: How does it relate to other tools?

**Tip:**

Not sure whether logic belongs in a tool description or in the agent's custom instructions? Refer to [Custom instructions, tool descriptions, or user input](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/prompt-engineering#custom-instructions-tool-descriptions-or-user-input).

##### Example: Customer support (retrieval)

- **Tool ID**: `support.search_articles`
- **Description**: "Searches the internal Knowledge Base for technical support articles. Use this tool when a user asks about error codes, troubleshooting steps, or product configurations.
  - Input: Requires a natural language query string.
  - Limitations: Returns a maximum of 3 articles.
  - Note: If this tool returns irrelevant results, try the `support.search_tickets` tool to see how similar historical issues were resolved."

##### Example: Finance (data fetching)

- **Tool ID**: `finance.get_transaction_history`
- **Description**: "Retrieves a list of transactions for a specific user account ID.
  - Parameters: `account_id` (required), `start_date` (optional, defaults to 30 days ago).
  - Usage: Use this to analyze spending patterns or find specific charges.
  - Constraint: Data is updated nightly; do not use it for real-time balance checks (use `finance.get_realtime_balance` for that)."

#### Additional tips

- **Limit scope**: Focus each tool on a specific task rather than creating overly complex tools.
- **Use meaningful parameter names**: Choose names that clearly indicate what the parameter represents.
- **Include `LIMIT` clauses in ES|QL queries**: Prevent returning excessive results.
- **Use labels**: Add relevant labels to make tools easier to find and organize.
- **Limit tool count**: More tools are not always better. Keep each agent focused with a limited number of relevant tools.

### Related pages

- [prompt engineering](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/prompt-engineering)
- [tools](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools)
- [builtin tools reference](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools/builtin-tools-reference)
- [kibana api](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/kibana-api#tools-apis)


## Index search tools in Elastic Agent Builder

Index search tools provide intelligent, natural language-driven search over specified Elasticsearch resources. Instead of defining explicit queries, you specify a pattern of [indices](https://www.elastic.co/docs/manage-data/data-store/index-basics), [aliases](https://www.elastic.co/docs/manage-data/data-store/aliases), or [data streams](https://www.elastic.co/docs/manage-data/data-store/data-streams), and the tool uses a combination of built-in capabilities to intelligently interpret and execute search requests. The tool automatically generates queries in Query DSL or ES|QL format based on the search intent.

### When to use index search tools

Use custom **Index search tools** when:

* You want agents to handle diverse, exploratory queries
* The search intent varies significantly across requests
* Users need flexible, dynamic search functionality
* You want to scope general search capabilities to specific indices

### Key characteristics

* Accept natural language queries from the agent
* Automatically determine optimal search strategy (full-text, semantic)
* Leverage built-in tools like index exploration, query generation, and semantic search
* Ideal for flexible, user-driven exploratory searches
* No need to pre-define query logic

### Configuration

Index search tools support the following configuration parameters:

`pattern`
:   An index pattern string specifying which indices, aliases, or data streams to search. Examples: `logs-myapp-*`, `my-index`, `.alerts-security-*`.

**Tip:**

    Avoid overly broad wildcard patterns like `*` or `logs-*` across large datasets.

`row_limit` (optional)
:   Maximum number of rows to return from ES|QL queries. This helps control the amount of data retrieved and prevents exceeding context length limits.

`custom_instructions` (optional)
:   Domain-specific guidance for ES|QL query generation. For example: `"Always include @timestamp and filter out records where environment='test'"`.

### How it works

When an agent calls an index search tool:

1. The agent provides a natural language query (for example, "find recent errors related to authentication")
2. The tool selects a single index from the configured pattern based on the query intent and available index metadata
3. It automatically orchestrates built-in tools to:
   - Explore the selected index's structure and mappings
   - Generate appropriate queries (ES|QL or query DSL)
   - Execute semantic search if relevant
   - Rank and format results
4. Returns results in a format the agent can interpret and present

**Important:**

Even when the configured pattern matches multiple indices, the tool selects only one index per query. It does not search across all matching indices simultaneously.

If your use case requires searching across multiple indices in a single query, use the built-in [search tool](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools/builtin-tools-reference#agent-builder-builtin-search-tool) instead, which supports multi-index ES|QL queries across index patterns. (stack: ga 9.4+)

To help agents make better decisions during the source selection phase, you can optimize your index metadata and tool configurations.

### Add index metadata to improve agent search

You can add metadata to your index mappings to help agents make better decisions. Index-level [`_meta.description`](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/mapping-meta-field) helps agents select the appropriate indices.

##### Example: Add index-level metadata

```console
PUT /ecommerce-orders-2025/_mapping
{
  "_meta": {
    "description": "Primary dataset for North American customer orders in 2025. Use this for questions about order values, shipping status, or customer purchase history. Do not use for real-time inventory levels—use the inventory index instead. RELATIONSHIPS: 'customer_id' links to 'customer-profiles' index. NOTES: 'total_amount' includes tax; use 'subtotal' for pre-tax calculations." <1>
  },
  "properties": {
    "order_id": { "type": "keyword" },
    "total_amount": { "type": "double" }, <2>
    "created_at": { "type": "date" },
    "customer_support_notes": { "type": "text" }
  }
}
```
1. Include usage guidance, limitations, relationships, and field semantics in the description
2. Example of fields that might need semantic clarification in the description

**Important:**

Keep descriptions concise (a few sentences) to avoid [context overflow](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/troubleshooting/context-length-exceeded).

### Best practices

- **Add index metadata descriptions**: Include `_meta.description` fields in your index mappings. Keep descriptions concise (a few sentences) to avoid [context overflow](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/troubleshooting/context-length-exceeded).
  - Explain what entities or events the index covers
  - Note what types of questions it can answer
  - Document how fields link to other indices
  - State what the index should NOT be used for
  - Clarify non-obvious field meanings or calculations
- **Use specific patterns**: Scope tools to relevant index patterns rather than broad wildcards (for example, `logs-myapp-*` instead of `logs-*`)
- **Write descriptive tool names**: Help agents select the right tool for the query (for example, "Search Security Alerts" vs. "Search Tool")
- **Provide context in descriptions**: Explain what data the indices contain and what types of questions the tool can answer
- **Create domain-specific tools**: Build separate tools for different data domains (logs, metrics, alerts) rather than one general-purpose tool. In enterprise environments with hundreds of indices, creating scoped search tools prevents the agent from wasting tokens scanning irrelevant data. For example, a "Finance Agent" should not search through "Customer Support" logs.
- **Add custom instructions**: Use the custom instructions parameter to guide ES|QL query generation with domain-specific requirements, such as always including certain fields, applying specific filters, or handling time ranges in a particular way
- **Set appropriate row limits**: Configure row limits to prevent retrieving excessive data that could exceed context length limits

For general guidance on naming tools and writing effective descriptions, refer to [Custom tools best practices](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools/custom-tools#best-practices).

**Tip:**

Creating scoped, domain-specific tools also helps prevent [context length issues](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/troubleshooting/context-length-exceeded) by reducing the volume of data the agent needs to process.

### Common patterns

The following examples show typical index patterns and domain-specific tool configurations.

#### Index pattern syntax

* **Wildcard patterns**: `logs-*`, `metrics-*`, `events-*`
* **Specific indices**: `products`, `users`, `orders`
* **Cross-cluster patterns** (stack: ga 9.4+): `remote_cluster:logs-*`, `cluster_a:events-*`. For previous versions, refer to [Cross-cluster search support](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/limitations-known-issues#cross-cluster-search-support).

Instead of creating a single generic search tool, consider creating multiple focused tools that target specific data domains. This gives the agent a smaller, higher-quality list of potential data sources, reducing the chance of retrieving irrelevant data.

**Support logs tool example**

**Tool name**: `Search Support Logs`

**Pattern**: `logs-support-*`

**Description**: "Search through server and application logs for error traces, stack traces, and diagnostic information. Use this when troubleshooting technical support tickets or investigating system issues."

**Finance invoices tool example**

**Tool name**: `Search Invoices`

**Pattern**: `finance-invoices-*`

**Description**: "Search through settled and pending invoices. Use this to retrieve payment status, billing addresses, or invoice details for accounting queries."

**Cross-cluster search tool example**

**Tool name**: `Search Remote Logs`

**Pattern**: `remote_cluster:logs-*`

**Description**: "Search log data stored on remote_cluster. Use this tool when the user asks about remote logs or logs on a specific remote cluster."

Index search tools only search remote clusters when you explicitly configure a cross-cluster pattern. Without a remote pattern, the tool resolves indices locally.

**Security alerts tool example**

**Tool name**: `Search Security Alerts`

**Pattern**: `security-alerts-*`

**Description**: "Search security detection alerts and findings. Use this for questions about threat detection, suspicious activity, or security incidents."

**Warning:**

Avoid overly broad patterns like `*` or `logs-*` across large datasets. Broad wildcards can cause the agent to retrieve more data than the LLM can process, resulting in slow responses or errors. Refer to [Context length exceeded](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/troubleshooting/context-length-exceeded) for tips on diagnosing and resolving these issues.
