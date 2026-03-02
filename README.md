# Nearby Finder

Production-ready full-stack nearby search application built with Next.js App Router, TailwindCSS, Framer Motion, Leaflet, and open-data providers (Nominatim + Overpass + OSRM).

## Features

- Search nearby places by:
  - Place name (server-side geocoding suggestions)
  - Manual latitude/longitude
  - Current location (browser permission)
- Dynamic radius (1km to 50km) with live auto-refresh
- Category multi-select + custom category keywords
- Map / List / Split view modes
- Marker clustering + selected marker highlighting
- Result cards with:
  - Name, category, formatted address
  - Phone, email, website (when available)
  - Rating/review count (when available in OSM tags)
  - Open/closed status
  - Distance and travel times (drive/walk)
  - Directions, save, share actions
- Place suggestions dropdown for place search input (select and search directly)
- Advanced filters:
  - Open now
  - Min rating
  - Sort by distance/rating/popularity
  - Has phone / has website
- Emergency Quick Mode (3km radius for hospitals/clinics/pharmacies/police)
- Favorites in local storage
- Dark mode toggle (light/dark/system)
- Skeleton loading, fade-in animations, infinite scroll
- Backend protections:
  - Input validation (Zod)
  - In-memory rate limiting
  - In-memory cache
  - CORS/origin checks
  - Security headers + HTTPS redirect middleware

## Tech Stack

- Frontend: Next.js (App Router), React, TailwindCSS, Framer Motion, Lucide
- UI: ShadCN-style component architecture
- Map: Leaflet + React Leaflet + marker clustering
- Backend: Next.js route handlers (Overpass + OSRM + Nominatim)

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
cp .env.example .env.local
```

3. (Optional) adjust `.env.local` values:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=
RATE_LIMIT_MAX=60
RATE_LIMIT_WINDOW_MS=60000
CACHE_TTL_MS=120000
```

4. Run development server:

```bash
npm run dev
```

5. Open: `http://localhost:3000`

## Scripts

- `npm run dev` - start local dev server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - lint codebase
- `npm run typecheck` - TypeScript checks

## Project Structure

```text
src/
  app/
    api/
      geocode/route.ts
      geocode/suggest/route.ts
      search/route.ts
    globals.css
    layout.tsx
    page.tsx
    robots.ts
    sitemap.ts
  components/
    map/
    nearby/
    place/
    providers/
    ui/
  hooks/
  lib/
    client/
    server/
```

## Deployment and Config Guides

- API setup guide: `docs/API_CONFIGURATION.md`
- Deployment guide (Vercel + Render): `docs/DEPLOYMENT.md`
- Performance and optimization guide: `docs/PERFORMANCE.md`
