import { NextRequest, NextResponse } from "next/server";
import { suggestPlaces } from "@/lib/server/google";
import { geocodeSuggestQuerySchema } from "@/lib/server/schemas";
import { apiRateLimiter, geocodeSuggestCache } from "@/lib/server/state";
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

  const parsed = geocodeSuggestQuerySchema.safeParse({
    query: request.nextUrl.searchParams.get("query"),
    limit: request.nextUrl.searchParams.get("limit")
  });

  if (!parsed.success) {
    return jsonError("Invalid geocode suggest query.", 400, parsed.error.flatten());
  }

  const key = `${parsed.data.query.trim().toLowerCase()}:${parsed.data.limit}`;
  const cached = geocodeSuggestCache.get(key);
  if (cached) {
    const response = NextResponse.json(cached);
    response.headers.set("X-Cache", "HIT");
    return withCors(response, origin);
  }

  try {
    const suggestions = await suggestPlaces(parsed.data.query, parsed.data.limit);
    geocodeSuggestCache.set(key, suggestions);
    const response = NextResponse.json(suggestions);
    response.headers.set("X-Cache", "MISS");
    return withCors(response, origin);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to fetch suggestions.",
      500
    );
  }
}
