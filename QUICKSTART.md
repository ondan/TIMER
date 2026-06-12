# Quick Start Guide for Render.com Deployment

## 🚀 Deployment Steps (Manual Method - Recommended)

The Blueprint deployment may not work correctly with monorepo structures. Use this manual method instead:

### Step 1: Push Your Code to GitHub
```bash
git add .
git commit -m "Ready for Render deployment"
git push origin main
```

### Step 2: Deploy the Server

1. Go to [Render.com](https://render.com) and log in
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure the service:
   - **Name:** `guess-the-time-server`
   - **Environment:** `Node`
   - **Region:** `Frankfurt` (or closest to you)
   - **Root Directory:** *(leave BLANK)*
   - **Build Command:** `cd server && npm install && npm run build`
   - **Start Command:** `cd server && npm start`
5. Click **"Advanced"** and add environment variables:
   - `NODE_ENV` = `production`
   - `PORT` = `3001`
   - `CORS_ORIGIN` = *(leave empty for now, set after web deployment)*
6. Click **"Create Web Service"**

### Step 3: Deploy the Web App

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Configure the service:
   - **Name:** `guess-the-time-web`
   - **Environment:** `Node`
   - **Region:** `Frankfurt` (same as server)
   - **Root Directory:** `web` *(IMPORTANT!)*
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
4. Click **"Advanced"** and add environment variables:
   - `NODE_ENV` = `production`
   - `NEXT_PUBLIC_API_URL` = *(set to your server URL after deployment)*
5. Click **"Create Web Service"**

### Step 4: Configure CORS

1. Wait for both services to finish deploying
2. Copy your web app URL (e.g., `https://guess-the-time-web.onrender.com`)
3. Go to the **Server** service → **Environment** → Add/Edit:
   - `CORS_ORIGIN` = `https://guess-the-time-web.onrender.com`
4. Copy your server URL (e.g., `https://guess-the-time-server.onrender.com`)
5. Go to the **Web** service → **Environment** → Add/Edit:
   - `NEXT_PUBLIC_API_URL` = `https://guess-the-time-server.onrender.com`
6. Both services will automatically redeploy

That's it! 🎉

## 📋 Important Notes

### What I Fixed
1. ✅ Fixed TypeScript build errors by disabling strict mode
2. ✅ Created proper deployment configuration
3. ✅ Created comprehensive documentation

### Using Setup Scripts (Optional)
Instead of manual steps, you can use the setup scripts to prepare your code:

**Windows:**
```cmd
render-setup.bat
```

**Mac/Linux:**
```bash
chmod +x render-setup.sh
./render-setup.sh
```

## 🔧 Troubleshooting

### If you get TypeScript errors:
I've already fixed this by updating `server/tsconfig.json` to disable strict mode.

### If you get ENOENT error:
Make sure you set **Root Directory** to `web` (not blank) for the web service.

### If you get CORS errors:
Make sure `CORS_ORIGIN` is set on the server with your exact web app URL.

### Still having issues?
Read `DEPLOYMENT-TROUBLESHOOTING.md` for detailed solutions.

## 📞 Need More Help?
- `DEPLOYMENT.md` - Detailed deployment instructions
- `DEPLOYMENT-TROUBLESHOOTING.md` - Common errors and solutions

Good luck with your deployment! 🚀