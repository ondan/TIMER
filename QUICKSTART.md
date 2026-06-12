# Quick Start Guide for Render.com Deployment

## 🚀 Quick Deployment (3 Steps)

### 1. Push Your Code to GitHub
```bash
git add .
git commit -m "Ready for Render deployment"
git push origin main
```

### 2. Deploy Using Blueprint
1. Go to [Render.com](https://render.com) and log in
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub repository
4. Render will automatically create both services (server + web)

### 3. Configure Environment Variables
After deployment, set these variables in the Render dashboard:

**For the Server service:**
- `CORS_ORIGIN`: `https://your-web-app.onrender.com`

**For the Web service:**
- `NEXT_PUBLIC_API_URL`: `https://your-server-app.onrender.com`

That's it! 🎉

## 📋 Important Notes

### The Error You Had
The error `ENOENT: no such file or directory, open '/opt/render/project/src/web/package.json'` happened because Render couldn't find your web app's package.json. 

**Solution**: I've created a `render.yaml` file that tells Render exactly how to deploy your monorepo structure.

### What I Fixed
1. ✅ Created `render.yaml` - Blueprint configuration for automatic deployment
2. ✅ Created `DEPLOYMENT.md` - Detailed deployment instructions
3. ✅ Created `.gitignore` - Prevents unnecessary files from being deployed
4. ✅ Created setup scripts for easy deployment

### Using Setup Scripts (Optional)
Instead of manual steps, you can use the setup scripts:

**Windows:**
```cmd
render-setup.bat
```

**Mac/Linux:**
```bash
chmod +x render-setup.sh
./render-setup.sh
```

These scripts will:
- Test both builds locally
- Commit your changes
- Push to GitHub
- Give you next steps

## 🔧 Troubleshooting

### If you still get the ENOENT error:
1. Make sure you're using the **Blueprint** deployment method (not manual)
2. Verify `render.yaml` is in your repository root
3. Check that your GitHub repository has the correct structure:
   ```
   your-repo/
   ├── render.yaml
   ├── package.json
   ├── server/
   │   └── package.json
   └── web/
       └── package.json
   ```

### Build Failures:
- Test builds locally first: `npm run build`
- Check that all dependencies are installed

### CORS Errors After Deployment:
- Make sure `CORS_ORIGIN` is set on the server
- URL must include `https://`

## 📞 Need Help?
Read the full instructions in `DEPLOYMENT.md` for detailed troubleshooting and configuration options.

Good luck with your deployment! 🚀