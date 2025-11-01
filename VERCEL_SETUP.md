# Vercel Setup - Single Repository

## Current Situation
- **Local repo**: `github.com/ramniks05/dravaya.git` ✅
- **Vercel connected to**: `github.com/ramniks05/dravayatech.git` ❌

## Solution: Connect Vercel to `dravaya` Repository

### Steps:

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Select your project

2. **Update Git Repository**
   - Go to: **Settings** → **Git**
   - Click **Disconnect** next to `dravayatech`
   - Click **Connect Git Repository**
   - Search for or select: `ramniks05/dravaya`
   - Authorize if needed
   - Select the `dravaya` repository

3. **Redeploy**
   - Vercel will automatically trigger a new deployment
   - Or manually click **Redeploy** from the dashboard

4. **Verify**
   - Check that deployments are now from `dravaya` repository
   - All future commits will auto-deploy from the correct repo

## After Setup
- All code goes to one repository: `dravaya`
- One command to push: `git push origin main`
- Automatic deployments from Vercel

## Clean Up (Optional)
You can delete the `dravayatech` repository from GitHub if you no longer need it:
- Go to: https://github.com/ramniks05/dravayatech/settings
- Scroll down to "Danger Zone"
- Delete the repository
