# Deployment Guide

## Important: Platform Choice

This is a **Node.js/Express backend application** with EJS templates. It cannot be deployed to Netlify as a static site.

## Recommended Deployment Platforms

### Option 1: Render (Recommended - Free Tier Available)

1. Go to [render.com](https://render.com)
2. Sign up with your GitHub account
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Render will auto-detect `render.yaml` configuration
6. Set environment variables:
   - `MONGODB_URI`: Your MongoDB connection string (use MongoDB Atlas free tier)
   - `SESSION_SECRET`: Will be auto-generated
7. Click "Create Web Service"

**MongoDB Atlas Setup:**
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create free cluster
3. Create database user
4. Whitelist IP: `0.0.0.0/0` (allow all - Render uses dynamic IPs)
5. Get connection string and add to Render environment variables

### Option 2: Railway (Free Tier Available)

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Add environment variables:
   - `MONGODB_URI`
   - `SESSION_SECRET`
   - `PORT` (Railway auto-provides this)
6. Deploy

### Option 3: Heroku (Paid)

1. Install Heroku CLI
2. Run:
   ```bash
   heroku login
   heroku create your-school-app
   heroku config:set MONGODB_URI=your_mongodb_connection_string
   heroku config:set SESSION_SECRET=your_random_secret
   git push heroku main
   ```

## Why Not Netlify?

- **Netlify** is for static sites (HTML/CSS/JS) or JAMstack apps
- This project is a **dynamic Node.js server** that:
  - Runs Express.js
  - Uses MongoDB
  - Renders EJS templates server-side
  - Handles sessions and authentication
  
- If you want to use Netlify, you would need to:
  1. Deploy backend to Render/Railway
  2. Convert frontend to static site (major refactor)
  3. Use Netlify Functions for API endpoints

## Mobile App Deployment

The `StudentApp` folder is a **React Native mobile app** for iOS/Android:
- **Not meant for web deployment**
- Deploy to app stores:
  - Google Play Store (Android)
  - Apple App Store (iOS)
- Or use Expo's build service: `eas build`

## Quick Start (Render)

1. Create MongoDB Atlas account and cluster (free)
2. Get connection string
3. Push code to GitHub ✅ (Already done)
4. Sign up on Render with GitHub
5. Create new Web Service from your repo
6. Add `MONGODB_URI` environment variable
7. Deploy!

## Environment Variables Needed

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/school_db
SESSION_SECRET=your-random-secret-key-here
PORT=3000
NODE_ENV=production
```
