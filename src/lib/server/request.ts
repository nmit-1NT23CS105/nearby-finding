import { NextRequest, NextResponse } from "next/server";

export function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

export function isOriginAllowed(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) {
    return true;
  }

  const host = request.headers.get("host");
  if (!host) {
    return false;
  }

  const requestHost = new URL(origin).host;
  return requestHost === host;
}

export function withCors(response: NextResponse, origin = "*") {
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.headers.set("Vary", "Origin");
  return response;
}

export function jsonError(message: string, status = 400, details?: unknown) {
  const response = NextResponse.json(
    {
      error: {
        message,
        details: details ?? null
      }
    },
    { status }
  );
  return withCors(response);
}
