# Shipnavi3PL Database - Render Deployment Guide

This guide will help you deploy your Shipnavi3PL Database application on Render.com.

## Prerequisites

- Render.com account (you already have this)
- Git repository (GitHub, GitLab, or Bitbucket)
- Basic understanding of Git

## Deployment Steps

### Step 1: Prepare Your Repository

1. **Initialize Git repository** (if not already done):
   ```bash
   cd client-database-system
   git init
   git add .
   git commit -m "Initial commit - Shipnavi3PL Database"
   ```

2. **Create GitHub repository**:
   - Go to GitHub.com and create a new repository
   - Name it `shipnavi3pl-database` (or your preferred name)
   - Don't initialize with README (we already have one)

3. **Push to GitHub**:
   ```bash
   git remote add origin https://github.com/yourusername/shipnavi3pl-database.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Deploy Backend on Render

1. **Connect GitHub to Render**:
   - Go to [dashboard.render.com](https://dashboard.render.com)
   - Click "New" → "Web Service"
   - Connect your GitHub account
   - Select your `shipnavi3pl-database` repository

2. **Configure Backend Service**:
   - **Name**: `shipnavi3pl-backend`
   - **Branch**: `main`
   - **Runtime**: Node.js
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
   - **Region**: Choose closest to your users

3. **Environment Variables**:
   - `NODE_VERSION`: `18`
   - `PORT`: `10000`
   - `JWT_SECRET`: (Generate a secure random string)
   - `ADMIN_EMAIL`: `admin@yourdomain.com`
   - `CLIENT_URL`: `https://shipnavi3pl-frontend.onrender.com`

4. **Database Setup**:
   - In Render dashboard, click "New" → "PostgreSQL"
   - **Name**: `shipnavi3pl-db`
   - **Plan**: Free (for testing) or choose appropriate plan
   - **Region**: Same as backend service

5. **Connect Database to Backend**:
   - In your backend service settings, add these environment variables:
     - `DB_HOST`: (from database connection string)
     - `DB_NAME`: (from database connection string)
     - `DB_USER`: (from database connection string)
     - `DB_PASSWORD`: (from database connection string)

6. **Deploy Backend**:
   - Click "Create Web Service"
   - Render will automatically deploy your backend
   - Wait for deployment to complete (5-10 minutes)

### Step 3: Deploy Frontend on Render

1. **Create Frontend Service**:
   - Click "New" → "Static Site"
   - Connect to the same GitHub repository
   - Select the `frontend` directory

2. **Configure Frontend**:
   - **Name**: `shipnavi3pl-frontend`
   - **Branch**: `main`
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
   - **Environment**: Static Site

3. **Environment Variables**:
   - `VITE_API_URL`: `https://shipnavi3pl-backend.onrender.com/api`

4. **Deploy Frontend**:
   - Click "Create Static Site"
   - Wait for deployment to complete

### Step 4: Database Initialization

1. **Access Database**:
   - In Render dashboard, go to your PostgreSQL database
   - Click "Connect" to get connection details

2. **Run Database Schema**:
   - Use a PostgreSQL client (like pgAdmin, DBeaver, or psql)
   - Connect to your Render database
   - Run the SQL from `backend/src/database/schema.sql`

3. **Test Database Connection**:
   - The backend should automatically connect and run migrations
   - Check backend logs in Render dashboard for any errors

### Step 5: Configure CORS and Security

1. **Update Backend Environment**:
   - In backend service settings, update `CLIENT_URL` to your actual frontend URL
   - Example: `https://shipnavi3pl-frontend.onrender.com`

2. **Test the Application**:
   - Visit your frontend URL
   - Test registration, login, and basic functionality
   - Check browser console for any CORS errors

## Post-Deployment Configuration

### Environment Variables to Update

**Backend Service**:
```bash
NODE_VERSION=18
PORT=10000
DB_HOST=your-database-host
DB_NAME=your-database-name
DB_USER=your-database-user
DB_PASSWORD=your-database-password
JWT_SECRET=your-secure-jwt-secret
ADMIN_EMAIL=admin@yourdomain.com
CLIENT_URL=https://your-frontend-url.onrender.com
```

**Frontend Service**:
```bash
VITE_API_URL=https://your-backend-url.onrender.com/api
```

### Monitoring and Logs

1. **View Logs**:
   - In Render dashboard, go to your services
   - Click "Logs" to view real-time logs
   - Monitor for errors and performance issues

2. **Health Checks**:
   - Backend health check: `https://your-backend-url.onrender.com/api/health`
   - Should return: `{"status":"ok","message":"Shipnavi3PL Database API is running","timestamp":"..."}`

### Common Issues and Solutions

1. **CORS Errors**:
   - Ensure `CLIENT_URL` is correctly set in backend
   - Check frontend `VITE_API_URL` points to correct backend URL

2. **Database Connection Errors**:
   - Verify database credentials in environment variables
   - Check database connection string format
   - Ensure database is running and accessible

3. **Build Failures**:
   - Check Node.js version compatibility
   - Verify all dependencies are in package.json
   - Check build logs for specific error messages

4. **File Upload Issues**:
   - Render's free plan has ephemeral storage
   - Consider using cloud storage (AWS S3, Cloudinary) for production
   - For testing, files will persist during deployment but may be lost

## Production Considerations

### For Production Deployment

1. **Upgrade Plans**:
   - Free plans have limitations (sleeping services, limited resources)
   - Consider upgrading to paid plans for production use

2. **Custom Domain**:
   - Add custom domain in Render dashboard
   - Configure SSL certificates (Render provides free SSL)

3. **Backup Strategy**:
   - Set up automated database backups
   - Consider application data backup solutions

4. **Monitoring**:
   - Set up monitoring and alerting
   - Monitor response times and error rates

5. **Security**:
   - Use strong JWT secrets
   - Regularly update dependencies
   - Implement proper input validation

## Testing Your Deployment

1. **Frontend Test**:
   - Visit: `https://shipnavi3pl-frontend.onrender.com`
   - Test registration and login
   - Verify all pages load correctly

2. **Backend Test**:
   - Visit: `https://shipnavi3pl-backend.onrender.com/api/health`
   - Test API endpoints with tools like Postman

3. **Integration Test**:
   - Register a new client
   - Upload test photos
   - Verify CSV import functionality

## Support

If you encounter issues:

1. **Check Render Logs**: Most issues are visible in service logs
2. **Verify Environment Variables**: Double-check all configuration
3. **Test Database Connection**: Ensure database is accessible
4. **Review CORS Settings**: Common issue with frontend-backend communication

## Estimated Costs

- **Free Plan**: $0/month (sleeping services, limited resources)
- **Starter Plan**: ~$7/month (always-on services)
- **Standard Plan**: ~$25/month (production-ready)

## Next Steps

1. Set up custom domain (optional)
2. Configure SSL certificates
3. Set up monitoring and alerting
4. Implement backup strategies
5. Consider scaling options for high traffic

Your Shipnavi3PL Database should now be live and accessible! 🎉