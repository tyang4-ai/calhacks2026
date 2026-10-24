# Sentence Transformers training overview (SentenceTransformerTrainer)

> Sources:
> - https://sbert.net/docs/sentence_transformer/training_overview.html
> - https://github.com/UKPLab/sentence-transformers/blob/v6.2.0/docs/sentence_transformer/training_overview.md
> Fetched: 2026-10-24.
>
> From the UKPLab/sentence-transformers repo at tag v6.2.0 (released Oct 21, 2026, the current PyPI release).
> v6 needs transformers 5.x, torch 2.2+ and huggingface-hub 1.x or later. The docs use the new import paths, such as `from sentence_transformers.sentence_transformer.losses import MultipleNegativesRankingLoss`. The v3-style paths (`sentence_transformers.losses`) still work through deprecated aliases and print a warning.
> Left out: static and multimodal model setups, multimodal datasets, multi-dataset training, the deprecated `fit` API, and the CrossEncoder comparison. Only the NanoBEIR evaluator tab is kept. InformationRetrievalEvaluator, the one Cindia needs, is in evaluator-information-retrieval.md.

**Tip:**

Using an AI coding agent (Claude Code, Codex, Cursor, Gemini CLI, ...)?

```bash
hf skills add train-sentence-transformers [--claude] [--global]
```

And ask your agent to fine-tune an embedding model for whatever task you have in mind.

## Why Finetune?

Finetuning Sentence Transformer models often heavily improves the performance of the model on your use case, because each task requires a different notion of similarity. For example, given news articles:

- "Apple launches the new iPad"
- "NVIDIA is gearing up for the next GPU generation"

Then the following use cases, we may have different notions of similarity:

- a model for **classification** of news articles as Economy, Sports, Technology, Politics, etc., should produce **similar embeddings** for these texts.
- a model for **semantic textual similarity** should produce **dissimilar embeddings** for these texts, as they have different meanings.
- a model for **semantic search** would **not need a notion for similarity** between two documents, as it should only compare queries and documents.

Also see [**Training Examples**](https://sbert.net/docs/sentence_transformer/training/examples) for numerous training scripts for common real-world applications that you can adopt.

## Training Components

Training Sentence Transformer models involves between 4 to 6 components:

    <a href="#model" class="box">
        Model
        Learn how to initialize the <b>model</b> for training.
    </a>
    <a href="#dataset" class="box">
        Dataset
        Learn how to prepare the <b>data</b> for training.
    </a>
    <a href="#loss-function" class="box">
        Loss Function
        Learn how to prepare and choose a <b>loss</b> function.
    </a>
    <a href="#training-arguments" class="box optional">
        Training Arguments
        Learn which <b>training arguments</b> are useful.
    </a>
    <a href="#evaluator" class="box optional">
        Evaluator
        Learn how to <b>evaluate</b> during and after training.
    </a>
    <a href="#trainer" class="box">
        Trainer
        Learn how to start the <b>training</b> process.
    </a>

<p></p>

**Tip:**

Before downloading training models or datasets, we recommend logging in with `hf auth login` for higher Hugging Face Hub rate limits and access to private or gated models and datasets your account can read. See the [login instructions](https://sbert.net/docs/installation.html#log-in-to-hugging-face).

## Model

Sentence Transformer models consist of a sequence of [Modules](https://sbert.net/docs/package_reference/sentence_transformer/modules.html) or [Custom Modules](https://sbert.net/docs/sentence_transformer/usage/custom_models.html#advanced-custom-modules), allowing for a lot of flexibility. If you want to further finetune a SentenceTransformer model (e.g. it has a [modules.json file](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/blob/main/modules.json)), then you don't have to worry about which modules are used:

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
```

But if instead you want to train from another checkpoint, or from scratch, then these are the most common architectures you can use:

**Transformers**

Most Sentence Transformer models use the `Transformer` and `Pooling` modules. The former loads a pretrained transformer model (e.g. [BERT](https://huggingface.co/google-bert/bert-base-uncased), [RoBERTa](https://huggingface.co/FacebookAI/roberta-base), [DistilBERT](https://huggingface.co/distilbert/distilbert-base-uncased), [ModernBERT](https://huggingface.co/answerdotai/ModernBERT-base), etc.) and the latter pools the output of the transformer to produce a single vector representation for each input sentence.

```python
from sentence_transformers import SentenceTransformer
from sentence_transformers.sentence_transformer.modules import Transformer, Pooling

# Loading in fp32 is preferred for training if your memory can handle it
transformer = Transformer("google-bert/bert-base-uncased", model_kwargs={"torch_dtype": "float32"})
pooling = Pooling(transformer.get_embedding_dimension(), pooling_mode="mean")

model = SentenceTransformer(modules=[transformer, pooling])
```

This is the default option in Sentence Transformers, so it's easier to use the shortcut:

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("google-bert/bert-base-uncased", model_kwargs={"torch_dtype": "float32"})
```

**Tip:**

The strongest base models are often "encoder models", i.e. models that are trained to produce a meaningful token embedding for inputs. You can find strong candidates here:

- [fill-mask models](https://huggingface.co/models?pipeline_tag=fill-mask) - trained for token embeddings
- [sentence similarity models](https://huggingface.co/models?pipeline_tag=sentence-similarity) - trained for text embeddings
- [feature-extraction models](https://huggingface.co/models?pipeline_tag=feature-extraction) - trained for text embeddings

Consider looking for base models that are designed on your language and/or domain of interest. For example, [FacebookAI/xlm-roberta-base](https://huggingface.co/FacebookAI/xlm-roberta-base) will work better than [google-bert/bert-base-uncased](https://huggingface.co/google-bert/bert-base-uncased) for Turkish.

## Dataset

The `SentenceTransformerTrainer` trains and evaluates using `datasets.Dataset` (one dataset) or `datasets.DatasetDict` instances (multiple datasets, see also [Multi-dataset training](https://sbert.net/docs/sentence_transformer/#multi-dataset-training)).

**Data on 🤗 Hugging Face Hub**

If you want to load data from the [Hugging Face Datasets](https://huggingface.co/datasets), then you should use `datasets.load_dataset`:

```python
from datasets import load_dataset

train_dataset = load_dataset("sentence-transformers/all-nli", "pair-class", split="train")
eval_dataset = load_dataset("sentence-transformers/all-nli", "pair-class", split="dev")

print(train_dataset)
"""
Dataset({
    features: ['premise', 'hypothesis', 'label'],
    num_rows: 942069
})
"""
```

Some datasets (including [sentence-transformers/all-nli](https://huggingface.co/datasets/sentence-transformers/all-nli)) require you to provide a "subset" alongside the dataset name. `sentence-transformers/all-nli` has 4 subsets, each with different data formats: [pair](https://huggingface.co/datasets/sentence-transformers/all-nli/viewer/pair), [pair-class](https://huggingface.co/datasets/sentence-transformers/all-nli/viewer/pair-class), [pair-score](https://huggingface.co/datasets/sentence-transformers/all-nli/viewer/pair-score), [triplet](https://huggingface.co/datasets/sentence-transformers/all-nli/viewer/triplet).

**Note:**

Many Hugging Face datasets that work out of the box with Sentence Transformers have been tagged with `sentence-transformers`, allowing you to easily find them by browsing to [https://huggingface.co/datasets?other=sentence-transformers](https://huggingface.co/datasets?other=sentence-transformers). We strongly recommend that you browse these datasets to find training datasets that might be useful for your tasks.

**Local Data (CSV, JSON, Parquet, Arrow, SQL)**

If you have local data in common file-formats, then you can load this data easily using `datasets.load_dataset`:

```python
from datasets import load_dataset

dataset = load_dataset("csv", data_files="my_file.csv")
```

or:

```python
from datasets import load_dataset

dataset = load_dataset("json", data_files="my_file.json")
```

**Local Data that requires pre-processing**

If you have local data that requires some extra pre-processing, my recommendation is to initialize your dataset using `datasets.Dataset.from_dict` and a dictionary of lists, like so:

```python
from datasets import Dataset

anchors = []
positives = []
# Open a file, do preprocessing, filtering, cleaning, etc.
# and append to the lists

dataset = Dataset.from_dict({
    "anchor": anchors,
    "positive": positives,
})
```

Each key from the dictionary will become a column in the resulting dataset.

### Dataset Format

It is important that your dataset format matches your loss function (or that you choose a loss function that matches your dataset format). Verifying whether a dataset format works with a loss function involves two steps:

1. If your loss function requires a *Label* according to the [Loss Overview](https://sbert.net/docs/sentence_transformer/loss_overview.html) table, then your dataset must have a **column named "label", "labels", "score" or "scores"**. This column is automatically taken as the label.
2. All columns not named "label", "labels", "score" or "scores" are considered *Inputs* according to the [Loss Overview](https://sbert.net/docs/sentence_transformer/loss_overview.html) table. The number of remaining columns must match the number of valid inputs for your chosen loss. The names of these columns are **irrelevant**, only the **order matters**.

For example, given a dataset with columns `["text1", "text2", "label"]` where the "label" column has float similarity score between 0 and 1, we can use it with `CoSENTLoss`, `AnglELoss`, and `CosineSimilarityLoss` because it:

1. has a "label" column as is required for these loss functions.
2. has 2 non-label columns, exactly the amount required by these loss functions.

Be sure to re-order your dataset columns with `Dataset.select_columns` if your columns are not ordered correctly. For example, if your dataset has `["good_answer", "bad_answer", "question"]` as columns, then this dataset can technically be used with a loss that requires (anchor, positive, negative) triplets, but the `good_answer` column will be taken as the anchor, `bad_answer` as the positive, and `question` as the negative.

Additionally, if your dataset has extraneous columns (e.g. sample_id, metadata, source, type), you should remove these with `Dataset.remove_columns` as they will be used as inputs otherwise. You can also use `Dataset.select_columns` to keep only the desired columns.

## Loss Function

Loss functions quantify how well a model performs for a given batch of data, allowing an optimizer to update the model weights to produce more favourable (i.e., lower) loss values. This is the core of the training process.

Sadly, there is no single loss function that works best for all use-cases. Instead, which loss function to use greatly depends on your available data and on your target task. See [Dataset Format](#dataset-format) to learn what datasets are valid for which loss functions. Additionally, the [Loss Overview](https://sbert.net/docs/sentence_transformer/loss_overview) will be your best friend to learn about the options.

Most loss functions can be initialized with just the `SentenceTransformer` that you're training, alongside some optional parameters, e.g.:

```python
from datasets import load_dataset
from sentence_transformers import SentenceTransformer
from sentence_transformers.sentence_transformer.losses import CoSENTLoss

# Load a model to train/finetune
model = SentenceTransformer("FacebookAI/xlm-roberta-base", model_kwargs={"torch_dtype": "float32"})

# Initialize the CoSENTLoss
# This loss requires pairs of text and a float similarity score as a label
loss = CoSENTLoss(model)

# Load an example training dataset that works with our loss function:
train_dataset = load_dataset("sentence-transformers/all-nli", "pair-score", split="train")
"""
Dataset({
    features: ['sentence1', 'sentence2', 'score'],
    num_rows: 942069
})
"""
```

## Training Arguments

The `SentenceTransformerTrainingArguments` class can be used to specify parameters for influencing training performance as well as defining the tracking/debugging parameters. Although it is optional, it is heavily recommended to experiment with the various useful arguments.

    Key Training Arguments for improving training performance

        <a href="https://huggingface.co/docs/transformers/main/en/main_classes/trainer#transformers.TrainingArguments.learning_rate"><code>learning_rate</code></a>
        <a href="https://huggingface.co/docs/transformers/main/en/main_classes/trainer#transformers.TrainingArguments.lr_scheduler_type"><code>lr_scheduler_type</code></a>
        <a href="https://huggingface.co/docs/transformers/main/en/main_classes/trainer#transformers.TrainingArguments.warmup_steps"><code>warmup_steps</code></a>
        <a href="https://huggingface.co/docs/transformers/main/en/main_classes/trainer#transformers.TrainingArguments.num_train_epochs"><code>num_train_epochs</code></a>
        <a href="https://huggingface.co/docs/transformers/main/en/main_classes/trainer#transformers.TrainingArguments.max_steps"><code>max_steps</code></a>
        <a href="https://huggingface.co/docs/transformers/main/en/main_classes/trainer#transformers.TrainingArguments.per_device_train_batch_size"><code>per_device_train_batch_size</code></a>
        <a href="https://huggingface.co/docs/transformers/main/en/main_classes/trainer#transformers.TrainingArguments.per_device_eval_batch_size"><code>per_device_eval_batch_size</code></a>
        <a href="https://huggingface.co/docs/transformers/main/en/main_classes/trainer#transformers.TrainingArguments.auto_find_batch_size "><code>auto_find_batch_size</code></a>
        <a href="https://huggingface.co/docs/transformers/main/en/main_classes/trainer#transformers.TrainingArguments.fp16"><code>fp16</code></a>
        <a href="https://huggingface.co/docs/transformers/main/en/main_classes/trainer#transformers.TrainingArguments.bf16"><code>bf16</code></a>
        <a href="https://huggingface.co/docs/transformers/main/en/main_classes/trainer#transformers.TrainingArguments.load_best_model_at_end"><code>load_best_model_at_end</code></a>
        <a href="https://huggingface.co/docs/transformers/main/en/main_classes/trainer#transformers.TrainingArguments.metric_for_best_model"><code>metric_for_best_model</code></a>
        <a href="https://huggingface.co/docs/transformers/main/en/main_classes/trainer#transformers.TrainingArguments.gradient_accumulation_steps"><code>gradient_accumulation_steps</code></a>
        <a href="https://huggingface.co/docs/transformers/main/en/main_classes/trainer#transformers.TrainingArguments.gradient_checkpointing"><code>gradient_checkpointing</code></a>
        <a href="https://huggingface.co/docs/transformers/main/en/main_classes/trainer#transformers.TrainingArguments.eval_accumulation_steps"><code>eval_accumulation_steps</code></a>
        <a href="https://huggingface.co/docs/transformers/main/en/main_classes/trainer#transformers.TrainingArguments.optim"><code>optim</code></a>
        <a href="../package_reference/sentence_transformer/training_args.html#sentence_transformers.sentence_transformer.training_args.SentenceTransformerTrainingArguments"><code>batch_sampler</code></a>
        <a href="../package_reference/sentence_transformer/training_args.html#sentence_transformers.sentence_transformer.training_args.SentenceTransformerTrainingArguments"><code>multi_dataset_batch_sampler</code></a>
        <a href="../package_reference/sentence_transformer/training_args.html#sentence_transformers.sentence_transformer.training_args.SentenceTransformerTrainingArguments"><code>prompts</code></a>
        <a href="../package_reference/sentence_transformer/training_args.html#sentence_transformers.sentence_transformer.training_args.SentenceTransformerTrainingArguments"><code>router_mapping</code></a>
        <a href="../package_reference/sentence_transformer/training_args.html#sentence_transformers.sentence_transformer.training_args.SentenceTransformerTrainingArguments"><code>learning_rate_mapping</code></a>

    Key Training Arguments for observing training performance

        <a href="https://huggingface.co/docs/transformers/main/en/main_classes/trainer#transformers.TrainingArguments.eval_strategy"><code>eval_strategy</code></a>
        <a href="https://huggingface.co/docs/transformers/main/en/main_classes/trainer#transformers.TrainingArguments.eval_steps"><code>eval_steps</code></a>
        <a href="https://huggingface.co/docs/transformers/main/en/main_classes/trainer#transformers.TrainingArguments.save_strategy"><code>save_strategy</code></a>
        <a href="https://huggingface.co/docs/transformers/main/en/main_classes/trainer#transformers.TrainingArguments.save_steps"><code>save_steps</code></a>
        <a href="https://huggingface.co/docs/transformers/main/en/main_classes/trainer#transformers.TrainingArguments.save_total_limit"><code>save_total_limit</code></a>
        <a href="https://huggingface.co/docs/transformers/main/en/main_classes/trainer#transformers.TrainingArguments.report_to"><code>report_to</code></a>
        <a href="https://huggingface.co/docs/transformers/main/en/main_classes/trainer#transformers.TrainingArguments.run_name"><code>run_name</code></a>
        <a href="https://huggingface.co/docs/transformers/main/en/main_classes/trainer#transformers.TrainingArguments.log_level"><code>log_level</code></a>
        <a href="https://huggingface.co/docs/transformers/main/en/main_classes/trainer#transformers.TrainingArguments.logging_steps"><code>logging_steps</code></a>
        <a href="https://huggingface.co/docs/transformers/main/en/main_classes/trainer#transformers.TrainingArguments.push_to_hub"><code>push_to_hub</code></a>
        <a href="https://huggingface.co/docs/transformers/main/en/main_classes/trainer#transformers.TrainingArguments.hub_model_id"><code>hub_model_id</code></a>
        <a href="https://huggingface.co/docs/transformers/main/en/main_classes/trainer#transformers.TrainingArguments.hub_strategy"><code>hub_strategy</code></a>
        <a href="https://huggingface.co/docs/transformers/main/en/main_classes/trainer#transformers.TrainingArguments.hub_private_repo"><code>hub_private_repo</code></a>

Here is an example of how `SentenceTransformerTrainingArguments` can be initialized:

```python
args = SentenceTransformerTrainingArguments(
    # Required parameter:
    output_dir="models/mpnet-base-all-nli-triplet",
    # Optional training parameters:
    num_train_epochs=1,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=16,
    learning_rate=2e-5,
    warmup_steps=0.1,
    fp16=True,  # Set to False if you get an error that your GPU can't run on FP16
    bf16=False,  # Set to True if you have a GPU that supports BF16
    batch_sampler=BatchSamplers.NO_DUPLICATES,  # losses that use "in-batch negatives" benefit from no duplicates
    # Optional tracking/debugging parameters:
    eval_strategy="steps",
    eval_steps=0.1,
    save_strategy="steps",
    save_steps=0.1,
    save_total_limit=2,
    logging_steps=0.01,
    run_name="mpnet-base-all-nli-triplet",  # Will be used in W&B if `wandb` is installed
)
```

## Evaluator

You can provide the `SentenceTransformerTrainer` with an `eval_dataset` to get the evaluation loss during training, but it may be useful to get more concrete metrics during training, too. For this, you can use evaluators to assess the model's performance with useful metrics before, during, or after training. You can use both an `eval_dataset` and an evaluator, one or the other, or neither. They evaluate based on the `eval_strategy` and `eval_steps` [Training Arguments](https://sbert.net/docs/sentence_transformer/#training-arguments).

Here are the implemented Evaluators that come with Sentence Transformers:

=============================================================================================  ===========================================================================================================================
Evaluator                                                                                      Required Data
=============================================================================================  ===========================================================================================================================
`BinaryClassificationEvaluator`  Pairs with class labels.
`EmbeddingSimilarityEvaluator`   Pairs with similarity scores.
`InformationRetrievalEvaluator`  Queries (qid => question), Corpus (cid => document), and relevant documents (qid => set[cid]).
`NanoBEIREvaluator`              No data required.
`MSEEvaluator`                   Source sentences to embed with a teacher model and target sentences to embed with the student model. Can be the same texts.
`ParaphraseMiningEvaluator`      Mapping of IDs to sentences & pairs with IDs of duplicate sentences.
`RerankingEvaluator`             List of `{'query': '...', 'positive': [...], 'negative': [...]}` dictionaries.
`TranslationEvaluator`           Pairs of sentences in two separate languages.
`TripletEvaluator`               (anchor, positive, negative) pairs.
=============================================================================================  ===========================================================================================================================

Additionally, `SequentialEvaluator` should be used to combine multiple evaluators into one Evaluator that can be passed to the `SentenceTransformerTrainer`.

Sometimes you don't have the required evaluation data to prepare one of these evaluators on your own, but you still want to track how well the model performs on some common benchmarks. In that case, you can use these evaluators with data from Hugging Face.

**NanoBEIREvaluator**

```python
from sentence_transformers.sentence_transformer.evaluation import NanoBEIREvaluator

# Initialize the evaluator. Unlike most other evaluators, this one loads the relevant datasets
# directly from Hugging Face, so there's no mandatory arguments
dev_evaluator = NanoBEIREvaluator()
# You can run evaluation like so:
# results = dev_evaluator(model)
```

**Tip:**

When evaluating frequently during training with a small `eval_steps`, consider using a tiny `eval_dataset` to minimize evaluation overhead. If you're concerned about the evaluation set size, a 90-1-9 train-eval-test split can provide a balance, reserving a reasonably sized test set for final evaluations. After training, you can assess your model's performance using `trainer.evaluate(test_dataset)` for test loss or initialize a testing evaluator with `test_evaluator(model)` for detailed test metrics.

If you evaluate after training, but before saving the model, your automatically generated model card will still include the test results.

**Warning:**

When using [Distributed Training](https://sbert.net/docs/sentence_transformer/training/distributed.html), the evaluator only runs on the first device, unlike the training and evaluation datasets, which are shared across all devices.

## Trainer

The `SentenceTransformerTrainer` is where all previous components come together. We only have to specify the trainer with the model, training arguments (optional), training dataset, evaluation dataset (optional), loss function, evaluator (optional) and we can start training. Let's have a look at a script where all of these components come together:

```python
from datasets import load_dataset
from sentence_transformers import (
    SentenceTransformer,
    SentenceTransformerTrainer,
    SentenceTransformerTrainingArguments,
    SentenceTransformerModelCardData,
)
from sentence_transformers.sentence_transformer.losses import MultipleNegativesRankingLoss
from sentence_transformers.sentence_transformer.training_args import BatchSamplers
from sentence_transformers.sentence_transformer.evaluation import TripletEvaluator

# 1. Load a model to finetune with 2. (Optional) model card data
model = SentenceTransformer(
    "microsoft/mpnet-base",
    model_card_data=SentenceTransformerModelCardData(
        language="en",
        license="apache-2.0",
        model_name="MPNet base trained on AllNLI triplets",
    ),
    model_kwargs={"torch_dtype": "float32"},
)

# 3. Load a dataset to finetune on
dataset = load_dataset("sentence-transformers/all-nli", "triplet")
train_dataset = dataset["train"].select(range(100_000))
eval_dataset = dataset["dev"]
test_dataset = dataset["test"]

# 4. Define a loss function
loss = MultipleNegativesRankingLoss(model)

# 5. (Optional) Specify training arguments
args = SentenceTransformerTrainingArguments(
    # Required parameter:
    output_dir="models/mpnet-base-all-nli-triplet",
    # Optional training parameters:
    num_train_epochs=1,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=16,
    learning_rate=2e-5,
    warmup_steps=0.1,
    fp16=True,  # Set to False if you get an error that your GPU can't run on FP16
    bf16=False,  # Set to True if you have a GPU that supports BF16
    batch_sampler=BatchSamplers.NO_DUPLICATES,  # MultipleNegativesRankingLoss benefits from no duplicate samples in a batch
    # Optional tracking/debugging parameters:
    eval_strategy="steps",
    eval_steps=0.1,
    save_strategy="steps",
    save_steps=0.1,
    save_total_limit=2,
    logging_steps=0.01,
    run_name="mpnet-base-all-nli-triplet",  # Will be used in W&B if `wandb` is installed
)

# 6. (Optional) Create an evaluator & evaluate the base model
dev_evaluator = TripletEvaluator(
    anchors=eval_dataset["anchor"],
    positives=eval_dataset["positive"],
    negatives=eval_dataset["negative"],
    name="all-nli-dev",
)
dev_evaluator(model)

# 7. Create a trainer & train
trainer = SentenceTransformerTrainer(
    model=model,
    args=args,
    train_dataset=train_dataset,
    eval_dataset=eval_dataset,
    loss=loss,
    evaluator=dev_evaluator,
)
trainer.train()

# (Optional) Evaluate the trained model on the test set
test_evaluator = TripletEvaluator(
    anchors=test_dataset["anchor"],
    positives=test_dataset["positive"],
    negatives=test_dataset["negative"],
    name="all-nli-test",
)
test_evaluator(model)

# 8. Save the trained model
model.save_pretrained("models/mpnet-base-all-nli-triplet/final")

# 9. (Optional) Push it to the Hugging Face Hub
model.push_to_hub("mpnet-base-all-nli-triplet")
```

### Callbacks

This Sentence Transformers trainer integrates support for various `transformers.TrainerCallback` subclasses, such as:

- `WandbCallback` to automatically log training metrics to W&B if `wandb` is installed
- `TensorBoardCallback` to log training metrics to TensorBoard if `tensorboard` is accessible.
- `CodeCarbonCallback` to track the carbon emissions of your model during training if `codecarbon` is installed.

    - Note: These carbon emissions will be included in your automatically generated model card.

See the Transformers [Callbacks](https://huggingface.co/docs/transformers/main/en/main_classes/callback)
documentation for more information on the integrated callbacks and how to write your own callbacks.

## Best Base Embedding Models

The quality of your text embedding model depends on which transformer model you choose. Sadly we cannot infer from a better performance on e.g. the GLUE or SuperGLUE benchmark that this model will also yield better representations.

To test the suitability of transformer models, I use the [training_nli_v2.py](https://github.com/huggingface/sentence-transformers/blob/main/examples/sentence_transformer/training/nli/training_nli_v2.py) script and train on 560k (anchor, positive, negative)-triplets for 1 epoch with batch size 64. I then evaluate on 14 diverse text similarity tasks (clustering, semantic search, duplicate detection etc.) from various domains.

In the following table you find the performance for different models and their performance on this benchmark:

| Model                                                                                                                             | Performance (14 sentence similarity tasks) |
|:-----------------------------------------------------------------------------------------------------------------------------------|:-----------------------------------------|
| [microsoft/mpnet-base](https://huggingface.co/microsoft/mpnet-base)                                                               | 60.99                                      |
| [nghuyong/ernie-2.0-en](https://huggingface.co/nghuyong/ernie-2.0-en)                                                             | 60.73                                      |
| [microsoft/deberta-base](https://huggingface.co/microsoft/deberta-base)                                                           | 60.21                                      |
| [FacebookAI/roberta-base](https://huggingface.co/FacebookAI/roberta-base)                                                                     | 59.63                                      |
| [google-t5/t5-base](https://huggingface.co/google-t5/t5-base)                                                                                         | 59.21                                      |
| [google-bert/bert-base-uncased](https://huggingface.co/google-bert/bert-base-uncased)                                                         | 59.17                                      |
| [distilbert/distilbert-base-uncased](https://huggingface.co/distilbert/distilbert-base-uncased)                                               | 59.03                                      |
| [nreimers/TinyBERT_L-6_H-768_v2](https://huggingface.co/nreimers/TinyBERT_L-6_H-768_v2)                                           | 58.27                                      |
| [google/t5-v1_1-base](https://huggingface.co/google/t5-v1_1-base)                                                                 | 57.63                                      |
| [nreimers/MiniLMv2-L6-H768-distilled-from-BERT-Large](https://huggingface.co/nreimers/MiniLMv2-L6-H768-distilled-from-BERT-Large) | 57.31                                      |
| [albert/albert-base-v2](https://huggingface.co/albert/albert-base-v2)                                                                           | 57.14                                      |
| [microsoft/MiniLM-L12-H384-uncased](https://huggingface.co/microsoft/MiniLM-L12-H384-uncased)                                     | 56.79                                      |
| [microsoft/deberta-v3-base](https://huggingface.co/microsoft/deberta-v3-base)                                                     | 54.46                                      |

## End-to-End Example

For a complete end-to-end training example, see the [Training and Finetuning Embedding Models](https://huggingface.co/blog/train-sentence-transformers) blogpost. It applies the components described on this page to a real training task, then benchmarks the resulting embedding model against its base checkpoint and against existing models of various sizes. For multimodal embedding training (text + image + audio + video), see the [Training and Finetuning Multimodal Embedding & Reranker Models](https://huggingface.co/blog/train-multimodal-sentence-transformers) blogpost, which performs the same kind of evaluation for a Visual Document Retrieval model.
