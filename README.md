# Payout Management System (React + Supabase)

Modern payout management with vendor wallets, beneficiaries, transactions, and admin approval. Secure PayNinja integration via Vercel serverless functions.

## Local Setup

1. Install dependencies

```
npm install
```

2. Env for frontend (create `.env.local`):

```
VITE_SUPABASE_URL=<your-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

3. Start

```
npx vite@5 --host
```

## Vercel Functions Env

Set in Vercel Project Settings:
- PAYMENT_API_URL=https://api-staging.payninja.in
- PAYMENT_API_KEY=...
- PAYMENT_SECRET_KEY=...
- PAYMENT_ENCRYPTION_KEY=32 ASCII chars (AES-256-CBC)
- SUPABASE_URL=<same as VITE_SUPABASE_URL>
- SUPABASE_SERVICE_ROLE=<service role key>

## Database

Run `supabase.sql` in Supabase SQL editor.

## Deploy

- Import to Vercel, set env vars, deploy.
