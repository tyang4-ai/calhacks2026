# Elasticsearch Serverless: API and settings differences, limits, billing

> Sources:
> - https://www.elastic.co/docs/deploy-manage/deploy/elastic-cloud/differences-from-other-elasticsearch-offerings
> - https://www.elastic.co/docs/deploy-manage/cloud-organization/billing/elasticsearch-billing-dimensions
> Fetched: 2026-10-24.
>
> From the elastic/docs-content repo, main branch. Observability and Security project sections are left out.
> Gotchas for B12: `_cluster/*` APIs answer 410 on Serverless (use `es.info()` for a health check), shard and replica settings are rejected, and Agent Builder bills 1,000 free executions a month on Elasticsearch projects.

This guide compares Elastic Cloud Hosted deployments with Elastic Cloud Serverless projects, highlighting key features and capabilities across different project types. Use this information to understand what's available in each deployment option or to plan migrations between platforms.

**Note:**

The following information reflects our strategic goals, plans and objectives and includes estimated release dates, anticipated features and functions, and proposed descriptions for commercial features. All details are for information only and are subject to change in our discretion. Information might be updated, added, or removed from this document as features or products become available, canceled, or postponed.

## Architectural differences

Elastic Cloud Serverless takes a fundamentally different approach to running the Elastic Stack compared to Elastic Cloud Hosted:

| **Functionality** | Elastic Cloud Hosted | Elastic Cloud Serverless |
|--------|----------------------|--------------------------|
| **Management model** | Self-service infrastructure | Fully managed service |
| **Project organization** | Single deployments with multiple capabilities | Separate projects for Elasticsearch, Elasticsearch Vector Database, Observability, and Security |
| **Scaling** | Manual or automated with configuration | Fully automated |
| **Infrastructure decisions** | User manages capacity | Automatically managed by Elastic |
| **Pricing model** | Based on provisioned resources | Based on usage |
| **Cloud providers** | AWS, Azure, GCP  | AWS, Azure, GCP |
| **Upgrades** | User-controlled timing | Automatically performed by Elastic |
| **User management** | Elastic Cloud-managed and deployment-local users | Elastic Cloud-managed users only. Serverless users are managed at the organization level with SAML authentication support. |
| **Backups** | User-managed with Snapshot & Restore | Automatically backed up by Elastic.<br><br>In case of data loss or corruption, you can request an emergency restore by [contacting Support](https://www.elastic.co/docs/troubleshoot#contact-us). |
| **Solutions** | Full Elastic Stack per deployment | Single solution per project |
| **Cross-origin resource sharing (CORS)** | Supported | Not available. Browser-based applications must route requests through a backend proxy server. |

In Serverless, Elastic automatically manages:

* Cluster scaling and optimization
* Node management and allocation
* Shard distribution and replication
* Resource utilization and monitoring
* High availability and disaster recovery strategies

Because Elastic fully manages sharding, several shard-related operations, including custom routing, are not supported. You can't set a `routing` value on document or search requests, and you can't create indices that require routing with the [`_routing` field](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/mapping-routing-field). This applies to all Serverless project types.

For what these differences mean feature by feature, refer to Compare features.

## Compare features
### Shared platform capabilities
These tables compare Elastic Cloud Hosted deployments and Serverless projects for core capabilities that behave the same way across all Serverless project types, grouped into platform and operations, indexing, search, and analysis, and alerting, reporting, and AI. A few of these capabilities are unavailable in specific project types, as noted in the tables. For capabilities that are specific to an Elastic solution, refer to the table for your solution or project type.

#### Platform and operations
These capabilities cover identity and access, security and networking, infrastructure and scaling, monitoring, and backups.

| **Feature**  | Elastic Cloud Hosted | Serverless projects| Notes  |
|----------|----------------------|--------------------|--------|
| **[API keys](https://www.elastic.co/docs/deploy-manage/api-keys)** | ✅ | ✅ | Available across Elastic Cloud Hosted and Serverless using deployment/project and cloud API key types. |
| **Audit logging** | ✅ | **Planned** | Anticipated in a future release |
| **Authentication and SSO** | Deployment-level [authentication realms](https://www.elastic.co/docs/deploy-manage/users-roles/cluster-or-deployment-auth/authentication-realms) and organization-level [SAML SSO](https://www.elastic.co/docs/deploy-manage/users-roles/cloud-organization/configure-saml-authentication) | Organization-level [user management](https://www.elastic.co/docs/deploy-manage/users-roles/cloud-organization/manage-users) and [SAML SSO](https://www.elastic.co/docs/deploy-manage/users-roles/cloud-organization/configure-saml-authentication) | Serverless does not provide deployment-level realm configuration. |
| **BYO-Key for encryption at rest** | ✅ | **Planned** | Anticipated in a future release; data in Serverless is stored on cloud-provider encrypted object storage |
| **Cloud provider support** | - AWS <br>- GCP <br>- Azure | - AWS <br>- Azure <br>- GCP | - [Elastic Cloud Hosted regions](https://www.elastic.co/docs/reference/cloud-hosted/regions)<br>- [Serverless regions](https://www.elastic.co/docs/deploy-manage/deploy/elastic-cloud/regions) |
| **Cluster scaling** | Manual with autoscaling option | Managed | Automatic scaling eliminates capacity planning - [Learn more](https://www.elastic.co/blog/elastic-serverless-architecture) |
| **Custom ML nodes** | ✅ | ✅ (partial) | Custom models on ML nodes are not available in Vector Database projects. |
| **Custom roles** | ✅ | ✅ | Managed through [Elastic Cloud roles](https://www.elastic.co/docs/deploy-manage/users-roles/cloud-organization/user-roles) and [Serverless custom roles](https://www.elastic.co/docs/deploy-manage/users-roles/serverless-custom-roles). |
| **Deployment health monitoring** | [AutoOps](https://www.elastic.co/docs/deploy-manage/monitor/autoops) or monitoring cluster | Managed by Elastic | - No monitoring cluster required <br>- Automatically handled by Elastic |
| **Deployment model** | Single deployments with multiple solutions | Separate projects for specific use cases | Fundamental architectural difference - [Learn more](https://www.elastic.co/blog/elastic-serverless-architecture) |
| **Deployment monitoring** | [AutoOps](https://www.elastic.co/docs/deploy-manage/monitor/autoops) or monitoring cluster | Managed by Elastic <br><br> [AutoOps](https://www.elastic.co/docs/deploy-manage/monitor/autoops/autoops-for-serverless) is also available | Elastic automatically monitors Serverless projects, but you can additionally use AutoOps to [monitor usage patterns and resource consumption](https://www.elastic.co/docs/deploy-manage/monitor/autoops/autoops-for-serverless#how-autoops-monitors-your-serverless-short-project).|
| **Hardware configuration** | Limited control | Managed | Hardware choices are managed by Elastic |
| **High availability** | ✅ | ✅ | Automatic resilience |
| **[Native realm authentication](https://www.elastic.co/docs/deploy-manage/users-roles/cluster-or-deployment-auth/native)** | ✅ | ❌ | Serverless does not support Elasticsearch authentication realms. User authentication is managed at the [organization level](https://www.elastic.co/docs/deploy-manage/users-roles/cloud-organization). |
| **Network security** | ✅ [IP filtering](https://www.elastic.co/docs/deploy-manage/security/ip-filtering-cloud)<br><br>✅ [Private connectivity](https://www.elastic.co/docs/deploy-manage/security/private-connectivity) (VPCs, PrivateLink)<br><br>✅ [Published static IPs](https://www.elastic.co/docs/deploy-manage/security/elastic-cloud-static-ips) | ✅ [IP filtering](https://www.elastic.co/docs/deploy-manage/security/ip-filtering-cloud)<br><br>✅ [Private connectivity](https://www.elastic.co/docs/deploy-manage/security/private-connectivity) (VPCs, PrivateLink)<br><br>❌ Published static IPs | Private connectivity for Serverless projects is currently supported in AWS and Azure regions only.<br><br>For Observability projects, requires [Observability Complete](https://www.elastic.co/docs/solutions/observability/observability-serverless-feature-tiers).<br><br>For Security projects, requires [Security Analytics Complete](https://www.elastic.co/docs/solutions/security/security-serverless-feature-tiers).<br><br>Serverless does not offer public static IP lists. Use private connectivity where supported. |
| **Node management** | User-controlled | Managed | No node configuration access by design |
| **Repository management** | ✅ | Managed | Automatically managed by Elastic |
| **Role-based access control** | ✅ | ✅ | In Serverless, RBAC is managed at organization level with optional project custom roles. |
| **Shard management** | User-configurable | Managed by Elastic | No manual shard allocation in Serverless |
| **[Snapshot/restore](https://www.elastic.co/docs/deploy-manage/tools/snapshot-and-restore)** | ✅ User-managed | Managed by Elastic<br><br>**Planned** for user-initiated snapshots | Serverless backups are managed by Elastic, as described in Architectural differences. User-initiated snapshots are anticipated in a future release. |

#### Indexing, search, and analysis
These capabilities cover how data is ingested, stored, replicated, queried, and managed across its lifecycle.

| **Feature**  | Elastic Cloud Hosted | Serverless projects| Notes  |
|----------|----------------------|--------------------|--------|
| **Behavioral analytics** | ❌ (deprecated in 9.0) | ❌ | Not available in Serverless |
| **[Bulk indexing](https://www.elastic.co/docs/deploy-manage/production-guidance/optimize-performance/indexing-speed#_use_bulk_requests)** | ✅ | ✅ | The baseline write latency in Serverless is 200ms.^1^ |
| [**Clone index API**](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-clone) | ✅ | **Planned** | Anticipated in a future release |
| **[Cross-cluster replication](https://www.elastic.co/docs/deploy-manage/tools/cross-cluster-replication)** | ✅ | **Planned** | Anticipated in a future release |
|  **Custom plugins and bundles** | ✅ | ✅ [Core analysis plugins](https://www.elastic.co/docs/reference/elasticsearch-plugins/analysis-plugins#_core_analysis_plugins) (bundled)<br><br>❌ Custom plugin/bundle uploads are not supported<br><br>❌ Custom dictionaries for [language analyzers](https://www.elastic.co/docs/reference/text-analysis/analysis-lang-analyzer) are not supported | Use the [synonyms API](https://www.elastic.co/docs/api/doc/elasticsearch-serverless/group/endpoint-synonyms) for [synonyms](https://www.elastic.co/docs/solutions/search/full-text/search-with-synonyms) in Serverless. |
| **Custom routing ([`_routing`](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/mapping-routing-field))** | ✅ | ❌ | Elastic fully manages sharding in Serverless, so you can't set custom `routing` values or require routing on an index. |
| **Data lifecycle management** | - [ILM](https://www.elastic.co/docs/manage-data/lifecycle/index-lifecycle-management) <br>- [Data stream lifecycle](https://www.elastic.co/docs/manage-data/lifecycle/data-stream) | [Data stream lifecycle](https://www.elastic.co/docs/manage-data/lifecycle/data-stream) only | - No data tiers in Serverless <br>- Optimized for common lifecycle management needs |
| **Elastic connectors (for search)** | ❌ (Managed connectors discontinued with Enterprise Search in 9.0) | ❌ | - Managed connectors not available <br>- Use [self-managed connectors](https://www.elastic.co/docs/reference/search-connectors/self-managed-connectors) |
| [**Elasticsearch for Apache Hadoop**](https://www.elastic.co/elasticsearch/hadoop) | ✅ | ❌ | Not available in Serverless |
| **Enterprise Search (App Search & Workplace Search)** | ❌ (discontinued in 9.0) | ❌ | Not available in Serverless |
| **[Index modes](https://www.elastic.co/docs/reference/elasticsearch/index-settings/index-modules#index-mode-setting)** | ✅ | ✅ (partial)  | Vector Database projects support `vectordb_document` only |
| [**`join` fields**](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/parent-join) | ✅ | ❌ | Not available in Serverless<br><br>The alternative for this in Serverless is the ES\|QL [`LOOKUP JOIN`](https://www.elastic.co/docs/reference/query-languages/esql/commands/lookup-join) command, which requires `lookup` index mode (unavailable in Vector Database projects) |
| [**Reindexing from remote**](https://www.elastic.co/docs/manage-data/migrate/migrate-data-using-reindex-api) | ✅ | ✅ | |
| [**Scripted metric aggregations**](https://www.elastic.co/docs/reference/aggregations/search-aggregations-metrics-scripted-metric-aggregation) | ✅ | ❌ | Not available in Serverless<br>The alternative for this in Serverless is [ES|QL](https://www.elastic.co/docs/reference/query-languages/esql) |
| **Search across clusters or projects** | ✅ As [cross-cluster search](https://www.elastic.co/docs/explore-analyze/cross-cluster-search) | ✅ As [cross-project search](https://www.elastic.co/docs/deploy-manage/cross-project-search-config) | |
| [**Synonyms**](https://www.elastic.co/docs/solutions/search/full-text/search-with-synonyms) | - Index time synonyms <br>- File-based synonyms <br>- Synonyms API | [Synonyms API](https://www.elastic.co/docs/api/doc/elasticsearch-serverless/group/endpoint-synonyms) only (does not support index-time or file-based synonyms) | |
| **Web crawler** | ❌ (Managed Elastic Crawler discontinued with Enterprise Search in 9.0) | Self-managed only | Use [**self-managed crawler**](https://github.com/elastic/crawler). |

^1^  In Serverless, Elastic ensures data durability by storing indexed data in an [object store](https://www.elastic.co/blog/elastic-serverless-architecture) rather than local replicas. Writes are batched over a 200ms window to ensure durability while optimizing performance and cost, which means that single-document indexing can appear slower than in Elastic Cloud Hosted. However, this design makes Serverless more scalable and resilient to high indexing loads without relying on in-cluster replication for fault tolerance. Because of a higher baseline write latency, Serverless indexing can be scaled by increasing concurrent indexing clients.

#### Alerting, reporting, and AI
These capabilities cover alerting, notifications, reporting, and AI-assisted experiences.

| **Feature**  | Elastic Cloud Hosted | Serverless projects| Notes  |
|----------|----------------------|--------------------|--------|
| [**Agent Builder**](https://www.elastic.co/docs/explore-analyze/ai-features/elastic-agent-builder) | ✅ | ✅ | The AI Agent chat experience that Agent Builder powers is the default in all project types. |
| **Email service** | ✅ | ✅ | Preconfigured email connector available - [Learn more about limits and usage](https://www.elastic.co/docs/deploy-manage/deploy/elastic-cloud/tools-apis#elastic-cloud-email-service) |
| [**Kibana Alerts**](https://www.elastic.co/docs/deploy-manage/monitor/monitoring-data/configure-stack-monitoring-alerts) | ✅ | ✅ | |
| **[Reporting](https://www.elastic.co/docs/explore-analyze/report-and-share)** | ✅ All report types and file formats | ✅ Discover CSV, Lens CSV, Discover session JSON, Dashboard JSON<br><br>❌ Dashboard and visualization PDF and PNG | |
| [**Watcher**](https://www.elastic.co/docs/explore-analyze/alerting/watcher) | ✅ | ❌ | Use **Kibana Alerts** instead, which provides rich integrations across use cases |

### Elasticsearch
Serverless Elasticsearch projects are the general-purpose project type, built for mixed lexical, semantic, time series, and analytics workloads rather than a single use case. They support every capability listed in Shared capabilities, so only the following capabilities behaves differently than in Elastic Cloud Hosted.

| **Feature** | Elastic Cloud Hosted | Serverless Elasticsearch projects | Serverless notes |
|---------|----------------------|-----------------------------------|------------------|
| [**Search applications**](https://www.elastic.co/docs/solutions/elasticsearch-solution-project/search-applications) |  ✅ UI <br><br>✅ APIs<br><br>✅ Maintenance mode (beta) | ❌ UI<br><br>✅ API<br><br>✅ Maintenance mode (beta) | UI not available in Serverless |

### Elasticsearch Vector Database
The Vector Database project type is optimized for vector workloads, with a vector-tuned default configuration, a hardware profile suited to embeddings, streamlined access to inference, and pricing built for vector storage and search. Configuration is intentionally narrower as a result.

The following table lists those differences against Elastic Cloud Hosted. Capabilities that behave the same in all project types are listed in Shared capabilities.

| **Feature** | Elastic Cloud Hosted | Serverless Elasticsearch Vector Database projects | Serverless notes |
|---------|----------------------|-----------------------------------|------------------|
| **Custom ML nodes** | ✅ | ❌ | Custom models on ML nodes are not available in Vector Database. Use the Elasticsearch project type if you need them. |
| **[Index modes](https://www.elastic.co/docs/reference/elasticsearch/index-settings/index-modules#index-mode-setting)** | ✅ All index modes |  [`vectordb_document`](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/dense-vector#dense-vector-vectordb-document-mode) only | `vectordb_document` is applied automatically to new indices and is the only mode supported in Vector Database.<br><br>Use the Elasticsearch project type for logs, analytics, metrics, or ES\|QL [`LOOKUP JOIN`](https://www.elastic.co/docs/reference/query-languages/esql/commands/lookup-join) workloads. |
| [**Search applications**](https://www.elastic.co/docs/solutions/elasticsearch-solution-project/search-applications) | - UI and APIs <br>- Maintenance mode (beta) | ❌ | Not available. Use the Elasticsearch project type if you need search applications. |

## Serverless index sizing and project limits
Elasticsearch uses sharding to distribute the data in your index across the cluster, which helps support growing data volumes and load. In Elastic Cloud Serverless, sharding is fully managed for you and automatically adjusts to suit your needs.

These best practices help you build an indexing and data lifecycle strategy that scales with your data over time:
 * Avoid large numbers of very small or empty indices where possible. Each index has a resource cost within your project and the service must scale its capacity to accommodate. If your design follows this pattern, consider organizing your data into fewer indices.
 * Avoid designs where each index grows to many terabytes, which can result in performance trade-offs. Consider creating multiple smaller indices that you can query using an [alias](https://www.elastic.co/docs/manage-data/data-store/aliases) or naming pattern.
 * Use a data stream instead of a single index when [appropriate](https://www.elastic.co/docs/manage-data/data-store/data-streams#should-you-use-a-data-stream), and take advantage of the [data stream lifecycle](https://www.elastic.co/docs/manage-data/lifecycle/data-stream) to manage data retention. Avoid date-based naming patterns with data streams, and let the lifecycle age out data automatically.

### Project limits

The following limits apply to Elastic Cloud Serverless projects and organizations:

| Limit | Value | Adjustable |
| :--- | :--- | :--- |
| Number of indices per project | 15,000 | Yes |
| Number of projects per organization | 500 | Yes |
| Data size per Elasticsearch Vector Database project | 1 TB | No |

Limits marked as adjustable can be increased by request. To request a limit increase, [open a support case](https://www.elastic.co/docs/troubleshoot#contact-us), and include your preferred new value and a brief description of your use case. Providing meaningful details around your use case and desired outcome ensures that Elastic can make recommendations that best suit your workload.

## Available Elasticsearch APIs
In Elastic Cloud Serverless, access is limited to a subset of Elasticsearch APIs, as Elastic manages the underlying infrastructure. These restrictions help maintain cluster stability, availability, and data integrity, ensuring reliable operation of Serverless projects.

The following Elasticsearch APIs are not available in Elastic Cloud Serverless:

Infrastructure operations
:   * All `_nodes/*` operations
* All `_cluster/*` operations
* Most `_cat/*` operations, except for index-related operations such as `/_cat/indices` and `/_cat/aliases`

Storage and backup
:   * All `_snapshot/*` operations
* Repository management operations

Index management
:   * `indices/close` operations
* `indices/open` operations
* Recovery and stats operations
* Force merge operations

When attempting to use an unavailable API, you'll receive this error:

```json
{
 "error": {
   "root_cause": [
     {
       "type": "api_not_available_exception",
       "reason": "Request for uri [/<API_ENDPOINT>] with method [<METHOD>] exists but is not available when running in serverless mode"
     }
   ],
   "status": 410
 }
}
```

**Tip:**

Refer to the [Elasticsearch Serverless API reference](https://www.elastic.co/docs/api/doc/elasticsearch-serverless/) for a complete list of available APIs.

### Version reporting in the root API
## Available Elasticsearch settings
In Elastic Cloud Serverless projects, configuration available to users is limited to certain [index-level settings](https://www.elastic.co/docs/reference/elasticsearch/index-settings), while Elastic manages cluster-level and node-level settings to maintain stability, availability, performance, and data integrity. These restrictions help ensure the reliability of Serverless projects.

Available settings
:   **Index-level settings**: Settings that control how documents are processed, stored, and searched are available to end users. These include:

    * Analysis configuration
    * Mapping parameters
    * Search/query settings
    * Indexing settings such as `refresh_interval`

  Some settings might have different default values or value constraints in Serverless. This information is documented in the [settings reference](https://www.elastic.co/docs/reference/elasticsearch/index-settings).

Managed settings
:   **Infrastructure-related settings**: Settings that affect cluster resources or data distribution are not available to end users. These include:

    * Node configurations
    * Cluster topology
    * Shard allocation
    * Resource management

When attempting to use an unavailable index setting, you'll receive this error:

```json
{
    "error": {
        "root_cause": [
            {
                "type": "illegal_argument_exception",
                "reason": "Settings [xyz] are not available when running in serverless mode"
            }
        ],
        "type": "illegal_argument_exception",
        "reason": "Settings [xyz] are not available when running in serverless mode"
    },
    "status": 400
}
```

## Learn more

- [Elastic Cloud Serverless roadmap](https://www.elastic.co/cloud/serverless/roadmap): See upcoming features and development plans for the Serverless platform. The roadmap primarily focuses on platform capabilities rather than project-specific features.
- [Elasticsearch Serverless API reference](https://www.elastic.co/docs/api/doc/elasticsearch-serverless/): Check out the complete list of available APIs in Elastic Cloud Serverless.
- [Project settings](https://www.elastic.co/docs/deploy-manage/deploy/elastic-cloud/project-settings): Configure project settings in Elastic Cloud Serverless.
- [Serverless regions](https://www.elastic.co/docs/deploy-manage/deploy/elastic-cloud/regions): Choose the right region for your Elastic Cloud Serverless project.
- [Elastic Cloud pricing](https://www.elastic.co/pricing/): Understand pricing for Elastic Cloud Hosted and Serverless projects
  - [Serverless project billing](https://www.elastic.co/docs/deploy-manage/cloud-organization/billing/serverless-project-billing-dimensions): Understand billing dimensions for Serverless projects.
  - [Elastic Cloud Hosted billing](https://www.elastic.co/docs/deploy-manage/cloud-organization/billing/cloud-hosted-deployment-billing-dimensions): Understand billing dimensions for Elastic Cloud Hosted deployments.


## Elasticsearch Serverless billing dimensions
Elasticsearch Serverless projects are priced based on consumption of the underlying infrastructure that supports your use case with the performance characteristics you need.
Measurements are in virtual compute units (VCUs).
Each VCU represents a fraction of RAM, CPU, and local disk for caching.

The number of VCUs you need is determined by:

* Volume and ingestion rate of your data
* Data retention requirements
* Search query volume
* Search Power setting
* Machine learning usage

For detailed Elasticsearch Serverless project rates, refer to the [Elasticsearch Serverless pricing page](https://www.elastic.co/pricing/serverless-search).

### VCU types: search, ingest, and ML
Elasticsearch Serverless uses the following VCU types:

* **Ingest:** The VCUs used to index incoming documents. Ingest VCUs account for compute resources consumed for ingestion. This is based on ingestion rate and amount of data ingested at any given time. Transforms and ingest pipelines also contribute to ingest VCU consumption. Ingest VCU billing scales to zero during periods with no ingest activity.
* **Search:** The VCUs used to return search results with the latency and queries per second (QPS) you require. Search VCUs are calculated as a factor of the compute resources needed to run search queries, search throughput, and latency. Search VCUs are not charged per search request. Instead, they are a factor of the compute resources that scale up and down based on amount of searchable data, search load (QPS), and performance (latency and availability).

  Unlike ingest, Search VCU billing does not scale to zero during idle periods. A baseline of search capacity is always provisioned so your data remains instantly queryable, and you are billed a reduced rate for this baseline when no search activity is occurring. The baseline is determined primarily by your Search Power setting and your [search-ready](https://www.elastic.co/docs/deploy-manage/deploy/elastic-cloud/project-settings#elasticsearch-manage-project-search-ai-lake-settings) dataset size.
* **Machine learning:** The VCUs used to perform inference, NLP tasks, and other ML activities. ML VCUs are a factor of the models deployed and number of ML operations such as inference for search and ingest. ML VCUs are typically consumed for generating embeddings during ingestion and during semantic search or reranking.
* **Tokens:** [The Elastic Inference Service](https://www.elastic.co/docs/explore-analyze/elastic-inference/eis) is charged based on tokens used with machine learning models. For embeddings and rerankers, usage is billed per million input tokens sent to the models. For LLMs, this is either per 1 million input or per 1 million output tokens. Elastic Managed LLMs can power AI Search features such as Agent Builder and AI Assistant for Search, as well as features in the Security and Observability products, and are enabled by default.

### Data storage and billing
Elasticsearch Serverless projects store data in the [Search AI Lake](https://www.elastic.co/docs/deploy-manage/deploy/elastic-cloud/project-settings#elasticsearch-manage-project-search-ai-lake-settings). You are charged per GB of stored data at rest. Note that if you perform operations at ingest such as vectorization or enrichment, the size of your stored data will differ from the size of the original source data.

### Agent Builder Executions
|

Each execution represents one conversational turn — a user input and the agent's non-error response. Complex turns that exceed 50,000 input tokens count as additional executions to reflect the heavier processing involved. For example, a turn that uses 120,000 input tokens would count for 3 Agent Executions. Error responses are not billed. When an agent triggers a workflow as part of its response, the workflow execution is metered separately under Workflow Executions.

A free allocation of 1,000 executions per month is included. Volume tier reductions apply at higher usage levels. Refer to the [Elasticsearch Serverless pricing page](https://www.elastic.co/pricing/serverless-search) for specific rates and tier breakpoints.

### Workflow Executions
Workflows enable you to automate multi-step processes within your Elasticsearch project.

In addition to the VCU-based billing dimensions above, workflow usage is billed based on the number of executions completed successfully in your project over the course of a month. Each execution represents one end-to-end run of a workflow. Failed executions are not billed.

A free allocation of 10,000 executions per month is included. Volume tier reductions apply at higher usage levels. Refer to the [Elasticsearch Serverless pricing page](https://www.elastic.co/pricing/serverless-search) for specific rates and tier breakpoints.

### Managing Elasticsearch costs
Elasticsearch Serverless costs follow your resource consumption across search, ingest, ML, and storage. To balance performance with spend for your workload, you can adjust the project settings, data layout, and indexing practices described in this section.

#### Search Power setting
[Search Power](https://www.elastic.co/docs/deploy-manage/deploy/elastic-cloud/project-settings#elasticsearch-manage-project-search-power-settings) controls the speed of searches against your data and the size of the baseline resources kept provisioned for your project. With Search Power, you can improve search performance by adding more resources for querying or you can reduce provisioned resources to cut costs.

#### Search-ready dataset size
The [search-ready](https://www.elastic.co/docs/deploy-manage/deploy/elastic-cloud/project-settings#elasticsearch-manage-project-search-ai-lake-settings) dataset size for a project is 100% of the index size for regular indices and the data within the Boost Window for [time series data](https://www.elastic.co/docs/manage-data/data-store/data-streams/time-series-data-stream-tsds#differences-from-regular-data-stream). This size is an important factor, along with your Search Power setting, that determines the baseline resources provisioned for your project, and therefore the reduced rate billed during idle periods. During active search, Search VCU consumption scales up based on query load; during idle periods, it drops to a reduced rate proportional to the search-ready dataset size.

  For regular indices, reducing the search-ready dataset size means reducing what you store and search: consolidating small indices, removing unused data, or moving historical data out of the project. For time series data, shortening the Search Boost Window is typically the most direct lever: data outside the window remains fully searchable from the Search AI Lake but has a minimal impact on the baseline capacity, lowering both active and idle Search VCU costs.

#### Machine learning trained model autoscaling
[Trained model autoscaling](https://www.elastic.co/docs/deploy-manage/autoscaling/trained-model-autoscaling) is always enabled and cannot be disabled, ensuring efficient resource usage, reduced costs, and optimal performance without manual configuration.

  Trained model deployments automatically scale down to zero allocations after 24 hours without any inference requests. When they scale up again, they remain active for 5 minutes before they can scale down. During these cooldown periods, you will continue to be billed for the active resources.

#### Indexing strategies
Consider your indexing strategies and how they might impact overall VCU usage and costs.
To ensure optimal performance and cost-effectiveness for your project, it's important to consider how you structure your data. You can control ingest VCU usage by managing the indexing load and how data is distributed across indices:

* **Bulk indexing**: Ingest VCU consumption scales with your indexing load. After 15 minutes with no ingest activity, ingest VCU consumption scales down to zero.

  Where your use case allows, batch documents into fewer, larger [`_bulk`](https://www.elastic.co/docs/api/doc/elastic-cloud-serverless/operation/operation-bulk) requests.
* **Index count and size**: Consolidate small indices for better efficiency.
  In general, avoid a design where your project contains hundreds of very small indices, specifically those under 1GB each.
  Avoiding small indices is important because every index in Elasticsearch has a certain amount of resource overhead.
  Elasticsearch needs to maintain metadata for each index to keep it running smoothly.
  When you have a very large number of small indices, the combined overhead from all of them can consume more CPU resources than if the same data were stored in fewer, larger indices.
  Higher resource consumption can lead to higher costs and potentially impact the overall performance of your project.

  If your use case naturally generates many small, separate streams of data, the recommended approach is to implement a process to consolidate them into fewer, larger indices. This practice leads to more efficient resource utilization. By grouping your data into larger indices, you can ensure a more performant and cost-efficient experience with Elasticsearch Serverless.

#### Project subtype or profile
When you use the [API](https://www.elastic.co/docs/api/doc/elastic-cloud-serverless/operation/operation-createelasticsearchproject) to create projects, be aware that the `optimized_for` option affects the VCU allocation and costs.

  The `general_purpose` option is suitable for most search use cases. For example, it is the right profile for full-text search, sparse vectors, and dense vectors that use compression such as BBQ. It is used by default when you create projects from the UI.

  The `vector` option is recommended only for uncompressed dense vectors ([dense_vector](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/dense-vector) fields with `int4` or `int8` quantization strategies) and high dimensionality. Though the per VCU cost is the same for general purpose and vector profiles, the latter allocates more VCUs for searchable data. This leads to higher VCU consumption in order to improve the performance for uncompressed vector data.
