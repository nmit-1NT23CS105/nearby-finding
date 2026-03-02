import { NextRequest, NextResponse } from "next/server";
import { geocodePlace } from "@/lib/server/google";
import { geocodeQuerySchema } from "@/lib/server/schemas";
import { apiRateLimiter, geocodeCache } from "@/lib/server/state";
import { getClientIp, isOriginAllowed, jsonError, withCors } from "@/lib/server/request";

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function GET(request: NextRequest) {
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

  const parsed = geocodeQuerySchema.safeParse({
    query: request.nextUrl.searchParams.get("query")
  });

  if (!parsed.success) {
    return jsonError("Invalid geocode query.", 400, parsed.error.flatten());
  }

  const key = parsed.data.query.trim().toLowerCase();
  const cached = geocodeCache.get(key);
  if (cached) {
    const response = NextResponse.json(cached);
    response.headers.set("X-Cache", "HIT");
    return withCors(response, origin);
  }

  try {
    const geocode = await geocodePlace(parsed.data.query);
    geocodeCache.set(key, geocode);
    const response = NextResponse.json(geocode);
    response.headers.set("X-Cache", "MISS");
    return withCors(response, origin);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to geocode location.",
      500
    );
  }
}
