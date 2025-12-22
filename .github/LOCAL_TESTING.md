# Local Workflow Testing with `act`

You can simulate GitHub Actions workflows locally using [act](https://github.com/nektos/act). This allows you to test your CI/CD pipelines without pushing to GitHub.

## 🛠️ Installation

### macOS (Homebrew)

```bash
brew install act
```

### Docker Requirement

`act` requires [Docker Desktop](https://www.docker.com/products/docker-desktop) to be installed and running.

## 🚀 Running Workflows Locally

### Test the Release Workflow

To simulate the release workflow (build, test, version bump logic) without actually pushing or releasing:

```bash
# Run the release workflow
act push -j release
```

### What Happens Locally?

The `release.yml` workflow has been modified to detect when it's running in `act`. When running locally:

1. **Build & Test**: Runs normally (lint, type check, build).
2. **Version Bump**: Calculates the new version but **skips the git push**.
3. **Release**: Skips creating the GitHub Release.
4. **Deploy**: Skips deploying to GitHub Pages.

This allows you to verify:

- ✅ Build passes
- ✅ Tests pass
- ✅ Version bump logic works (it will print "Would have pushed changes")
- ✅ Changelog generation works

### Common Commands

```bash
# List available workflows
act -l

# Run a specific job
act -j build

# Run with a specific event
act pull_request

# Run with verbose logging (for debugging)
act -v
```

## ⚠️ Limitations

- **Secrets**: If your workflow uses secrets, you need to provide them via `--secret-file` or command line.
- **GitHub Token**: `act` uses a default token. For actions requiring specific permissions, you might need to provide a real token.
- **Artifacts**: Artifact uploads/downloads are simulated locally.

## 🔧 Troubleshooting

**"Docker not running"**
Ensure Docker Desktop is started.

**"Error: specific action not found"**
`act` tries to download actions. If it fails, check your internet connection or try running with `-P ubuntu-latest=node:16-buster-slim` (or similar image).
