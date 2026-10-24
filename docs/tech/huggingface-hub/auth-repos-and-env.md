# huggingface_hub: quick start, login and tokens, creating a repo, environment variables

> Sources:
> - https://huggingface.co/docs/huggingface_hub/quick-start
> - https://huggingface.co/docs/huggingface_hub/guides/repository
> - https://huggingface.co/docs/huggingface_hub/package_reference/environment_variables
> Fetched: 2026-10-24.
>
> From the huggingface/huggingface_hub repo at tag v2.3.0 (released Oct 23, 2026, the current PyPI release).
> The Python token variable is `HF_TOKEN`. Every call that writes needs a token with write access.
> Only the environment variables that matter for a training script are kept.

The [Hugging Face Hub](https://huggingface.co/) is the go-to place for sharing machine learning
models, demos, datasets, and metrics. `huggingface_hub` library helps you interact with
the Hub without leaving your development environment. You can create and manage
repositories easily, download and upload files, and get useful model and dataset
metadata from the Hub.

## Installation

To get started, install the `huggingface_hub` library:

```bash
pip install --upgrade huggingface_hub
```

For more details, check out the [installation](https://huggingface.co/docs/huggingface_hub/installation) guide.

> [!TIP]
> The `huggingface_hub` also ships with a [`hf` CLI](https://huggingface.co/docs/huggingface_hub/guides/cli) that lets you interact with the Hub directly from the terminal.
> If you're using AI agents (Claude Code, Codex, Cursor, ...), install the Skill to let your agent use the CLI:
> ```bash
> # works with Claude Code, Codex, Cursor, OpenCode, Pi and any agent that loads skills from `.agents/skills`
> hf skills add
> ```
> Check out the [Hugging Face CLI for AI Agents](https://huggingface.co/docs/hub/agents-cli) guide for more details.

## Download files

Repositories on the Hub are git version controlled, and users can download a single file
or the whole repository. You can use the `hf_hub_download` function to download files.
This function will download and cache a file on your local disk. The next time you need
that file, it will load from your cache, so you don't need to re-download it.

You will need the repository id and the filename of the file you want to download. For
example, to download the [Pegasus](https://huggingface.co/google/pegasus-xsum) model
configuration file:

```py
>>> from huggingface_hub import hf_hub_download
>>> hf_hub_download(repo_id="google/pegasus-xsum", filename="config.json")
```

To download a specific version of the file, use the `revision` parameter to specify the
branch name, tag, or commit hash. If you choose to use the commit hash, it must be the
full-length hash instead of the shorter 7-character commit hash:

```py
>>> from huggingface_hub import hf_hub_download
>>> hf_hub_download(
...     repo_id="google/pegasus-xsum",
...     filename="config.json",
...     revision="4d33b01d79672f27f001f6abade33f22d993b151"
... )
```

For more details and options, see the API reference for `hf_hub_download`.

<a id="login"></a>

## Authentication

In a lot of cases, you must be authenticated with a Hugging Face account to interact with
the Hub: download private repos, upload files, create PRs,...
[Create an account](https://huggingface.co/join) if you don't already have one.

### Login command

The easiest way to authenticate is with the `login` command:

```bash
hf auth login
```

If you are already logged in, the command will return immediately. To force re-login, use `hf auth login --force`. If you are not logged in, you will be prompted to log in with your browser: open the printed URL, enter the short code, approve the request, and an access token is retrieved and saved in your `HF_HOME` directory (defaults to `~/.cache/huggingface/token`). The token expires after a while but is refreshed automatically as long as you keep using it. Any script or library interacting with the Hub will use this token when sending requests. Alternatively, you can paste a [User Access Token](https://huggingface.co/docs/hub/security-tokens) generated from your [Settings page](https://huggingface.co/settings/tokens).

> [!TIP]
> User Access Tokens can have `read` or `write` permissions. Make sure to have a `write` access token if you want to create or edit a repository. Otherwise, it's best to generate a `read` token to reduce risk in case your token is inadvertently leaked.

Alternatively, you can programmatically log in using `login` in a notebook or a script:

```py
>>> from huggingface_hub import login
>>> login()
```

You can only be logged in to one account at a time. Logging in to a new account will automatically log you out of the previous one. To determine your currently active account, simply run the `hf auth whoami` command.

> [!WARNING]
> Once logged in, all requests to the Hub - even methods that don't necessarily require authentication - will use your access token by default. If you want to disable the implicit use of your token, you should set `HF_HUB_DISABLE_IMPLICIT_TOKEN=1` as an environment variable (see [reference](https://huggingface.co/docs/package_reference/environment_variables#hfhubdisableimplicittoken)).

### Manage multiple tokens locally

You can save multiple tokens on your machine by simply logging in with the `login` command with each token. If you need to switch between these tokens locally, you can use the [`auth switch`] command:

```bash
hf auth switch
```

This command will prompt you to select a token by its name from a list of saved tokens. Once selected, the chosen token becomes the _active_ token, and it will be used for all interactions with the Hub.

You can list all available access tokens on your machine with `hf auth list`.

### Environment variable

The environment variable `HF_TOKEN` can also be used to authenticate yourself. This is especially useful in a Space where you can set `HF_TOKEN` as a [Space secret](https://huggingface.co/docs/hub/spaces-overview#managing-secrets).

> [!TIP]
> **NEW:** Google Colaboratory lets you define [private keys](https://twitter.com/GoogleColab/status/1719798406195867814) for your notebooks. Define a `HF_TOKEN` secret to be automatically authenticated!

Authentication via an environment variable or a secret has priority over the token stored on your machine.

### Method parameters

Finally, it is also possible to authenticate by passing your token to any method that accepts `token` as a parameter.

```
from huggingface_hub import whoami

user = whoami(token=...)
```

This is usually discouraged except in an environment where you don't want to store your token permanently or if you need to handle several tokens at once.

> [!WARNING]
> Please be careful when passing tokens as a parameter. It is always best practice to load the token from a secure vault instead of hardcoding it in your codebase or notebook. Hardcoded tokens present a major leak risk if you share your code inadvertently.

## Create a repository

Once you've registered and logged in, create a repository with the `create_repo`
function:

```py
>>> from huggingface_hub import HfApi
>>> api = HfApi()
>>> api.create_repo(repo_id="super-cool-model")
```

If you want your repository to be private, then:

```py
>>> from huggingface_hub import HfApi
>>> api = HfApi()
>>> api.create_repo(repo_id="super-cool-model", private=True)
```

Private repositories will not be visible to anyone except yourself.

> [!TIP]
> To create a repository or to push content to the Hub, you must provide a User Access
> Token that has the `write` permission. You can choose the permission when creating the
> token in your [Settings page](https://huggingface.co/settings/tokens).

## Upload files

Use the `upload_file` function to add a file to your newly created repository. You
need to specify:

1. The path of the file to upload.
2. The path of the file in the repository.
3. The repository id of where you want to add the file.

```py
>>> from huggingface_hub import HfApi
>>> api = HfApi()
>>> api.upload_file(
...     path_or_fileobj="/home/lysandre/dummy-test/README.md",
...     path_in_repo="README.md",
...     repo_id="lysandre/test-model",
... )
```

To upload more than one file at a time, take a look at the [Upload](https://huggingface.co/docs/huggingface_hub/guides/upload) guide
which will introduce you to several methods for uploading files (with or without git).

## Next steps

The `huggingface_hub` library provides an easy way for users to interact with the Hub
with Python. To learn more about how you can manage your files and repositories on the
Hub, we recommend reading our [how-to guides](https://huggingface.co/docs/huggingface_hub/guides/overview) to:

- [Manage your repository](https://huggingface.co/docs/huggingface_hub/guides/repository).
- [Download](https://huggingface.co/docs/huggingface_hub/guides/download) files from the Hub.
- [Upload](https://huggingface.co/docs/huggingface_hub/guides/upload) files to the Hub.
- [Search the Hub](https://huggingface.co/docs/huggingface_hub/guides/search) for your desired model or dataset.
- [Run Inference](https://huggingface.co/docs/huggingface_hub/guides/inference) across multiple services for models hosted on the Hugging Face Hub.


## Repo creation and deletion

The first step is to know how to create and delete repositories. You can only manage repositories that you own (under
your username namespace) or from organizations in which you have write permissions.

### Create a repository

Create an empty repository with `create_repo` and give it a name with the `repo_id` parameter. The `repo_id` is your namespace followed by the repository name: `username_or_org/repo_name`.

```py
>>> from huggingface_hub import create_repo
>>> create_repo("lysandre/test-model")
'https://huggingface.co/lysandre/test-model'
```

Or via CLI:

```bash
>>> hf repos create lysandre/test-model
Successfully created lysandre/test-model on the Hub.
Your repo is now available at https://huggingface.co/lysandre/test-model
```

By default, `create_repo` creates a model repository. But you can use the `repo_type` parameter to specify another repository type. For example, if you want to create a dataset repository:

```py
>>> from huggingface_hub import create_repo
>>> create_repo("lysandre/test-dataset", repo_type="dataset")
'https://huggingface.co/datasets/lysandre/test-dataset'
```

Or via CLI:

```bash
>>> hf repos create lysandre/test-dataset --repo-type dataset
```

When you create a repository, you can set your repository visibility with the `visibility` parameter:

```py
>>> from huggingface_hub import create_repo
>>> create_repo("lysandre/test-private", visibility="private")
```

Or via CLI:

```bash
>>> hf repos create lysandre/test-private --private
```

If you want to change the repository visibility at a later time, you can use the `update_repo_settings` function.

> [!TIP]
> If you are part of an organization with an Enterprise plan, you can create a repo in a specific resource group by passing `resource_group_id` as parameter to `create_repo`. Resource groups are a security feature to control which members from your org can access a given resource. You can get the resource group ID by copying it from your org settings page url on the Hub (e.g. `"https://huggingface.co/organizations/huggingface/settings/resource-groups/66670e5163145ca562cb1988"` => `"66670e5163145ca562cb1988"`). For more details about resource group, check out this [guide](https://huggingface.co/docs/hub/en/security-resource-groups).

You can also create a repo in a specific cloud region by passing `region` as parameter:

```py
>>> from huggingface_hub import create_repo
>>> create_repo("lysandre/test-model", region="us")
```

### Delete a repository

Delete a repository with `delete_repo`. Make sure you want to delete a repository because this is an irreversible process!

Specify the `repo_id` of the repository you want to delete:

```py
>>> delete_repo(repo_id="lysandre/my-corrupted-dataset", repo_type="dataset")
```

Pass `missing_ok=True` to silently ignore the call if the repository doesn't exist:

```py
>>> delete_repo(repo_id="lysandre/my-corrupted-dataset", repo_type="dataset", missing_ok=True)
```

Or via CLI:

```bash
>>> hf repos delete lysandre/my-corrupted-dataset --repo-type dataset
```

### Duplicate a repository

In some cases, you want to copy someone else's repo to adapt it to your use case.
This is possible using the `duplicate_repo` method. It will duplicate the whole repository, preserving the full git history.
This works for models, datasets, and Spaces. For Spaces, you will still need to configure your own settings (hardware, sleep-time, storage, variables and secrets). Check out our [Manage your Space](https://huggingface.co/docs/huggingface_hub/guides/manage-spaces) guide for more details.

```py
>>> from huggingface_hub import duplicate_repo

# Duplicate a Space
>>> duplicate_repo("multimodalart/dreambooth-training", repo_type="space", private=False)
RepoUrl('https://huggingface.co/spaces/nateraw/dreambooth-training',...)

# Duplicate a dataset
>>> duplicate_repo("openai/gdpval", repo_type="dataset")
RepoUrl('https://huggingface.co/datasets/nateraw/gdpval',...)
```

Like `create_repo`, `duplicate_repo` accepts a `resource_group_id` to create the copy directly inside a resource group of your Enterprise organization (`--resource-group-id` with `hf repos duplicate`).

The git history is copied right away, but the LFS/Xet files may still be copied in the background once `duplicate_repo` returns. Until the copy is complete, downloading these files from the new repo may fail. Check `files_copy_pending` on the returned value to know if the copy is still in progress:

```py
>>> from huggingface_hub import duplicate_repo
>>> repo_url = duplicate_repo("openai/gdpval", repo_type="dataset")
>>> repo_url.files_copy_pending
True
```

## Change repository settings

Repositories come with some settings that you can configure. Most of the time, you will want to do that manually in the
repo settings page in your browser. You must have write access to a repo to configure it (either own it or being part of
an organization). In this section, we will see the settings that you can also configure programmatically using `huggingface_hub`.

Some settings are specific to Spaces (hardware, environment variables,...). To configure those, please refer to our [Manage your Spaces](https://huggingface.co/docs/huggingface_hub/guides/manage-spaces) guide.

### Update visibility

A repository can be public or private. A private repository is only visible to you or members of the organization in which the repository is located. Change a repository to private as shown in the following:

```py
>>> from huggingface_hub import update_repo_settings
>>> update_repo_settings(repo_id=repo_id, private=True)
```

Or via CLI:

```bash
>>> hf repos settings lysandre/test-private --private true
```

### Setup gated access

To give more control over how repos are used, the Hub allows repo authors to enable **access requests** for their repos. User must agree to share their contact information (username and email address) with the repo authors to access the files when enabled. A repo with access requests enabled is called a **gated repo**.

You can set a repo as gated using `update_repo_settings`:

```py
>>> from huggingface_hub import HfApi

>>> api = HfApi()
>>> api.update_repo_settings(repo_id=repo_id, gated="auto")  # Set automatic gating for a model
```

Or via CLI:

```bash
>>> hf repos settings lysandre/test-private --gated auto
```

### Rename your repository

You can rename your repository on the Hub using `move_repo`. Using this method, you can also move the repo from a user to
an organization. When doing so, there are a [few limitations](https://hf.co/docs/hub/repositories-settings#renaming-or-transferring-a-repo)
that you should be aware of. For example, you can't transfer your repo to another user.

```py
>>> from huggingface_hub import move_repo
>>> move_repo(from_id="Wauplin/cool-model", to_id="huggingface/cool-model")
```

Or via CLI:

```bash
>>> hf repos move Wauplin/cool-model huggingface/cool-model
```


## Environment variables (selected)

#### HF_HOME

To configure where `huggingface_hub` will locally store data. In particular, your token
and the cache will be stored in this folder.

Defaults to `"~/.cache/huggingface"` unless [XDG_CACHE_HOME](#xdgcachehome) is set.

#### HF_HUB_CACHE

To configure where repositories from the Hub will be cached locally (models, datasets and
spaces).

Defaults to `"$HF_HOME/hub"` (e.g. `"~/.cache/huggingface/hub"` by default).

#### HF_TOKEN

To configure the User Access Token to authenticate to the Hub. If set, this value will
overwrite the token stored on the machine (in either `$HF_TOKEN_PATH` or `"$HF_HOME/token"` if the former is not set).

For more details about authentication, check out [this section](https://huggingface.co/docs/huggingface_hub/quick-start#authentication).

#### HF_HUB_ETAG_TIMEOUT

Integer value to define the number of seconds to wait for server response when fetching the latest metadata from a repo before downloading a file. If the request times out, `huggingface_hub` will default to the locally cached files. Setting a lower value speeds up the workflow for machines with a slow connection that have already cached files. A higher value guarantees the metadata call to succeed in more cases. Default to 10s.

#### HF_HUB_DOWNLOAD_TIMEOUT

Integer value to define the number of seconds to wait for server response when downloading a file. If the request times out, a TimeoutError is raised. Setting a higher value is beneficial on machine with a slow connection. A smaller value makes the process fail quicker in case of complete network outage. Default to 10s.

#### HF_HUB_OFFLINE

If set, no HTTP calls will be made to the Hugging Face Hub. If you try to download files, only the cached files will be accessed. If no cache file is detected, an error is raised This is useful in case your network is slow and you don't care about having the latest version of a file.

If `HF_HUB_OFFLINE=1` is set as environment variable and you call any method of `HfApi`, an `OfflineModeIsEnabled` exception will be raised.

**Note:** even if the latest version of a file is cached, calling `hf_hub_download` still triggers a HTTP request to check that a new version is not available. Setting `HF_HUB_OFFLINE=1` will skip this call which speeds up your loading time.

If you want to check if offline mode is enabled or not, you can use the `is_offline_mode` helper.

#### HF_HUB_DISABLE_TELEMETRY

By default, some data is collected by HF libraries (`transformers`, `datasets`, `gradio`,..) to monitor usage, debug issues and help prioritize features.
Each library defines its own policy (i.e. which usage to monitor) but the core implementation happens in `huggingface_hub` (see `send_telemetry`).

You can set `HF_HUB_DISABLE_TELEMETRY=1` as environment variable to globally disable telemetry.

#### HF_HUB_ENABLE_HF_TRANSFER

> [!WARNING]
> This is a deprecated environment variable.
> Now that the Hugging Face Hub is fully powered by the Xet storage backend, all file transfers go through the `hf-xet` binary package. It provides efficient transfers using a chunk-based deduplication strategy and integrates seamlessly with `huggingface_hub`.
> This means `hf_transfer` can't be used anymore. If you are interested in higher performance, check out the [`HF_XET_HIGH_PERFORMANCE` section](#hf_xet_high_performance)
