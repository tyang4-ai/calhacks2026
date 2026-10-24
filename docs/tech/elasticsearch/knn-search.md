# kNN search

> Sources:
> - https://www.elastic.co/docs/solutions/search/vector/knn
> - https://www.elastic.co/docs/solutions/search/vector/knn/approximate-knn
> - https://www.elastic.co/docs/solutions/search/vector/knn/filtered-knn-search
> Fetched: 2026-10-24.
>
> Three pages from the elastic/docs-content repo, main branch, joined in this order.

A *k-nearest neighbor* (kNN) search finds the *k* nearest vectors to a query vector using a similarity metric such as cosine or L2 norm. In Elasticsearch, kNN is the primary way to query [`dense_vector`](https://www.elastic.co/docs/solutions/search/vector/dense-vector) fields after you store embeddings.

## Common use cases for kNN vector similarity search

kNN vector similarity search supports use cases across search, recommendations, and analysis:

- **Search**
  - [Semantic text search](https://www.elastic.co/docs/solutions/search/semantic-search): Find documents that match the meaning of a query, even when the wording differs.
  - [Image and video similarity](https://www.elastic.co/docs/solutions/search/vector/vector-search-use-cases#multimodal-search): Search across text, images, audio, or video to find visually or semantically similar content.

- **Recommendations**
  - [Product recommendations](https://www.elastic.co/docs/solutions/search/vector/vector-search-use-cases#discovery-and-recommendations): Surface items similar to what a user is viewing or has interacted with.
  - [Collaborative filtering](https://www.elastic.co/docs/solutions/search/vector/vector-search-use-cases#discovery-and-recommendations): Match users or items based on shared behavior or preference patterns in vector space.
  - [Personalized content discovery](https://www.elastic.co/docs/solutions/search/vector/vector-search-use-cases#discovery-and-recommendations): Suggest articles, media, or other content tailored to individual user interests.

- **Analysis**
  - [Anomaly detection](https://www.elastic.co/docs/solutions/search/vector/vector-search-use-cases#duplicate-detection-fraud-and-anomaly-detection): Flag records whose vectors sit unusually far from their nearest neighbors.
  - [Pattern matching](https://www.elastic.co/docs/solutions/search/vector/vector-search-use-cases#duplicate-detection-fraud-and-anomaly-detection): Find near-duplicates, suspicious matches, or other patterns that exact matching would miss.

## Prerequisites for kNN search
To run a kNN search in Elasticsearch:

- Your data must be vectorized. You can:
  - Use [`semantic_text`](https://www.elastic.co/docs/solutions/search/semantic-search/semantic-search-semantic-text) to have Elastic generate embeddings automatically.
  - Use the [Elastic Inference Service](https://www.elastic.co/docs/explore-analyze/elastic-inference/eis) for managed inference.
  - [Deploy an NLP model](https://www.elastic.co/docs/explore-analyze/machine-learning/nlp/ml-nlp-text-emb-vector-search-example) on an ML node.
  - Generate vectors outside of your Elastic deployment. Learn how to [Bring your own dense vectors](https://www.elastic.co/docs/solutions/search/vector/bring-own-vectors).

**Tip:**

Query vectors must have the same dimension and be created with the same model as the document vectors.

- Required [index privileges](https://www.elastic.co/docs/reference/elasticsearch/security-privileges#privileges-list-indices):
  - `create_index` or `manage` to create an index with a `dense_vector` field
  - `create`, `index`, or `write` to add data
  - `read` to search the index

If you're using Elastic Cloud Serverless, [compare Elasticsearch and Vector Database projects](https://www.elastic.co/docs/solutions/vector-database#when-to-use-this-project-type) before implementing kNN search.

## kNN search methods
Elasticsearch provides two ways to perform kNN search. Select a method based on your dataset size, latency requirements, and whether you need exact scoring.

[**Approximate kNN**](https://www.elastic.co/docs/solutions/search/vector/knn/approximate-knn) is best for most production workloads where low latency and scale matter more than perfect recall. It narrows the search to likely matches instead of scoring every document, reducing latency on large datasets.

[**Exact, brute-force kNN**](https://www.elastic.co/docs/solutions/search/vector/knn/exact-knn) is best for small datasets, pre-filtered subsets, or when you need precise scoring without approximate indexing. It scores every matching document, which guarantees accurate results but does not scale well for large datasets. You can improve latency by filtering your data to a small subset of documents.

## kNN search examples
Every kNN search needs a query vector. You can provide it directly or have Elasticsearch generate or retrieve it at search time with `query_vector_builder`. The exact `dense_vector` query and the approximate kNN methods support query vector builders.

For examples that provide a query vector directly, refer to:

- [Approximate kNN search](https://www.elastic.co/docs/solutions/search/vector/knn/approximate-knn#approximate-knn-example)
- [Exact kNN with the `dense_vector` query](https://www.elastic.co/docs/solutions/search/vector/knn/exact-knn#exact-knn-dense-vector-query)
- [Exact kNN with a `script_score` query](https://www.elastic.co/docs/solutions/search/vector/knn/exact-knn#exact-knn-script-score-query)

### Generate or retrieve a query vector at search time
The following examples use `query_vector_builder` with the top-level `knn` option. You can use the same builders with the exact `dense_vector` query. For all available builders and their parameters, refer to [Query vector builders](https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-knn-query#query-vector-builders-overview).

#### Use the `text_embedding` query vector builder
Use the `text_embedding` query vector builder to generate a query vector from text. Specify the same model that generated the document vectors.

Reference the deployed model or its deployment in the `query_vector_builder` object, and pass the search string as `model_text`:

```console
POST my-index/_search
{
  "knn": {
    "field": "dense-vector-field",
    "k": 10,
    "num_candidates": 100,
    "query_vector_builder": {
      "text_embedding": {
        "model_id": "my-text-embedding-model", <1>
        "model_text": "The opposite of blue" <2>
      }
    }
  }
}
```

1. The ID of the text embedding model that generates the query vector. Use the same model that produced the document embeddings in the target index. You can also provide a `deployment_id` as the `model_id` value.
2. The query string from which the model generates the dense vector representation.

For a walkthrough that covers deploying a model, generating document embeddings, and querying them, refer to this [end-to-end example](https://www.elastic.co/docs/explore-analyze/machine-learning/nlp/ml-nlp-text-emb-vector-search-example).

#### Use the `lookup` query vector builder
_Applies to: stack: ga 9.4_

Use the [`lookup` query vector builder](https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-knn-query#knn-query-builder-lookup) when the vector you want to search with is already stored in a document. This is the pattern behind "more like this" and recommendation features: instead of embedding new input, you take the vector from an item the user is viewing and find its nearest neighbors.

The following request finds the images most similar to document `2`:

```console
POST image-index/_search
{
  "knn": {
    "field": "image-vector",
    "k": 10,
    "query_vector_builder": {
      "lookup": {
        "index": "image-index", <1>
        "id": "2", <2>
        "path": "image-vector" <3>
      }
    }
  }
}
```

1. The index that holds the document to look up. It doesn't have to be the index you're searching.
2. The ID of the document to look up. The request fails with a `404` if the document doesn't exist or has no value for `path`.
3. The vector field to read the query vector from. Its dimensions must match the field you're searching.

Elasticsearch reads the vector from the indexed field rather than from `_source`, so the lookup works even when vector values are excluded from `_source`.

The looked-up document is its own nearest neighbor, so it comes back as the top hit. Exclude it with a filter when you only want other documents:

```console
POST image-index/_search
{
  "knn": {
    "field": "image-vector",
    "k": 10,
    "query_vector_builder": {
      "lookup": {
        "index": "image-index",
        "id": "2",
        "path": "image-vector"
      }
    },
    "filter": {
      "bool": {
        "must_not": {
          "ids": {
            "values": ["2"]
          }
        }
      }
    }
  }
}
```

### Find more examples by method

For approximate kNN similarity thresholds, hybrid search, multiple vector fields, and aggregations, refer to [Approximate kNN query examples](https://www.elastic.co/docs/solutions/search/vector/knn/approximate-knn-query-examples). For filtering, refer to [Filter approximate kNN results](https://www.elastic.co/docs/solutions/search/vector/knn/filtered-knn-search).

For exact kNN filtering and scoring examples, refer to [Exact kNN search](https://www.elastic.co/docs/solutions/search/vector/knn/exact-knn).

## Next steps

Continue with the guide for the kNN search method that fits your use case:

- [Approximate kNN search](https://www.elastic.co/docs/solutions/search/vector/knn/approximate-knn): Learn how to map, index, and query `dense_vector` fields for fast, scalable approximate kNN search.
- [Exact kNN search](https://www.elastic.co/docs/solutions/search/vector/knn/exact-knn): Learn how to run exact brute-force kNN search for small datasets or precise scoring.


## Approximate kNN search
Approximate kNN search uses graph-based or clustered index structures to find similar vectors quickly at scale. Use it for most production workloads where you need low latency at scale. This page covers approximate kNN search methods, a basic example, mapping defaults, indexing considerations, and vector index mode.

**Tip:**

If you use `semantic_text` fields, query them with a [`match` query](https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-match-query) for the simplest approach, or use the [`knn` query](https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-knn-query#knn-query-with-semantic-text) when you need more control over the search.

**Warning:**

Approximate kNN search has specific resource requirements. For instance, for HNSW, all vector data must fit in the node’s page cache for efficient performance. Refer to the [approximate kNN tuning guide](https://www.elastic.co/docs/deploy-manage/production-guidance/optimize-performance/approximate-knn-search) for configuration tips.

### Approximate kNN search methods
Elasticsearch provides three ways to run approximate kNN search, with different field type support:

| Method | Supported field types | Use case |
|---|---|---|
| Top-level `knn` option | [`dense_vector`](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/dense-vector) | Standalone kNN search or hybrid search with score fusion |
| [`knn` query](https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-knn-query) | [`dense_vector`](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/dense-vector), [`semantic_text`](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/semantic-text) | Composable with other queries in a `bool` clause. Required for `semantic_text` fields |
| [`knn` retriever](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/retrievers/knn-retriever) | [`dense_vector`](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/dense-vector) | Use within a retriever pipeline for ranking and result merging |

### Basic example
Follow these steps to map `dense_vector` fields, index embeddings, and run a basic approximate kNN query.

1. Map one or more `dense_vector` fields. Approximate kNN search is enabled by default, so no extra mapping options are required.

    Optionally, you can configure additional parameters, including the similarity metric, index options, and quantization. Refer to [`dense_vector`](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/dense-vector#dense-vector-params) for the full list of parameters.

    ```console
    PUT image-index
    {
      "mappings": {
        "properties": {
          "image-vector": {
            "type": "dense_vector",
            "similarity": "l2_norm"
          },
          "title": {
            "type": "text"
          },
          "file-type": {
            "type": "keyword"
          }
        }
      }
    }
    ```

2. Index your data with embeddings. If you don't have vectors yet, refer to [Bring your own dense vectors](https://www.elastic.co/docs/solutions/search/vector/bring-own-vectors) for options on generating or sourcing them.

    ```console
    POST image-index/_bulk?refresh=true
    { "index": { "_id": "1" } }
    { "image-vector": [1, 5, -20], "title": "moose family", "file-type": "jpg" }
    { "index": { "_id": "2" } }
    { "image-vector": [42, 8, -15], "title": "alpine lake", "file-type": "png" }
    { "index": { "_id": "3" } }
    { "image-vector": [15, 11, 23], "title": "full moon", "file-type": "jpg" }
    ...
    ```

3. Query using the [`knn` option](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search#operation-search-body-application-json-knn):

    ```console
    POST image-index/_search
    {
      "knn": {
        "field": "image-vector",
        "query_vector": [-5, 9, -12],
        "k": 10
      }
    }
    ```

    Alternatively, use a [`knn` query](https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-knn-query), which you can combine with other queries in a `bool` clause:

    ```console
    POST image-index/_search
    {
      "query": {
        "knn": {
          "field": "image-vector",
          "query_vector": [-5, 9, -12],
          "k": 10
        }
      }
    }
    ```

The document `_score` is a positive float calculated based on the chosen vector similarity metric. Refer to [`similarity`](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/dense-vector#dense-vector-similarity) for details on how kNN scores are computed.

### Mapping defaults
Approximate kNN works without any explicit mapping options. Unless you set them, Elasticsearch applies these defaults:

| Parameter | Default |
|---|---|
| `index` | `true`, so the field is searchable with approximate kNN |
| `element_type` | `float` |
| `dims` | Inferred from the first vector indexed into the field |
| `similarity` | `cosine`, except for `bit` vectors, which use `l2_norm` |
| `index_options.type` | `float` and `bfloat16` vectors are quantized automatically, using BBQ where available and `int8_hnsw` for low-dimensional vectors. `byte` and `bit` vectors are not quantized. |

The `index_options.type` default is particularly important: by default your `float` vectors are quantized, which is what keeps memory use manageable at scale. Refer to [Default quantization types](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/dense-vector#dense-vector-quantization) for how the default is chosen, and to [Optimize performance and accuracy](https://www.elastic.co/docs/solutions/search/vector/knn/optimize-performance-accuracy) if you need to override it.

### Indexing considerations for approximate kNN search
For approximate kNN, Elasticsearch indexes dense vector values as an [HNSW graph](https://arxiv.org/abs/1603.09320) or as clusters using [DiskBBQ](https://www.elastic.co/search-labs/blog/diskbbq-elasticsearch-introduction). Building these structures is compute-intensive. [GPU-accelerated vector indexing](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/gpu-vector-indexing) is also supported. To reduce memory use and speed up vector distance calculations, Elasticsearch also [quantizes](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/dense-vector#dense-vector-quantization) vectors.

Quantization comes at the expense of recall, which you can compensate for by [oversampling and rescoring](https://www.elastic.co/docs/solutions/search/vector/knn/optimize-performance-accuracy#dense-vector-knn-search-rescoring) more vectors. The `hnsw` and `bbq_disk` types each come with their own settings to balance recall, indexing speed, and vector search speed.

For guidance on choosing and tuning these settings, refer to the [approximate kNN tuning guide](https://www.elastic.co/docs/deploy-manage/production-guidance/optimize-performance/approximate-knn-search). When defining your `dense_vector` mapping, use [`index_options`](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/dense-vector#dense-vector-index-options) to set these parameters.

### Vector index mode
_Applies to: stack: ga 9.5+; serverless: ga_

If an index is used primarily for vector search, create it with the `vectordb_document` [index mode](https://www.elastic.co/docs/reference/elasticsearch/index-settings/index-modules#index-mode-setting) to get defaults tuned for vector workloads:

```console
PUT my-vector-index
{
  "settings": {
    "index": {
      "mode": "vectordb_document"
    }
  }
}
```

In this mode, Elasticsearch encodes vectors as `bfloat16` to halve raw vector storage, excludes vector values from `_source`, preloads vector index files into the filesystem cache, and tunes merging for vector data.

Refer to [Index modes for vector search](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/dense-vector#dense-vector-index-modes) for the full list of applied settings.

### Resources

- [Tune approximate kNN search](https://www.elastic.co/docs/deploy-manage/production-guidance/optimize-performance/approximate-knn-search): Production guidance for vector memory, node sizing, indexing, filesystem cache, and on-disk rescoring.
- [Profile kNN search](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/search-profile#profiling-knn-search): Inspect query timing and vector operation counts to diagnose slow kNN searches.
- [`dense_vector` field type](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/dense-vector): API reference for vector field mapping, including `index`, `similarity`, `index_options`, and quantization parameters.
- [`knn` query](https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-knn-query): API reference for the `knn` query, including parameters, `query_vector_builder` options, and usage with `dense_vector` and `semantic_text` fields.


## Filter approximate kNN results
Use a filter with approximate kNN when you want the most similar results, but only from a specific subset of your data. For example, you might search for similar products in one category, documents from a certain time period, or images with a particular file type.

The examples run against the `image-index` mapping and sample data from [Approximate kNN search](https://www.elastic.co/docs/solutions/search/vector/knn/approximate-knn#approximate-knn-example).

Add a `filter` to the `knn` clause. Elasticsearch returns the top `k` nearest neighbors that also satisfy the filter query:

```console
POST image-index/_search
{
  "knn": {
    "field": "image-vector",
    "query_vector": [54, 10, -2],
    "k": 5,
    "num_candidates": 50,
    "filter": {
      "term": {
        "file-type": "png"
      }
    }
  },
  "fields": ["title"],
  "_source": false
}
```

**Note:**

The filter is applied **during** approximate kNN search to ensure that `k` matching documents are returned. In contrast, post-filtering applies the filter **after** the approximate kNN step and can return fewer than `k` results, even when enough relevant documents exist.

### Pre-filtering and post-filtering
Pre-filtering only happens when the filter is part of the kNN clause itself. The `filter` parameter of the `knn` option, the `knn` query, and the `knn` retriever all pre-filter. A filter placed outside the kNN clause does not.

This distinction matters most when you translate a filtered search into the [`knn` query](https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-knn-query) form. In the following request, the `filter` clause of the `bool` query is a sibling of the `knn` query, so it's applied **after** the vector search:

```console
POST image-index/_search
{
  "query": {
    "bool": {
      "must": {
        "knn": {
          "field": "image-vector",
          "query_vector": [54, 10, -2],
          "k": 5,
          "num_candidates": 50
        }
      },
      "filter": {
        "term": {
          "file-type": "png"
        }
      }
    }
  }
}
```

The kNN search runs without any knowledge of the filter and returns the five nearest images regardless of file type. Only then does the `bool` query discard the ones that aren't PNGs, so the response can contain far fewer than five hits, or none at all, even when the index holds plenty of similar PNGs.

To pre-filter instead, move the filter inside the `knn` query:

```console
POST image-index/_search
{
  "query": {
    "knn": {
      "field": "image-vector",
      "query_vector": [54, 10, -2],
      "k": 5,
      "num_candidates": 50,
      "filter": {
        "term": {
          "file-type": "png"
        }
      }
    }
  }
}
```

Post-filtering isn't always wrong. It's a reasonable choice when the filter matches most of your documents and you'd rather not pay the cost of filtered graph traversal. But when the filter is selective, pre-filter.

### Filtering behavior and performance
In approximate kNN search with an HNSW index, filters can make a search slower rather than faster, because the search has to explore more of the graph to collect enough candidates that satisfy the filter. This is the opposite of conventional query filtering, where a stricter filter usually speeds up a query.

To limit the impact, Lucene falls back to brute force per segment in two cases:

* If the number of documents matching the filter in a segment is no greater than the number of candidates the search would examine there, the search skips the HNSW graph and scores the filtered documents directly.
* While exploring the graph, if the search visits more nodes than there are documents matching the filter, it stops traversing and scores the filtered documents directly.

**Note:**

For indices created in 9.1 or later, Elasticsearch also applies the `acorn` filter heuristic by default, which traverses only vectors that match the filter instead of comparing every vector it visits. This is generally faster at comparable recall, although you might need to raise `num_candidates` to hit exceptionally high recall targets. To change the heuristic, use [`index.dense_vector.hnsw_filter_heuristic`](https://www.elastic.co/docs/reference/elasticsearch/index-settings/index-modules#index-dense-vector-hnsw-filter-heuristic).

For more ways to trade approximate search speed against accuracy, refer to [Optimize approximate kNN performance and accuracy](https://www.elastic.co/docs/solutions/search/vector/knn/optimize-performance-accuracy).
