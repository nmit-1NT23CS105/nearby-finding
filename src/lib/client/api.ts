import { GeocodeResponse, GeocodeSuggestion, SearchRequest, SearchResponse } from "@/lib/types";

type ApiError = {
  error?: {
    message?: string;
  };
};

async function requestWithRetry<T>(
  input: RequestInfo | URL,
  init: RequestInit,
  retries = 2
): Promise<T> {
  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= retries) {
    try {
      const response = await fetch(input, init);
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ApiError;
        throw new Error(body.error?.message || `Request failed with status ${response.status}`);
      }
      return (await response.json()) as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown request error");
      if (attempt === retries) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 300 * Math.pow(2, attempt)));
      attempt += 1;
    }
  }

  throw lastError || new Error("Request failed");
}

function withBase(path: string) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
  if (!base) {
    return path;
  }
  return `${base}${path}`;
}

export async function geocodeAddress(query: string) {
  const url = withBase(`/api/geocode?query=${encodeURIComponent(query)}`);
  return requestWithRetry<GeocodeResponse>(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    },
    cache: "no-store"
  });
}

export async function geocodeSuggestions(query: string, limit = 6) {
  const url = withBase(
    `/api/geocode/suggest?query=${encodeURIComponent(query)}&limit=${encodeURIComponent(String(limit))}`
  );
  return requestWithRetry<GeocodeSuggestion[]>(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    },
    cache: "no-store"
  });
}

export async function searchPlaces(payload: SearchRequest) {
  return requestWithRetry<SearchResponse>(withBase("/api/search"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
}
