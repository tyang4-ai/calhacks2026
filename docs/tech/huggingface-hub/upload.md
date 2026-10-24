# huggingface_hub: upload files to the Hub

> Sources:
> - https://huggingface.co/docs/huggingface_hub/guides/upload
> - https://github.com/huggingface/huggingface_hub/blob/v2.3.0/docs/source/en/guides/upload.md
> Fetched: 2026-10-24.
>
> From the huggingface/huggingface_hub repo at tag v2.3.0 (released Oct 23, 2026, the current PyPI release).
> The Python token variable is `HF_TOKEN`. Every call that writes needs a token with write access.
> Left out: large-folder uploads, scheduled and background uploads, chunked uploads and the LFS internals.

Sharing your files and work is an important aspect of the Hub. The `huggingface_hub` offers several options for uploading your files to the Hub. You can use these functions independently or integrate them into your library, making it more convenient for your users to interact with the Hub.

Whenever you want to upload files to the Hub, you need to log in to your Hugging Face account. For more details about authentication, check out [this section](https://huggingface.co/docs/huggingface_hub/quick-start#authentication).

## Upload a file

Once you've created a repository with `create_repo`, you can upload a file to your repository using `upload_file`.

Specify the path of the file to upload, where you want to upload the file to in the repository, and the name of the repository you want to add the file to. Depending on your repository type, you can optionally set the repository type as a `dataset`, `model`, or `space`.

```py
>>> from huggingface_hub import HfApi
>>> api = HfApi()
>>> api.upload_file(
...     path_or_fileobj="/path/to/local/folder/README.md",
...     path_in_repo="README.md",
...     repo_id="username/test-dataset",
...     repo_type="dataset",
... )
```

## Upload a folder

Use the `upload_folder` function to upload a local folder to an existing repository. Specify the path of the local folder
to upload, where you want to upload the folder to in the repository, and the name of the repository you want to add the
folder to. Depending on your repository type, you can optionally set the repository type as a `dataset`, `model`, or `space`.

```py
>>> from huggingface_hub import HfApi
>>> api = HfApi()

# Upload all the content from the local folder to your remote Space.
# By default, files are uploaded at the root of the repo
>>> api.upload_folder(
...     folder_path="/path/to/local/space",
...     repo_id="username/my-cool-space",
...     repo_type="space",
... )
```

By default, the `.gitignore` file will be taken into account to know which files should be committed or not. By default we check if a `.gitignore` file is present in a commit, and if not, we check if it exists on the Hub. Please be aware that only a `.gitignore` file present at the root of the directory will be used. We do not check for `.gitignore` files in subdirectories.

If you don't want to use an hardcoded `.gitignore` file, you can use the `allow_patterns` and `ignore_patterns` arguments to filter which files to upload. These parameters accept either a single pattern or a list of patterns. Patterns are Standard Wildcards (globbing patterns) as documented [here](https://tldp.org/LDP/GNU-Linux-Tools-Summary/html/x11655.htm). If both `allow_patterns` and `ignore_patterns` are provided, both constraints apply.

Beside the `.gitignore` file and allow/ignore patterns, any `.git/` folder present in any subdirectory will be ignored.

```py
>>> api.upload_folder(
...     folder_path="/path/to/local/folder",
...     path_in_repo="my-dataset/train", # Upload to a specific folder
...     repo_id="username/test-dataset",
...     repo_type="dataset",
...     ignore_patterns="**/logs/*.txt", # Ignore all text logs
... )
```

You can also use the `delete_patterns` argument to specify files you want to delete from the repo in the same commit.
This can prove useful if you want to clean a remote folder before pushing files in it and you don't know which files
already exists.

The example below uploads the local `./logs` folder to the remote `/experiment/logs/` folder. Only txt files are uploaded
but before that, all previous logs on the repo are deleted. All of this in a single commit.
```py
>>> api.upload_folder(
...     folder_path="/path/to/local/folder/logs",
...     repo_id="username/trained-model",
...     path_in_repo="experiment/logs/",
...     allow_patterns="*.txt", # Upload all local text files
...     delete_patterns="*.txt", # Delete all remote text files before
... )
```

### How files are uploaded

When `hf_xet` is installed (which is the case by default), `upload_folder` uploads files through a streamed pipeline: files are checked against the Hub, uploaded to the Xet storage backend (which chunks, deduplicates and retries transfers internally), and committed in adaptive batches, all in parallel. In practice this means:

- **Folders of any size**: small folders are uploaded in a single commit, while folders with many files are automatically split into several commits to stay below server limits. When this happens, follow-up commits get a ` (part 2)`, ` (part 3)`, ... suffix on the commit message.
- **Resumable**: if the upload is interrupted for any reason, simply re-run the same call. Files already committed are detected and skipped, and chunks already uploaded are deduplicated — re-uploading them transfers (almost) no data. No local state is involved: you can even resume from a different machine. One exception: with `create_pr=True`, re-running opens a new pull request. We recommend re-run with `revision="refs/pr/N"` instead when resuming upload.
- **No double read**: files are hashed while being chunked for upload, in a single read pass. There is no separate "hashing" phase before the upload starts.

A live progress display keeps track of the three stages:

```
Found 5,000 files to upload
  Preparing   ████████████████████  5,000 / 5,000 ✓
  Uploading   ██████████████░░░░░░  423 / 603 files  3.8GB · 19.7MB/s
  Committing  ██████████████████░░  4,580 / 5,000  6 commits
```

If `hf_xet` is not installed, `upload_folder` falls back to the legacy behavior: hash everything first, upload over HTTP, then create a single commit. We always recommend to keep `hf_xet` installed for better robustness

## Upload from the CLI

You can use the `hf upload` command from the terminal to directly upload files to the Hub. Internally it uses the same `upload_file` and `upload_folder` helpers described above.

You can either upload a single file or an entire folder:

```bash
# Usage:  hf upload [repo_id] [local_path] [path_in_repo]
>>> hf upload Wauplin/my-cool-model ./models/model.safetensors model.safetensors
https://huggingface.co/Wauplin/my-cool-model/blob/main/model.safetensors

>>> hf upload Wauplin/my-cool-model ./models .
https://huggingface.co/Wauplin/my-cool-model/tree/main
```

`local_path` and `path_in_repo` are optional and can be implicitly inferred. If `local_path` is not set, the tool will
check if a local folder or file has the same name as the `repo_id`. If that's the case, its content will be uploaded.
Otherwise, an exception is raised asking the user to explicitly set `local_path`. In any case, if `path_in_repo` is not
set, files are uploaded at the root of the repo.

The destination can also be expressed as a single `hf://` URI following the grammar `hf://[<TYPE>/]<ID>[@<REVISION>][/<PATH>]` (see the [HF URIs reference](https://huggingface.co/docs/huggingface_hub/package_reference/hf_uris) for the full syntax). The repo type, revision and `path_in_repo` are then read from the URI, which cannot be combined with the `--repo-type` and `--revision` options:

```bash
# Upload a single file to a dataset on a specific branch
>>> hf upload hf://datasets/Wauplin/my-cool-dataset@my-branch/data/train.csv ./train.csv
https://huggingface.co/datasets/Wauplin/my-cool-dataset/blob/my-branch/data/train.csv
```

> [!TIP]
> For maximum upload throughput on large files, set the [`HF_XET_HIGH_PERFORMANCE=1`](https://huggingface.co/docs/huggingface_hub/package_reference/environment_variables.md#hf_xet_high_performance) environment variable. This enables `hf_xet`'s high-performance mode, which saturates available bandwidth and CPU cores. Note: the legacy `HF_HUB_ENABLE_HF_TRANSFER=1` flag is no longer used since `hf_transfer` was removed in favor of `hf_xet` — set `HF_XET_HIGH_PERFORMANCE=1` instead.

For more details about the CLI upload command, please refer to the [CLI guide](https://huggingface.co/docs/huggingface_hub/guides/cli#hf-upload).
