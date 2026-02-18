# Deployment Fix Guide

## Issue
CORS errors and 404 errors when connecting to backend on Render from Vercel frontend.

## Changes Made

### 1. Added CORS Package
- Added `cors` to backend dependencies
- Configured Express to use CORS middleware
- Set CORS origin based on `FRONTEND_URL` environment variable

### 2. Fixed Render Configuration
- Removed hardcoded `PORT` from `render.yaml` (Render assigns its own PORT)
- Added `FRONTEND_URL` environment variable for CORS configuration

### 3. Updated Server Configuration
- Added Express middleware for CORS and JSON parsing
- Updated Socket.io CORS to use `FRONTEND_URL`
- Fixed server startup log message

## Deployment Steps

### Step 1: Install Dependencies Locally (Optional)
```bash
cd backend
npm install
```

### Step 2: Update Backend on Render

1. **Commit and Push Changes:**
   ```bash
   git add .
   git commit -m "Fix CORS and deployment configuration"
   git push origin main
   ```

2. **Update Render Environment Variables:**
   - Go to your Render dashboard: https://dashboard.render.com
   - Select your `locker-room` service
   - Go to "Environment" tab
   - Add/Update these variables:
     - `MONGODB_URI`: Your MongoDB connection string (MongoDB Atlas recommended)
     - `FRONTEND_URL`: `https://locker-room-frontend.vercel.app`
   - **Important:** Remove `PORT` if it exists (Render sets this automatically)
   - Click "Save Changes"

3. **Redeploy:**
   - Render should auto-deploy after you push
   - Or manually trigger: Click "Manual Deploy" → "Deploy latest commit"
   - Wait for deployment to complete (check logs)

### Step 3: Update Frontend on Vercel

1. **Update Environment Variable:**
   - Go to Vercel dashboard: https://vercel.com/dashboard
   - Select your `locker-room-frontend` project
   - Go to "Settings" → "Environment Variables"
   - Add/Update:
     - `VITE_BACKEND_URL`: `https://locker-room-fyfs.onrender.com`
   - Save

2. **Redeploy Frontend:**
   ```bash
   cd frontend
   git push origin main
   ```
   - Or in Vercel dashboard: "Deployments" → Click "..." → "Redeploy"

### Step 4: Test the Application

1. Visit: `https://locker-room-frontend.vercel.app`
2. Open browser DevTools (F12) → Console
3. You should see successful Socket.io connection (no CORS errors)
4. Try logging in and chatting

## Environment Variables Summary

### Backend (Render)
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chat-app
FRONTEND_URL=https://locker-room-frontend.vercel.app
```

### Frontend (Vercel)
```
VITE_BACKEND_URL=https://locker-room-fyfs.onrender.com
```

## MongoDB Atlas Setup (If Not Done)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create free cluster (M0)
3. Create database user:
   - Database Access → Add New Database User
   - Set username and password
4. Whitelist all IPs:
   - Network Access → Add IP Address → `0.0.0.0/0` (Allow from anywhere)
5. Get connection string:
   - Clusters → Connect → Connect your application
   - Copy connection string
   - Replace `<password>` with your database user password
6. Add to Render environment variables as `MONGODB_URI`

## Troubleshooting

### Still Getting CORS Errors?
- Verify `FRONTEND_URL` is set correctly on Render
- Check Render logs: Dashboard → Logs (look for startup messages)
- Ensure no spaces or trailing slashes in URLs

### 404 Errors?
- Check Render service is running (should show green "Live")
- Visit `https://locker-room-fyfs.onrender.com/health` - should return `{"status":"ok"}`
- Check Render logs for errors

### Socket.io Not Connecting?
- Verify `VITE_BACKEND_URL` on Vercel matches your Render URL
- Clear browser cache and hard reload (Cmd+Shift+R / Ctrl+Shift+R)
- Check that Render service isn't sleeping (free tier sleeps after 15min inactivity)

### MongoDB Connection Failed?
- Verify connection string format in Render env vars
- Check MongoDB Atlas IP whitelist includes `0.0.0.0/0`
- Ensure password doesn't contain special characters (or URL encode them)

## Quick Test Commands

```bash
# Test backend health endpoint
curl https://locker-room-fyfs.onrender.com/health

# Should return: {"status":"ok","mongodb":"connected"}
```

## Notes

- **Render Free Tier:** Service sleeps after 15 minutes of inactivity. First request after sleep takes ~30 seconds to wake up.
- **CORS Security:** For production, set `FRONTEND_URL` to exact frontend URL instead of `*`
- **MongoDB Local:** Not recommended for production - use MongoDB Atlas

---

**After following these steps, your chat app should work without CORS errors! 🎉**
