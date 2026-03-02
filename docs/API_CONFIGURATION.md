# API Configuration Guide

## Providers Used

- Nearby places and details: `Overpass API` (OpenStreetMap data)
- Place geocoding suggestions: `Nominatim` (OpenStreetMap)
- Drive/walk travel time: `OSRM public router`

## Required Environment Variables

Set in `.env.local`:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=
RATE_LIMIT_MAX=60
RATE_LIMIT_WINDOW_MS=60000
CACHE_TTL_MS=120000
```

## Key Requirement

- No API key is required for the default stack.
- The app uses public open-data endpoints with server-side calls.

## Important Data Notes

- Contact details, ratings, review counts, and open-now status depend on OpenStreetMap tag coverage per place.
- Some places may have missing phone/email/website/rating fields.
- Travel times are estimated using OSRM profiles (`driving`, `walking`).

## Usage Policy Notes

- Public Nominatim, Overpass, and OSRM endpoints have fair-use limits.
- For higher traffic, use your own hosted endpoints or managed alternatives.
- Keep backend rate limits enabled to avoid provider throttling.
