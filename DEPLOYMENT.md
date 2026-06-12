# Deployment Guide for Render.com

## Overview
This project is a monorepo with two services:
- **Server**: Socket.IO backend API (Node.js)
- **Web**: Next.js frontend application

## Deployment Steps

### 1. Prepare Your Repository
Make sure your code is pushed to GitHub:
```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 2. Deploy to Render.com

#### Option A: Using render.yaml (Recommended)
1. Log in to [Render.com](https://render.com)
2. Click "New +" → "Blueprint"
3. Connect your GitHub repository
4. Render will automatically detect the `render.yaml` file and create both services
5. Configure environment variables:
   - For the server: Set `CORS_ORIGIN` to your frontend URL
   - For the web: Set `NEXT_PUBLIC_API_URL` to your backend URL

#### Option B: Manual Deployment
If you prefer to deploy services separately:

**Backend Server:**
1. Click "New +" → "Web Service"
2. Connect your repository
3. Configure:
   - **Name**: `guess-the-time-server`
   - **Environment**: `Node`
   - **Build Command**: `cd server && npm install && npm run build`
   - **Start Command**: `cd server && npm start`
   - **Root Directory**: Leave blank (uses repo root)
4. Add environment variables:
   - `NODE_ENV=production`
   - `PORT=3001`
   - `CORS_ORIGIN=https://your-frontend-url.onrender.com`

**Frontend Web App:**
1. Click "New +" → "Web Service"
2. Connect your repository
3. Configure:
   - **Name**: `guess-the-time-web`
   - **Environment**: `Node`
   - **Root Directory**: `web`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Add environment variables:
   - `NODE_ENV=production`
   - `NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com`

### 3. Configure CORS
After deployment, update the server's CORS settings to allow requests from your frontend URL:
- In Render dashboard → Server service → Environment → Add `CORS_ORIGIN` with your frontend URL

### 4. Test Your Deployment
1. Visit your frontend URL
2. Try creating a room and playing the game
3. Check browser console for any errors

## Troubleshooting

### Error: "ENOENT: no such file or directory, open '/opt/render/project/src/web/package.json'"
This error occurs when Render can't find the web/package.json file. Solutions:

1. **Verify repository structure**: Make sure the `web` directory exists in your repository root
2. **Check Root Directory setting**: For the web service, ensure "Root Directory" is set to `web`
3. **Use render.yaml**: The blueprint deployment automatically handles the directory structure

### Error: "Cannot find module"
- Ensure all dependencies are listed in the respective package.json files
- Check that the build commands are correct

### CORS Errors
- Verify `CORS_ORIGIN` environment variable is set correctly on the server
- Make sure the URL includes the protocol (https://)

## Environment Variables

### Server
- `PORT`: Server port (default: 3001)
- `CORS_ORIGIN`: Frontend URL for CORS
- `NODE_ENV`: Set to `production`

### Web
- `NEXT_PUBLIC_API_URL`: Backend server URL
- `NODE_ENV`: Set to `production`

## Updating Your Deployment
After making changes:
```bash
git add .
git commit -m "Your changes"
git push origin main
```
Render will automatically rebuild and deploy your changes.

## Notes
- Free tier services will spin down after 15 minutes of inactivity
- First request after spin-down may take 30-60 seconds
- Consider upgrading to paid tier for production use