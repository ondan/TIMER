# Quick Start Guide for Render.com Deployment

## 🚀 Deployment Steps (Single Service - Easiest Method)

This is the simplest way to deploy your monorepo to Render.com. Everything runs in one service.

### Step 1: Push Your Code to GitHub
```bash
git add .
git commit -m "Ready for Render deployment"
git push origin main
```

### Step 2: Deploy to Render

1. Go to [Render.com](https://render.com) and log in
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure the service:
   - **Name:** `guess-the-time`
   - **Environment:** `Node`
   - **Region:** `Frankfurt` (or closest to you)
   - **Root Directory:** *(leave BLANK)*
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
5. Click **"Advanced"** and add environment variables:
   - `NODE_ENV` = `production`
   - `PORT` = `3001`
   - `CORS_ORIGIN` = *(set to your app URL after deployment)*
   - `NEXT_PUBLIC_API_URL` = *(set to your app URL after deployment)*
6. Click **"Create Web Service"**

### Step 3: Configure URLs (After Deployment)

1. Wait for the service to finish deploying
2. Copy your app URL (e.g., `https://guess-the-time.onrender.com`)
3. Go to the service → **Environment** → Add/Edit:
   - `CORS_ORIGIN` = `https://guess-the-time.onrender.com`
   - `NEXT_PUBLIC_API_URL` = `https://guess-the-time.onrender.com`
4. The service will automatically redeploy

That's it! 🎉

## 📋 What This Does

- **Build:** Compiles both server (TypeScript) and web (Next.js)
- **Start:** Runs both server and web concurrently in one process
- **Single URL:** Both backend and frontend are accessible from the same URL

## 🔧 Troubleshooting

### If you get build errors:
Make sure `npm run build` works locally first:
```bash
npm install
npm run build
```

### If the service crashes:
Check the logs in Render dashboard → Logs → Default

### If you get CORS errors:
Make sure `CORS_ORIGIN` is set to your exact Render URL.

## 📞 Need More Help?
- `DEPLOYMENT-TROUBLESHOOTING.md` - Detailed troubleshooting
- `DEPLOYMENT.md` - Full deployment documentation

Good luck with your deployment! 🚀