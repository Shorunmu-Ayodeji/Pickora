# Backend Setup Guide for Pickora

This guide explains how to set up the backend for Pickora to enable cross-device result sharing.

## Current Setup

The app now includes Vercel serverless functions in the `/api` folder:
- `api/results/[id].js` - Stores and retrieves raffle results
- `api/analytics.js` - Provides analytics data

## Option 1: Using Vercel KV (Recommended)

Vercel KV is a Redis-based key-value store that works seamlessly with Vercel.

### Setup Steps:

1. **Install Vercel KV package:**
   ```bash
   npm install @vercel/kv
   ```

2. **Create a Vercel KV database:**
   - Go to your Vercel dashboard
   - Navigate to your project
   - Go to "Storage" tab
   - Click "Create Database" → Select "KV"
   - Follow the setup wizard

3. **Link KV to your project:**
   - The KV database will automatically be linked
   - Environment variables will be set automatically

4. **Deploy:**
   ```bash
   vercel deploy
   ```

The API functions will automatically use Vercel KV once it's configured.

## Option 2: Using Alternative Database

If you prefer a different database, you can modify the API functions:

### Using Upstash Redis (Free tier available):

1. **Sign up at [upstash.com](https://upstash.com)**
2. **Create a Redis database**
3. **Install the client:**
   ```bash
   npm install @upstash/redis
   ```
4. **Update `api/results/[id].js`:**
   ```javascript
   import { Redis } from '@upstash/redis'
   const redis = new Redis({
     url: process.env.UPSTASH_REDIS_REST_URL,
     token: process.env.UPSTASH_REDIS_REST_TOKEN,
   })
   ```
5. **Add environment variables in Vercel:**
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### Using MongoDB Atlas (Free tier available):

1. **Sign up at [mongodb.com/atlas](https://www.mongodb.com/atlas)**
2. **Create a free cluster**
3. **Get connection string**
4. **Install MongoDB client:**
   ```bash
   npm install mongodb
   ```
5. **Update API functions to use MongoDB**

## Option 3: Fallback Mode (Development Only)

The current implementation includes a fallback that uses in-memory storage. This works for development but **results are not persistent** and will be lost when the server restarts.

**This is NOT suitable for production!**

## Testing the Backend

1. **Start local development:**
   ```bash
   npm run dev
   ```

2. **Test storing a result:**
   - Create a raffle
   - Check browser console for API calls
   - Verify result is stored

3. **Test retrieving a result:**
   - Copy the result link
   - Open in incognito/another browser
   - Verify the result loads

## Environment Variables

If using Vercel KV, no environment variables are needed (auto-configured).

If using a custom database, add these in Vercel dashboard:
- Settings → Environment Variables
- Add your database connection variables

## Deployment

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Add backend API"
   git push
   ```

2. **Deploy on Vercel:**
   - Vercel will automatically detect the `/api` folder
   - Serverless functions will be deployed automatically

3. **Configure database:**
   - Follow Option 1, 2, or 3 above
   - Test the deployment

## Troubleshooting

### Results not saving?
- Check browser console for errors
- Verify API endpoint is accessible
- Check Vercel function logs

### Results not loading on other devices?
- Ensure database is properly configured
- Check CORS settings
- Verify environment variables are set

### Analytics not working?
- Analytics require a database (KV or alternative)
- Check that analytics endpoint is accessible

## Next Steps

Once the backend is set up:
1. Results will be shareable across devices
2. Analytics will track usage globally
3. Results will persist (not just in browser)

For production, we strongly recommend using **Vercel KV** or a similar persistent database solution.

