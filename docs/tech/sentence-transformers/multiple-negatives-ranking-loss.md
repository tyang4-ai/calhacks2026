# MultipleNegativesRankingLoss, its cached variant, batch samplers, and the loss overview

> Sources:
> - https://sbert.net/docs/package_reference/sentence_transformer/losses.html#multiplenegativesrankingloss
> - https://github.com/UKPLab/sentence-transformers/blob/v6.2.0/sentence_transformers/sentence_transformer/losses/multiple_negatives_ranking.py
> - https://github.com/UKPLab/sentence-transformers/blob/v6.2.0/sentence_transformers/sentence_transformer/losses/cached_multiple_negatives_ranking.py
> - https://github.com/UKPLab/sentence-transformers/blob/v6.2.0/sentence_transformers/base/sampler.py
> - https://sbert.net/docs/sentence_transformer/loss_overview.html
> Fetched: 2026-10-24.
>
> From the UKPLab/sentence-transformers repo at tag v6.2.0 (released Oct 21, 2026, the current PyPI release).
> v6 needs transformers 5.x, torch 2.2+ and huggingface-hub 1.x or later. The docs use the new import paths, such as `from sentence_transformers.sentence_transformer.losses import MultipleNegativesRankingLoss`. The v3-style paths (`sentence_transformers.losses`) still work through deprecated aliases and print a warning.
> The class docstrings are what the API reference page renders. MNRL works on (anchor, positive) or (anchor, positive, negative) columns, and in-batch duplicates hurt it, so train with `batch_sampler=BatchSamplers.NO_DUPLICATES`.

## MultipleNegativesRankingLoss

```python
MultipleNegativesRankingLoss(model: SentenceTransformer, scale: float = 20.0, similarity_fct: Callable[[Tensor, Tensor], Tensor] = cos_sim, gather_across_devices: bool = False, directions: tuple[ Literal["query_to_doc", "query_to_query", "doc_to_query", "doc_to_doc"], ..., ] = ("query_to_doc",), partition_mode: Literal["joint", "per_direction"] = "joint", hardness_mode: Literal["in_batch_negatives", "hard_negatives", "all_negatives"] | None = None, hardness_strength: float = 0.0,)
```

Given a dataset of (anchor, positive) pairs, (anchor, positive, negative) triplets, or (anchor, positive, negative_1, ..., negative_n)
n-tuples, this loss implements a contrastive learning objective that encourages the model to produce similar
embeddings for the anchor and positive samples, while producing dissimilar embeddings for the negative samples.

In plain terms, the loss works as follows:

1. For each anchor (often a query) in the batch, we want the similarity to its matched positive
   (often a document) to be higher than the similarity to all other documents in the batch (including
   optional hard negatives). This is the standard forward MultipleNegativesRankingLoss / InfoNCE term,
   denoted with "query_to_doc".
2. Optionally, we can also require the opposite: for each document, its matched query should have higher
   similarity than all other queries in the batch. This is the symmetric backward term, denoted with
   "doc_to_query".
3. Optionally, we can further require that for each query, its similarity to all other queries in the batch
   is lower than to its matched document. This is the "query_to_query" term.
4. Optionally, we can also require that for each document, its similarity to all other documents in the batch
   is lower than to its matched query. This excludes documents that belong to the same query in the case of
   hard negatives (i.e. columns beyond the first two in the input). This is the "doc_to_doc" term.

All of these are implemented via different choices of interaction directions and how we normalize
the scores, but they all share the same core idea: the correct pair (query, positive) should have
the highest similarity compared to all in-batch alternatives.

All of these are expressed via the same underlying formulation by choosing different
`directions` and `partition_mode` values. Optional negatives in the input are treated as
additional hard-negative documents for the corresponding query.

The default configuration is also known as the InfoNCE loss, SimCSE loss, cross-entropy loss with in-batch
negatives, or simply in-batch negatives loss.

**Args:**

    model: SentenceTransformer model
    scale: Output of similarity function is multiplied by scale value. In some literature, the scaling parameter
        is referred to as temperature, which is the inverse of the scale. In short: `scale = 1 / temperature`, so
        `scale=20.0` is equivalent to `temperature=0.05`. A higher scale (lower temperature) puts more emphasis
        on the positive example, and values between 10 and 100 are common.
    similarity_fct: similarity function between embeddings. By default, cos_sim. Can also be set to
        dot product (and then set scale to 1)
    gather_across_devices: If True, gather the embeddings across all devices before computing the loss.
        Recommended when training on multiple GPUs, as it allows for larger batch sizes, but it may slow down
        training due to communication overhead, and can potentially lead to out-of-memory errors.
    directions: Which similarity interaction terms to include in the loss. Options:

        - "query_to_doc": query -> all documents (always included as it covers the paired positive).
        - "query_to_query": query -> all other queries in the batch.
        - "doc_to_query": document -> all queries (symmetric term).
        - "doc_to_doc": document -> all other documents in the batch, excluding those belonging to the same query.

        The default ("query_to_doc",) matches the standard MultipleNegativesRankingLoss / InfoNCE behavior.
    partition_mode: How to normalize the scores (the softmax denominator):

        - "joint": One joint softmax over all selected directions.
        - "per_direction": One softmax per direction. A loss is computed for each direction and then averaged.
          Not compatible with `"query_to_query"` or `"doc_to_doc"` directions.

    hardness_mode: Strategy for applying hardness weighting. `None` (default) disables hardness
        weighting entirely. Options:

        - `"in_batch_negatives"`: Adds `hardness_strength * stop_grad(cos_sim)` to every in-batch negative
          logit inside the softmax ([Lan et al. 2025](https://huggingface.co/papers/2503.04812), Eq. 5). The
          in-batch negatives are all positives and hard negatives from other samples in the batch.
          Works with all data formats including pairs-only.
        - `"hard_negatives"`: Applies `hardness_strength * stop_grad(cos_sim)` only to the logits of
          explicit hard negatives, leaving in-batch negatives unpenalized. Only active when explicit
          negatives are provided. As used in
          [Schechter Vera et al. 2025](https://huggingface.co/papers/2509.20354) (EmbeddingGemma).
        - `"all_negatives"`: Applies `hardness_strength * stop_grad(cos_sim)` to every negative logit,
          both in-batch negatives and explicit hard negatives, leaving only the positive unpenalized.
          Combines the effect of `"in_batch_negatives"` and `"hard_negatives"`.

    hardness_strength: Strength of the hardness weighting. The meaning depends on `hardness_mode`:

        - For `"in_batch_negatives"`: acts as `alpha` in the hardness penalty, [Lan et al. 2025](https://huggingface.co/papers/2503.04812) uses 9.
        - For `"hard_negatives"`: acts as `alpha` in the hardness penalty, [Schechter Vera et al. 2025](https://huggingface.co/papers/2509.20354) uses 5.

        Must be non-negative. Ignored when `hardness_mode` is `None`.

**Requirements:**

    1. (anchor, positive) pairs, (anchor, positive, negative) triplets, or (anchor, positive, negative_1, ..., negative_n) n-tuples

**Inputs:**

    +-------------------------------------------------+--------+
    | Inputs                                          | Labels |
    +=================================================+========+
    | (anchor, positive) pairs                        | none   |
    +-------------------------------------------------+--------+
    | (anchor, positive, negative) triplets           | none   |
    +-------------------------------------------------+--------+
    | (anchor, positive, negative_1, ..., negative_n) | none   |
    +-------------------------------------------------+--------+

**Recommendations:**

    - Use `BatchSamplers.NO_DUPLICATES` (`docs`) to
      ensure that no in-batch negatives are duplicates of the anchor or positive samples.

**Relations:**

    - `CachedMultipleNegativesRankingLoss` is equivalent to this loss, but it uses caching that allows for
      much higher batch sizes (and thus better performance) without extra memory usage. However, it is slightly
      slower.
    - `GISTEmbedLoss` is equivalent to this loss, but uses a guide model to guide the in-batch negative
      sample selection. `GISTEmbedLoss` yields a stronger training signal at the cost of some training overhead.

Loss variants from the literature:
    - Standard InfoNCE / classic MultipleNegativesRankingLoss (query -> doc only), e.g. as in [van den Oord et al. 2018](https://huggingface.co/papers/1807.03748):

```python
loss = MultipleNegativesRankingLoss(
    model,
    directions=("query_to_doc",),  # default
    partition_mode="joint",  # default
)
```

      This variant is recommended if you are training with (anchor, positive, negative_1, ..., negative_n) n-tuples.

    - Symmetric InfoNCE (query -> doc and doc -> query), e.g. as in [Günther et al. 2024](https://huggingface.co/papers/2310.19923):

```python
loss = MultipleNegativesRankingLoss(
    model,
    directions=("query_to_doc", "doc_to_query"),
    partition_mode="per_direction",  # forward/backward computed separately and averaged
)
```

      This variant may outperform the standard variant in some scenarios.

    - GTE improved contrastive loss (query/doc + same-type negatives), e.g. as in [Li et al. 2023](https://huggingface.co/papers/2308.03281):

```python
loss = MultipleNegativesRankingLoss(
    model,
    directions=("query_to_doc", "query_to_query", "doc_to_query", "doc_to_doc"),
    partition_mode="joint",  # single softmax over all selected interaction terms
)
```

      This variant is recommended if you are training with only (anchor, positive) pairs or (anchor, positive, negative)
      triplets, as it may provide a stronger training signal.

**Example:**

```python
from sentence_transformers import SentenceTransformer, SentenceTransformerTrainer, losses
from datasets import Dataset

model = SentenceTransformer("microsoft/mpnet-base")
train_dataset = Dataset.from_dict({
    "anchor": ["It's nice weather outside today.", "He drove to work."],
    "positive": ["It's so sunny.", "He took the car to the office."],
})
loss = losses.MultipleNegativesRankingLoss(model)

trainer = SentenceTransformerTrainer(
    model=model,
    train_dataset=train_dataset,
    loss=loss,
)
trainer.train()
```


## BatchSamplers

Stores the acceptable string identifiers for batch samplers.

The batch sampler is responsible for determining how samples are grouped into batches during training.
Valid options are:

- `BatchSamplers.BATCH_SAMPLER`: **[default]** Uses `DefaultBatchSampler`, the default
  PyTorch batch sampler.
- `BatchSamplers.NO_DUPLICATES`: Uses `NoDuplicatesBatchSampler`,
  ensuring no duplicate samples in a batch.
- `BatchSamplers.NO_DUPLICATES_HASHED`: Uses `NoDuplicatesBatchSampler`
  with `precompute_hashes=True`, a variant that precomputes hashes for faster duplicate checks at a small memory cost.
  Requires the `xxhash` library to be installed.

  Both are recommended for losses that use in-batch negatives, such as:

    - `MultipleNegativesRankingLoss`
    - `CachedMultipleNegativesRankingLoss`
    - `MultipleNegativesSymmetricRankingLoss`
    - `CachedMultipleNegativesSymmetricRankingLoss`
    - `MegaBatchMarginLoss`
    - `GISTEmbedLoss`
    - `CachedGISTEmbedLoss`
- `BatchSamplers.GROUP_BY_LABEL`: Uses `GroupByLabelBatchSampler`,
  which constructs each batch by drawing at least 2 samples from each of at least 2 distinct labels.
  This guarantees every batch contains multiple classes, which is required for in-batch triplet mining.
  Recommended for:

    - `BatchAllTripletLoss`
    - `BatchHardSoftMarginTripletLoss`
    - `BatchHardTripletLoss`
    - `BatchSemiHardTripletLoss`

If you want to use a custom batch sampler, then you can subclass
`DefaultBatchSampler` and pass the class (not an instance) to the
`batch_sampler` argument in `SentenceTransformerTrainingArguments`
(or `CrossEncoderTrainingArguments`, etc.).
Alternatively, you can pass a function that accepts `dataset`, `batch_size`, `drop_last`,
`valid_label_columns`, `generator`, and `seed` and returns a
`DefaultBatchSampler` instance.

Usage:

```python
from sentence_transformers import SentenceTransformer, SentenceTransformerTrainer, SentenceTransformerTrainingArguments
from sentence_transformers.sentence_transformer.training_args import BatchSamplers
from sentence_transformers.sentence_transformer.losses import MultipleNegativesRankingLoss
from datasets import Dataset

model = SentenceTransformer("microsoft/mpnet-base")
train_dataset = Dataset.from_dict({
    "anchor": ["It's nice weather outside today.", "He drove to work."],
    "positive": ["It's so sunny.", "He took the car to the office."],
})
loss = MultipleNegativesRankingLoss(model)
args = SentenceTransformerTrainingArguments(
    output_dir="checkpoints",
    batch_sampler=BatchSamplers.NO_DUPLICATES,
)
trainer = SentenceTransformerTrainer(
    model=model,
    args=args,
    train_dataset=train_dataset,
    loss=loss,
)
trainer.train()
```


## CachedMultipleNegativesRankingLoss

```python
CachedMultipleNegativesRankingLoss(model: SentenceTransformer, scale: float = 20.0, similarity_fct: Callable[[Tensor, Tensor], Tensor] = cos_sim, mini_batch_size: int = 32, mini_batch_num_tokens: int | None = None, gather_across_devices: bool = False, directions: tuple[ Literal["query_to_doc", "query_to_query", "doc_to_query", "doc_to_doc"], ..., ] = ("query_to_doc",), partition_mode: Literal["joint", "per_direction"] = "joint", show_progress_bar: bool = False, hardness_mode: Literal["in_batch_negatives", "hard_negatives", "all_negatives"] | None = None, hardness_strength: float = 0.0,)
```

Boosted version of `MultipleNegativesRankingLoss` (https://huggingface.co/papers/1705.00652) by GradCache (https://huggingface.co/papers/2101.06983).

Contrastive learning (here our MNRL loss) with in-batch negatives is usually hard to work with large batch sizes due to (GPU) memory limitation.
Even with batch-scaling methods like gradient-scaling, it cannot work either. This is because the in-batch negatives make the data points within
the same batch non-independent and thus the batch cannot be broke down into mini-batches. GradCache is a smart way to solve this problem.
It achieves the goal by dividing the computation into two stages of embedding and loss calculation, which both can be scaled by mini-batches.
As a result, memory of constant size (e.g. that works with batch size = 32) can now process much larger batches (e.g. 65536).

In detail:

    (1) It first does a quick embedding step without gradients/computation graphs to get all the embeddings.
    (2) Calculate the loss, backward up to the embeddings and cache the gradients wrt. to the embeddings.
    (3) A 2nd embedding step with gradients/computation graphs and connect the cached gradients into the backward chain.

Notes: All steps are done with mini-batches. In the original implementation of GradCache, (2) is not done in mini-batches and
requires a lot memory when the batch size is large. One drawback is about the speed. Gradient caching will sacrifice
around 20% computation time according to the paper.

See `MultipleNegativesRankingLoss` for more details about the underlying loss itself.

**Args:**

    model: SentenceTransformer model
    scale: Output of similarity function is multiplied by scale value. In some literature, the scaling parameter
        is referred to as temperature, which is the inverse of the scale. In short: `scale = 1 / temperature`, so
        `scale=20.0` is equivalent to `temperature=0.05`. A higher scale (lower temperature) puts more emphasis
        on the positive example, and values between 10 and 100 are common.
    similarity_fct: similarity function between embeddings. By default, cos_sim. Can also be set to dot
        product (and then set scale to 1)
    mini_batch_size: Mini-batch size for the forward pass, this denotes how much memory is actually used during
        training and evaluation. The larger the mini-batch size, the faster the training is, but the more memory is used. It's recommended to set it as high as your GPU memory allows. The default
        value is 32.
    mini_batch_num_tokens: If set, the embedding mini-batches are packed by total (non-padding)
        token count instead of by `mini_batch_size` sequences, which speeds up training on
        variable-length data. Most effective for models that avoid padded compute, e.g. flash
        attention with input flattening. See the Speeding up Inference documentation for details.
    gather_across_devices: If True, gather the embeddings across all devices before computing the loss.
        Recommended when training on multiple GPUs, as it allows for larger batch sizes, but it may slow down
        training due to communication overhead, and can potentially lead to out-of-memory errors.
    directions: Which similarity interaction terms to include in the loss. Options:

        - "query_to_doc": query -> all documents (always included as it covers the paired positive).
        - "query_to_query": query -> all other queries in the batch.
        - "doc_to_query": document -> all queries (symmetric term).
        - "doc_to_doc": document -> all other documents in the batch, excluding those belonging to the same query.

        The default ("query_to_doc",) matches the standard MultipleNegativesRankingLoss / InfoNCE behavior.
    partition_mode: How to normalize the scores (the softmax denominator):

        - "joint": One joint softmax over all selected directions.
        - "per_direction": One softmax per direction. A loss is computed for each direction and then averaged.
          Not compatible with `"query_to_query"` or `"doc_to_doc"` directions.

    show_progress_bar: If True, a progress bar for the mini-batches is shown during training. The default is False.
    hardness_mode: Strategy for applying hardness weighting. `None` (default) disables hardness
        weighting entirely. Options:

        - `"in_batch_negatives"`: Adds `hardness_strength * stop_grad(cos_sim)` to every in-batch negative
          logit inside the softmax ([Lan et al. 2025](https://huggingface.co/papers/2503.04812), Eq. 5). The
          in-batch negatives are all positives and hard negatives from other samples in the batch.
        - `"hard_negatives"`: Applies `hardness_strength * stop_grad(cos_sim)` only to the logits of
          explicit hard negatives, leaving in-batch negatives unpenalized. Only active when explicit
          negatives are provided. As used in
          [Schechter Vera et al. 2025](https://huggingface.co/papers/2509.20354) (EmbeddingGemma).
        - `"all_negatives"`: Applies `hardness_strength * stop_grad(cos_sim)` to every negative logit,
          both in-batch negatives and explicit hard negatives, leaving only the positive unpenalized.
          Combines the effect of `"in_batch_negatives"` and `"hard_negatives"`.

    hardness_strength: Strength of the hardness weighting. The meaning depends on `hardness_mode`:

        - For `"in_batch_negatives"`: acts as `alpha` in the hardness penalty, [Lan et al. 2025](https://huggingface.co/papers/2503.04812) uses 9.
        - For `"hard_negatives"`: acts as `alpha` in the hardness penalty, [Schechter Vera et al. 2025](https://huggingface.co/papers/2509.20354) uses 5.

        Must be non-negative. Ignored when `hardness_mode` is `None`.

**References:**

    - Efficient Natural Language Response Suggestion for Smart Reply, Section 4.4: https://huggingface.co/papers/1705.00652
    - Scaling Deep Contrastive Learning Batch Size under Memory Limited Setup: https://huggingface.co/papers/2101.06983

**Requirements:**

    1. (anchor, positive) pairs, (anchor, positive, negative) triplets, or (anchor, positive, negative_1, ..., negative_n) n-tuples
    2. Should be used with large `per_device_train_batch_size` and low `mini_batch_size` for superior performance, but slower training time than `MultipleNegativesRankingLoss`.

**Inputs:**

    +-------------------------------------------------+--------+
    | Inputs                                          | Labels |
    +=================================================+========+
    | (anchor, positive) pairs                        | none   |
    +-------------------------------------------------+--------+
    | (anchor, positive, negative) triplets           | none   |
    +-------------------------------------------------+--------+
    | (anchor, positive, negative_1, ..., negative_n) | none   |
    +-------------------------------------------------+--------+

**Recommendations:**

    - Use `BatchSamplers.NO_DUPLICATES` (`docs`) to
      ensure that no in-batch negatives are duplicates of the anchor or positive samples.

**Relations:**

    - Equivalent to `MultipleNegativesRankingLoss`, but with caching that allows for much higher batch sizes
      (and thus better performance) without extra memory usage. This loss also trains roughly 2x to 2.4x slower than
      `MultipleNegativesRankingLoss`.

**Example:**

```python
from sentence_transformers import SentenceTransformer, SentenceTransformerTrainer, losses
from datasets import Dataset

model = SentenceTransformer("microsoft/mpnet-base")
train_dataset = Dataset.from_dict({
    "anchor": ["It's nice weather outside today.", "He drove to work."],
    "positive": ["It's so sunny.", "He took the car to the office."],
})
loss = losses.CachedMultipleNegativesRankingLoss(model, mini_batch_size=64)

trainer = SentenceTransformerTrainer(
    model=model,
    train_dataset=train_dataset,
    loss=loss,
)
trainer.train()
```


# Loss Overview

## Loss Table

Loss functions play a critical role in the performance of your fine-tuned model. Sadly, there is no "one size fits all" loss function. Ideally, this table should help narrow down your choice of loss function(s) by matching them to your data formats.

**Note:**

You can often convert one training data format into another, allowing more loss functions to be viable for your scenario. For example, `(input_A, input_B) pairs` with `class` labels can be converted into `(anchor, positive, negative) triplets` by sampling inputs with the same or different classes.

**Legend:** Loss functions marked with `★` are commonly recommended default choices.

| Inputs                                            | Labels                                   | Appropriate Loss Functions                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
|---------------------------------------------------|------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `single inputs`                                   | `class`                                  | <a href="../package_reference/sentence_transformer/losses.html#batchalltripletloss">`BatchAllTripletLoss`</a><a href="../package_reference/sentence_transformer/losses.html#batchhardsoftmargintripletloss">`BatchHardSoftMarginTripletLoss`</a><a href="../package_reference/sentence_transformer/losses.html#batchhardtripletloss">`BatchHardTripletLoss`</a><a href="../package_reference/sentence_transformer/losses.html#batchsemihardtripletloss">`BatchSemiHardTripletLoss`</a>                                                                                                                        |
| `single inputs`                                   | `none`                                   | <a href="../package_reference/sentence_transformer/losses.html#contrastivetensionloss">`ContrastiveTensionLoss`</a><a href="../package_reference/sentence_transformer/losses.html#denoisingautoencoderloss">`DenoisingAutoEncoderLoss`</a>                                                                                                                                                                                                                                                                                                                                                                            |
| `(anchor, anchor) pairs`                          | `none`                                   | <a href="../package_reference/sentence_transformer/losses.html#contrastivetensionlossinbatchnegatives">`ContrastiveTensionLossInBatchNegatives`</a>                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `(damaged_input, original_input) pairs`           | `none`                                   | <a href="../package_reference/sentence_transformer/losses.html#denoisingautoencoderloss">`DenoisingAutoEncoderLoss`</a>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `(input_A, input_B) pairs`                        | `class`                                  | <a href="../package_reference/sentence_transformer/losses.html#softmaxloss">`SoftmaxLoss`</a>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `(input_A, input_B) pairs`                        | `class probabilities`                    | <a href="../package_reference/sentence_transformer/losses.html#softmaxloss">`SoftmaxLoss`</a>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `(anchor, positive) pairs`                        | `none`                                   | <a href="../package_reference/sentence_transformer/losses.html#multiplenegativesrankingloss">`MultipleNegativesRankingLoss`</a> ★<a href="../package_reference/sentence_transformer/losses.html#cachedmultiplenegativesrankingloss">`CachedMultipleNegativesRankingLoss`</a> ★<a href="../package_reference/sentence_transformer/losses.html#megabatchmarginloss">`MegaBatchMarginLoss`</a><a href="../package_reference/sentence_transformer/losses.html#gistembedloss">`GISTEmbedLoss`</a><a href="../package_reference/sentence_transformer/losses.html#cachedgistembedloss">`CachedGISTEmbedLoss`</a> |
| `(anchor, positive/negative) pairs`               | `1 if positive, 0 if negative`           | <a href="../package_reference/sentence_transformer/losses.html#contrastiveloss">`ContrastiveLoss`</a><a href="../package_reference/sentence_transformer/losses.html#onlinecontrastiveloss">`OnlineContrastiveLoss`</a>                                                                                                                                                                                                                                                                                                                                                                                                |
| `(input_A, input_B) pairs`                        | `float similarity score between 0 and 1` | <a href="../package_reference/sentence_transformer/losses.html#cosentloss">`CoSENTLoss`</a><a href="../package_reference/sentence_transformer/losses.html#angleloss">`AnglELoss`</a><a href="../package_reference/sentence_transformer/losses.html#cosinesimilarityloss">`CosineSimilarityLoss`</a>                                                                                                                                                                                                                                                                                                               |
| `(anchor, positive, negative) triplets`           | `none`                                   | <a href="../package_reference/sentence_transformer/losses.html#multiplenegativesrankingloss">`MultipleNegativesRankingLoss`</a> ★<a href="../package_reference/sentence_transformer/losses.html#cachedmultiplenegativesrankingloss">`CachedMultipleNegativesRankingLoss`</a> ★<a href="../package_reference/sentence_transformer/losses.html#tripletloss">`TripletLoss`</a><a href="../package_reference/sentence_transformer/losses.html#cachedgistembedloss">`CachedGISTEmbedLoss`</a><a href="../package_reference/sentence_transformer/losses.html#gistembedloss">`GISTEmbedLoss`</a>                 |
| `(anchor, positive, negative_1, ..., negative_n)` | `none`                                   | <a href="../package_reference/sentence_transformer/losses.html#multiplenegativesrankingloss">`MultipleNegativesRankingLoss`</a> ★<a href="../package_reference/sentence_transformer/losses.html#cachedmultiplenegativesrankingloss">`CachedMultipleNegativesRankingLoss`</a> ★<a href="../package_reference/sentence_transformer/losses.html#cachedgistembedloss">`CachedGISTEmbedLoss`</a>                                                                                                                                                                                                                       |

## Loss modifiers

These loss functions can be seen as *loss modifiers*: they work on top of standard loss functions, but apply those loss functions in different ways to try and instil useful properties into the trained embedding model.

For example, models trained with <a href="../package_reference/sentence_transformer/losses.html#matryoshkaloss">`MatryoshkaLoss`</a> produce embeddings whose size can be truncated without notable losses in performance (see the [🪆 Introduction to Matryoshka Embedding Models](https://huggingface.co/blog/matryoshka) blogpost for a full walkthrough), and models trained with <a href="../package_reference/sentence_transformer/losses.html#adaptivelayerloss">`AdaptiveLayerLoss`</a> still perform well when you remove model layers for faster inference.

| Inputs | Labels | Appropriate Loss Functions                                                                                                                                                                                                                                                                                                  |
|--------|--------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `any`  | `any`  | <a href="../package_reference/sentence_transformer/losses.html#matryoshkaloss">`MatryoshkaLoss`</a><a href="../package_reference/sentence_transformer/losses.html#adaptivelayerloss">`AdaptiveLayerLoss`</a><a href="../package_reference/sentence_transformer/losses.html#matryoshka2dloss">`Matryoshka2dLoss`</a> |

## Regularization

These losses are designed to regularize the embedding space during training, encouraging certain properties in the learned embeddings. They can often be applied to any dataset configuration.

| Inputs | Labels | Appropriate Loss Functions                                                                                                                  |
|--------|--------|---------------------------------------------------------------------------------------------------------------------------------------------|
| `any`  | `none` | <a href="../package_reference/sentence_transformer/losses.html#globalorthogonalregularizationloss">`GlobalOrthogonalRegularizationLoss`</a> |
