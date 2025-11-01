# Vercel Environment Variables Setup

## Required Environment Variables

Set these in **Vercel Dashboard** → **Project Settings** → **Environment Variables**

### Frontend Variables (Available in Browser)
These are prefixed with `VITE_` and will be included in the build:

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key | `eyJhbGci...` |

### Backend Variables (API Routes Only)
These are server-only and NOT prefixed with `VITE_`:

| Variable | Description | Required For | Example |
|----------|-------------|--------------|---------|
| `PAYMENT_API_URL` | PayNinja API base URL | Payment APIs | `https://api-staging.payninja.in` |
| `PAYMENT_API_KEY` | PayNinja API key | Payment APIs | Your API key |
| `PAYMENT_SECRET_KEY` | PayNinja secret key | Payment APIs | Your secret key |
| `PAYMENT_ENCRYPTION_KEY` | 32 ASCII characters for AES-256-CBC | Payment encryption | `1234567890ABCDEF1234567890ABCDEF` |
| `SUPABASE_URL` | Supabase project URL (same as VITE_SUPABASE_URL) | Webhook | `https://xxxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE` | Supabase service role key (for webhooks) | Webhook | `eyJhbGci...` (service_role) |

## How to Set in Vercel

1. Go to: https://vercel.com/dashboard
2. Select your project
3. Go to: **Settings** → **Environment Variables**
4. Add each variable:
   - **Key**: The variable name (e.g., `VITE_SUPABASE_URL`)
   - **Value**: The actual value
   - **Environment**: Select `Production`, `Preview`, and `Development` (or just `Production`)

## Important Notes

- **VITE_*** variables are exposed to the browser - safe for public keys
- **Non-VITE_*** variables are server-only - use for secrets
- After adding variables, **redeploy** for changes to take effect
- You can get Supabase keys from: Supabase Dashboard → Settings → API
- Get PayNinja keys from your PayNinja account dashboard

## Quick Checklist

- [ ] `VITE_SUPABASE_URL` - Frontend Supabase connection
- [ ] `VITE_SUPABASE_ANON_KEY` - Frontend Supabase auth
- [ ] `PAYMENT_API_URL` - Payment API endpoint
- [ ] `PAYMENT_API_KEY` - Payment API authentication
- [ ] `PAYMENT_SECRET_KEY` - Payment API signature
- [ ] `PAYMENT_ENCRYPTION_KEY` - Payment data encryption (32 chars)
- [ ] `SUPABASE_URL` - Backend Supabase connection
- [ ] `SUPABASE_SERVICE_ROLE` - Backend Supabase admin access

## Testing

After setting variables:
1. Redeploy your project
2. Test payment functionality
3. Check browser console for missing variable errors
4. Check API route logs for server-side errors
