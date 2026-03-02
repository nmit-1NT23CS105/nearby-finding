# Performance Optimization Guide

## Implemented Optimizations

- Debounced auto-refresh for radius/filter/category changes
- Server-side in-memory caching for geocode and search payloads
- Server-side rate limiting per client IP
- Client-side response memo cache for repeated queries
- Lazy loaded map bundle (`next/dynamic`, `ssr: false`)
- Marker clustering for large result sets
- Infinite scroll pagination in list mode
- Lightweight skeleton loaders to reduce perceived latency
- Framer Motion with short transitions for smooth UI response

## Tuning Recommendations

1. Increase server cache TTL in high-traffic environments:
   - `CACHE_TTL_MS=180000` to `300000`
2. Tune rate limit:
   - `RATE_LIMIT_MAX` based on your hosting capacity and fair-use targets
3. Limit category fan-out:
   - Too many selected/custom categories trigger multiple provider calls
4. Use edge/CDN hosting where possible:
   - Vercel handles static/app assets efficiently
5. Monitor provider usage:
   - Watch Overpass/Nominatim/OSRM reliability and adjust backend throttling

## Optional Upgrades

- Redis for distributed cache + distributed rate limiting
- Background prefetch of place details
- Persistent database for cross-device favorites
- Service worker + offline shell (PWA)
