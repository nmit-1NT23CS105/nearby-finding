import { env } from "@/lib/env";
import { MemoryCache } from "@/lib/server/cache";
import { InMemoryRateLimiter } from "@/lib/server/rate-limit";
import { GeocodeResponse, GeocodeSuggestion, SearchResponse } from "@/lib/types";

export const apiRateLimiter = new InMemoryRateLimiter(
  env.RATE_LIMIT_MAX,
  env.RATE_LIMIT_WINDOW_MS
);

export const geocodeCache = new MemoryCache<GeocodeResponse>(env.CACHE_TTL_MS);
export const geocodeSuggestCache = new MemoryCache<GeocodeSuggestion[]>(env.CACHE_TTL_MS);
export const nearbyCache = new MemoryCache<SearchResponse>(env.CACHE_TTL_MS);
