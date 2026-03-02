# Deployment Guide

## Option A: Single Deployment on Vercel (recommended)

This app is full-stack via Next.js route handlers, so one Vercel deployment is enough.

1. Push repository to GitHub.
2. Import project in Vercel.
3. Add environment variables:
   - `NEXT_PUBLIC_SITE_URL` (your Vercel domain)
   - `RATE_LIMIT_MAX` (optional)
   - `RATE_LIMIT_WINDOW_MS` (optional)
   - `CACHE_TTL_MS` (optional)
4. Deploy.

## Option B: Vercel Frontend + Render Backend

Use when API traffic/controls need separate hosting.

### Backend on Render

1. Create Render Web Service from same repository.
2. Build command:

```bash
npm install && npm run build
```

3. Start command:

```bash
npm run start
```

4. Add environment variables:
   - `NEXT_PUBLIC_SITE_URL` (optional)
   - `RATE_LIMIT_MAX`
   - `RATE_LIMIT_WINDOW_MS`
   - `CACHE_TTL_MS`

5. Deploy and note Render URL (example: `https://nearby-api.onrender.com`).

### Frontend on Vercel

1. Deploy frontend on Vercel.
2. Set:

```env
NEXT_PUBLIC_API_BASE_URL=https://nearby-api.onrender.com
NEXT_PUBLIC_SITE_URL=https://your-vercel-domain.vercel.app
```

3. Redeploy frontend.

## Production Checklist

- No provider API key required for default stack
- HTTPS enabled (handled by Vercel/Render + middleware redirect)
- CORS/origin checks verified
- Rate limit values tuned for expected traffic
- Monitoring/logging enabled in hosting dashboard
