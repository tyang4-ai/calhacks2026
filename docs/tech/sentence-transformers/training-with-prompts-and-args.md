# Training with prompts (query: and passage: prefixes) and the extra training arguments

> Sources:
> - https://sbert.net/examples/sentence_transformer/training/prompts/README.html
> - https://github.com/UKPLab/sentence-transformers/blob/v6.2.0/examples/sentence_transformer/training/prompts/README.md
> - https://github.com/UKPLab/sentence-transformers/blob/v6.2.0/sentence_transformers/base/training_args.py
> Fetched: 2026-10-24.
>
> From the UKPLab/sentence-transformers repo at tag v6.2.0 (released Oct 21, 2026, the current PyPI release).
> v6 needs transformers 5.x, torch 2.2+ and huggingface-hub 1.x or later. The docs use the new import paths, such as `from sentence_transformers.sentence_transformer.losses import MultipleNegativesRankingLoss`. The v3-style paths (`sentence_transformers.losses`) still work through deprecated aliases and print a warning.
> The e5 models expect `query: ` and `passage: ` at the start of every input (see multilingual-e5-small.md). The trainer can add them for you with `prompts={"anchor": "query: ", "positive": "passage: ", "negative": "passage: "}` (column name to prefix), or the training pairs can carry the prefixes in the text. Do one or the other, never both.

## What are Prompts?

Many modern embedding models are trained with "instructions" or "prompts" following the [INSTRUCTOR paper](https://huggingface.co/papers/2212.09741). These prompts are strings, prefixed to each text to be embedded, allowing the model to distinguish between different types of text.

For example, the [mixedbread-ai/mxbai-embed-large-v1](https://huggingface.co/mixedbread-ai/mxbai-embed-large-v1) model was trained with `Represent this sentence for searching relevant passages: ` as the prompt for all queries. This prompt is stored in the [model configuration](https://huggingface.co/mixedbread-ai/mxbai-embed-large-v1/blob/main/config_sentence_transformers.json) under the prompt name `"query"`, so users can specify that `prompt_name` in `model.encode`:

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("mixedbread-ai/mxbai-embed-large-v1")
query_embedding = model.encode("What are Pandas?", prompt_name="query")
# or
# query_embedding = model.encode("What are Pandas?", prompt="Represent this sentence for searching relevant passages: ")
document_embeddings = model.encode([
    "Pandas is a software library written for the Python programming language for data manipulation and analysis.",
    "Pandas are a species of bear native to South Central China. They are also known as the giant panda or simply panda.",
    "Koala bears are not actually bears, they are marsupials native to Australia.",
])
similarity = model.similarity(query_embedding, document_embeddings)
print(similarity)
# => tensor([[0.7594, 0.7560, 0.4674]])
```

See [Prompt Templates](https://sbert.net/examples/sentence_transformer/applications/computing-embeddings/README.rst#prompt-templates) for more information about inference with prompts.

## Why would we train with Prompts?

The [INSTRUCTOR paper](https://huggingface.co/papers/2212.09741) showed that adding prompts or instructions before each text could improve model performance by an average of ~6%, with major gains especially for classification, clustering, and semantic textual similarity. Note that the performance improvements for retrieval are notably lower at 0.4% and 2.7% for small and large models, respectively.

<img src="https://huggingface.co/tomaarsen/mpnet-base-nq-prompts/resolve/main/instructor.png" alt="instructor results" width="720"/>

More recently, the [BGE paper](https://huggingface.co/papers/2309.07597) showed similar findings, showing about a 1.4% performance increase for retrieval if the query is prefixed with `Represent this sentence for searching relevant passages: `. The authors conclude that using instructions may substantially contribute to the quality of task-specific fine-tuning.

<img src="https://huggingface.co/tomaarsen/mpnet-base-nq-prompts/resolve/main/bge.png" alt="bge results" width="720"/>

In essence, using instructions or prompts allows for improved performance as long as they are used both during training and inference.

## How do we train with Prompts?

Since the v3.3.0 Sentence Transformers release, it's possible to finetune embedding models with prompts using the `prompts` argument in the `SentenceTransformerTrainingArguments` class. There are 4 separate accepted formats for this argument:

1. `str`: A single prompt to use for all columns in all datasets. For example:

```python
args = SentenceTransformerTrainingArguments(
    ...,
    prompts="text: ",
    ...,
)
```

2. `Dict[str, str]`: A dictionary mapping column names to prompts, applied to all datasets. For example:

```python
args = SentenceTransformerTrainingArguments(
    ...,
    prompts={
        "query": "query: ",
        "answer": "document: ",
    },
    ...,
)
```

3. `Dict[str, str]`: A dictionary mapping dataset names to prompts. This should only be used if your training/evaluation/test datasets are a `DatasetDict` or a dictionary of `Dataset`. For example:

```python
args = SentenceTransformerTrainingArguments(
    ...,
    prompts={
        "stsb": "Represent this text for semantic similarity search: ",
        "nq": "Represent this text for retrieval: ",
    },
    ...,
)
```

4. `Dict[str, Dict[str, str]]`: A dictionary mapping dataset names to dictionaries mapping column names to prompts. This should only be used if your training/evaluation/test datasets are a `DatasetDict` or a dictionary of `Dataset`. For example:

```python
args = SentenceTransformerTrainingArguments(
    ...,
    prompts={
        "stsb": {
            "sentence1": "sts: ",
            "sentence2": "sts: ",
        },
        "nq": {
            "query": "query: ",
            "document": "document: ",
        },
    },
    ...,
)
```

Additionally, some research papers ([INSTRUCTOR](https://huggingface.co/papers/2212.09741), [NV-Embed](https://huggingface.co/papers/2405.17428)) exclude the prompt from the mean pooling step, such that it's only used in the Transformer blocks. In Sentence Transformers, this can be configured with the `include_prompt` argument/attribute in the `Pooling` module or via the `SentenceTransformer.set_pooling_include_prompt()` method. In my personal experience, models that include the prompt in the pooling tend to perform better.

### Training Script

See the following script as an example of how to train with prompts in practice:

* [training_nq_prompts.py](https://github.com/huggingface/sentence-transformers/blob/main/examples/sentence_transformer/training/prompts/training_nq_prompts.py): This script finetunes [microsoft/mpnet-base](https://huggingface.co/microsoft/mpnet-base) on 100k query-answer pairs from the [natural-questions](https://huggingface.co/datasets/sentence-transformers/natural-questions) dataset using the `CachedMultipleNegativesRankingLoss` loss. The model is evaluated during training using the `NanoBEIREvaluator`.

This script has two variables that affect 1) whether prompts are used and 2) whether prompts are included in the pooling. I have finetuned both `microsoft/mpnet-base` and `google-bert/bert-base-uncased` under the various different settings, resulting in a 0.66% and 0.90% relative improvements on `NDCG@10` at no extra cost.

**Experiments with `microsoft/mpnet-base`**

Running the script under various settings resulted in these checkpoints:

* [tomaarsen/mpnet-base-nq](https://huggingface.co/tomaarsen/mpnet-base-nq)
* [tomaarsen/mpnet-base-nq-prompts](https://huggingface.co/tomaarsen/mpnet-base-nq-prompts)

**Note:**

`microsoft/mpnet-base` seems to be a tad unstable when training with prompts and excluding those prompts in the pooling: the loss spikes at some point, an effect not observed with e.g. `google-bert/bert-base-uncased`.

For these two models, the model trained with prompts consistently outperforms the baseline model all throughout training:

Additionally, the model trained with prompts includes these prompts in the training dataset details in the automatically generated model card: [tomaarsen/mpnet-base-nq-prompts#natural-questions](https://huggingface.co/tomaarsen/mpnet-base-nq-prompts#natural-questions).

**Important:**
If you train with prompts, then it's heavily recommended to store prompts in the model configuration as a mapping of prompt names to prompt strings. You can do this by initializing the `SentenceTransformer` with a `prompts` dictionary before saving it, updating the `model.prompts` of a loaded model before saving it, and/or updating the [config_sentence_transformers.json](https://huggingface.co/tomaarsen/mpnet-base-nq-prompts/blob/main/config_sentence_transformers.json) file of the saved model.

After adding the prompts in the model configuration, the final usage of the prompt-trained model becomes:

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("tomaarsen/mpnet-base-nq-prompts")
query_embedding = model.encode("What are Pandas?", prompt_name="query")
document_embeddings = model.encode([
    "Pandas is a software library written for the Python programming language for data manipulation and analysis.",
    "Pandas are a species of bear native to South Central China. They are also known as the giant panda or simply panda.",
    "Koala bears are not actually bears, they are marsupials native to Australia.",
    ],
    prompt_name="document",
)
similarity = model.similarity(query_embedding, document_embeddings)
print(similarity)
# => tensor([[0.4725, 0.7339, 0.4369]])
```

**Experiments with `google-bert/bert-base-uncased`**

Running the script under various settings resulted in these checkpoints:

* [tomaarsen/bert-base-nq](https://huggingface.co/tomaarsen/bert-base-nq)
* [tomaarsen/bert-base-nq-prompts](https://huggingface.co/tomaarsen/bert-base-nq-prompts)
* [tomaarsen/bert-base-nq-prompts-exclude-pooling-prompts](https://huggingface.co/tomaarsen/bert-base-nq-prompts-exclude-pooling-prompts)

For these three models, the model trained with prompts consistently outperforms the baseline model all throughout training, except for the very first evaluation. The model that excludes the prompt in the mean pooling consistently performs notably worse than either of the other two.

Additionally, the model trained with prompts includes these prompts in the training dataset details in the automatically generated model card: [tomaarsen/bert-base-nq-prompts#natural-questions](https://huggingface.co/tomaarsen/bert-base-nq-prompts#natural-questions).

**Important:**
If you train with prompts, then it's heavily recommended to store prompts in the model configuration as a mapping of prompt names to prompt strings. You can do this by initializing the `SentenceTransformer` with a `prompts` dictionary before saving it, updating the `model.prompts` of a loaded model before saving it, and/or updating the [config_sentence_transformers.json](https://huggingface.co/tomaarsen/mpnet-base-nq-prompts/blob/main/config_sentence_transformers.json) file of the saved model.

After adding the prompts in the model configuration, the final usage of the prompt-trained model becomes:

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("tomaarsen/bert-base-nq-prompts")
query_embedding = model.encode("What are Pandas?", prompt_name="query")
document_embeddings = model.encode([
    "Pandas is a software library written for the Python programming language for data manipulation and analysis.",
    "Pandas are a species of bear native to South Central China. They are also known as the giant panda or simply panda.",
    "Koala bears are not actually bears, they are marsupials native to Australia.",
    ],
    prompt_name="document",
)
similarity = model.similarity(query_embedding, document_embeddings)
print(similarity)
# => tensor([[0.3955, 0.8226, 0.5706]])
```


## SentenceTransformerTrainingArguments: the arguments Sentence Transformers adds

`SentenceTransformerTrainingArguments` extends `transformers.TrainingArguments`. Its docstring, from `BaseTrainingArguments`:

BaseTrainingArguments extends `TrainingArguments` with additional arguments
specific to Sentence Transformers. See `TrainingArguments` for the complete list of
available arguments.

**Args:**

    output_dir (`str`):
        The output directory where the model checkpoints will be written.
    prompts (`Union[Dict[str, Dict[str, str]], Dict[str, str], str]`, *optional*):
        The prompts to use for each column in the training, evaluation and test datasets. Four formats are accepted:

        1. `str`: A single prompt to use for all columns in the datasets, regardless of whether the training/evaluation/test
           datasets are `datasets.Dataset` or a `datasets.DatasetDict`.
        2. `Dict[str, str]`: A dictionary mapping column names to prompts, regardless of whether the training/evaluation/test
           datasets are `datasets.Dataset` or a `datasets.DatasetDict`.
        3. `Dict[str, str]`: A dictionary mapping dataset names to prompts. This should only be used if your training/evaluation/test
           datasets are a `datasets.DatasetDict` or a dictionary of `datasets.Dataset`.
        4. `Dict[str, Dict[str, str]]`: A dictionary mapping dataset names to dictionaries mapping column names to
           prompts. This should only be used if your training/evaluation/test datasets are a
           `datasets.DatasetDict` or a dictionary of `datasets.Dataset`.

    batch_sampler (Union[`BatchSamplers`, `str`, `DefaultBatchSampler`, Callable[[...], `DefaultBatchSampler`]], *optional*):
        The batch sampler to use. See `BatchSamplers` for valid options.
        Defaults to `BatchSamplers.BATCH_SAMPLER`.
    multi_dataset_batch_sampler (Union[`MultiDatasetBatchSamplers`, `str`, `MultiDatasetDefaultBatchSampler`, Callable[[...], `MultiDatasetDefaultBatchSampler`]], *optional*):
        The multi-dataset batch sampler to use. See `MultiDatasetBatchSamplers`
        for valid options. Defaults to `MultiDatasetBatchSamplers.PROPORTIONAL`.
    router_mapping (`Dict[str, str] | Dict[str, Dict[str, str]]`, *optional*):
        A mapping of dataset column names to Router routes, like "query" or "document". This is used to specify
        which Router submodule to use for each dataset. Two formats are accepted:

        1. `Dict[str, str]`: A mapping of column names to routes.
        2. `Dict[str, Dict[str, str]]`: A mapping of dataset names to a mapping of column names to routes for
           multi-dataset training/evaluation.
    learning_rate_mapping (`Dict[str, float] | None`, *optional*):
        A mapping of parameter name regular expressions to learning rates. This allows you to set different
        learning rates for different parts of the model, e.g., `{'SparseStaticEmbedding\.*': 1e-3}` for the
        SparseStaticEmbedding module. This is useful when you want to fine-tune specific parts of the model
        with different learning rates.