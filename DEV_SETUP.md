# Development Setup Guide

## Quick Start (Recommended)

For **local development**, use the Vite dev server:

```bash
npm run dev:vite
```

Then open: `http://localhost:5173`

## Why Vite Dev Server?

- ✅ No build step required
- ✅ Instant hot module reload
- ✅ Faster development
- ✅ No file locking issues
- ✅ Better error messages

## When to Use Vercel Dev

Only use `npm run dev` (vercel dev) when you need to:
- Test API routes (`/api/*`)
- Simulate production environment
- Test deployment configuration

## Troubleshooting

If you get 500 errors with `vercel dev`:
1. Stop the server (Ctrl+C)
2. Delete the `dist` folder (if not locked)
3. Use `npm run dev:vite` instead

