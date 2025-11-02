# 🚀 Convex Auto-Deploy Setup Guide

This repository now has automatic Convex backend deployment configured via GitHub Actions.

## 📋 Prerequisites

Before the automatic deployment works, you need to configure the `CONVEX_DEPLOY_KEY` secret in GitHub.

## 🔧 Setup Instructions

### Step 1: Get your Convex Deploy Key

1. Go to [Convex Dashboard](https://dashboard.convex.dev)
2. Select your project: **vibe-most-wanted**
3. Click on the **Settings** tab
4. Go to **Deploy Keys** section
5. Click **Generate Deploy Key**
6. Copy the generated key (it looks like: `prod:scintillating-crane-430|...`)

### Step 2: Add the secret to GitHub

1. Go to your GitHub repository: https://github.com/JVHBO/vibe-most-wanted
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Set:
   - Name: `CONVEX_DEPLOY_KEY`
   - Secret: Paste the deploy key you copied from Convex
6. Click **Add secret**

### Step 3: Test the deployment

You can trigger a deployment in two ways:

**Option A: Push to main (automatic)**
```bash
git push origin main
```
The workflow will automatically run when changes are detected in `convex/**` folder.

**Option B: Manual trigger**
1. Go to **Actions** tab in GitHub
2. Click on **Deploy Convex Backend** workflow
3. Click **Run workflow**
4. Select branch `main`
5. Click **Run workflow**

## 🎯 What gets deployed automatically

- ✅ All Convex functions (`convex/*.ts`)
- ✅ Schema changes (`convex/schema.ts`)
- ✅ Backend mutations and queries
- ✅ Runs Next.js build to ensure everything compiles

## 🔍 Monitoring deployments

- Check deployment status in the **Actions** tab
- Each deployment takes ~2-3 minutes
- You'll see a ✅ green checkmark when successful
- You'll see a ❌ red X if it fails

## ⚠️ Important Notes

1. **Never commit the `CONVEX_DEPLOY_KEY` to the repository**
2. The key should only be stored in GitHub Secrets
3. If you ever need to regenerate the key, update it in GitHub Secrets too
4. The deployment runs on every push to `main` that affects `convex/` files

## 🐛 Troubleshooting

**Workflow fails with "CONVEX_DEPLOY_KEY not found"**
→ Make sure you added the secret correctly in GitHub Settings

**Deployment fails but no error shown**
→ Check the Convex Dashboard for deployment logs

**Changes not showing up in production**
→ Wait 2-3 minutes for deployment to complete, then hard refresh your browser

## 📚 Learn More

- [Convex Deployment Documentation](https://docs.convex.dev/production/hosting)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
