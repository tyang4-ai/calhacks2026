# InformationRetrievalEvaluator (recall@k, MRR, NDCG for a query set)

> Sources:
> - https://sbert.net/docs/package_reference/sentence_transformer/evaluation.html#informationretrievalevaluator
> - https://github.com/UKPLab/sentence-transformers/blob/v6.2.0/sentence_transformers/sentence_transformer/evaluation/information_retrieval.py
> Fetched: 2026-10-24.
>
> From the UKPLab/sentence-transformers repo at tag v6.2.0 (released Oct 21, 2026, the current PyPI release).
> v6 needs transformers 5.x, torch 2.2+ and huggingface-hub 1.x or later. The docs use the new import paths, such as `from sentence_transformers.sentence_transformer.losses import MultipleNegativesRankingLoss`. The v3-style paths (`sentence_transformers.losses`) still work through deprecated aliases and print a warning.
> This is the class docstring and signature from the source. Pass it to the trainer as `evaluator=` or call it on a model: `results = evaluator(model)`. Result keys are prefixed with the evaluator `name` and the score function, for example `cindia-eval_cosine_recall@5` (check the printed dict once).

```python
InformationRetrievalEvaluator(queries: dict[str, SingleInput], corpus: dict[str, SingleInput], relevant_docs: dict[str, set[str]], corpus_chunk_size: int = 50000, mrr_at_k: list[int] = [10], ndcg_at_k: list[int] = [10], accuracy_at_k: list[int] = [1, 3, 5, 10], precision_recall_at_k: list[int] = [1, 3, 5, 10], map_at_k: list[int] = [100], show_progress_bar: bool = False, batch_size: int = 32, name: str = "", write_csv: bool = True, truncate_dim: int | None = None, score_functions: dict[str, Callable[[Tensor, Tensor], Tensor]] | None = None, main_score_function: str | SimilarityFunction | None = None, query_prompt: str | None = None, query_prompt_name: str | None = None, corpus_prompt: str | None = None, corpus_prompt_name: str | None = None, write_predictions: bool = False,)
```

This class evaluates an Information Retrieval (IR) setting.

Given a set of queries and a large corpus set. It will retrieve for each query the top-k most similar document. It measures
Mean Reciprocal Rank (MRR), Recall@k, and Normalized Discounted Cumulative Gain (NDCG)

**Args:**

    queries (Dict[str, str]): A dictionary mapping query IDs to queries.
    corpus (Dict[str, str]): A dictionary mapping document IDs to documents.
    relevant_docs (Dict[str, Set[str]]): A dictionary mapping query IDs to a set of relevant document IDs.
    corpus_chunk_size (int): The size of each chunk of the corpus. Defaults to 50000.
    mrr_at_k (List[int]): A list of integers representing the values of k for MRR calculation. Defaults to [10].
    ndcg_at_k (List[int]): A list of integers representing the values of k for NDCG calculation. Defaults to [10].
    accuracy_at_k (List[int]): A list of integers representing the values of k for accuracy calculation. Defaults to [1, 3, 5, 10].
    precision_recall_at_k (List[int]): A list of integers representing the values of k for precision and recall calculation. Defaults to [1, 3, 5, 10].
    map_at_k (List[int]): A list of integers representing the values of k for MAP calculation. Defaults to [100].
    show_progress_bar (bool): Whether to show a progress bar during evaluation. Defaults to False.
    batch_size (int): The batch size for evaluation. Defaults to 32.
    name (str): A name for the evaluation. Defaults to "".
    write_csv (bool): Whether to write the evaluation results to a CSV file. Defaults to True.
    truncate_dim (int, optional): The dimension to truncate the embeddings to. Defaults to None.
    score_functions (Dict[str, Callable[[Tensor, Tensor], Tensor]]): A dictionary mapping score function names to score functions. Defaults to the `similarity` function of the model passed to each call, so a reused evaluator follows every model's own similarity.
    main_score_function (Union[str, SimilarityFunction], optional): The main score function to use for evaluation. Defaults to None.
    query_prompt (str, optional): The prompt to be used when encoding the corpus. Defaults to None.
    query_prompt_name (str, optional): The name of the prompt to be used when encoding the corpus. Defaults to None.
    corpus_prompt (str, optional): The prompt to be used when encoding the corpus. Defaults to None.
    corpus_prompt_name (str, optional): The name of the prompt to be used when encoding the corpus. Defaults to None.
    write_predictions (bool): Whether to write the predictions to a JSONL file. Defaults to False.
        This can be useful for downstream evaluation as it can be used as input to the `ReciprocalRankFusionEvaluator` that accept precomputed predictions.

**Example:**

```python
import logging
import random

from datasets import load_dataset
from sentence_transformers import SentenceTransformer
from sentence_transformers.sentence_transformer.evaluation import InformationRetrievalEvaluator
from datasets import load_dataset

logging.basicConfig(format="%(asctime)s - %(message)s", datefmt="%Y-%m-%d %H:%M:%S", level=logging.INFO)

# Load a model
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

# Load the Touche-2020 IR dataset (https://huggingface.co/datasets/mteb/webis-touche2020-v3)
corpus = load_dataset("mteb/webis-touche2020-v3", "corpus", split="corpus")
queries = load_dataset("mteb/webis-touche2020-v3", "queries", split="train")
relevant_docs_data = load_dataset("mteb/webis-touche2020-v3", "default", split="test")

# For this dataset, we want to concatenate the title and texts for the corpus
corpus = corpus.map(lambda x: {"text": (x["title"] + " " + x["text"]).strip()}, remove_columns=["title"])

# Shrink the corpus size heavily to only the relevant documents + 30,000 random documents
required_corpus_ids = set(map(str, relevant_docs_data["corpus-id"]))
required_corpus_ids |= set(random.sample(corpus["_id"], k=30_000))
corpus = corpus.filter(lambda x: x["_id"] in required_corpus_ids)

# Convert the datasets to dictionaries
corpus = dict(zip(corpus["_id"], corpus["text"]))  # Our corpus (cid => document)
queries = dict(zip(queries["_id"], queries["text"]))  # Our queries (qid => question)
relevant_docs = {}  # Query ID to relevant documents (qid => set([relevant_cids])
for qid, corpus_ids in zip(relevant_docs_data["query-id"], relevant_docs_data["corpus-id"]):
    qid = str(qid)
    corpus_ids = str(corpus_ids)
    if qid not in relevant_docs:
        relevant_docs[qid] = set()
    relevant_docs[qid].add(corpus_ids)

# Given queries, a corpus and a mapping with relevant documents, the InformationRetrievalEvaluator computes different IR metrics.
ir_evaluator = InformationRetrievalEvaluator(
    queries=queries,
    corpus=corpus,
    relevant_docs=relevant_docs,
    name="mteb-touche2020-subset-test",
)
results = ir_evaluator(model)
'''
Information Retrieval Evaluation of the model on the mteb-touche2020-subset-test dataset:
Queries: 49
Corpus: 32446

Score-Function: cosine
Accuracy@1: 100.00%
Accuracy@3: 100.00%
Accuracy@5: 100.00%
Accuracy@10: 100.00%
Precision@1: 100.00%
Precision@3: 93.88%
Precision@5: 91.84%
Precision@10: 91.63%
Recall@1: 1.76%
Recall@3: 4.98%
Recall@5: 8.14%
Recall@10: 16.25%
MRR@10: 1.0000
NDCG@10: 0.9295
MAP@100: 0.4844
'''
print(ir_evaluator.primary_metric)
# => "mteb-touche2020-subset-test_cosine_ndcg@10"
print(results[ir_evaluator.primary_metric])
# => 0.9294944073850905
```
