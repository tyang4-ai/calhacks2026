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
- `pairs.jsonl` holds 1045 query-piece lines for 54 fictional pieces: 831 in English and 214 in Chinese.
- Claude wrote the queries for 54 pieces: claude-haiku-5-5 for 53 pieces, claude-sonnet-5-5 for 1 piece on a retry after a failed check. 0 pieces fell back to fixed templates.
- The content filter dropped 0 queries and the eval-leak guard dropped 40. 316 lines carry a filtered hard negative, and the rest rely on in-batch negatives.
- Written 2026-10-25T05:04:05Z, from the catalog exported at 2026-10-25T04:38:11.213Z.
<!-- cindia:pairs:end -->

## Evaluation

The evaluation uses 50 agent-written, held-out queries over the same 54 pieces that are in training: our data agent wrote the queries separately, and none was used for training. Only the queries are held out, because the 54 documents themselves are in training. It covers one model family, scored against keyword search (BM25), the untuned base model and a local hybrid of the two. Every number below comes from `report.json`, with paired bootstrap 95% intervals. This is a small test, not a benchmark.

<!-- cindia:results:start -->
Scored 2026-10-25T06:46:04Z on cpu: 50 queries (40 English, 10 Chinese), the top 5 of 54 pieces. Fingerprint `f7181c7ddb90af25`.

| System | recall@5 | MRR@10 | recall@5, English | recall@5, Chinese | MRR@10, English | MRR@10, Chinese |
|---|---:|---:|---:|---:|---:|---:|
| keyword (BM25) | 0.784 | 0.875 | 0.812 | 0.672 | 0.924 | 0.675 |
| base model | 0.722 | 0.781 | 0.796 | 0.425 | 0.886 | 0.361 |
| Cindia's model | 0.789 | 0.892 | 0.797 | 0.758 | 0.903 | 0.850 |
| local hybrid | 0.825 | 0.940 | 0.849 | 0.728 | 0.950 | 0.900 |

Paired bootstrap over the queries (10,000 resamples, seeded), 95% intervals:

- The gap between Cindia's model and keyword (BM25) on recall@5 is within noise (+0.005, 95% interval -0.088 to +0.101).
- The gap between Cindia's model and keyword (BM25) on MRR@10 is within noise (+0.018, 95% interval -0.087 to +0.123).
- The gap between Cindia's model and base model on recall@5 is within noise (+0.067, 95% interval -0.018 to +0.156).
- Cindia's model beats base model on MRR@10 (+0.111, 95% interval +0.022 to +0.206).
- The gap between local hybrid and Cindia's model on recall@5 is within noise (+0.035, 95% interval -0.021 to +0.094).
- local hybrid beats Cindia's model on MRR@10 (+0.048, 95% interval +0.002 to +0.105).

Notes from the run:

- Every number here comes from this run, scored 2026-10-25T06:46:04Z on cpu, rerun with --eval-only on the saved model.
- The 50 test queries were written by our data agent, not a person, and held out: none is used for training. The 54 pieces they grade are in training, and only the queries are held out. One small catalog and one model family: a small test, not a benchmark.
- hybrid is a local hybrid: reciprocal rank fusion (constant 60) of Cindia's model and BM25, skipping keyword hits that scored 0. The live Elastic hybrid is a different system, and B12 records its own numbers.
- recallAtK is recall@5 (grades 1 and 2 both count); mrr is MRR@10 (the first grade-2 piece within the top 10).
- 219 pieces in some system's top 5 aren't graded for their query, and count as misses until the pooled grading pass (unjudged.json).
- Dev split: 108 training queries held out (10% of each piece's). Recall@5 on them: base 0.917, Cindia's model 0.963. They come from the same authoring pipeline as the training queries, so they say less than the test set.
- The tour query on the map: its projected point lands within the spread of its top 3, so the map stores no queryShift.
- On the map, 23 of the 50 test queries land by projection and 27 at the weighted center of their top 3, marked approximate. The two components explain 16.2% and 13.7% of the passages' variance.
- Fine-tuned from intfloat/multilingual-e5-small (MIT) for 3 epochs at batch 16 (177 steps) with MultipleNegativesRankingLoss on 650 query-passage pairs and 276 triplets with a hard negative, NO_DUPLICATES batches, learning rate 2e-05 with 10% warmup, seed 13, max_seq_length 128, word embeddings frozen (21.6M of 117.7M weights trained).
- Batch 16, not 32: the memory probe measured a peak of 5.18 GB and 14.7 s a step at batch 32 (limits 4 GB and 30 s).
- Training pairs: 1045 query-piece lines for 54 fictional pieces. Claude (claude-haiku-5-5, claude-sonnet-5-5) wrote the queries for 54 pieces from their records alone.
- The content filter dropped 0 queries holding a contentRules banned, stereotype or meaning word, a People's name used as a product word, or a URL.
- The eval-leak guard dropped 40 queries that equaled or nearly matched one of the 50 held-out eval queries or the tour query; no eval query was used for training.
- Hard negatives: 316 looks, material and craft_term lines carry one. The filter dropped 397 candidates that shared a motif, mood or recipient word with the query, or matched every facet it names; every other line relies on in-batch negatives.
<!-- cindia:results:end -->

## Limits

One small catalog, one run, queries and pieces from the same authoring pipeline. The test queries and the listings were written by the same kind of agent, so the scores say how well the model fits this catalog and say little about real shoppers or any other catalog. The model was trained for a few epochs with one seed (the device and the settings are in the notes above), and nothing here measures how much the numbers would move with another seed.

## Not for

This model is not for classifying, ranking or verifying real makers or their work, judging authenticity or identity, or any decision about a real person. It has seen only invented listings, and it knows nothing about any community, its crafts or its rules.

## Fictional data

Every community, maker and story here is fictional. The crafts are real traditions. We haven't worked with these communities yet, and a real launch starts with them.

## Licence and credit

Fine-tuned from [intfloat/multilingual-e5-small](https://huggingface.co/intfloat/multilingual-e5-small) (MIT). The fine-tuned weights are shared under the same MIT licence.
