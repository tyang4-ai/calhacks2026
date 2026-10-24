# intfloat/multilingual-e5-small: what the model card says

> Sources:
> - https://huggingface.co/intfloat/multilingual-e5-small
> - https://huggingface.co/intfloat/multilingual-e5-base
> - https://github.com/microsoft/unilm/blob/master/e5/README.md
> Fetched: 2026-10-24.
>
> The container has no route to huggingface.co, so this page is assembled: the model table is copied from the microsoft/unilm README, and the prefix rules and FAQ are quoted from the E5 model cards as read through a fetch tool. Quotes are marked. Everything else is labeled as a summary or a Cindia note.

## The model

- Hub ID: `intfloat/multilingual-e5-small`. License: MIT (model card metadata). The card lists 94 languages, and Chinese (`zh`) is one of them.
- From the E5 README in the microsoft/unilm repo (fetched 2026-10-24 from https://github.com/microsoft/unilm/blob/master/e5/README.md), the multilingual rows of its model table:

|------------------------|------|:-----------:|:-------------------:|-----------------------------------------------------------------------------------------|
|------------------------|------|:-----------:|:-------------------:|-----------------------------------------------------------------------------------------|
|--------------------------------|------|:-----------:|:-------------------:|-----------------------------------------------------------------------------------------------------------|
| multilingual-e5-small          | 46.6 |     12      |         384         | [intfloat/multilingual-e5-small](https://huggingface.co/intfloat/multilingual-e5-small)                   |
| multilingual-e5-base           | 48.9 |     12      |         768         | [intfloat/multilingual-e5-base](https://huggingface.co/intfloat/multilingual-e5-base)                     |
| multilingual-e5-large          | 51.4 |     24      |        1024         | [intfloat/multilingual-e5-large](https://huggingface.co/intfloat/multilingual-e5-large)                   |
| multilingual-e5-large-instruct | 52.5 |     24      |        1024         | [intfloat/multilingual-e5-large-instruct](https://huggingface.co/intfloat/multilingual-e5-large-instruct) |

  So `multilingual-e5-small` has 12 layers and 384-dimension embeddings, which matches `dims: 384` in the contracts.

## Input prefixes (quoted from the E5 model cards)

The multilingual E5 cards share one usage section and FAQ. These quotes are from the `intfloat/multilingual-e5-base` card, read through a fetch tool on 2026-10-24, because the small model's card body did not load:

- "Each input text should start with "query: " or "passage: ", even for non-English texts."
- "For tasks other than retrieval, you can simply use the "query: " prefix."
- FAQ, "Do I need to add the prefix "query: " and "passage: " to input texts?": "Yes, this is how the model is trained, otherwise you will see a performance degradation."
- Use "query: " and "passage: " for asymmetric tasks such as open QA and ad hoc retrieval. Use "query: " on both sides for symmetric tasks such as semantic similarity and paraphrase retrieval, and for embeddings used as features in classification or clustering. (Summarized from the same FAQ.)

## Similarity scores sit high

- FAQ, "Why does the cosine similarity scores distribute around 0.7 to 1.0?": "This is a known and expected behavior as we use a low temperature 0.01 for InfoNCE contrastive loss."
- The card adds that only the relative order of scores matters for retrieval, not their absolute values.
- Cindia note: a fixed cut such as "similarity 0.75 or above" means little on the raw base model, because almost every pair scores above 0.7. Measure the score spread of real look-alikes and of unrelated listings after fine-tuning before picking B15's threshold. Elasticsearch turns cosine into `_score = (1 + cosine) / 2`, so the same pairs land near 0.85 to 1.0 there.

## Length limit

- "Long texts will be truncated to at most 512 tokens." (Limitations section.)

## Loading it with Sentence Transformers

This snippet is the one shown on the small model's Hub page:

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("intfloat/multilingual-e5-small")

sentences = [
    "The weather is lovely today.",
    "It's so sunny outside!",
    "He drove to the stadium."
]
embeddings = model.encode(sentences)
similarities = model.similarity(embeddings, embeddings)
print(similarities.shape)  # [3, 3]
```

With the prefixes, a Cindia query and a piece passage look like this (the passage rule is in `docs/v2/contracts.md`, section 2):

```python
q = model.encode(["query: a soft, hopeful gift for my mom, peony, gift for mom"], normalize_embeddings=True)
p = model.encode(["passage: embroidered silk fan | craft: Gu embroidery, ... "], normalize_embeddings=True)
```

## Citation

"Multilingual E5 Text Embeddings: A Technical Report" (Wang et al., 2024).
