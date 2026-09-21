# 🚀 Deployment Guide

## Prerequisites
1. Install Vercel CLI: `npm i -g vercel`
2. Login to Vercel: `vercel login`

## Deploy All Projects
Run this command in the root folder:
```bash
./deploy-all.sh
```

## Deploy Individual Projects
Go into the project folder:
```bash
cd apex-intelligence-platform
vercel deploy --prod
```

## Access Your Apps
After deployment, Vercel will give you live URLs.
- `apex-intelligence-platform` → `apex-intelligence-platform.vercel.app`
- `voltix-home` → `voltix-home.vercel.app`
- `interview-prep` → `interview-prep.vercel.app`
- `scarpper` → `scarpper.vercel.app`
- `portfolio` → `portfolio.vercel.app`
- etc.

## Custom Domains (Optional)
In Vercel Dashboard → Project → Settings → Domains → Add your domain.
