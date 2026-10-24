# Sentence Transformers: what changed in v5.4 and v6 (for code written from memory)

> Sources:
> - https://sbert.net/docs/migration_guide.html
> - https://github.com/UKPLab/sentence-transformers/blob/v6.2.0/docs/migration_guide.md
> Fetched: 2026-10-24.
>
> From the UKPLab/sentence-transformers repo at tag v6.2.0 (released Oct 21, 2026, the current PyPI release).
> v6 needs transformers 5.x, torch 2.2+ and huggingface-hub 1.x or later. The docs use the new import paths, such as `from sentence_transformers.sentence_transformer.losses import MultipleNegativesRankingLoss`. The v3-style paths (`sentence_transformers.losses`) still work through deprecated aliases and print a warning.
> Only the v5 to v6 and v5 to v5.4 sections are kept, without the PyLate, colpali and CrossEncoder parts.

## Migrating from v5.x to v6.x

The v6.0 release introduces `MultiVectorEncoder`, a fourth model type for ColBERT-style multi-vector (late interaction) retrieval models. It absorbs the modeling, training, and evaluation of [PyLate](https://github.com/lightonai/pylate) and [colpali-engine](https://github.com/illuin-tech/colpali): see the two dedicated sections below if you are migrating from either library.

### Breaking changes

v6.0 requires `transformers` v5.x (up from 4.41+), `torch` 2.2+ (up from 1.11+), and `huggingface-hub` v1.x (up from 0.23+): if your environment pins any of these lower, plan those upgrades first. Smaller floors also moved (`numpy` 1.24+, `scikit-learn` 1.1+, and for the `train` extra `datasets` 2.16+ and `accelerate` 1.3+). The minimum Python version stays 3.10.

#### Changed outputs and artifacts

- `CrossEncoder`'s `rank` now returns Python floats as its `"score"` values, where it previously returned `numpy.float32` scalars, or 0-dimensional tensors with `convert_to_tensor=True`. The results are directly JSON serializable, which matches what `semantic_search` already returned. The `convert_to_numpy` and `convert_to_tensor` arguments on `rank` are now deprecated no-ops that will be removed in a future version: call `predict` directly if you want the scores as an array or a tensor.
- `CrossEncoder`'s `predict` (and `rank`) now upcasts the scores to `float32` before applying the optional activation function, so `float16` and `bfloat16` rerankers return different and far better ordered scores: a sigmoid in half precision saturates and ties the top candidates together. The returned dtype changes only for `predict` with `convert_to_tensor=True` or `convert_to_numpy=False`, as the default numpy output was already `float32`.
- `quantize_embeddings` returns a list of per-input matrices when given a list of 2D arrays, where it previously stacked them into one 3D array: update callers that indexed the stacked array.
- Multi-process `encode(pool=..., precision="int8")` (and `"uint8"`) now quantizes once after merging the worker results, so the calibration ranges match single-process encoding. Quantized indexes built with v5.x multi-process encoding are not bit-compatible: regenerate them. Peak memory is higher because the full `float32` matrix is materialized before quantization.
- `similarity` and `similarity_pairwise` on `SentenceTransformer`, and the `cos_sim` family they call, now return `float32` scores for `float16` and `bfloat16` embeddings, where they previously scored in the input dtype: half precision ties too many scores together to rank with.
- `Pooling` configured with `include_prompt=False` no longer replaces `attention_mask` in the features it is handed: the prompt is dropped from the pooling average only, and the mask keeps describing every token the encoder attended over, matching the `input_ids` and `token_embeddings` that come back beside it. `encode(output_value=None)` therefore reports the full mask where it previously reported one with the prompt positions zeroed, as does a custom module that runs after `Pooling` and reads `features["attention_mask"]`. `sentence_embedding` and `output_value="token_embeddings"` are unchanged. If you pooled over the narrowed mask yourself, rebuild it by zeroing the first `prompt_length` unmasked positions of each row, from the `prompt_length` the same dict still carries.

#### Custom module classes require `trust_remote_code=True`

Loading a model whose `modules.json` references a module class outside of Sentence Transformers now always requires `trust_remote_code=True`, also when the model is stored in a local directory or when the class comes from a locally installed package. Previously, local models were implicitly trusted, and other untrusted references only emitted a `FutureWarning`.

Behavioral changes that need no code updates (loss bug fixes that change training results, seed reproducibility, model card regeneration differences, compatibility of new saves with older library versions) and a handful of niche API changes are covered in the release notes instead.

### Smaller changes

- `TripletEvaluator` and `SparseTripletEvaluator` now embed anchors with `encode_query` and positives / negatives with `encode_document`, instead of `encode` for all three. This is a no-op for models without `query` / `document` prompts, but asymmetric models will report different triplet accuracy than in v5.x because their prompts are now applied.
- A bare list of chat message dictionaries is now read as a single conversation rather than as a batch of inputs, so `model.encode([{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}])` produces one embedding. Wrap each conversation in its own list to encode a batch: `model.encode([[msg1], [msg2]])`.
- `similarity` and `similarity_pairwise` on `SentenceTransformer`, `SparseEncoder`, and `MultiVectorEncoder` are now regular methods rather than properties that return a similarity function. Calls like `model.similarity(embeddings1, embeddings2)` work unchanged. Assigning a custom function to `model.similarity` is not supported anymore (it now silently shadows the method where it previously raised an `AttributeError`): to inspect or change the similarity function, get and set `model.similarity_fn_name` (e.g. `model.similarity_fn_name = "dot"`), which updates both `similarity` and `similarity_pairwise`.

## Migrating from v5.x to v5.4+

The v5.4 release restructures the codebase into a shared `base` package and refactors `CrossEncoder` to use the same modular architecture as `SentenceTransformer` and `SparseEncoder`. Almost all changes are backwards compatible; old code will continue to work but may emit deprecation warnings.

**Warning:**
If you only use `SentenceTransformer.encode` or `CrossEncoder.predict` with text inputs, you likely do not need to make any changes. The sections below cover the specific APIs that have changed.

### Updated import paths

The codebase has been restructured so that `SentenceTransformer`, `SparseEncoder`, and `CrossEncoder` share a common `base` package. As a result, many internal modules have moved to new locations. All old import paths continue to work but emit deprecation warnings.

The top-level imports are unchanged. `from sentence_transformers import SentenceTransformer, CrossEncoder, SparseEncoder` works exactly as before. The changes only affect imports of internal modules, losses, evaluators, and utilities.

**Key import path changes**

| v5.x | v5.4+ (recommended) |
|---|---|
| `from sentence_transformers.models import ...` | | `from sentence_transformers.sentence_transformer.modules import ...` `from sentence_transformers.cross_encoder.modules import ...` `from sentence_transformers.sparse_encoder.modules import ...` Modules are available from each model type's `modules` package. |
| `from sentence_transformers.losses import ...` | `from sentence_transformers.sentence_transformer.losses import ...` |
| `from sentence_transformers.evaluation import ...` | `from sentence_transformers.sentence_transformer.evaluation import ...` |
| `from sentence_transformers.training_args import ...` | `from sentence_transformers.sentence_transformer.training_args import ...` |
| `from sentence_transformers.trainer import ...` | `from sentence_transformers.sentence_transformer.trainer import ...` |
| `from sentence_transformers.data_collator import ...` | `from sentence_transformers.sentence_transformer.data_collator import ...` |
| `from sentence_transformers.model_card import ...` | `from sentence_transformers.sentence_transformer.model_card import ...` |
| `from sentence_transformers.sparse_encoder.models import ...` | `from sentence_transformers.sparse_encoder.modules import ...` |
| `from sentence_transformers.sampler import ...` | `from sentence_transformers.base.sampler import ...` |
| `from sentence_transformers.similarity_functions import SimilarityFunction` | `from sentence_transformers.util.similarity import SimilarityFunction` |
| `from sentence_transformers.quantization import quantize_embeddings` | `from sentence_transformers.util.quantization import quantize_embeddings` |

### Renamed methods and parameters

Several methods and constructor parameters have been renamed to use more consistent terminology. All old names still work but emit deprecation warnings.

| v5.x | v5.4+ (recommended) |
|---|---|
| `SentenceTransformer.get_sentence_embedding_dimension()` | `SentenceTransformer.get_embedding_dimension()` |
| `SparseEncoder.get_sentence_embedding_dimension()` | `SparseEncoder.get_embedding_dimension()` |
| `SentenceTransformer.truncate_sentence_embeddings(dim)` | `SentenceTransformer.truncate_embeddings(dim)` |
| `model.encode(sentences=...)` | | `model.encode(inputs=...)` Also `encode_query`, `encode_document`, the corresponding `SparseEncoder` methods, `predict` and `rank` |

| v5.x | v5.4+ (recommended) |
|---|---|
| `Transformer.get_word_embedding_dimension()` | `Transformer.get_embedding_dimension()` |
| `LSTM.get_word_embedding_dimension()` | `LSTM.get_embedding_dimension()` |
| `CNN.get_word_embedding_dimension()` | `CNN.get_embedding_dimension()` |
| `WordEmbeddings.get_word_embedding_dimension()` | `WordEmbeddings.get_embedding_dimension()` |
| `WeightedLayerPooling.get_word_embedding_dimension()` | `WeightedLayerPooling.get_embedding_dimension()` |

| v5.x | v5.4+ (recommended) |
|---|---|
| `Pooling(word_embedding_dimension=...)` | `Pooling(embedding_dimension=...)` |
| `LSTM(word_embedding_dimension=...)` | `LSTM(embedding_dimension=...)` |
| `WeightedLayerPooling(word_embedding_dimension=...)` | `WeightedLayerPooling(embedding_dimension=...)` |
| `SpladePooling(word_embedding_dimension=...)` | `SpladePooling(embedding_dimension=...)` |
| `CNN(in_word_embedding_dimension=...)` | `CNN(in_embedding_dimension=...)` |
| `SoftmaxLoss(sentence_embedding_dimension=...)` | `SoftmaxLoss(embedding_dimension=...)` |

### Trainer `tokenizer` parameter renamed to `processing_class`

The `tokenizer` parameter on `SentenceTransformerTrainer`, `CrossEncoderTrainer`, and `SparseEncoderTrainer` has been renamed to `processing_class` to align with the upstream `transformers` `Trainer`. The old name is accepted with a deprecation warning.

### `tokenizer_kwargs` renamed to `processor_kwargs`

The `tokenizer_kwargs` parameter on `SentenceTransformer`, `SparseEncoder`, and `CrossEncoder` has been renamed to `processor_kwargs` to reflect that multimodal models use processors rather than tokenizers. The old name is accepted with a deprecation warning.

| v5.x | v5.4+ (recommended) |
|---|---|
| .. code-block:: python | .. code-block:: python |

### Removed `tags` parameter from `push_to_hub`

The `tags` parameter has been removed from `push_to_hub` on all model types. Use `model.model_card_data.tags.append("my-tag")` before calling `push_to_hub` instead.

### Default pooling for CausalLM models

When loading a model without a pre-trained Sentence Transformer configuration (e.g. a raw `transformers` model), previous versions always defaulted to mean pooling. Starting with v5.4, CausalLM-based models (e.g. Llama, Qwen, Mistral) now default to last token pooling instead, as the last token has the most complete contextual representation in causal models. All other models continue to default to mean pooling.

If you relied on mean pooling for a CausalLM model, you can explicitly set the pooling mode:

```python
from sentence_transformers import SentenceTransformer
from sentence_transformers.sentence_transformer.modules import Transformer, Pooling

transformer = Transformer("Qwen/Qwen2-0.5B")
pooling = Pooling(transformer.get_embedding_dimension(), pooling_mode="mean")
model = SentenceTransformer(modules=[transformer, pooling])
```
