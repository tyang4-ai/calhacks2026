# Retrievers for hybrid search: rrf, knn, standard

> Sources:
> - https://www.elastic.co/docs/reference/elasticsearch/rest-apis/retrievers
> - https://www.elastic.co/docs/reference/elasticsearch/rest-apis/retrievers/rrf-retriever
> - https://www.elastic.co/docs/reference/elasticsearch/rest-apis/retrievers/knn-retriever
> - https://www.elastic.co/docs/reference/elasticsearch/rest-apis/retrievers/standard-retriever
> Fetched: 2026-10-24.
>
> Four pages from the elastic/elasticsearch repo, main branch. The retrievers overview comes first, then each retriever.
> The Python client takes the same JSON as `es.search(index=..., retriever={...})`.

A retriever is a specification to describe top documents returned from a search. A retriever replaces other elements of the [search API](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search) that also return top documents such as [`query`](https://www.elastic.co/docs/reference/query-languages/querydsl) and [`knn`](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search#search-api-knn). A retriever may have child retrievers where a retriever with two or more children is considered a compound retriever. This allows for complex behavior to be depicted in a tree-like structure, called the retriever tree, which clarifies the order of operations that occur during a search.

**Tip:**

Refer to [*Retrievers*](https://www.elastic.co/docs/solutions/search/retrievers-overview) for a high level overview of the retrievers abstraction. Refer to [Retrievers examples](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/retrievers/retrievers-examples) for additional examples.

The following retrievers are available:

`diversify` (serverless: preview) (stack: preview 9.3)
:   The [diversify](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/retrievers/diversify-retriever) retriever reduces the results from another retriever by applying a diversification strategy to the top-N results.

`knn`
:   The [knn](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/retrievers/knn-retriever) retriever replaces the functionality of a [knn search](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search#search-api-knn).

`linear`
:   The [linear](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/retrievers/linear-retriever) retriever linearly combines the scores of other retrievers for the top documents.

`pinned` (stack: GA 9.1)
:   The [pinned](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/retrievers/pinned-retriever) retriever always places specified documents at the top of the results, with the remaining hits provided by a secondary retriever.

`rescorer`
:   The [rescorer](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/retrievers/rescorer-retriever) retriever replaces the functionality of the [query rescorer](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/rescore-search-results#rescore).

`rrf`
:   The [rrf](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/retrievers/rrf-retriever) retriever produces top documents from [reciprocal rank fusion (RRF)](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/reciprocal-rank-fusion).

`rule`
:   The [rule](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/retrievers/rule-retriever) retriever applies contextual [Searching with query rules](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/searching-with-query-rules#query-rules) to pin or exclude documents for specific queries.

`standard`
:   The [standard](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/retrievers/standard-retriever) retriever replaces the functionality of a traditional [query](https://www.elastic.co/docs/reference/query-languages/querydsl).

`text_similarity_reranker`
:   The [text_similarity_reranker](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/retrievers/text-similarity-reranker-retriever) retriever enhances search results by re-ranking documents based on semantic similarity to a specified inference text, using a machine learning model.

## Common usage guidelines
### Using `from` and `size` with a retriever tree
The [`from`](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search#search-from-param) and [`size`](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search#search-size-param) parameters are provided globally as part of the general [search API](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search). They are applied to all retrievers in a retriever tree, unless a specific retriever overrides the `size` parameter using a different parameter such as `rank_window_size`. Though, the final search hits are always limited to `size`.

### Using aggregations with a retriever tree
[Aggregations](https://www.elastic.co/docs/reference/aggregations) are globally specified as part of a search request. The query used for an aggregation is the combination of all leaf retrievers as `should` clauses in a [boolean query](https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-bool-query).

### Using `min_score` with compound retrievers
When using `min_score` with compound retrievers (such as [`rrf`](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/retrievers/rrf-retriever) or [`linear`](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/retrievers/linear-retriever)), documents are filtered **after** the compound scoring has been applied. This is important to understand because:

1. **Document collection**: Each child retriever collects documents up to its `rank_window_size` limit.
2. **Score computation**: The compound retriever computes final scores (e.g., RRF ranking, linear combination with normalization).
3. **Threshold filtering**: Documents with a final score below `min_score` are excluded from the results.

Because `min_score` is applied after score normalization or RRF computation, the `total_hits` value reflects only the documents that pass the threshold after the compound scoring, not the total number of documents matched by the child retrievers.

### Restrictions on search parameters when specifying a retriever
When a retriever is specified as part of a search, the following elements are not allowed at the top-level:

* [`query`](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search#request-body-search-query)
* [`knn`](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search#search-api-knn)
* [`search_after`](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/paginate-search-results#search-after)
* [`terminate_after`](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search#request-body-search-terminate-after)
* [`sort`](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search#search-sort-param)
* [`rescore`](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/rescore-search-results#rescore) use a [rescorer retriever](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/retrievers/rescorer-retriever) instead

## Multi-field query format
_Applies to: stack: ga 9.1_

The [`linear`](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/retrievers/linear-retriever) and [`rrf`](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/retrievers/rrf-retriever) retrievers support a multi-field query format that provides a simplified way to define searches across multiple fields without explicitly specifying inner retrievers.
This format automatically generates appropriate inner retrievers based on the field types and query parameters.
This is a great way to search an index, knowing little to nothing about its schema, while also handling normalization across lexical and semantic matches.

### Field grouping
The multi-field query format groups queried fields into two categories:

- **Lexical fields**: fields that support term queries, such as `keyword` and `text` fields.
- **Semantic fields**: [`semantic_text` fields](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/semantic-text).

Each field group is queried separately and the scores/ranks are normalized such that each contributes 50% to the final score/rank.
This balances the importance of lexical and semantic fields.
Most indices contain more lexical than semantic fields, and without this grouping the results would often bias towards lexical field matches.

**Warning:**

In the `linear` retriever, this grouping relies on using a normalizer other than `none` (i.e., `minmax` or `l2_norm`).
If you use the `none` normalizer, the scores across field groups will not be normalized and the results may be biased towards lexical field matches.

### Linear retriever field boosting
When using the `linear` retriever, fields can be boosted using the `^` notation:

```console
GET books/_search
{
  "retriever": {
    "linear": {
      "query": "elasticsearch",
      "fields": [
        "title^3",                <1>
        "description^2",          <2>
        "title_semantic",         <3>
        "description_semantic^2"
      ],
      "normalizer": "minmax"
    }
  }
}
```

1. 3x weight
2. 2x weight
3. 1x weight (default)

Due to how the field group scores are normalized, per-field boosts have no effect on the range of the final score.
Instead, they affect the importance of the field's score within its group.

For example, if the schema looks like:

```console
PUT /books
{
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "copy_to": "title_semantic"
      },
      "description": {
        "type": "text",
        "copy_to": "description_semantic"
      },
      "title_semantic": {
        "type": "semantic_text"
      },
      "description_semantic": {
        "type": "semantic_text"
      }
    }
  }
}
```

And we run this query:

```console
GET books/_search
{
  "retriever": {
    "linear": {
      "query": "elasticsearch",
      "fields": [
        "title",
        "description",
        "title_semantic",
        "description_semantic"
      ],
      "normalizer": "minmax"
    }
  }
}
```

The score breakdown would be:

* Lexical fields (50% of score):
  * `title`: 50% of lexical fields group score, 25% of final score
  * `description`: 50% of lexical fields group score, 25% of final score
* Semantic fields (50% of score):
  * `title_semantic`: 50% of semantic fields group score, 25% of final score
  * `description_semantic`: 50% of semantic fields group score, 25% of final score

If we apply per-field boosts like so:

```console
GET books/_search
{
  "retriever": {
    "linear": {
      "query": "elasticsearch",
      "fields": [
        "title^3",
        "description^2",
        "title_semantic",
        "description_semantic^2"
      ],
      "normalizer": "minmax"
    }
  }
}
```

The score breakdown would change to:

* Lexical fields (50% of score):
    * `title`: 60% of lexical fields group score, 30% of final score
    * `description`: 40% of lexical fields group score, 20% of final score
* Semantic fields (50% of score):
    * `title_semantic`: 33% of semantic fields group score, 16.5% of final score
    * `description_semantic`: 66% of semantic fields group score, 33% of final score

### Wildcard field patterns
Field names support the `*` wildcard character to match multiple fields:

```console
GET books/_search
{
  "retriever": {
    "rrf": {
      "query": "machine learning",
      "fields": [
        "title*",    <1>
        "*_text"     <2>
      ]
    }
  }
}
```

1. Match fields that start with `title`
2. Match fields that end with `_text`

Note, however, that wildcard field patterns will only resolve to fields that either:

- Support term queries, such as `keyword` and `text` fields
- Are `semantic_text` fields

### Limitations

- **Single index**: Until 9.2, multi-field queries only work with single index searches.
- **CCS (Cross Cluster Search)**: Multi-field queries do not support remote cluster searches

### Examples

- [RRF with the multi-field query format](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/retrievers/retrievers-examples#retrievers-examples-rrf-multi-field-query-format)
- [Linear retriever with the multi-field query format](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/retrievers/retrievers-examples#retrievers-examples-linear-multi-field-query-format)


## RRF retriever
An [RRF](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/reciprocal-rank-fusion) retriever returns top documents based on the RRF formula, combining two or more child retrievers.
Reciprocal rank fusion (RRF) is a method for combining multiple result sets with different relevance indicators into a single result set.

### Parameters
**Note:**

Either `query` or `retrievers` must be specified.
Combining `query` and `retrievers` is not supported.

`query` (stack: ga 9.1)
:   (Optional, String)

    The query to use when using the [multi-field query format](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/retrievers#multi-field-query-format).

`fields` (stack: ga 9.1)
:   (Optional, array of strings)

    The fields to query when using the [multi-field query format](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/retrievers#multi-field-query-format).
    If not specified, uses the index's default fields from the `index.query.default_field` index setting, which is `*` by default.

`retrievers`
:   (Optional, array of retriever objects)

    A list of child retrievers to specify which sets of returned top documents will have the RRF formula applied to them.
    Each retriever can optionally include a weight to adjust its influence on the final ranking. (stack: ga 9.2)

    When weights are specified, the final RRF score is calculated as:
    ```
    rrf_score = weight_1 × rrf_score_1 + weight_2 × rrf_score_2 + ... + weight_n × rrf_score_n
    ```
    where `rrf_score_i` is the RRF score for document from retriever `i`, and `weight_i` is the weight for that retriever.

`rank_constant`
:   (Optional, integer)

    This value determines how much influence documents in individual result sets per query have over the final ranked result set. A higher value indicates that lower ranked documents have more influence. This value must be greater than or equal to `1`. Defaults to `60`.

`rank_window_size`
:   (Optional, integer)

    This value determines the size of the individual result sets per query.
    A higher value will improve result relevance at the cost of performance.
    The final ranked result set is pruned down to the search request’s [size](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search#search-size-param).
    `rank_window_size` must be greater than or equal to `size` and greater than or equal to `1`.
    Defaults to 10.

`filter`
:   (Optional, [query object or list of query objects](https://www.elastic.co/docs/reference/query-languages/querydsl))

    Applies the specified [boolean query filter](https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-bool-query) to all of the specified sub-retrievers, according to each retriever’s specifications.

Each entry in the `retrievers` array can be specified using the direct format or the wrapped format. (stack: ga 9.2)

**Direct format** (default weight of `1.0`):
```json
{
  "rrf": {
    "retrievers": [
      {
        "standard": {
          "query": {
            "multi_match": {
              "query": "search text",
              "fields": ["field1", "field2"]
            }
          }
        }
      },
      {
        "knn": {
          "field": "vector",
          "query_vector": [1, 2, 3],
          "k": 10,
          "num_candidates": 50
        }
      }
    ]
  }
}
```

**Wrapped format with custom weights** (stack: ga 9.2):
```json
{
  "rrf": {
    "retrievers": [
      {
        "retriever": {
          "standard": {
            "query": {
              "multi_match": {
                "query": "search text",
                "fields": ["field1", "field2"]
              }
            }
          }
        },
        "weight": 2.0
      },
      {
        "retriever": {
          "knn": {
            "field": "vector",
            "query_vector": [1, 2, 3],
            "k": 10,
            "num_candidates": 50
          }
        },
        "weight": 1.0
      }
    ]
  }
}
```

In the wrapped format:

`retriever`
:   (Required, a retriever object)

    Specifies a child retriever. Any valid retriever type can be used (e.g., `standard`, `knn`, `text_similarity_reranker`, etc.).

`weight` (stack: ga 9.2)
:   (Optional, float)

    The weight that each score of this retriever's top docs will be multiplied in the RRF formula. Higher values increase this retriever's influence on the final ranking. Must be non-negative. Defaults to `1.0`.

### Example: Hybrid search
A simple hybrid search example (lexical search + dense vector search) combining a `standard` retriever with a `knn` retriever using RRF:

```console
GET /restaurants/_search
{
  "retriever": {
    "rrf": { <1>
      "retrievers": [ <2>
        {
          "standard": { <3>
            "query": {
              "multi_match": {
                "query": "Austria",
                "fields": [
                  "city",
                  "region"
                ]
              }
            }
          }
        },
        {
          "knn": { <4>
            "field": "vector",
            "query_vector": [10, 22, 77],
            "k": 10,
            "num_candidates": 10
          }
        }
      ],
      "rank_constant": 1, <5>
      "rank_window_size": 50  <6>
    }
  }
}
```

1. Defines a retriever tree with an RRF retriever.
2. The sub-retriever array.
3. The first sub-retriever is a `standard` retriever.
4. The second sub-retriever is a `knn` retriever.
5. The rank constant for the RRF retriever.
6. The rank window size for the RRF retriever.

### Example: Weighted hybrid search
(stack: ga 9.2)

This example demonstrates how to use weights to adjust the influence of different retrievers in the RRF ranking.
In this case, we're giving the `standard` retriever more importance (weight 2.0) compared to the `knn` retriever (weight 1.0):

```console
GET /restaurants/_search
{
  "retriever": {
    "rrf": {
      "retrievers": [
        {
          "retriever": { <1>
            "standard": {
              "query": {
                "multi_match": {
                  "query": "Austria",
                  "fields": ["city", "region"]
                }
              }
            }
          },
          "weight": 2.0 <2>
        },
        {
          "retriever": { <3>
            "knn": {
              "field": "vector",
              "query_vector": [10, 22, 77],
              "k": 10,
              "num_candidates": 10
            }
          },
          "weight": 1.0 <4>
        }
      ],
      "rank_constant": 60,
      "rank_window_size": 50
    }
  }
}
```

1. The first retriever in weighted format.
2. This retriever has a weight of 2.0, giving it twice the influence of the kNN retriever.
3. The second retriever in weighted format.
4. This retriever has a weight of 1.0 (default weight).

**Note:**

You can mix weighted and non-weighted formats in the same query.
The direct format (without explicit `retriever` wrapper) uses the default weight of `1.0`:

```json
{
  "rrf": {
    "retrievers": [
      { "standard": { "query": {...} } },
      { "retriever": { "knn": {...} }, "weight": 2.0 }
    ]
  }
}
```

In this example, the `standard` retriever uses weight `1.0` (default), while the `knn` retriever uses weight `2.0`.

### Example: Hybrid search with sparse vectors
A more complex hybrid search example (lexical search + ELSER sparse vector search + dense vector search) using RRF:

```console
GET movies/_search
{
  "retriever": {
    "rrf": {
      "retrievers": [
        {
          "standard": {
            "query": {
              "sparse_vector": {
                "field": "plot_embedding",
                "inference_id": "my-elser-model",
                "query": "films that explore psychological depths"
              }
            }
          }
        },
        {
          "standard": {
            "query": {
              "multi_match": {
                "query": "crime",
                "fields": [
                  "plot",
                  "title"
                ]
              }
            }
          }
        },
        {
          "knn": {
            "field": "vector",
            "query_vector": [10, 22, 77],
            "k": 10,
            "num_candidates": 10
          }
        }
      ]
    }
  }
}
```


## kNN retriever
A kNN retriever returns top documents from a [k-nearest neighbor search (kNN)](https://www.elastic.co/docs/solutions/search/vector/knn).

### Parameters
`field`
:   (Required, string)

    The name of the vector field to search against. Must be a [`dense_vector` field with indexing enabled](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/dense-vector#index-vectors-knn-search). To run a kNN search on a [`semantic_text`](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/semantic-text) field, use the [`knn` query](https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-knn-query#knn-query-with-semantic-text) instead.

`query_vector`
:   (Required if `query_vector_builder` is not defined, array of `float` or string)

    Query vector. Must have the same number of dimensions as the vector field you are searching against.
    Must be one of:
      - An array of floats
      - A hex-encoded byte vector (one byte per dimension; for `bit`, one byte per 8 dimensions). (stack: ga 9.0-9.3)
      - A base64-encoded vector string. Base64 supports `float` and `bfloat16` (big-endian), `byte`, and `bit` encodings depending on the target field type. (stack: ga 9.4) (serverless: ga)

`query_vector_builder`
:   (Required if `query_vector` is not defined, query vector builder object)

    Defines a [model](https://www.elastic.co/docs/solutions/search/vector/knn#knn-semantic-search) to build a query vector.

`k`
:   (Required, integer)

    Number of nearest neighbors to return as top hits. This value must be fewer than or equal to `num_candidates`.

`num_candidates`
:   (Optional, integer (stack: ga 9.5); in earlier versions this parameter is required)

    The number of nearest neighbor candidates to consider per shard. Needs to be greater than `k`, or `size` if `k` is omitted, and cannot exceed 10,000. Elasticsearch collects `num_candidates` results from each shard, then merges them to find the top `k` results. Increasing `num_candidates` tends to improve the accuracy of the final `k` results. Defaults to `Math.min(1.5 * k, 10_000)`.

`visit_percentage` (stack: ga 9.2)
:   (Optional, float)

    The percentage of vectors to explore per shard while doing knn search with `bbq_disk`. Must be between 0 and 100.  0 will default to using `num_candidates` for calculating the percent visited. Increasing `visit_percentage` tends to improve the accuracy of the final results.  If `visit_percentage` is set for `bbq_disk`, `num_candidates` is ignored. Defaults to ~1% per shard for every 1 million vectors.

`filter`
:   (Optional, [query object or list of query objects](https://www.elastic.co/docs/reference/query-languages/querydsl))

    Query to filter the documents that can match. The kNN search will return the top `k` documents that also match this filter. The value can be a single query or a list of queries. If `filter` is not provided, all documents are allowed to match.

`similarity`
:   (Optional, float)

    The minimum similarity required for a document to be considered a match. The similarity value calculated relates to the raw [`similarity`](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/dense-vector#dense-vector-similarity) used. Not the document score. The matched documents are then scored according to [`similarity`](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/dense-vector#dense-vector-similarity) and the provided `boost` is applied.

    The `similarity` parameter is the direct vector similarity calculation.

    * `l2_norm`: also known as Euclidean, will include documents where the vector is within the `dims` dimensional hypersphere with radius `similarity` with origin at `query_vector`.
    * `cosine`, `dot_product`, and `max_inner_product`: Only return vectors where the cosine similarity or dot-product are at least the provided `similarity`.

    Read more here: [knn similarity search](https://www.elastic.co/docs/solutions/search/vector/knn/approximate-knn-query-examples#knn-similarity-search)

`rescore_vector` (stack: preview =9.0, ga 9.1+)
:   (Optional, object) Apply oversampling and rescoring to quantized vectors.

**Note:**

Rescoring only makes sense for quantized vectors; when [quantization](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/dense-vector#dense-vector-quantization) is not used, the original vectors are used for scoring. Rescore option will be ignored for non-quantized `dense_vector` fields.

`oversample`
:   (Required, float)

    Applies the specified oversample factor to `k` on the approximate kNN search. The approximate kNN search will:

    * Retrieve `num_candidates` candidates per shard.
    * From these candidates, the top `k * oversample` candidates per shard will be rescored using the original vectors.
    * The top `k` rescored candidates will be returned.

See [oversampling and rescoring quantized vectors](https://www.elastic.co/docs/solutions/search/vector/knn/optimize-performance-accuracy#dense-vector-knn-search-rescoring) for details.

### Restrictions
The parameters `query_vector` and `query_vector_builder` cannot be used together.

### Example
```console
GET /restaurants/_search
{
  "retriever": {
    "knn": { <1>
      "field": "vector", <2>
      "query_vector": [10, 22, 77], <3>
      "k": 10, <4>
      "num_candidates": 10 <5>
    }
  }
}
```

1. Configuration for k-nearest neighbor (knn) search, which is based on vector similarity.
2. Specifies the field name that contains the vectors.
3. The query vector against which document vectors are compared in the `knn` search.
4. The number of nearest neighbors to return as top hits. This value must be fewer than or equal to `num_candidates`.
5. The size of the initial candidate set from which the final `k` nearest neighbors are selected.


## Standard retriever
A standard retriever returns top documents from a traditional [query](https://www.elastic.co/docs/reference/query-languages/querydsl).

#### Parameters:
`query`
:   (Optional, [query object](https://www.elastic.co/docs/reference/query-languages/querydsl))

    Defines a query to retrieve a set of top documents.

`filter`
:   (Optional, [query object or list of query objects](https://www.elastic.co/docs/reference/query-languages/querydsl))

    Applies a [boolean query filter](https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-bool-query) to this retriever, where all documents must match this query but do not contribute to the score.

`search_after`
:   (Optional, [search after object](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/paginate-search-results#search-after))

    Defines a search after object parameter used for pagination.

`terminate_after`
:   (Optional, integer) Maximum number of documents to collect for each shard. If a query reaches this limit, Elasticsearch terminates the query early. Elasticsearch collects documents before sorting.

**Important:**

    Use with caution. Elasticsearch applies this parameter to each shard handling the request. When possible, let Elasticsearch perform early termination automatically. Avoid specifying this parameter for requests that target data streams with backing indices across multiple data tiers.

`sort`
:   (Optional, [sort object](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/sort-search-results)) A sort object that specifies the order of matching documents.

`min_score`
:   (Optional, `float`)

    Minimum [`_score`](https://www.elastic.co/docs/reference/query-languages/query-dsl/query-filter-context#relevance-scores) for matching documents. Documents with a lower `_score` are not included in the top documents.

`collapse`
:   (Optional, [collapse object](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/collapse-search-results))

    Collapses the top documents by a specified key into a single top document per key.

### Restrictions
When a retriever tree contains a compound retriever (a retriever with two or more child retrievers) the [search after](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/paginate-search-results#search-after) parameter is not supported.

### Example
```console
GET /restaurants/_search
{
  "retriever": { <1>
    "standard": { <2>
      "query": { <3>
        "bool": { <4>
          "should": [ <5>
            {
              "match": { <6>
                "region": "Austria"
              }
            }
          ],
          "filter": [ <7>
            {
              "term": { <8>
                "year": "2019" <9>
              }
            }
          ]
        }
      }
    }
  }
}
```

1. Opens the `retriever` object.
2. The `standard` retriever is used for defining traditional Elasticsearch queries.
3. The entry point for defining the search query.
4. The `bool` object allows for combining multiple query clauses logically.
5. The `should` array indicates conditions under which a document will match. Documents matching these conditions will have increased relevancy scores.
6. The `match` object finds documents where the `region` field contains the word "Austria."
7. The `filter` array provides filtering conditions that must be met but do not contribute to the relevancy score.
8. The `term` object is used for exact matches, in this case, filtering documents by the `year` field.
9. The exact value to match in the `year` field.
