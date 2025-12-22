# Release Process

This document describes the release process for the aiOla Voice API App using GitHub Actions workflows.

## 📋 Overview

The release process is automated using GitHub Actions with three main workflows:

- **CI Workflow** (`ci.yml`): Runs on PRs and commits to validate code quality
- **Release Workflow** (`release.yml`): Creates GitHub releases and deploys to GitHub Pages

## 🚀 Creating a New Release

### Prerequisites

- All changes merged to `main` branch
- CI checks passing
- Version number decided (following [Semantic Versioning](https://semver.org/))

### Release Steps

1. **Push Changes to Main**

   Simply merge your changes to the `main` branch (via Pull Request or direct push).

   ```bash
   git push origin main
   ```

   **That's it!** The release workflow will automatically:

   - **Determine version bump** (major/minor/patch) based on commit messages
   - **Bump version** in `package.json`
   - **Create commit & tag** (e.g., `v0.1.5`)
   - **Push changes** back to repo
   - **Create GitHub Release** with artifacts
   - **Deploy to GitHub Pages**

   **Version Bump Logic**:

   - `BREAKING CHANGE` in commit → **Major** bump
   - `feat:` in commit → **Minor** bump
   - Default → **Patch** bump

2. **Monitor Release Workflow**

   - Navigate to the [Actions tab](../../actions) in GitHub
   - Watch the "Release" workflow execute automatically
   - Verify all jobs complete successfully

3. **Verify Release**

   - Check [Releases page](../../releases) for new release
   - Download and verify build artifacts
   - Visit deployed site at `https://[username].github.io/aiola-voice-api-app/`

## 📦 Versioning Strategy

We follow [Semantic Versioning](https://semver.org/) (SemVer):

- **MAJOR** version (X.0.0): Breaking changes or major feature releases
- **MINOR** version (0.X.0): New features, backward compatible
- **PATCH** version (0.0.X): Bug fixes, backward compatible

### Examples

- `0.1.3 → 0.1.4`: Bug fix
- `0.1.4 → 0.2.0`: New feature (voice picker improvements)
- `0.2.0 → 1.0.0`: First stable release or breaking API changes

## 🔄 Workflows

### CI Workflow

**Triggers**: Pull requests and pushes to main/feature branches

**Jobs**:

- Lint: ESLint code quality checks
- Type Check: TypeScript compilation verification
- Build: Production build validation

**Purpose**: Ensure code quality before merging

### Release Workflow

**Triggers**:

- Push to `main` branch (automatic release on merge)
- Manual workflow dispatch

**Jobs**:

1. **Build and Test**: Lint, type check, and create production build
2. **Create GitHub Release**: Generate changelog, create git tag, and create release with artifacts
3. **Deploy to GitHub Pages**: Deploy build to GitHub Pages (requires manual approval)

**Outputs**:

- Automatic git tag creation (e.g., `v0.1.4`)
- GitHub Release with changelog
- Build artifacts (ZIP file)
- Deployed application on GitHub Pages

## 🛠️ Manual Release (Alternative)

You can also trigger a release manually from GitHub:

1. Go to [Actions tab](../../actions)
2. Select "Release" workflow
3. Click "Run workflow"
4. Enter version number (e.g., `0.1.4`)
5. Click "Run workflow" button

## 📝 Changelog Generation

The release workflow automatically generates a changelog from commit messages between releases. For better changelogs, use conventional commit messages:

```bash
feat: add new voice picker component
fix: resolve audio playback issue
docs: update README with new features
chore: bump dependencies
```

## 🔧 Troubleshooting

### Release Workflow Fails

1. **Check CI Status**: Ensure all CI checks pass before creating release
2. **Verify Version**: Ensure version in `package.json` matches tag
3. **Check Logs**: Review workflow logs in Actions tab for specific errors

### GitHub Pages Not Updating

1. **Check Deployment**: Verify deployment job completed successfully
2. **Clear Cache**: Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)
3. **Check Settings**: Ensure GitHub Pages is enabled in repository settings

### Tag Already Exists

```bash
# Delete local tag
git tag -d v0.1.4

# Delete remote tag
git push origin :refs/tags/v0.1.4

# Create new tag
git tag -a v0.1.4 -m "Release v0.1.4"
git push origin v0.1.4
```

## 🔐 Permissions

The workflows require the following permissions:

- `contents: write` - Create releases and push tags
- `pages: write` - Deploy to GitHub Pages
- `id-token: write` - GitHub Pages deployment authentication

These are configured in the workflow files and should work automatically.

## 🎯 Best Practices

1. **Test Before Release**: Always test changes locally before creating a release
2. **Meaningful Versions**: Use semantic versioning appropriately
3. **Clear Commit Messages**: Write descriptive commit messages for better changelogs
4. **Review Changes**: Review the diff before pushing tags
5. **Monitor Deployments**: Watch the workflow execution to catch issues early

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)

---

**Need Help?** Check the [Troubleshooting](#-troubleshooting) section or review workflow logs in the Actions tab.
