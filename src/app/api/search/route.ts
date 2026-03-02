import { NextRequest, NextResponse } from "next/server";
import { searchNearbyPlaces } from "@/lib/server/google";
import { searchRequestSchema } from "@/lib/server/schemas";
import { apiRateLimiter, nearbyCache } from "@/lib/server/state";
import { getClientIp, isOriginAllowed, jsonError, withCors } from "@/lib/server/request";

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function POST(request: NextRequest) {
  if (!isOriginAllowed(request)) {
    return jsonError("Origin not allowed.", 403);
  }
  const origin = request.headers.get("origin") ?? "*";

  const limiter = apiRateLimiter.check(getClientIp(request));
  if (!limiter.allowed) {
    return jsonError("Rate limit exceeded. Please retry shortly.", 429, {
      resetAt: limiter.resetAt
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON payload.", 400);
  }

  const parsed = searchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid search request.", 400, parsed.error.flatten());
  }

  const key = JSON.stringify({
    location: parsed.data.location,
    radiusKm: parsed.data.radiusKm,
    categories: parsed.data.categories.sort(),
    customCategories: parsed.data.customCategories.sort(),
    filters: parsed.data.filters
  });

  const cached = nearbyCache.get(key);
  if (cached) {
    const response = NextResponse.json(cached);
    response.headers.set("X-Cache", "HIT");
    return withCors(response, origin);
  }

  try {
    const responsePayload = await searchNearbyPlaces({
      lat: parsed.data.location.lat,
      lng: parsed.data.location.lng,
      radiusKm: parsed.data.radiusKm,
      categoryIds: parsed.data.categories,
      customCategories: parsed.data.customCategories,
      filters: parsed.data.filters
    });

    nearbyCache.set(key, responsePayload);

    const response = NextResponse.json(responsePayload);
    response.headers.set("X-Cache", "MISS");
    return withCors(response, origin);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Search request failed.",
      500
    );
  }
}
