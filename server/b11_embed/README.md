---
license: mit
base_model: intfloat/multilingual-e5-small
library_name: sentence-transformers
pipeline_tag: sentence-similarity
language:
- en
- zh
tags:
- sentence-transformers
- sentence-similarity
- feature-extraction
- synthetic-data
---

# cindia-embed-v1

`cindia-embed-v1` is a sentence-embedding model fine-tuned from [intfloat/multilingual-e5-small](https://huggingface.co/intfloat/multilingual-e5-small), which is released under the MIT licence by its authors. It keeps the base model's 384 dimensions, its tokenizer and its mean pooling, so English and Chinese text share one vector space. It was built in one weekend for Cindia (Craft Inheritance Network, Direct from Independent Artisans), a hackathon project at Cal Hacks 13.0.

## Intended use

Search over this fictional demo catalog of 54 listings on the Cindia platform. A buyer describes a feeling, such as "something warm and bright for my mom's new house", and the model ranks the catalog's pieces by cosine similarity, so the search can land on the right weavings, pottery and beadwork even when the words differ.

Every input carries the E5 prefix in its text: `query: ` for a search and `passage: ` for a listing. Vectors are L2-normalized, so cosine similarity is a dot product. Load it from a local copy of this repository:

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("models/cindia-embed-v1")
vectors = model.encode(["query: something warm and bright for my mom"], normalize_embeddings=True)
```

`report.json` in this repository carries the weights' sha256 (`modelSha256`), a hash of the 54 passages (`passagesHash`) and the fingerprint made from both. Cindia's server refuses a model, a vector file or a search index that doesn't share that fingerprint.

## Training data

The training data is synthetic queries that Claude wrote about 54 fictional listings, read from each listing's own record and nothing else. Some listings are attributed to fictional members of real Native American nations. In the catalog they appear as Diné, Ojibwe, Acoma Pueblo, Seminole makers, and every one of those makers is invented. No real community's, maker's or buyer's data was used anywhere in training or evaluation.

Before training, every query was checked against Cindia's content rules (no stereotype or meaning words, no nation's name used as a product word, no links) and against the held-out test queries, so no test query or near copy of one was trained on. Every training pair is kept in `pairs.jsonl` in Cindia's code repository for audit. The pairs file is not uploaded here.

<!-- cindia:pairs:start -->
_Filled in from pairs_meta.json by publish.py when the model is published._
<!-- cindia:pairs:end -->

## Evaluation

The evaluation uses 50 agent-written, held-out queries over the same 54 pieces that are in training: our data agent wrote the queries separately, and none was used for training. Only the queries are held out, because the 54 documents themselves are in training. It covers one model family, scored against keyword search (BM25), the untuned base model and a local hybrid of the two. Every number below comes from `report.json`, with paired bootstrap 95% intervals. This is a small test, not a benchmark.

<!-- cindia:results:start -->
_Filled in from report.json by publish.py when the model is published._
<!-- cindia:results:end -->

## Limits

One small catalog, one run, queries and pieces from the same authoring pipeline. The test queries and the listings were written by the same kind of agent, so the scores say how well the model fits this catalog and say little about real shoppers or any other catalog. The model was trained for a few epochs with one seed (the device and the settings are in the notes above), and nothing here measures how much the numbers would move with another seed.

## Not for

This model is not for classifying, ranking or verifying real makers or their work, judging authenticity or identity, or any decision about a real person. It has seen only invented listings, and it knows nothing about any community, its crafts or its rules.

## Fictional data

Every community, maker and story here is fictional. The crafts are real traditions. We haven't worked with these communities yet, and a real launch starts with them.

## Licence and credit

Fine-tuned from [intfloat/multilingual-e5-small](https://huggingface.co/intfloat/multilingual-e5-small) (MIT). The fine-tuned weights are shared under the same MIT licence.
