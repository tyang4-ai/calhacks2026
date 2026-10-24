# Elastic Agent Builder API tutorial

> Source: https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/agent-builder-api-tutorial
> Fetched: 2026-10-24.
>
> From the elastic/docs-content repo, main branch, with its snippet files inlined. Console form only (same HTTP rules as kibana-api.md).

Learn how to work with Elastic Agent Builder programmatically using the Kibana APIs. This tutorial walks you through creating custom tools and agents that can help users search and analyze data.

This tutorial assumes you have basic knowledge of:

- Elasticsearch indices and data structures
- REST APIs and JSON
- Basic ES|QL query syntax

By the end of this tutorial, you can:

- Create and run custom ES|QL tools tailored to specific use cases
- Build custom agents with specific instructions and tool sets
- Chat with agents programmatically using the converse API
- Manage conversations and clean up resources

## Before you begin

To build a custom agent with Elastic Agent Builder APIs, you need the following:

- Access to the feature in Kibana. Refer to [get started](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/get-started)
- [Permission](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/permissions) to create indices and use Elastic Agent Builder
- A [Elastic Agent Builder API key](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/api-keys) for authentication if you're using `curl`
**Note:**

  Set the required environment variables to simplify running `curl` commands:
  ```bash
  export KIBANA_URL="your-kibana-url"
  export ELASTICSEARCH_URL="your-elasticsearch-url"
  export API_KEY="your-api-key"
  ```

## Step 0: Set up sample data

Before working with agents and tools, create a sample dataset. This tutorial uses a collection of books to demonstrate how custom tools can efficiently query specific data.

Create an index with book data:

```console
PUT /kibana_sample_data_agents
{
  "mappings": {
    "properties": {
      "name": { "type": "text" },
      "author": { "type": "text" },
      "release_date": { "type": "date" },
      "page_count": { "type": "integer" }
    }
  }
}
```

Add sample book documents to the index:

```console
POST /_bulk
{ "index" : { "_index" : "kibana_sample_data_agents" } }
{"name": "Snow Crash", "author": "Neal Stephenson", "release_date": "1992-06-01", "page_count": 470}
{ "index" : { "_index" : "kibana_sample_data_agents" } }
{"name": "Revelation Space", "author": "Alastair Reynolds", "release_date": "2000-03-15", "page_count": 585}
{ "index" : { "_index" : "kibana_sample_data_agents" } }
{"name": "1984", "author": "George Orwell", "release_date": "1985-06-01", "page_count": 328}
{ "index" : { "_index" : "kibana_sample_data_agents" } }
{"name": "Fahrenheit 451", "author": "Ray Bradbury", "release_date": "1953-10-15", "page_count": 227}
{ "index" : { "_index" : "kibana_sample_data_agents" } }
{"name": "Brave New World", "author": "Aldous Huxley", "release_date": "1932-06-01", "page_count": 268}
{ "index" : { "_index" : "kibana_sample_data_agents" } }
{"name": "The Handmaids Tale", "author": "Margaret Atwood", "release_date": "1985-06-01", "page_count": 311}
```

### Result

You now have a `kibana_sample_data_agents` index with six books, ready for querying with custom tools.

## Step 1: Chat with the default agent

Start by chatting with the default agent to understand how Elastic Agent Builder works. The default agent has access to built-in tools that can query your data.

Send a message to the default agent:

```console
POST kbn://api/agent_builder/converse
{
  "input": "What books are in the kibana_sample_data_agents index?"
}
```

### Result

The agent responds with information about the books in your sample data. Notice the `token_usage` field in the response. To learn how to track token consumption, refer to [Monitor token usage](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/monitor-usage). You'll compare this with your custom agent later to see how specialized tools can reduce token consumption.

**Example response**

```json
{
  "conversation_id": "173bd57d-bb27-464c-86a3-09ecaf6bc8ef",
  "round_id": "a37100bc-3996-4be5-b874-7920a36e2ede",
  "status": "completed",
  "steps": [
    {
      "type": "reasoning",
      "reasoning": "The user is asking about books in a specific index (kibana_sample_data_agents). I'll search this index to retrieve the book information."
    },
    {
      "type": "tool_call",
      "tool_id": "platform.core.search",
      "params": {
        "query": "all books in kibana_sample_data_agents index",
        "index": "kibana_sample_data_agents"
      },
      "results": [
        {
          "type": "tabular_data",
          "data": {
            "columns": [
              { "name": "name", "type": "text" },
              { "name": "author", "type": "text" },
              { "name": "page_count", "type": "integer" },
              { "name": "release_date", "type": "date" }
            ],
            "values": [
              ["1984", "George Orwell", 328, "1985-06-01T00:00:00.000Z"],
              ["Brave New World", "Aldous Huxley", 268, "1932-06-01T00:00:00.000Z"],
              ["Fahrenheit 451", "Ray Bradbury", 227, "1953-10-15T00:00:00.000Z"],
              ["Revelation Space", "Alastair Reynolds", 585, "2000-03-15T00:00:00.000Z"],
              ["Snow Crash", "Neal Stephenson", 470, "1992-06-01T00:00:00.000Z"],
              ["The Handmaids Tale", "Margaret Atwood", 311, "1985-06-01T00:00:00.000Z"]
            ]
          }
        }
      ]
    }
  ],
  "model_usage": {
    "input_tokens": 30257,
    "output_tokens": 670
  },
  "response": {
    "message": "The **kibana_sample_data_agents** index contains 6 books:\n\n1. **1984** by George Orwell (328 pages, released June 1985)\n2. **Brave New World** by Aldous Huxley (268 pages, released June 1932)\n3. **Fahrenheit 451** by Ray Bradbury (227 pages, released October 1953)\n4. **Revelation Space** by Alastair Reynolds (585 pages, released March 2000)\n5. **Snow Crash** by Neal Stephenson (470 pages, released June 1992)\n6. **The Handmaid's Tale** by Margaret Atwood (311 pages, released June 1985)"
  }
}
```

## Step 2: Explore available tools

[Tools](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools) are reusable functions that agents use to perform specific tasks. Elastic Agent Builder includes built-in tools for common operations like searching indices and generating queries. You can also create custom tools.

List all available tools:

```console
GET kbn://api/agent_builder/tools
```

### Result

The response includes all available tools, including built-in platform tools like `platform.core.search`, `platform.core.generate_esql`, and others.

**Example response (truncated)**

```json
{
  "results": [
    {
      "id": "platform.core.search",
      "type": "builtin",
      "description": "A powerful tool for searching and analyzing data within your Elasticsearch cluster...",
      "configuration": {},
      "readonly": true
    },
    {
      "id": "platform.core.generate_esql",
      "type": "builtin",
      "description": "Generate an ES|QL query from a natural language query.",
      "configuration": {},
      "readonly": true
    },
    {
      "id": "platform.core.execute_esql",
      "type": "builtin",
      "description": "Execute an ES|QL query and return the results in a tabular format...",
      "configuration": {},
      "readonly": true
    },
    {
      "id": "platform.core.list_indices",
      "type": "builtin",
      "description": "List the indices, aliases and datastreams from the Elasticsearch cluster...",
      "configuration": {},
      "readonly": true
    }
  ]
}
```

## Step 3: Run a built-in tool

Use the built-in ES|QL generator tool to create a query for your sample data. This tool generates optimized ES|QL queries based on natural language descriptions.

Run the ES|QL generator tool:

```console
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "platform.core.generate_esql", <1>
  "tool_params": {
    "query": "Build an ES|QL query to get the book with the most pages", <2>
    "index": "kibana_sample_data_agents" <3>
  }
}
```
1. ID of the built-in ES|QL generator tool
2. Natural language description of the desired query
3. Index to query

### Result

The tool returns an ES|QL query similar to: `FROM kibana_sample_data_agents | SORT page_count DESC | LIMIT 1`. You'll use this query in the next step to create a custom tool.

**Example response**

```json
{
  "results": [
    {
      "type": "query",
      "data": {
        "esql": "FROM kibana_sample_data_agents\n| SORT page_count DESC\n| LIMIT 1"
      }
    },
    {
      "type": "other",
      "data": {
        "answer": "Here's the ES|QL query:\n\n```esql\nFROM kibana_sample_data_agents\n| SORT page_count DESC\n| LIMIT 1\n```\n\nThis query will return the book with the highest page count."
      }
    }
  ]
}
```

## Step 4: Create a custom ES|QL tool

Create a [custom ES|QL tool](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools/esql-tools) using the query from the previous step. Custom tools encapsulate specific queries or operations, making them reusable and efficient.

Create a tool that finds the book with the most pages:

```console
POST kbn://api/agent_builder/tools
{
  "id": "example-books-esql-tool", <1>
  "type": "esql", <2>
  "description": "An ES|QL query tool for getting the book with the most pages", <3>
  "configuration": {
    "query": "FROM kibana_sample_data_agents | SORT page_count DESC | LIMIT 1", <4>
    "params": {} <5>
  }
}
```
1. Unique identifier for the tool
2. Tool type - `esql` for ES|QL query tools
3. Description that helps agents understand when to use this tool
4. The ES|QL query to run
5. Query parameters (empty for this basic example)

### Result

The response confirms the tool was created with its full configuration.

**Example response**

```json
{
  "id": "example-books-esql-tool",
  "type": "esql",
  "description": "An ES|QL query tool for getting the book with the most pages",
  "tags": [],
  "configuration": {
    "query": "FROM kibana_sample_data_agents | SORT page_count DESC | LIMIT 1",
    "params": {}
  },
  "readonly": false,
  "schema": {
    "type": "object",
    "properties": {},
    "additionalProperties": false,
    "description": "Parameters needed to execute the query"
  }
}
```

## Step 5: Run your custom tool

Test your new custom tool to verify it works correctly.

Run the custom tool:

```console
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "example-books-esql-tool",
  "tool_params": {}
}
```

### Result

The response includes tabular data showing "Revelation Space" by Alastair Reynolds with 585 pages.

**Example response**

```json
{
  "results": [
    {
      "type": "query",
      "data": {
        "esql": "FROM kibana_sample_data_agents | SORT page_count DESC | LIMIT 1"
      }
    },
    {
      "type": "tabular_data",
      "data": {
        "source": "esql",
        "query": "FROM kibana_sample_data_agents | SORT page_count DESC | LIMIT 1",
        "columns": [
          { "name": "author", "type": "text" },
          { "name": "name", "type": "text" },
          { "name": "page_count", "type": "integer" },
          { "name": "release_date", "type": "date" }
        ],
        "values": [
          ["Alastair Reynolds", "Revelation Space", 585, "2000-03-15T00:00:00.000Z"]
        ]
      }
    }
  ]
}
```

## Step 6: Get a tool by ID

Retrieve the details of a specific tool using its ID.

Get the tool you created:

```console
GET kbn://api/agent_builder/tools/example-books-esql-tool
```

### Result

The response includes the full tool definition with all its configuration details.

## Step 7: Update the tool to accept parameters

Make your tool more flexible by adding parameters. This allows the same tool to handle different queries based on input values.

Update the tool to filter by year and limit results:

```console
PUT kbn://api/agent_builder/tools/example-books-esql-tool
{
  "description": "An ES|QL query tool for finding the longest books published before a certain year",
  "configuration": {
    "query": "FROM kibana_sample_data_agents | WHERE DATE_EXTRACT(\"year\", release_date) < ?maxYear | SORT page_count DESC | LIMIT ?limit", <1>
    "params": {
      "maxYear": { <2>
        "type": "integer",
        "description": "Maximum year to filter books (exclusive)"
      },
      "limit": { <3>
        "type": "integer",
        "description": "Maximum number of results to return"
      }
    }
  }
}
```
1. Query with parameterized placeholders (`?maxYear`, `?limit`)
2. Integer parameter for filtering by publication year
3. Integer parameter for limiting results

Run the updated tool with parameters:

```console
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "example-books-esql-tool",
  "tool_params": {
    "maxYear": 1960, <1>
    "limit": 2 <2>
  }
}
```
1. Find books published before 1960
2. Return only the top 2 results

### Result

The response shows "Brave New World" (268 pages, 1932) and "Fahrenheit 451" (227 pages, 1953), the two longest books published before 1960.

**Example response**

```json
{
  "results": [
    {
      "type": "query",
      "data": {
        "esql": "FROM kibana_sample_data_agents\n| WHERE DATE_EXTRACT(\"year\", release_date) < 1960\n| SORT page_count DESC\n| LIMIT 2"
      }
    },
    {
      "type": "tabular_data",
      "data": {
        "source": "esql",
        "query": "FROM kibana_sample_data_agents\n| WHERE DATE_EXTRACT(\"year\", release_date) < 1960\n| SORT page_count DESC\n| LIMIT 2",
        "columns": [
          { "name": "author", "type": "text" },
          { "name": "name", "type": "text" },
          { "name": "page_count", "type": "integer" },
          { "name": "release_date", "type": "date" }
        ],
        "values": [
          ["Aldous Huxley", "Brave New World", 268, "1932-06-01T00:00:00.000Z"],
          ["Ray Bradbury", "Fahrenheit 451", 227, "1953-10-15T00:00:00.000Z"]
        ]
      }
    }
  ]
}
```

## Step 8: Create a custom agent

[Agents](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/custom-agents) combine instructions with specific tools to handle user conversations effectively. Create an agent specialized for searching the books collection.

List all existing agents to see what's available:

```console
GET kbn://api/agent_builder/agents
```

Create a specialized agent for book searches:

```console
POST kbn://api/agent_builder/agents
{
  "id": "books-search-agent", <1>
  "name": "Books Search Helper", <2>
  "description": "Hi! I can help you search and analyze the books in our sample data collection.", <3>
  "labels": ["books", "sample-data", "search"], <4>
  "avatar_color": "#BFDBFF", <5>
  "avatar_symbol": "📚", <6>
  "configuration": {
    "instructions": "You are a helpful agent that assists users in searching and analyzing book data from the kibana_sample_data_agents index. Help users find books by author, title, or analyze reading patterns.", <7>
    "tools": [ <8>
      {
        "tool_ids": [
          "example-books-esql-tool",
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
1. Unique identifier for the agent
2. Display name shown in the UI
3. Greeting message users view when starting a conversation
4. Labels for organizing and filtering agents
5. Avatar background color (hex code)
6. Avatar symbol or emoji
7. System instructions that guide the agent's behavior
8. Tools the agent can use - includes your custom tool and built-in tools

### Result

The response confirms the agent was created with its full configuration.

**Example response**

```json
{
  "id": "books-search-agent",
  "type": "chat",
  "name": "Books Search Helper",
  "description": "Hi! I can help you search and analyze the books in our sample data collection.",
  "labels": ["books", "sample-data", "search"],
  "avatar_color": "#BFDBFF",
  "avatar_symbol": "📚",
  "configuration": {
    "instructions": "You are a helpful agent that assists users in searching and analyzing book data from the kibana_sample_data_agents index. Help users find books by author, title, or analyze reading patterns.",
    "tools": [
      {
        "tool_ids": [
          "example-books-esql-tool",
          "platform.core.search",
          "platform.core.list_indices",
          "platform.core.get_index_mapping",
          "platform.core.get_document_by_id"
        ]
      }
    ]
  },
  "readonly": false
}
```

## Step 9: Get an agent by ID

Retrieve the details of a specific agent using its ID.

Get the agent you created:

```console
GET kbn://api/agent_builder/agents/books-search-agent
```

### Result

The response includes the full agent definition with all its configuration details.

## Step 10: Update an agent

Update your agent's configuration, such as changing its description or labels.

Update the agent's description:

```console
PUT kbn://api/agent_builder/agents/books-search-agent
{
  "name": "Books Search Helper",
  "description": "Updated - Search and analyze our sample books collection with ease!",
  "labels": ["books", "sample-data", "search", "updated"]
}
```

### Result

The response confirms the agent was updated with the new configuration.

## Step 11: Chat with your custom agent

Test your new agent by asking it questions about the book collection. The agent uses your custom tool and built-in tools to answer queries.

Start a conversation with the custom agent:

```console
POST kbn://api/agent_builder/converse
{
  "input": "What books do we have in our collection?",
  "agent_id": "books-search-agent" <1>
}
```

1. Specify your custom agent ID

### Result

The agent responds with information about your book collection. Note the `conversation_id` in the response - you'll use this to continue the conversation.

**Example response (truncated)**

```json
{
  "conversation_id": "e5b4e3ff-f5c9-4f52-9001-87b403df1a6a",
  "round_id": "145aeacf-fa04-4d3d-a93c-141b5c2463fe",
  "status": "completed",
  "steps": [
    {
      "type": "reasoning",
      "reasoning": "The user is asking about books in the collection. I should search the kibana_sample_data_agents index."
    },
    {
      "type": "tool_call",
      "tool_id": "platform.core.search",
      "params": {
        "query": "list all books in kibana_sample_data_agents index",
        "index": "kibana_sample_data_agents"
      },
      "results": [
        {
          "type": "tabular_data",
          "data": {
            "columns": [
              { "name": "name", "type": "text" },
              { "name": "author", "type": "text" },
              { "name": "page_count", "type": "integer" },
              { "name": "release_date", "type": "date" }
            ],
            "values": [
              ["1984", "George Orwell", 328, "1985-06-01T00:00:00.000Z"],
              ["Brave New World", "Aldous Huxley", 268, "1932-06-01T00:00:00.000Z"],
              ["Fahrenheit 451", "Ray Bradbury", 227, "1953-10-15T00:00:00.000Z"],
              ["Revelation Space", "Alastair Reynolds", 585, "2000-03-15T00:00:00.000Z"],
              ["Snow Crash", "Neal Stephenson", 470, "1992-06-01T00:00:00.000Z"],
              ["The Handmaids Tale", "Margaret Atwood", 311, "1985-06-01T00:00:00.000Z"]
            ]
          }
        }
      ]
    }
  ],
  "model_usage": {
    "input_tokens": 30345,
    "output_tokens": 704
  },
  "response": {
    "message": "Your collection contains **6 books**:\n\n1. **1984** by George Orwell (328 pages, released June 1985)\n2. **Brave New World** by Aldous Huxley (268 pages, released June 1932)\n3. **Fahrenheit 451** by Ray Bradbury (227 pages, released October 1953)\n4. **Revelation Space** by Alastair Reynolds (585 pages, released March 2000)\n5. **Snow Crash** by Neal Stephenson (470 pages, released June 1992)\n6. **The Handmaid's Tale** by Margaret Atwood (311 pages, released June 1985)"
  }
}
```

Continue the conversation using the custom tool:

```console
POST kbn://api/agent_builder/converse
{
  "input": "Can you find the longest book published before 1960?",
  "agent_id": "books-search-agent",
  "conversation_id": "<CONVERSATION_ID>" <1>
}
```

1. Use the conversation ID from the previous response to maintain context

### Result

The agent uses your custom `example-books-esql-tool` to efficiently answer the query in a single step. Compare the `token_usage` in this response with Step 1. Custom tools optimized for specific use cases typically consume fewer tokens than general-purpose agents. To learn more about token consumption, refer to [Monitor token usage](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/monitor-usage).

### Handle a human-in-the-loop prompt

When an agent calls a tool that requires your confirmation, the response has an `awaiting_prompt` status and includes the prompt in `response.prompts`:

```json
{
  "conversation_id": "<CONVERSATION_ID>",
  "round_id": "<ROUND_ID>",
  "status": "awaiting_prompt",
  "response": {
    "prompts": [
      {
        "type": "confirmation",
        "id": "<PROMPT_ID>",
        "title": "Permission to call tool",
        "message": "Agent wants to call tool \"<TOOL_ID>\". Do you want to proceed?"
      }
    ]
  }
}
```

To respond, call the converse API again with the same conversation ID and map the exact prompt ID to your response:

```console
POST kbn://api/agent_builder/converse
{
  "agent_id": "books-search-agent",
  "conversation_id": "<CONVERSATION_ID>",
  "prompts": {
    "<PROMPT_ID>": {
      "allow": true
    }
  }
}
```

Set `allow` to `false` to deny the action. This request resumes the existing conversation round. It does not start a new user turn. To learn about the prompt types shown in chat, refer to [Human-in-the-loop prompts](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/chat#human-in-the-loop-prompts).

**Tip:**

For real-time chat responses, use the [streaming converse API](https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-agent-builder-converse-async) instead.

## Step 12: Manage conversations

View and manage your conversation history with agents.

List all conversations:

```console
GET kbn://api/agent_builder/conversations
```

Get the full history of a specific conversation:

```console
GET kbn://api/agent_builder/conversations/<CONVERSATION_ID> <1>
```

1. Replace with an actual conversation ID from the previous step

### Result

The response includes the complete conversation history with all messages, tool calls, and responses.

## Step 13: Clean up resources (optional)

Remove the resources created in this tutorial when you no longer need them.

Delete the conversation:

```console
DELETE kbn://api/agent_builder/conversations/<CONVERSATION_ID>
```

Delete the custom agent:

```console
DELETE kbn://api/agent_builder/agents/books-search-agent
```

Delete the custom tool:

```console
DELETE kbn://api/agent_builder/tools/example-books-esql-tool
```

Delete the sample index:

```console
DELETE /kibana_sample_data_agents
```

### Result

All resources created during this tutorial are now removed.

## Summary

In this tutorial, you learned how to:

- Create custom ES|QL tools with and without parameters
- Run tools directly using the tools API
- Build custom agents with specific instructions and tool sets
- Chat with agents programmatically using the converse API
- Manage conversation history

Custom tools optimized for specific use cases can significantly reduce token consumption and improve response accuracy compared to general-purpose agents with many tools. By tailoring agents and tools to your specific data and workflows, you create more efficient and effective AI-powered experiences.

## Next steps

- Explore [streaming responses](https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-agent-builder-converse-async) for real-time chat experiences
- Learn about [other tool types](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools) beyond ES|QL, including [index search tools](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools/index-search-tools), [MCP tools](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools/mcp-tools), and [workflow tools](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools/workflow-tools)
- Try the [MCP server](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/mcp-server) to connect external AI clients like Claude Desktop to your agents
- Review [best practices for prompt engineering](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/prompt-engineering) to optimize your agents

## Related pages

- [Elastic Agent Builder Kibana APIs overview](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/kibana-api)
- [Kibana API reference](https://www.elastic.co/docs/api/doc/kibana/group/endpoint-agent-builder)
- [Custom agents](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/custom-agents)
- [Tools reference](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools)
