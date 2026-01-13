# Vercel Deployment Guide

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com) (free tier available)
2. **GitHub Repository**: Your code is already on GitHub at `https://github.com/jfdercksen/sa-shooting-comp`
3. **Supabase Project**: Make sure your Supabase project is set up and running

## Required Environment Variables

Your app needs these environment variables in Vercel:

### Supabase Configuration
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for API routes)

### How to Find Your Supabase Credentials

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel**
   - Visit [vercel.com](https://vercel.com)
   - Sign in with your GitHub account

2. **Import Project**
   - Click **"Add New..."** → **"Project"**
   - Select **"Import Git Repository"**
   - Find and select `jfdercksen/sa-shooting-comp`
   - Click **"Import"**

3. **Configure Project**
   - **Framework Preset**: Next.js (should auto-detect)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

4. **Add Environment Variables**
   - Click **"Environment Variables"**
   - Add each variable:
     - `NEXT_PUBLIC_SUPABASE_URL` = `your-supabase-url`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `your-anon-key`
     - `SUPABASE_SERVICE_ROLE_KEY` = `your-service-role-key`
   - Select **Production**, **Preview**, and **Development** for each
   - Click **"Save"**

5. **Deploy**
   - Click **"Deploy"**
   - Wait for build to complete (2-5 minutes)
   - Your app will be live at `https://sa-shooting-comp.vercel.app` (or custom domain)

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```
   - Follow the prompts
   - When asked for environment variables, add them interactively

4. **Deploy to Production**
   ```bash
   vercel --prod
   ```

## Post-Deployment Configuration

### 1. Update Supabase Auth Redirect URLs

After deployment, update your Supabase auth settings:

1. Go to Supabase Dashboard → **Authentication** → **URL Configuration**
2. Add your Vercel URL to **Redirect URLs**:
   - `https://your-app.vercel.app/auth/callback`
   - `https://your-app.vercel.app/**` (for all routes)

### 2. Set Up Custom Domain (Optional)

1. In Vercel dashboard, go to **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update Supabase redirect URLs with your custom domain

### 3. Verify Environment Variables

After deployment, verify variables are set:
- Go to Vercel Dashboard → **Settings** → **Environment Variables**
- Ensure all three variables are present

## Troubleshooting

### Build Fails

**Error: Missing environment variables**
- Solution: Add all required environment variables in Vercel dashboard

**Error: Module not found**
- Solution: Ensure `package.json` has all dependencies listed

**Error: TypeScript errors**
- Solution: Fix TypeScript errors locally first, then redeploy

### Runtime Errors

**Error: Supabase connection failed**
- Check `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct
- Verify Supabase project is active

**Error: Authentication not working**
- Update Supabase redirect URLs to include Vercel domain
- Check `SUPABASE_SERVICE_ROLE_KEY` is set correctly

### Database Issues

**RLS Policies blocking requests**
- Ensure RLS policies are set up correctly in Supabase
- Check that authenticated users have proper permissions

## Useful Commands

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# View deployment logs
vercel logs

# Check deployment status
vercel inspect
```

## Next Steps After Deployment

1. ✅ Test authentication flow
2. ✅ Test competition registration
3. ✅ Test scoring submission
4. ✅ Test admin functions
5. ✅ Set up monitoring (Vercel Analytics)
6. ✅ Configure custom domain
7. ✅ Set up CI/CD (automatic deployments on git push)

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Supabase Documentation](https://supabase.com/docs)

