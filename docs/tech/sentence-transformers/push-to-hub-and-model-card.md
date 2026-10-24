# Sentence Transformers: save_pretrained, push_to_hub, and SentenceTransformerModelCardData

> Sources:
> - https://sbert.net/docs/package_reference/sentence_transformer/model.html
> - https://github.com/UKPLab/sentence-transformers/blob/v6.2.0/sentence_transformers/base/model.py
> - https://github.com/UKPLab/sentence-transformers/blob/v6.2.0/sentence_transformers/sentence_transformer/model_card.py
> Fetched: 2026-10-24.
>
> From the UKPLab/sentence-transformers repo at tag v6.2.0 (released Oct 21, 2026, the current PyPI release).
> v6 needs transformers 5.x, torch 2.2+ and huggingface-hub 1.x or later. The docs use the new import paths, such as `from sentence_transformers.sentence_transformer.losses import MultipleNegativesRankingLoss`. The v3-style paths (`sentence_transformers.losses`) still work through deprecated aliases and print a warning.
> The trainer writes a model card automatically. `push_to_hub` uploads the model folder and that README.md. Since v5.4 `push_to_hub` has no `tags` argument: append to `model.model_card_data.tags` before pushing.

## `save_pretrained`

```python
save_pretrained(path: str, model_name: str | None = None, create_model_card: bool = True, train_datasets: list[str] | None = None, safe_serialization: bool = True,)
```

Saves a model and its configuration files to a directory, so that it can be loaded again.

**Args:**

    path (str): Path on disk where the model will be saved.
    model_name (str, optional): Optional model name.
    create_model_card (bool, optional): If True, create a README.md with basic information about this model.
    train_datasets (List[str], optional): Optional list with the names of the datasets used to train the model.
    safe_serialization (bool, optional): If True, save the model using safetensors. If False, save the model
        the traditional (but unsafe) PyTorch way.

## `push_to_hub`

```python
push_to_hub(repo_id: str, token: str | None = None, private: bool | None = None, safe_serialization: bool = True, commit_message: str | None = None, local_model_path: str | None = None, exist_ok: bool = False, replace_model_card: bool = False, train_datasets: list[str] | None = None, revision: str | None = None, create_pr: bool = False,)
```

Uploads all elements of this model to a HuggingFace Hub repository, creating it if it doesn't exist.

**Args:**

    repo_id (str): Repository name for your model in the Hub, including the user or organization.
    token (str, optional): An authentication token (See https://huggingface.co/settings/token)
    private (bool, optional): Set to true, for hosting a private model
    safe_serialization (bool, optional): If true, save the model using safetensors. If false, save the model the traditional PyTorch way
    commit_message (str, optional): Message to commit while pushing.
    local_model_path (str, optional): Path of the model locally. If set, this file path will be uploaded. Otherwise, the current model will be uploaded
    exist_ok (bool, optional): If true, saving to an existing repository is OK. If false, saving only to a new repository is possible
    replace_model_card (bool, optional): If true, replace an existing model card in the hub with the
        automatically created model card. If false (default), keep the existing model card if one exists
        in the repository.
    train_datasets (List[str], optional): Datasets used to train the model. If set, the datasets will be added to the model card in the Hub.
    revision (str, optional): Branch to push the uploaded files to
    create_pr (bool, optional): If True, create a pull request instead of pushing directly to the main branch

**Returns:**

    str: The url of the commit of your model in the repository on the Hugging Face Hub.

## `SentenceTransformerModelCardData`

A dataclass storing data used in the model card.

**Args:**

    language (`Optional[Union[str, List[str]]]`): The model language, either a string or a list,
        e.g. "en" or ["en", "de", "nl"]
    license (`Optional[str]`): The license of the model, e.g. "apache-2.0", "mit",
        or "cc-by-nc-sa-4.0"
    model_name (`Optional[str]`): The pretty name of the model, e.g. "SentenceTransformer based on microsoft/mpnet-base".
    model_id (`Optional[str]`): The model ID when pushing the model to the Hub,
        e.g. "tomaarsen/sbert-mpnet-base-allnli".
    train_datasets (`List[Dict[str, str]]`): A list of the names and/or Hugging Face dataset IDs of the training datasets.
        e.g. [{"name": "SNLI", "id": "stanfordnlp/snli"}, {"name": "MultiNLI", "id": "nyu-mll/multi_nli"}, {"name": "STSB"}]
    eval_datasets (`List[Dict[str, str]]`): A list of the names and/or Hugging Face dataset IDs of the evaluation datasets.
        e.g. [{"name": "SNLI", "id": "stanfordnlp/snli"}, {"id": "mteb/stsbenchmark-sts"}]
    task_name (`str`): The human-readable task the model is trained on,
        e.g. "semantic textual similarity, semantic search, paraphrase mining, text classification, clustering, and more".
    tags (`Optional[List[str]]`): A list of tags for the model,
        e.g. ["sentence-transformers", "sentence-similarity", "feature-extraction"].
    local_files_only (`bool`): If True, don't attempt to find dataset or base model information on the Hub.
        Defaults to False.
    generate_widget_examples (`bool`): If True, generate widget examples from the evaluation or training dataset,
        and compute their similarities. Defaults to True.

**Tip:** 

Install [codecarbon](https://github.com/mlco2/codecarbon) to automatically track carbon emission usage and
include it in your model cards.

Example:

```python
>>> model = SentenceTransformer(
...     "microsoft/mpnet-base",
...     model_card_data=SentenceTransformerModelCardData(
...         model_id="tomaarsen/sbert-mpnet-base-allnli",
...         train_datasets=[{"name": "SNLI", "id": "stanfordnlp/snli"}, {"name": "MultiNLI", "id": "nyu-mll/multi_nli"}],
...         eval_datasets=[{"name": "SNLI", "id": "stanfordnlp/snli"}, {"name": "MultiNLI", "id": "nyu-mll/multi_nli"}],
...         license="apache-2.0",
...         language="en",
...     ),
... )
```
