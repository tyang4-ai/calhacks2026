# Agent Builder API reference: tools

> Sources:
> - https://www.elastic.co/docs/api/doc/kibana/group/endpoint-agent-builder
> - https://github.com/elastic/kibana/blob/main/oas_docs/output/kibana.serverless.yaml
> Fetched: 2026-10-24.
>
> Generated from the Kibana Serverless OpenAPI spec (main branch, Oct 24, 2026) for every path under `/api/agent_builder/tools`.
> Each operation lists its parameters, the request body fields, and the example requests and responses from the spec.
> Every call needs `Authorization: ApiKey <key>`. POST, PUT and DELETE also need `kbn-xsrf: true`. In a non-default space, prefix the path with `/s/<space_id>`.

### GET `/api/agent_builder/tools`

**List tools.** List all available tools. Use this endpoint to retrieve complete tool definitions including their schemas and configuration requirements. To learn more about Agent Builder tools, refer to the [tools documentation](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools).

[Required authorization] Route required privileges: agentBuilder:read.

Example response 200 (Example response returning a list of existing tools):
```json
{
  "results": [
    {
      "configuration": {},
      "description": "A powerful tool for searching and analyzing data within your Elasticsearch cluster.\nIt supports both full-text relevance searches and structured analytical queries.\n\nUse this tool for any query that involves finding documents, counting, aggregating, or summarizing data from a known index.\n\nExamples of queries:\n- \"find articles about serverless architecture\"\n- \"search for support tickets mentioning 'billing issue' or 'refund request'\"\n- \"what is our policy on parental leave?\"\n- \"list all products where the category is 'electronics'\"\n- \"show me the last 5 documents from that index\"\n- \"show me the sales over the last year break down by month\"\n\nNote:\n- The 'index' parameter can be used to specify which index to search against.\n If not provided, the tool will decide itself which is the best index to use.\n- It is perfectly fine not to specify the 'index' parameter. It should only be specified when you already\n know about the index and fields you want to search on, e.g. if the user explicitly specified it.",
      "id": "platform.core.search",
      "readonly": true,
      "schema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "additionalProperties": false,
        "type": "object",
        "properties": {
          "index": {
            "description": "(optional) Index to search against. If not provided, will automatically select the best index to use based on the query.",
            "type": "string"
          },
          "query": {
            "description": "A natural language query expressing the search request",
            "type": "string"
          }
        },
        "required": [
          "query"
        ]
      },
      "tags": [],
      "type": "builtin"
    },
    {
      "configuration": {},
      "description": "Retrieve the full content (source) of an Elasticsearch document based on its ID and index name.",
      "id": "platform.core.get_document_by_id",
      "readonly": true,
      "schema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "additionalProperties": false,
        "type": "object",
        "properties": {
          "id": {
            "description": "ID of the document to retrieve",
            "type": "string"
          },
          "index": {
            "description": "Name of the index to retrieve the document from",
            "type": "string"
          }
        },
        "required": [
          "id",
          "index"
        ]
      },
      "tags": [],
      "type": "builtin"
    },
    {
      "configuration": {},
      "description": "Execute an ES|QL query and return the results in a tabular format.\n\n## Usage\n\nThis tool runs an ES|QL query; it does not write one.\n\n### Where the query comes from\n\nBy default, when you need a new query, use the `platform_core_generate_esql` tool rather than writing it yourself: it inspects the target data and applies ES|QL guidance that is easy to get wrong when writing a query from memory.\nAdapting an earlier query to a new question, such as another metric or field, counts as writing a new query: call `platform_core_generate_esql` again for each new question.\n\nYou can run a query as-is when it comes from:\n- the user,\n- your instructions or a skill you loaded, such as a query template,\n- the result of another tool, or an attachment.\n\nThese are default guidelines. If your instructions or a skill you loaded tell you to write ES|QL queries yourself and run them with this tool, do so. Do the same if the `platform_core_generate_esql` tool is not available to you.",
      "id": "platform.core.execute_esql",
      "readonly": true,
      "schema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "additionalProperties": false,
        "type": "object",
        "properties": {
          "query": {
            "description": "The ES|QL query to execute",
            "type": "st
... (truncated)
```

### POST `/api/agent_builder/tools`

**Create a tool.** Create a new tool. Use this endpoint to define a custom tool with specific functionality and configuration for use by agents. To learn more about Agent Builder tools, refer to the [tools documentation](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools).

[Required authorization] Route required privileges: agentBuilder:manageTools.

Parameters:
- `kbn-xsrf` (header, string, required): A required header to protect against CSRF attacks

Request body:
- `configuration`, object, required: Tool-specific configuration parameters. See examples for details.
- `confirmation`, object: Optional tool call policy to control tool call confirmation behavior
  - `askUser`, string, one of `once`, `always`, `never`
- `description`, string, default `""`: Description of what the tool does.
- `id`, string, required: Unique identifier for the tool.
- `tags`, array of string, default `[]`: Optional tags for categorizing and organizing tools.
- `type`, string, required, one of `esql`, `index_search`, `workflow`, `mcp`: The type of tool to create (e.g., esql, index_search).

Example request (Example request to create an ESQL query tool with a pre-defined query):
```json
{
  "configuration": {
    "params": {
      "limit": {
        "description": "Maximum number of results to return",
        "type": "integer"
      },
      "startTime": {
        "description": "Start time for the analysis in ISO format",
        "type": "date"
      }
    },
    "query": "FROM financial_trades | WHERE execution_timestamp >= ?startTime | STATS trade_count=COUNT(*), avg_price=AVG(execution_price) BY symbol | SORT trade_count DESC | LIMIT ?limit"
  },
  "description": "Example ES|QL query tool for analyzing financial trades with time filtering",
  "id": "example-esql-tool",
  "tags": [
    "analytics",
    "finance"
  ],
  "type": "esql"
}
```

Example request (Example request to create an index_search tool with a pre-defined index pattern):
```json
{
  "configuration": {
    "pattern": "financial_*"
  },
  "description": "Search tool specifically for financial data analysis and reporting",
  "id": "example-index-search-tool",
  "tags": [
    "search",
    "finance"
  ],
  "type": "index_search"
}
```

Example response 200 (Example response returning a definition of ESQL tool created):
```json
{
  "configuration": {
    "params": {
      "limit": {
        "description": "Maximum number of results to return",
        "type": "integer"
      },
      "startTime": {
        "description": "Start time for the analysis in ISO format",
        "type": "date"
      }
    },
    "query": "FROM financial_trades | WHERE execution_timestamp >= ?startTime | STATS trade_count=COUNT(*), avg_price=AVG(execution_price) BY symbol | SORT trade_count DESC | LIMIT ?limit"
  },
  "description": "Example ES|QL query tool for analyzing financial trades with time filtering",
  "id": "example-esql-tool",
  "readonly": false,
  "schema": {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "additionalProperties": false,
    "description": "Parameters needed to execute the query",
    "type": "object",
    "properties": {
      "limit": {
        "description": "Maximum number of results to return",
        "type": "integer"
      },
      "startTime": {
        "description": "Start time for the analysis in ISO format",
        "format": "date-time",
        "type": "string"
      }
    },
    "required": [
      "startTime",
      "limit"
    ]
  },
  "tags": [
    "analytics",
    "finance"
  ],
  "type": "esql"
}
```

Example response 200 (Example response returning a definition of search tool tool created):
```json
{
  "configuration": {
    "pattern": "financial_*"
  },
  "description": "Search tool specifically for financial data analysis and reporting",
  "id": "example-index-search-tool",
  "readonly": false,
  "schema": {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "additionalProperties": false,
    "type": "object",
    "properties": {
      "nlQuery": {
        "description": "A natural language query expressing the search request",
        "type": "string"
      }
    },
    "required": [
      "nlQuery"
    ]
  },
  "tags": [
    "search",
    "finance"
  ],
  "type": "index_search"
}
```

### POST `/api/agent_builder/tools/_execute`

**Run a tool.** Run a tool with parameters. Use this endpoint to run a tool directly with specified inputs and optional external connector integration. To learn more about Agent Builder tools, refer to the [tools documentation](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools).

[Required authorization] Route required privileges: agentBuilder:read.

Parameters:
- `kbn-xsrf` (header, string, required): A required header to protect against CSRF attacks

Request body:
- `approvals`, object: Actions the tool run may take that would otherwise need a live user to approve them. Applies to this run and any sub-agents it spawns.
  - `auto_approved_apis`, object: Destructive Elasticsearch or Kibana APIs the tool may call without a user confirmation, keyed by backend. A tool run has no live user to answer the confirmation prompt, so a destructive API is refused unless it is listed here.
    - `elasticsearch`, array of string: Elasticsearch APIs pre-approved for this run. Each entry is an exact identifier formed from the namespace and name (for example `indices.create`), a namespace wildcard (for example `indices.*`), or `*` for every Elasticsearch API.
    - `kibana`, array of string: Kibana APIs pre-approved for this run. Each entry is an exact identifier formed from the namespace and name (for example `alerting.delete-alerting-rule-id`), a namespace wildcard (for example `alerting.*`), or `*` for every Kibana API.
- `connector_id`, string: Optional connector ID for tools that require external integrations.
- `tool_id`, string, required: The ID of the tool to execute.
- `tool_params`, object, required: Parameters to pass to the tool execution. See examples for details

Example request (Example request executing platform.core.execute_esql tool):
```json
{
  "tool_id": "platform.core.execute_esql",
  "tool_params": {
    "query": "FROM financial_trades | LIMIT 3"
  }
}
```

Example request (Example request executing platform.core.get_document_by_id tool):
```json
{
  "tool_id": "platform.core.get_document_by_id",
  "tool_params": {
    "id": "TRD-20250805-0820a89f",
    "index": "financial_trades"
  }
}
```

Example request (Example request executing custom example-esql-tool tool):
```json
{
  "tool_id": "example-esql-tool",
  "tool_params": {
    "limit": 3,
    "startTime": "2024-01-01T00:00:00Z"
  }
}
```

Example request (Example request executing custom example-index-search-tool tool):
```json
{
  "tool_id": "example-index-search-tool",
  "tool_params": {
    "nlQuery": "find trades with high execution prices above 100"
  }
}
```

Example response 200 (Example response calling built-in platform.core.execute_esql tool):
```json
{
  "results": [
    {
      "data": {
        "esql": "FROM financial_trades | LIMIT 3"
      },
      "type": "query"
    },
    {
      "data": {
        "columns": [
          {
            "name": "account_id",
            "type": "keyword"
          },
          {
            "name": "execution_price",
            "type": "double"
          },
          {
            "name": "symbol",
            "type": "keyword"
          },
          {
            "name": "trade_type",
            "type": "keyword"
          }
        ],
        "query": "FROM financial_trades | LIMIT 3",
        "source": "esql",
        "values": [
          [
            "ACC00179-1f91",
            43.77000045776367,
            "CVX",
            "sell"
          ],
          [
            "ACC00407-0bbb",
            660.4199829101562,
            "V",
            "buy"
          ],
          [
            "ACC00179-1f91",
            440.3599853515625,
            "KO",
            "buy"
          ]
        ]
      },
      "tool_result_id": "xTpT",
      "type": "esql_results"
    }
  ]
}
```

Example response 200 (Example response calling built-in platform.core.get_document_by_id tool):
```json
{
  "results": [
    {
      "data": {
        "content": {
          "account_id": "ACC00271-fb5c",
          "execution_price": 488.54,
          "execution_timestamp": "2025-08-05T08:04:11.649855",
          "last_updated": "2025-09-15T13:23:36",
          "order_status": "executed",
          "order_type": "market",
          "quantity": 131,
          "status_reason": "fully_filled",
          "symbol": "EWL",
          "trade_cost": 63998.74,
          "trade_id": "TRD-20250805-0820a89f",
          "trade_type": "sell"
        },
        "partial": false,
        "reference": {
          "id": "TRD-20250805-0820a89f",
          "index": "financial_trades"
        }
      },
      "type": "resource"
    }
  ]
}
```

Example response 200 (Example response calling custom example-esql-tool tool):
```json
{
  "results": [
    {
      "data": {
        "columns": [
          {
            "name": "trade_count",
            "type": "long"
          },
          {
            "name": "avg_price",
            "type": "double"
          },
          {
            "name": "symbol",
            "type": "keyword"
          }
        ],
        "query": "FROM financial_trades | WHERE execution_timestamp >= ?startTime | STATS trade_count=COUNT(*), avg_price=AVG(execution_price) BY symbol | SORT trade_count DESC | LIMIT ?limit",
        "source": "esql",
        "values": [
          [
            2115,
            89.33911587329621,
            "US_T_BOND_20YR"
          ],
          [
            2112,
            104.20854155945055,
            "INTL_CORP_ASIA_D"
          ],
          [
            2105,
            89.93244177666526,
            "INTL_CORP_EU_B"
          ]
        ]
      },
      "tool_result_id": "Voy8",
      "type": "esql_results"
    }
  ]
}
```

Example response 200 (Example response calling custom example-index-search-tool tool):
```json
{
  "results": [
    {
      "data": {
        "esql": "FROM financial_trades\n| WHERE execution_price > 100\n| LIMIT 100"
      },
      "type": "query"
    },
    {
      "data": {
        "columns": [
          {
            "name": "account_id",
            "type": "keyword"
          },
          {
            "name": "execution_price",
            "type": "double"
          },
          {
            "name": "execution_timestamp",
            "type": "date"
          },
          {
            "name": "symbol",
            "type": "keyword"
          },
          {
            "name": "trade_type",
            "type": "keyword"
          }
        ],
        "query": "FROM financial_trades\n| WHERE execution_price > 100\n| LIMIT 100",
        "source": "esql",
        "values": [
          [
            "ACC00407-0bbb",
            660.4199829101562,
            "2020-09-25T11:06:08.687Z",
            "V",
            "buy"
          ],
          [
            "ACC00179-1f91",
            440.3599853515625,
            "2025-08-07T21:56:45.377Z",
            "KO",
            "buy"
          ],
          [
            "ACC00407-0bbb",
            132.8800048828125,
            "2020-11-19T04:39:13.655Z",
            "JAP_JGB_10YR",
            "sell"
          ]
        ]
      },
      "tool_result_id": "uE8y",
      "type": "esql_results"
    }
  ]
}
```

### GET `/api/agent_builder/tools/{toolId}`

**Get a tool by id.** Get a specific tool by ID. Use this endpoint to retrieve the complete tool definition including its schema and configuration requirements. To learn more about Agent Builder tools, refer to the [tools documentation](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools).

[Required authorization] Route required privileges: agentBuilder:read.

Parameters:
- `toolId` (path, string, required): The unique identifier of the tool to retrieve.

Example response 200 (Example response returning built-in platform.core.search tool):
```json
{
  "configuration": {},
  "description": "A powerful tool for searching and analyzing data within your Elasticsearch cluster.\nIt supports both full-text relevance searches and structured analytical queries.\n\nUse this tool for any query that involves finding documents, counting, aggregating, or summarizing data from a known index.\n\nExamples of queries:\n- \"find articles about serverless architecture\"\n- \"search for support tickets mentioning 'billing issue' or 'refund request'\"\n- \"what is our policy on parental leave?\"\n- \"list all products where the category is 'electronics'\"\n- \"show me the last 5 documents from that index\"\n- \"show me the sales over the last year break down by month\"\n\nNote:\n- The 'index' parameter can be used to specify which index to search against.\n If not provided, the tool will decide itself which is the best index to use.\n- It is perfectly fine not to specify the 'index' parameter. It should only be specified when you already\n know about the index and fields you want to search on, e.g. if the user explicitly specified it.",
  "id": "platform.core.search",
  "readonly": true,
  "schema": {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "additionalProperties": false,
    "type": "object",
    "properties": {
      "index": {
        "description": "(optional) Index to search against. If not provided, will automatically select the best index to use based on the query.",
        "type": "string"
      },
      "query": {
        "description": "A natural language query expressing the search request",
        "type": "string"
      }
    },
    "required": [
      "query"
    ]
  },
  "tags": [],
  "type": "builtin"
}
```

Example response 200 (Example response returning custom example-esql-tool tool):
```json
{
  "configuration": {
    "params": {
      "limit": {
        "description": "Maximum number of results to return",
        "type": "integer"
      },
      "startTime": {
        "description": "Start time for the analysis in ISO format",
        "type": "date"
      }
    },
    "query": "FROM financial_trades | WHERE execution_timestamp >= ?startTime | STATS trade_count=COUNT(*), avg_price=AVG(execution_price) BY symbol | SORT trade_count DESC | LIMIT ?limit"
  },
  "description": "Example ES|QL query tool for analyzing financial trades with time filtering",
  "id": "example-esql-tool",
  "readonly": false,
  "schema": {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "additionalProperties": false,
    "description": "Parameters needed to execute the query",
    "type": "object",
    "properties": {
      "limit": {
        "description": "Maximum number of results to return",
        "type": "integer"
      },
      "startTime": {
        "description": "Start time for the analysis in ISO format",
        "format": "date-time",
        "type": "string"
      }
    },
    "required": [
      "startTime",
      "limit"
    ]
  },
  "tags": [
    "analytics",
    "finance"
  ],
  "type": "esql"
}
```

Example response 200 (Example response returning custom example-index-search-tool tool):
```json
{
  "configuration": {
    "pattern": "financial_*"
  },
  "description": "Search tool specifically for financial data analysis and reporting",
  "id": "example-index-search-tool",
  "readonly": false,
  "schema": {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "additionalProperties": false,
    "type": "object",
    "properties": {
      "nlQuery": {
        "description": "A natural language query expressing the search request",
        "type": "string"
      }
    },
    "required": [
      "nlQuery"
    ]
  },
  "tags": [
    "search",
    "finance"
  ],
  "type": "index_search"
}
```

### PUT `/api/agent_builder/tools/{toolId}`

**Update a tool.** Update an existing tool. Use this endpoint to modify any aspect of the tool's configuration or metadata. To learn more about Agent Builder tools, refer to the [tools documentation](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools).

[Required authorization] Route required privileges: agentBuilder:manageTools.

Parameters:
- `kbn-xsrf` (header, string, required): A required header to protect against CSRF attacks
- `toolId` (path, string, required): The unique identifier of the tool to update.

Request body:
- `configuration`, object: Updated tool-specific configuration parameters. See examples for details.
- `confirmation`, object: Updated tool call policy to control tool call confirmation behavior
  - `askUser`, string, one of `once`, `always`, `never`
- `description`, string: Updated description of what the tool does.
- `tags`, array of string: Updated tags for categorizing and organizing tools.

Example request (Example request to update the custom ESQL tool):
```json
{
  "configuration": {
    "params": {
      "limit": {
        "description": "Maximum number of results to return",
        "type": "integer"
      },
      "startTime": {
        "description": "Start time for the analysis in ISO format",
        "type": "date"
      },
      "symbolPattern": {
        "description": "Pattern to filter symbols (e.g., 'US_*' for US instruments)",
        "type": "keyword"
      }
    },
    "query": "FROM financial_trades | WHERE execution_timestamp >= ?startTime AND symbol LIKE ?symbolPattern | STATS trade_count=COUNT(*), avg_price=AVG(execution_price), total_volume=SUM(quantity) BY symbol | SORT trade_count DESC | LIMIT ?limit"
  },
  "description": "Updated ES|QL query tool for comprehensive financial analysis with enhanced filtering",
  "tags": [
    "analytics",
    "finance",
    "reporting"
  ]
}
```

Example request (Example request to update the custom Search tool):
```json
{
  "description": "Updated search tool for comprehensive financial data analysis, reporting, and compliance monitoring",
  "tags": [
    "search",
    "finance",
    "compliance",
    "reporting"
  ]
}
```

Example response 200 (Example response showing the updated ESQL tool):
```json
{
  "configuration": {
    "params": {
      "limit": {
        "description": "Maximum number of results to return",
        "type": "integer"
      },
      "startTime": {
        "description": "Start time for the analysis in ISO format",
        "type": "date"
      },
      "symbolPattern": {
        "description": "Pattern to filter symbols (e.g., 'US_*' for US instruments)",
        "type": "keyword"
      }
    },
    "query": "FROM financial_trades | WHERE execution_timestamp >= ?startTime AND symbol LIKE ?symbolPattern | STATS trade_count=COUNT(*), avg_price=AVG(execution_price), total_volume=SUM(quantity) BY symbol | SORT trade_count DESC | LIMIT ?limit"
  },
  "description": "Updated ES|QL query tool for comprehensive financial analysis with enhanced filtering",
  "id": "example-esql-tool",
  "readonly": false,
  "schema": {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "additionalProperties": false,
    "description": "Parameters needed to execute the enhanced query",
    "type": "object",
    "properties": {
      "limit": {
        "description": "Maximum number of results to return",
        "type": "integer"
      },
      "startTime": {
        "description": "Start time for the analysis in ISO format",
        "format": "date-time",
        "type": "string"
      },
      "symbolPattern": {
        "description": "Pattern to filter symbols (e.g., 'US_*' for US instruments)",
        "type": "string"
      }
    },
    "required": [
      "startTime",
      "symbolPattern",
      "limit"
    ]
  },
  "tags": [
    "analytics",
    "finance",
    "reporting"
  ],
  "type": "esql"
}
```

Example response 200 (Example response showing the updated Search tool):
```json
{
  "configuration": {
    "pattern": "financial_*"
  },
  "description": "Updated search tool for comprehensive financial data analysis, reporting, and compliance monitoring",
  "id": "example-index-search-tool",
  "readonly": false,
  "schema": {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "additionalProperties": false,
    "type": "object",
    "properties": {
      "nlQuery": {
        "description": "A natural language query expressing the search request",
        "type": "string"
      }
    },
    "required": [
      "nlQuery"
    ]
  },
  "tags": [
    "search",
    "finance",
    "compliance",
    "reporting"
  ],
  "type": "index_search"
}
```

### DELETE `/api/agent_builder/tools/{toolId}`

**Delete a tool.** Delete a tool by ID. This action cannot be undone. To learn more about Agent Builder tools, refer to the [tools documentation](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools).

[Required authorization] Route required privileges: agentBuilder:manageTools.

Parameters:
- `kbn-xsrf` (header, string, required): A required header to protect against CSRF attacks
- `toolId` (path, string, required): The unique identifier of the tool to delete.
- `force` (query, boolean): If true, removes the tool from agents that use it and then deletes it. If false and any agent uses the tool, the request returns 409 Conflict with the list of agents.

Example response 200 (Example response showing that the deletion operation was successful):
```json
{
  "success": true
}
```
