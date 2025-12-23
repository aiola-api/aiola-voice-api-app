# Quick Release Reference

## 🚀 Create a Release (1 Step)

### 1. Push to Main

```bash
git push origin main
```

**That's it!** The workflow automatically:

- ✅ **Bumps version** (patch/minor/major)
- ✅ **Commits & Tags**
- ✅ **Releases** to GitHub
- ✅ **Deploys** to Pages

**Version Bump Logic**:

- `BREAKING CHANGE` → Major
- `feat:` → Minor
- Default → Patch

## ✅ What Happens Automatically

1. ✅ Linting and type checking
2. ✅ Production build
3. ✅ GitHub Release creation with changelog
4. ✅ Build artifacts uploaded
5. ✅ Deployment to GitHub Pages (with approval)

## 📍 Useful Links

- [Full Release Documentation](./.github/RELEASE.md)
- [GitHub Actions](../../actions)
- [Releases](../../releases)
- [Live Demo](https://[username].github.io/aiola-voice-api-app/)

## 🔧 Troubleshooting

**Release not triggering?**

- Ensure you pushed to `main` branch
- Check GitHub Actions tab for workflow status

**Need to skip CI?**

```bash
git commit -m "chore: update docs [skip ci]"
```

**Manual release?**
Go to Actions → Release → Run workflow
