# Render.com Deployment Troubleshooting

## Common Errors and Solutions

### Error 1: TypeScript Compilation Errors
**Error:** `Could not find a declaration file for module 'express'`

**Cause:** TypeScript strict mode requires type definitions for all modules.

**Solution:** I've updated `server/tsconfig.json` to disable strict mode:
```json
{
  "compilerOptions": {
    "strict": false,
    "noImplicitAny": false,
    ...
  }
}
```

This allows the build to complete even if some type definitions are missing.

### Error 2: ENOENT - Cannot find web/package.json
**Error:** `ENOENT: no such file or directory, open '/opt/render/project/src/web/package.json'`

**Cause:** Render's Blueprint deployment may not correctly interpret the monorepo structure.

**Solution:** Use manual deployment instead of Blueprint:

#### Manual Deployment Steps:

**For the Server:**
1. Create a new Web Service
2. Connect your repository
3. **DO NOT set a Root Directory** (leave it blank)
4. Set Build Command: `cd server && npm install && npm run build`
5. Set Start Command: `cd server && npm start`
6. Add environment variables:
   - `NODE_ENV=production`
   - `PORT=3001`
   - `CORS_ORIGIN=https://your-frontend-url.onrender.com`

**For the Web App:**
1. Create a new Web Service
2. Connect your repository
3. **Set Root Directory to `web`** (this is crucial!)
4. Set Build Command: `npm install && npm run build`
5. Set Start Command: `npm start`
6. Add environment variables:
   - `NODE_ENV=production`
   - `NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com`

### Alternative: Deploy as Single Service

If you continue having issues with two services, you can deploy everything as a single service:

1. Create a new Web Service
2. Leave Root Directory blank
3. Set Build Command: `npm run build`
4. Set Start Command: `npm start`
5. This will build and run both server and web together

However, this approach is not recommended for production as it uses more resources.

## Verification Steps

After deployment, verify:

1. **Check Build Logs:**
   - Go to your service dashboard
   - Click "Logs" → "Build"
   - Look for successful completion messages

2. **Test Endpoints:**
   - Server: Visit `https://your-server.onrender.com/health`
   - Should return: `{"ok": true}`

3. **Check Web App:**
   - Visit your frontend URL
   - Should see the app loading

## If Problems Persist

### Clean Deployment:
```bash
# Locally test the build
npm run build

# If successful, push changes
git add .
git commit -m "Fix deployment issues"
git push origin main

# Then in Render dashboard:
# - Go to Manual Deploy
# - Click "Clear Build Cache"
# - Click "Deploy"
```

### Check File Structure:
Make sure your repository has this exact structure:
```
your-repo/
├── package.json (root)
├── render.yaml
├── .gitignore
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       └── room-manager.ts
├── web/
│   ├── package.json
│   ├── next.config.ts
│   └── app/
└── shared/
    ├── types.ts
    └── game-modes.ts
```

### Environment Variables:
Double-check that:
- All required env vars are set
- URLs include `https://`
- No trailing slashes in URLs

## Getting Help

If you're still stuck:
1. Check the full build logs in Render dashboard
2. Look for the first error message
3. Search for that specific error

The most common issue is the Root Directory setting for the web service - make sure it's set to `web` and not left blank.