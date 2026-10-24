# Elastic Cloud Serverless: create a project, connect, API keys, trial limits

> Sources:
> - https://www.elastic.co/docs/deploy-manage/deploy/elastic-cloud/create-serverless-project
> - https://www.elastic.co/docs/deploy-manage/deploy/elastic-cloud/find-connection-details-serverless
> - https://www.elastic.co/docs/deploy-manage/api-keys/serverless-project-api-keys
> - https://www.elastic.co/docs/solutions/elasticsearch-solution-project/search-connection-details
> - https://github.com/elastic/docs-content/blob/main/deploy-manage/deploy/_snippets/trial-limitations.md
> Fetched: 2026-10-24.
>
> From the elastic/docs-content repo, main branch.
> Cindia: create an **Elasticsearch** project (not Vector Database), because the index uses int8_hnsw and B12 also needs Kibana for Agent Builder.

You can create a serverless project in the following ways:

* If you are a new user, [sign up for a free 14-day trial](https://cloud.elastic.co/serverless-registration) to create a serverless project. For more information about the Elastic Cloud trials, refer to [Trial features](https://www.elastic.co/docs/deploy-manage/deploy/elastic-cloud/create-an-organization#general-sign-up-trial-what-is-included-in-my-trial).
* If you are an existing customer, [log in to Elastic Cloud](https://cloud.elastic.co/login) and create a project in the Elastic Cloud console. The `admin` predefined role or an equivalent custom role is required to create projects. Refer to [user roles](https://www.elastic.co/docs/deploy-manage/users-roles/cloud-organization/user-roles).

**Note:**

    Existing customers can also [create and manage projects](https://www.elastic.co/docs/deploy-manage/deploy/elastic-cloud/manage-serverless-projects-using-api) using the [Elastic Cloud Serverless API](https://www.elastic.co/docs/api/doc/elastic-cloud-serverless/) or the (serverless: preview) [Elastic CLI](https://www.elastic.co/docs/deploy-manage/deploy/elastic-cloud/cli:).

## Before you begin

Decide which project type you might need before you create the project. You'll select one of the following types during setup:

* Elasticsearch
* Vector Database
* Observability
* Security

To match a type to your use case, review this [project comparison table](https://www.elastic.co/docs/deploy-manage/deploy/elastic-cloud/serverless#choose-a-project-type).

You can't convert a project to a different project type later. If you choose the wrong project type, create another project. When you no longer need a project, [delete it](https://www.elastic.co/docs/deploy-manage/uninstall/delete-a-cloud-deployment#serverless) so it doesn't continue to incur charges.

You can have up to 500 Serverless projects in your organization. This limit applies whether you create projects in the Elastic Cloud console or with the API. If you reach the limit, you'll get an error when you try to create another project. To request an increase, [contact Elastic Support](https://www.elastic.co/docs/troubleshoot#contact-us).

## Create a project in the Elastic Cloud console
The steps to create a Serverless project are the same regardless of which project type you select.

1. On the Elastic Cloud home page, find the **Serverless projects** panel and select **Create project**.
2. Select a project type that matches your use case, then select **Next**. If you're not sure which type to choose, refer to our [project type comparison](https://www.elastic.co/docs/deploy-manage/deploy/elastic-cloud/serverless#get-started).
3. Enter a name for your project.
4. Select a cloud provider and region. For available regions, refer to [regions](https://www.elastic.co/docs/deploy-manage/deploy/elastic-cloud/regions).

    For Elastic Security Serverless and Elastic Observability Serverless projects, you can also select a feature tier. For more information, review the [project features and add-ons](https://www.elastic.co/docs/deploy-manage/deploy/elastic-cloud/project-settings#project-features-add-ons) included in each feature tier.
5. Select **Create project**. It takes a few minutes to create your project.
6. When the project is ready, select **Continue** to open it. You might need to log in to Elastic Cloud again.

**Tip:**

If Kibana loads as a blank page, check that your firewall, proxy, or secure web gateway allows access to `kibana.estccdn.com` and `cloud.elastic.co`. For the full list of required domains, refer to [Browser access requirements](https://www.elastic.co/docs/deploy-manage/deploy/elastic-cloud#browser-access).

## Next steps

* [find connection details serverless](https://www.elastic.co/docs/deploy-manage/deploy/elastic-cloud/find-connection-details-serverless): Get the Elasticsearch endpoint and API key that clients and tools need to connect to your project.
* [project settings](https://www.elastic.co/docs/deploy-manage/deploy/elastic-cloud/project-settings): Configure your project's features, add-ons, and other settings.


## Trial limits

During the free 14-day trial, Elastic provides access to one hosted deployment and three Serverless projects. If all you want to do is try out Elastic, the trial includes more than enough to get you started. During the trial period, some limitations apply.

**Hosted deployments**

* You can only have one active deployment at a time.
* The deployment size is limited to 4 GB RAM per availability zone for Elasticsearch data nodes, up to 2 availability zones (8 GB total). The available storage depends on the selected hardware profile, cloud provider, and region. To compare profile trade-offs, refer to [Hardware profiles](https://www.elastic.co/docs/deploy-manage/deploy/elastic-cloud/ec-change-hardware-profile).
* Storage in a trial deployment is not a fixed value and can vary significantly even with the same RAM allocation. For example, vector search-optimized profiles generally provide less storage than more storage-dense profile options.
* Machine learning nodes are available up to 4GB RAM, or up to 8GB when using Reranker.
* Custom Elasticsearch plugins are not enabled.
* Token usage for LLMs and other ML models is restricted during the trial period. If you require higher limits, reach out to [Support](https://cloud.elastic.co/support). After [upgrading to paid](https://www.elastic.co/docs/deploy-manage/cloud-organization/billing/add-billing-details), it can take up to 24 hours for these restrictions to clear.

**Serverless projects**

* You can have three active Serverless projects at a time.
* For Elasticsearch Serverless projects, Search Power is limited to 100 and Search Boost Window is limited to 7 days. Refer to [project settings](https://www.elastic.co/docs/deploy-manage/deploy/elastic-cloud/project-settings#elasticsearch-manage-project-search-ai-lake-settings).
* Scaling is limited for Serverless projects in trials. Failures might occur if the workload requires memory or compute beyond what trial limits can provide.
* Token usage for LLMs and other ML models is restricted during the trial period. If you require higher limits, reach out to [Support](https://cloud.elastic.co/support). After [upgrading to paid](https://www.elastic.co/docs/deploy-manage/cloud-organization/billing/add-billing-details), it can take up to 24 hours for these restrictions to clear.


## Find your Serverless project connection details
**Note:**

This page is for Elastic Cloud Serverless projects. If you're using an Elastic Cloud Hosted deployment, refer to [find cloud id](https://www.elastic.co/docs/deploy-manage/deploy/elastic-cloud/find-cloud-id).

When you connect clients and tools to an Elastic Cloud Serverless project, these are the main connection details you'll work with:

**Elasticsearch endpoint**
:   The HTTPS URL you use to send requests to your project. Most clients, SDKs, and integrations connect with this URL plus an API key.

**API key**
:   Authenticates the client to your project. Serverless does not support username and password authentication for these connections.

**Cloud ID**
:   A unique, encoded string that represents your project's Elasticsearch endpoint (and, where applicable, Kibana endpoint) in a compact form. Compatible clients can use it instead of configuring host URLs individually: the client resolves those endpoints from the Cloud ID.

### Find your Elasticsearch endpoint
You can copy your endpoint from the Elastic Cloud Console, or from Kibana. Use whichever fits your workflow: the Console route doesn't require you to open Kibana.

(elasticsearch: ga) In Elasticsearch Serverless projects, the **Get started with Elasticsearch** page also shows the endpoint directly.

#### From the Elastic Cloud Console
**Other endpoints in this panel:**

The **Application endpoints, cluster and component IDs** area also lists endpoints for other applications, such as Kibana and, depending on the project type, Fleet or OpenTelemetry (OTLP), along with your project ID and component IDs. To connect clients and tools to Elasticsearch, use the **Elasticsearch endpoint**.

#### From Kibana
1. Open the **Connection details** panel in one of these ways:

    * Select the **Help menu** , and then select **Connection details**.
    * Select the project selector in the header, and then select **Connection details**.

2. On the **Endpoints** tab, copy the **Elasticsearch endpoint**.

### Find your Cloud ID
The Cloud ID is available in Kibana only. You need it only for [Beats](https://www.elastic.co/docs/reference/beats/reference) and [Logstash](https://www.elastic.co/docs/reference/logstash/reference), which can use it in place of the endpoint URL. All other clients and tools use the endpoint.

1. In Kibana, open the **Connection details** panel from the **Help menu**  or the project selector in the header.
2. Turn on **Show Cloud ID**, then copy the value.

### Create an API key
You can create an API key in the **API key** tab of the **Connection details** panel.

Alternatively, you can also create an API key from your project's **API keys** page, which you can access from the navigation menu or with the [global search field](https://www.elastic.co/docs/explore-analyze/find-and-organize/find-apps-and-objects).

For detailed steps, including how to restrict a key's privileges and how to update or delete keys, refer to [serverless project api keys](https://www.elastic.co/docs/deploy-manage/api-keys/serverless-project-api-keys).

#### Elastic Cloud API keys
Keys created in your project work with that project only. If you want one key to work across several projects, or to manage keys centrally, create an [Elastic Cloud API key](https://www.elastic.co/docs/deploy-manage/api-keys/elastic-cloud-api-keys) in the Elastic Cloud Console instead.

Elastic Cloud API keys manage your organization, deployments, and projects. To also use one in place of a project API key, grant it [Elasticsearch and Kibana API access](https://www.elastic.co/docs/deploy-manage/api-keys/elastic-cloud-api-keys#project-access) for the relevant projects.

### Next steps
After you have your project's connection details, [send a test request](https://www.elastic.co/docs/solutions/elasticsearch-solution-project/search-connection-details#elasticsearch-get-started-test-connection) to confirm that your endpoint and API key work, then use them to configure a client or data shipper. Explore these pages:

* [Beats for Elasticsearch Serverless](https://www.elastic.co/docs/reference/beats/reference/serverless/beats): Configure Beats to send logs, metrics, and other data using your Elasticsearch endpoint and API key.
* [Sending data to Elasticsearch Serverless](https://www.elastic.co/docs/reference/logstash/reference/connecting-to-serverless): Configure Logstash to send data to your project.
* [install elastic agents](https://www.elastic.co/docs/reference/fleet/install-elastic-agents): Collect and ship data with Elastic Agent and Fleet.
* [elasticsearch clients](https://www.elastic.co/docs/reference/elasticsearch-clients): Connect applications to your project with an official client library.
* [ingest](https://www.elastic.co/docs/manage-data/ingest): Browse other ingest options, from APIs and connectors to OpenTelemetry.


## Serverless project API keys
In Serverless projects, the following types of API keys exist:

- **Personal** API keys, that you can create to allow external services to access your serverless project, including the [Elasticsearch](https://www.elastic.co/docs/api/doc/elasticsearch/) and [Kibana](https://www.elastic.co/docs/api/doc/kibana/) APIs, on behalf of a user.
- **Managed** API keys, created and managed by Kibana to correctly run background tasks.

**Manage Serverless project API access using Elastic Cloud API keys:**

As an alternative to using Serverless project API keys, which are tied to a single project, you can create [Elastic Cloud API keys](https://www.elastic.co/docs/deploy-manage/api-keys/elastic-cloud-api-keys) that include access to projects' Elasticsearch and Kibana APIs. This allows you to create keys that can interact with multiple projects, and manage API access centrally from the Elastic Cloud console.

The [cross-project search feature](https://www.elastic.co/docs/deploy-manage/cross-project-search-config/cps-config-access-and-scope#manage-user-and-api-key-access) requires Elastic Cloud API keys for programmatic access.

To manage API keys in Kibana, go to the **API keys** management page in the navigation menu or use the [global search field](https://www.elastic.co/docs/explore-analyze/find-and-organize/find-apps-and-objects).

### Create an API key
In **API keys**, click **Create API key**:

Once created, you can copy the encoded API key and use it to send requests to the Elasticsearch HTTP API. For example:

```bash
curl "${ES_URL}" \
-H "Authorization: ApiKey ${API_KEY}"
```

**Important:**

API keys are intended for programmatic access. Don’t use API keys to authenticate access using a web browser.

#### Control security privileges
When you create or update an API key, use **Control security privileges** to configure access to specific Elasticsearch APIs and resources. Define the permissions using a JSON `role_descriptors` object, where you specify one or more roles and the associated privileges.

For example, the following `role_descriptors` object defines a `books-read-only` role that limits the API key to `read` privileges on the `books` index.

```json
{
  "books-read-only": {
    "cluster": [],
    "indices": [
      {
        "names": ["books"],
        "privileges": ["read"]
      }
    ],
    "applications": [],
    "run_as": [],
    "metadata": {},
    "transient_metadata": {
      "enabled": true
    }
  }
}
```

For the `role_descriptors` object schema, check out the [`/_security/api_key` endpoint](https://www.elastic.co/docs/api/doc/elasticsearch-serverless/operation/operation-security-create-api-key) docs. For supported privileges, check [Security privileges](https://www.elastic.co/docs/reference/elasticsearch/security-privileges#privileges-list-indices).

### Update an API key
In **API keys**, click on the name of the key. You can update only **Control security privileges** and **Include metadata**.

### View and delete API keys
The **API keys** app lists your API keys, including the name, date created, and status. When API keys expire, the status changes from `Active` to `Expired`.

You can delete API keys individually or in bulk.

### Related pages

* [find connection details serverless](https://www.elastic.co/docs/deploy-manage/deploy/elastic-cloud/find-connection-details-serverless): Pair a key with your project's Elasticsearch endpoint to connect clients and tools.


### Test your connection
Verify your endpoint and API key with a request to the Elasticsearch root endpoint.

1. In a terminal, assign your endpoint and encoded API key to environment variables:

    ```bash
    export ES_URL="https://my-deployment-a1b2c3.es.us-central1.gcp.elastic-cloud.com"
    export API_KEY="ZFZRbF9Jb0JDMEoxaVhoR2pSa3Q6dExwdmJSaldRTHFXWEp4TFFlR19Hdw=="
    ```

2. Send the request:

    ```bash
    curl "${ES_URL}" -H "Authorization: ApiKey ${API_KEY}"
    ```

A successful response returns your cluster details:

```json
{
  "name" : "instance-0000000000",
  "cluster_name" : "my-deployment",
  "cluster_uuid" : "ws0IbTBUQfigmYAVMztkZQ",
  "version" : { ... },
  "tagline" : "You Know, for Search"
}
```

**Note:**

If your cluster uses a self-signed certificate, pass your CA certificate with `curl --cacert`. Refer to [Automatic security setup](https://www.elastic.co/docs/deploy-manage/security/self-auto-setup) for the certificate location.
