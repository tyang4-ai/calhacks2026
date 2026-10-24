# Create API keys for the Agent Builder APIs

> Source: https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/api-keys
> Fetched: 2026-10-24.
>
> From the elastic/docs-content repo, main branch. On Serverless, a project API key works for both the Elasticsearch and the Kibana APIs.

Use an API key to authenticate applications that call Elastic Agent Builder programmatically, including custom clients, scripts that use `curl`, [MCP clients](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/mcp-server), and [A2A clients](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/a2a-server).

API keys use the same Kibana feature privileges as roles. The role management UI displays names such as **Agent Builder: Read**, while an API key role descriptor uses the corresponding application privilege name, such as `feature_agentBuilder.read`.

## Before you begin

Before creating an API key:

- Make sure the user creating the key has the `manage_api_key` or `manage_own_api_key` cluster privilege.
- Create the key as a user, not by authenticating the request with another API key. An API key can create only a derived key with no privileges.
- Make sure the user creating the key has every privilege that you assign to the key. An API key cannot grant more privileges than its owner has.
- Identify the Kibana [space](https://www.elastic.co/docs/deploy-manage/manage-spaces) that the client will access. The examples use the default space.
- Identify the index patterns that agents and tools need to query. Replace `customer-*` in the examples with your own patterns.
- Determine whether agents use Elasticsearch inference endpoints, Kibana connectors, or workflows. These features require additional privileges.
- Refer to the [privilege reference](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/permissions#privilege-reference) for the exact privilege names to use in a role descriptor.
- After you create the key, copy and securely store its `encoded` value. You cannot retrieve it later.
- If you're using `curl`, set the Elasticsearch URL, Kibana URL, and username:

  ```bash
  export ELASTICSEARCH_URL="https://<elasticsearch-host>" <1>
  export KIBANA_URL="https://<kibana-host>" <2>
  export ELASTIC_USERNAME="<username>" <3>
  ```

  1. Use `ELASTICSEARCH_URL` to create API keys with the Elasticsearch `/_security/api_key` API. To locate it, refer to [Find your Elasticsearch endpoint](https://www.elastic.co/docs/solutions/elasticsearch-solution-project/search-connection-details).
  2. Use `KIBANA_URL` to call the Elastic Agent Builder APIs under `/api/agent_builder`.
  3. `ELASTIC_USERNAME` is the username of the user creating the key. The `curl` examples prompt you for this user's password.

**Note:**

The `curl` examples authenticate directly to Elasticsearch with a username and password. Serverless does not support this authentication method, so create the key in Console or the **API keys** UI instead.

## Create a read-only client key

The following example creates a key for a client that can use agents and view Elastic Agent Builder components, but cannot create, update, or delete them. The key can read data only from indices matching `customer-*`.

Run the following request in [Console](https://www.elastic.co/docs/explore-analyze/query-filter/tools/console). The key is owned by the user who is signed in to Kibana:

```console
POST /_security/api_key
{
  "name": "agent-builder-read-only",
  "expiration": "30d",
  "role_descriptors": {
    "agent-builder-read-only": {
      "cluster": ["monitor_inference"], <1>
      "indices": [
        {
          "names": ["customer-*"], <2>
          "privileges": ["read", "view_index_metadata"]
        }
      ],
      "applications": [
        {
          "application": "kibana-.kibana", <3>
          "privileges": [
            "feature_agentBuilder.read", <4>
            "feature_actions.read",
            "feature_workflowsManagement.read"
          ],
          "resources": ["space:default"] <5>
        }
      ]
    }
  }
}
```

1. `monitor_inference` is required when agents or tools call the Elasticsearch Inference API. Remove it if they do not.
2. Replace `customer-*` with the index patterns that the client needs. The assigned index privileges allow reads and access to index mappings, but not writes.
3. Use `kibana-.kibana` as the application name for Kibana feature privileges.
4. `feature_agentBuilder.read` provides read-only access to Elastic Agent Builder. The other two privileges provide read-only access to connectors and workflows.
5. Replace `space:default` if the client uses a different Kibana space.

**API keys UI:**

1. Go to the **API keys** management page in the navigation menu or use the [global search field](https://www.elastic.co/docs/explore-analyze/find-and-organize/find-apps-and-objects), then select **Create API key**.
2. Enter a name and expiration for the key.
3. Enable **Control security privileges**.
4. Paste the following role descriptor into the editor, then create the key:

```json
{
  "agent-builder-read-only": {
    "cluster": ["monitor_inference"], <1>
    "indices": [
      {
        "names": ["customer-*"], <2>
        "privileges": ["read", "view_index_metadata"]
      }
    ],
    "applications": [
      {
        "application": "kibana-.kibana", <3>
        "privileges": [
          "feature_agentBuilder.read", <4>
          "feature_actions.read",
          "feature_workflowsManagement.read"
        ],
        "resources": ["space:default"] <5>
      }
    ]
  }
}
```

1. `monitor_inference` is required when agents or tools call the Elasticsearch Inference API. Remove it if they do not.
2. Replace `customer-*` with the index patterns that the client needs. The assigned index privileges allow reads and access to index mappings, but not writes.
3. Use `kibana-.kibana` as the application name for Kibana feature privileges.
4. `feature_agentBuilder.read` provides read-only access to Elastic Agent Builder. The other two privileges provide read-only access to connectors and workflows.
5. Replace `space:default` if the client uses a different Kibana space.

Remove privileges that the client does not need:

- Remove `feature_actions.read` if agents do not use Kibana connectors.
- Remove `feature_workflowsManagement.read` if agents do not interact with workflows.
- Add `feature_workflowsManagement.workflow_execute` if any agent uses a [workflow tool](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools/workflow-tools). Read access lets an agent reference a workflow; running one requires the execute privilege.
- Remove `monitor_inference` if agents and tools do not call the Elasticsearch Inference API.

## Create a key with management access

This example allows a client to manage Elastic Agent Builder components and workflows while keeping index access read-only.

(stack: ga 9.4+) `feature_agentBuilder.all` also grants skills management.

```console
POST /_security/api_key
{
  "name": "agent-builder-management",
  "expiration": "30d",
  "role_descriptors": {
    "agent-builder-management": {
      "cluster": ["monitor_inference"], <1>
      "indices": [
        {
          "names": ["customer-*"], <2>
          "privileges": ["read", "view_index_metadata"]
        }
      ],
      "applications": [
        {
          "application": "kibana-.kibana", <3>
          "privileges": [
            "feature_agentBuilder.all", <4>
            "feature_actions.read",
            "feature_workflowsManagement.all"
          ],
          "resources": ["space:default"] <5>
        }
      ]
    }
  }
}
```

1. `monitor_inference` is required when agents or tools call the Elasticsearch Inference API. Remove it if they do not.
2. Replace `customer-*` with the index patterns that the client needs. The assigned index privileges allow reads and access to index mappings, but not writes.
3. Use `kibana-.kibana` as the application name for Kibana feature privileges.
4. `feature_agentBuilder.all` allows the client to manage Elastic Agent Builder components. `feature_actions.read` allows it to use connectors, and `feature_workflowsManagement.all` allows it to manage workflows.
5. Replace `space:default` if the client uses a different Kibana space.

**API keys UI:**

Enable **Control security privileges** and paste the following role descriptor into the editor:

```json
{
  "agent-builder-management": {
    "cluster": ["monitor_inference"], <1>
    "indices": [
      {
        "names": ["customer-*"], <2>
        "privileges": ["read", "view_index_metadata"]
      }
    ],
    "applications": [
      {
        "application": "kibana-.kibana", <3>
        "privileges": [
          "feature_agentBuilder.all", <4>
          "feature_actions.read",
          "feature_workflowsManagement.all"
        ],
        "resources": ["space:default"] <5>
      }
    ]
  }
}
```

1. `monitor_inference` is required when agents or tools call the Elasticsearch Inference API. Remove it if they do not.
2. Replace `customer-*` with the index patterns that the client needs. The assigned index privileges allow reads and access to index mappings, but not writes.
3. Use `kibana-.kibana` as the application name for Kibana feature privileges.
4. `feature_agentBuilder.all` allows the client to manage Elastic Agent Builder components. `feature_actions.read` allows it to use connectors, and `feature_workflowsManagement.all` allows it to manage workflows.
5. Replace `space:default` if the client uses a different Kibana space.

The `feature_agentBuilder.all` application privilege does not grant write access to indices. Tools continue to run with only the `read` and `view_index_metadata` index privileges assigned to the key.

## Create an unrestricted development key

**Warning:**

An unrestricted key can access everything its owner can access. Use this approach only for development or trusted administrative automation. Before using a key in production, replace it with a restricted key that grants only the required spaces, indices, and features.

For short-lived development or administrative automation, you can create a key without role descriptors:

```console
POST /_security/api_key
{
  "name": "agent-builder-development",
  "expiration": "1d"
}
```

**API keys UI:**

Enter a name and expiration for the key, leave **Control security privileges** disabled, and create the key.

The key inherits a point-in-time snapshot of the privileges of the user who creates it. It is an administrator key only when the owner has administrator privileges.

## Update an API key

If troubleshooting shows that a key is missing privileges, update it instead of creating another key:

- In Kibana, go to the **API keys** management page in the navigation menu or use the [global search field](https://www.elastic.co/docs/explore-analyze/find-and-organize/find-apps-and-objects). Click the key name, update **Control security privileges**, and save your changes.
- To use the Elasticsearch API, send `PUT /_security/api_key/<api-key-id>` with the complete updated `role_descriptors` object. Authenticate as the user who owns the key; API key credentials cannot authenticate this request. The user needs at least the `manage_own_api_key` cluster privilege.

**Warning:**

When you include `role_descriptors`, the update replaces the key's assigned role descriptors instead of merging the changes. Include every privilege that the key must retain. Do not submit an empty `role_descriptors` object, because the key would inherit all privileges of its owner.

Expired or invalidated keys cannot be updated. To learn about updating a key's expiration or metadata, refer to [Update an API key](https://www.elastic.co/docs/deploy-manage/api-keys/elasticsearch-api-keys#update-api-key) and the [update API key API](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-update-api-key).

## Use the API key

Use the `encoded` value of the API key to authenticate requests to the Elastic Agent Builder APIs. The request URL depends on the Kibana space that the key can access.

### Call APIs in the default space

Store the `encoded` value securely, set it as an environment variable, and send it in the `Authorization` header:

```bash
export API_KEY="<encoded-api-key>" <1>

curl -X GET "${KIBANA_URL}/api/agent_builder/tools" \
  -H "Authorization: ApiKey ${API_KEY}"
```

1. Use the `encoded` value returned when you created the API key, not the separate `id` or `api_key` values.

### Call APIs in a custom space

When you create a key for a custom space, set the role descriptor's application privilege resource to that space. For a key with `"resources": ["space:production"]`, use the same space identifier in the request URL. To change an existing key's space access, update the key.

```bash
curl -X GET "${KIBANA_URL}/s/production/api/agent_builder/tools" \ <1>
  -H "Authorization: ApiKey ${API_KEY}"
```

1. The `production` space in the URL must match `space:production` in the key's role descriptor.

## Troubleshoot API keys

The following list pairs common API key symptoms with checks or changes that can resolve them. If a key is missing privileges, update its role descriptors.

`401 Unauthorized`
:   Make sure the header uses the `encoded` value returned by the create API, not the separate `id` or `api_key` fields.

`403 Forbidden`
:   Check that the key has the required Kibana application privileges and that the space in the URL matches the `resources` value. Also make sure the key owner has the privileges assigned to the key. If privileges are missing, update the key.

An agent or tool cannot find data
:   Check the index patterns and make sure the key has both `read` and `view_index_metadata` for the required indices.

Connector or model requests fail
:   Add `feature_actions.read` for Kibana connectors. Add `monitor_inference` for Elasticsearch inference endpoints and tools that use the Elasticsearch Inference API.

Workflow requests fail
:   Add `feature_workflowsManagement.read` to read workflows, `feature_workflowsManagement.workflow_execute` to run them, or `feature_workflowsManagement.all` to manage them.

The create API rejects the role descriptor for a derived key
:   Authenticate the create request as a user. When the request is authenticated with an API key, Elasticsearch requires an explicit role descriptor with no privileges.

## Related pages

- [permissions](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/permissions)
- [kibana api](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/kibana-api)
- [elasticsearch api keys](https://www.elastic.co/docs/deploy-manage/api-keys/elasticsearch-api-keys)
- [serverless project api keys](https://www.elastic.co/docs/deploy-manage/api-keys/serverless-project-api-keys)
