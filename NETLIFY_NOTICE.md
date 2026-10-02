# Netlify Configuration Instructions

## ⚠️ Important Notice

This project is a **Node.js/Express backend server** and **CANNOT run fully on Netlify**. Netlify only hosts static files (HTML, CSS, JavaScript).

The `netlify.toml` configuration will deploy a **static landing page only** that explains the project and provides links.

## Steps to Fix Netlify Deployment

### Option 1: Update Netlify Settings (Show Landing Page Only)

1. Go to your Netlify dashboard
2. Select your site
3. Go to **Site settings** → **Build & deploy** → **Build settings**
4. Update the following:
   - **Build command**: `echo 'Serving static files only'`
   - **Publish directory**: `public`
5. Click **Save**
6. Go to **Deploys** tab
7. Click **Trigger deploy** → **Clear cache and deploy**

The site will now show a landing page explaining that the full app needs to be deployed elsewhere.

### Option 2: Delete Netlify Site and Deploy to Render (Recommended)

1. **Delete the Netlify site**:
   - Go to Netlify dashboard
   - Select your site
   - Site settings → General → Scroll down
   - Click "Delete this site"

2. **Deploy to Render** (supports Node.js):
   - Go to https://render.com
   - Sign up/login with GitHub
   - Click "New +" → "Web Service"
   - Select `School_Management_System` repository
   - Render will auto-detect the `render.yaml` configuration
   - Add environment variable:
     - Key: `MONGODB_URI`
     - Value: `mongodb+srv://your-connection-string` (from MongoDB Atlas)
   - Click "Create Web Service"
   - Wait ~5 minutes for deployment

3. **Set up MongoDB Atlas** (if you haven't):
   - Go to https://www.mongodb.com/cloud/atlas
   - Create free account
   - Create a free cluster (M0)
   - Create database user (username/password)
   - Network Access → Add IP: `0.0.0.0/0` (allow all)
   - Get connection string:
     - Click "Connect" on your cluster
     - Choose "Connect your application"
     - Copy the connection string
     - Replace `<password>` with your database user password

## What Each Platform Does

| Platform | Purpose | Works? |
|----------|---------|--------|
| **Netlify** | Static sites (HTML/CSS/JS only) | ❌ Cannot run Node.js server |
| **Render** | Backend apps (Node.js, Python, etc.) | ✅ Perfect for this project |
| **Railway** | Backend apps + databases | ✅ Alternative to Render |
| **Heroku** | Backend apps (now paid only) | ✅ Works but costs money |

## Full Project Structure

```
School_Management_System/
├── server.js              ← Node.js server (needs Render/Railway)
├── routes/                ← Backend routes
├── models/                ← MongoDB models
├── views/                 ← EJS templates (server-rendered)
├── public/                ← Static files (CSS, JS, images)
│   └── netlify-landing.html ← What Netlify can serve
└── StudentApp/            ← React Native mobile app (for app stores)
```

## Why Netlify Won't Work

Netlify can only serve files from the `public/` folder. It cannot:
- ❌ Run `server.js` (Express backend)
- ❌ Connect to MongoDB
- ❌ Handle authentication sessions
- ❌ Render EJS templates
- ❌ Process form submissions on the server

You **must** use a Node.js hosting platform like Render or Railway.

## Need Help?

See `DEPLOYMENT.md` for complete step-by-step deployment instructions for Render.
