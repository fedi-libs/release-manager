# fedi-libs Release Manager

A reusable GitHub Actions workflow for automated Python package releases, specifically designed for `fedi-libs` projects. It leverages GitHub Apps for bot interactions, `git-cliff` for changelog generation, and Trusted Publishing (OIDC) for secure PyPI deployments.

## Features

- **Human-Driven**: Initiated by creating a "Draft Release" in the GitHub UI.
- **Automated Changelog**: Uses `git-cliff` and Conventional Commits to generate release notes.
- **On-Demand RC**: Deploy release candidates to TestPyPI by commenting `/deploy` on a PR.
- **Secure Deployment**: Uses OIDC (Trusted Publishing) for PyPI/TestPyPI—no long-lived tokens required.
- **Dynamic Versioning**: Supports `hatch-vcs` and `setuptools_scm` by injecting versions via environment variables.

## Architecture

The workflow consists of three phases:

1.  **Preparation**: When a Draft Release is created, a bot creates a release branch and a Pull Request with an auto-generated changelog.
2.  **Verification**: While the PR is open, members can trigger TestPyPI deployments via PR comments.
3.  **Finalization**: When the PR is merged, the package is published to PyPI, and the GitHub Release is moved from Draft to Published.

## Usage in Your Project
To use this workflow in your repository, create the following files:

### Prerequires
for GitHub Actions limitations, this release-manager needs minimal "proxy" with GitHub webhook.

The proxy is included in this repository. If you have a Cloudflare account, you can deploy it immediately.

```bash
git clone https://github.com/fedi-libs/release-manager.GitHub
pnpm install
pnpm deploy
```

### 1. Release Preparation (`.github/workflows/release-preparation.yml`)

```yaml
name: Release Preparation

on:
  release:
    types: [created]

jobs:
  call-prep:
    if: github.event.release.draft == true
    uses: fedi-libs/release-manager/.github/workflows/reusable-release-prep.yml@main
    with:
      tag_name: ${{ github.event.release.tag_name }}
    secrets:
      app_id: ${{ secrets.RELEASE_BOT_APP_ID }}
      private_key: ${{ secrets.RELEASE_BOT_PRIVATE_KEY }}
```

### 2. RC Deployment (`.github/workflows/rc-deployment.yml`)

```yaml
name: RC Deployment

on:
  issue_comment:
    types: [created]

jobs:
  call-rc-deploy:
    if: |
      github.event.issue.pull_request &&
      contains(github.event.comment.body, '/deploy')
    uses: fedi-libs/release-manager/.github/workflows/reusable-rc-deploy.yml@main
    with:
      comment_user: ${{ github.event.comment.user.login }}
      pr_number: ${{ github.event.issue.number }}
      package_name: ${{ github.event.repository.name }}
    secrets:
      app_id: ${{ secrets.RELEASE_BOT_APP_ID }}
      private_key: ${{ secrets.RELEASE_BOT_PRIVATE_KEY }}
```

### 3. Formal Release (`.github/workflows/formal-release.yml`)

```yaml
name: Formal Release

on:
  pull_request:
    types: [closed]

jobs:
  call-formal-release:
    if: |
      github.event.pull_request.merged == true &&
      startsWith(github.event.pull_request.head.ref, 'release/') &&
      github.event.pull_request.user.login == 'fedi-libs-release-bot[bot]'
    uses: fedi-libs/release-manager/.github/workflows/reusable-formal-release.yml@main
    with:
      head_ref: ${{ github.event.pull_request.head.ref }}
      pr_body: ${{ github.event.pull_request.body }}
    secrets:
      app_id: ${{ secrets.RELEASE_BOT_APP_ID }}
      private_key: ${{ secrets.RELEASE_BOT_PRIVATE_KEY }}
```

## Setup Requirements

### 1. GitHub App
Create a GitHub App (e.g., `fedi-libs-release-bot`) with the following permissions:
- **Contents**: Read & Write
- **Pull Requests**: Read & Write
- **Metadata**: Read-only

Store the `App ID` and `Private Key` as secrets in your repository:
- `RELEASE_BOT_APP_ID`
- `RELEASE_BOT_PRIVATE_KEY`

### 2. Trusted Publishing (PyPI)
Configure [Trusted Publishing](https://docs.pypi.org/trusted-publishers/adding-a-publisher/) on PyPI and TestPyPI for your repository. This allows GitHub Actions to publish packages without API tokens.

## License
MIT