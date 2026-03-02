import { CATEGORY_OPTIONS } from "@/lib/categories";
import { GeocodeSuggestion, SearchFilters, SearchResponse } from "@/lib/types";
import { haversineDistanceMeters } from "@/lib/server/geo";

const NOMINATIM_SEARCH_API = "https://nominatim.openstreetmap.org/search";
const OSRM_TABLE_API_BASE = "https://router.project-osrm.org/table/v1";
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter"
];

type NominatimItem = {
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
};

type OverpassElement = {
  id: number;
  type: "node" | "way" | "relation";
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements?: OverpassElement[];
};

type OsrmTableResponse = {
  code: string;
  durations?: Array<Array<number | null>>;
  distances?: Array<Array<number | null>>;
};

type SearchSpec = {
  label: string;
  categoryId: string | null;
  clauses: string[];
  customKeyword?: string;
};

type PlaceDraft = {
  placeId: string;
  name: string;
  category: string;
  categories: string[];
  address: string;
  location: { lat: number; lng: number };
  phone: string | null;
  email: string | null;
  website: string | null;
  rating: number | null;
  reviewCount: number | null;
  isOpen: boolean | null;
  distanceMeters: number;
  mapsUrl: string;
};

function fetchHeaders() {
  return {
    Accept: "application/json",
    "User-Agent": "NearbyFinder/1.0 (open-data-provider; contact: app-local)"
  };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    next: { revalidate: 0 },
    ...init,
    headers: {
      ...fetchHeaders(),
      ...(init?.headers || {})
    }
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      body?.trim()
        ? `Provider request failed (${response.status}): ${body.slice(0, 140)}`
        : `Provider request failed with status ${response.status}`
    );
  }

  return (await response.json()) as T;
}

function escapeOverpassRegex(value: string) {
  return value
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/"/g, "\\\"");
}

function buildSearchSpecs(categoryIds: string[], customCategories: string[]) {
  const selectedCategories = categoryIds
    .map((id) => CATEGORY_OPTIONS.find((option) => option.id === id))
    .filter(Boolean)
    .slice(0, 10);

  const normalizedCustom = customCategories
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 6);

  if (selectedCategories.length === 0 && normalizedCustom.length === 0) {
    selectedCategories.push(
      CATEGORY_OPTIONS.find((option) => option.id === "restaurants")!,
      CATEGORY_OPTIONS.find((option) => option.id === "shops")!
    );
  }

  const categorySpecs: SearchSpec[] = selectedCategories.map((entry) => ({
    label: entry!.label,
    categoryId: entry!.id,
    clauses: entry!.overpassClauses
  }));

  const customSpecs: SearchSpec[] = normalizedCustom.map((keyword) => ({
    label: keyword,
    categoryId: null,
    customKeyword: keyword.toLowerCase(),
    clauses: [`[name~"${escapeOverpassRegex(keyword)}",i]`]
  }));

  return [...categorySpecs, ...customSpecs];
}

function mapNominatimSuggestion(query: string, item: NominatimItem): GeocodeSuggestion {
  return {
    id: `${item.lat},${item.lon},${item.display_name}`,
    query,
    location: {
      lat: Number(item.lat),
      lng: Number(item.lon)
    },
    formattedAddress: item.display_name,
    label: item.name || item.display_name.split(",")[0] || query
  };
}

export async function suggestPlaces(query: string, limit = 6) {
  const url = new URL(NOMINATIM_SEARCH_API);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", String(Math.max(1, Math.min(limit, 10))));
  url.searchParams.set("addressdetails", "1");

  const result = await fetchJson<NominatimItem[]>(url.toString());
  return result.map((item) => mapNominatimSuggestion(query, item));
}

export async function geocodePlace(query: string) {
  const suggestions = await suggestPlaces(query, 1);
  if (!suggestions.length) {
    throw new Error("No geocode results found.");
  }
  const top = suggestions[0];
  return {
    query: top.query,
    location: top.location,
    formattedAddress: top.formattedAddress
  };
}

function matchCategory(categoryId: string, tags: Record<string, string>) {
  const amenity = (tags.amenity || "").toLowerCase();
  const shop = (tags.shop || "").toLowerCase();
  const tourism = (tags.tourism || "").toLowerCase();
  const healthcare = (tags.healthcare || "").toLowerCase();

  switch (categoryId) {
    case "shops":
      return !!shop;
    case "hospitals":
      return amenity === "hospital" || healthcare === "hospital";
    case "restaurants":
      return amenity === "restaurant";
    case "food":
      return ["fast_food", "cafe", "food_court", "restaurant", "ice_cream"].includes(amenity);
    case "pharmacies":
      return amenity === "pharmacy" || shop === "chemist";
    case "schools":
      return amenity === "school";
    case "atms":
      return amenity === "atm";
    case "clinics":
      return amenity === "clinic" || healthcare === "clinic" || healthcare === "doctor";
    case "petrol":
      return amenity === "fuel";
    case "supermarkets":
      return shop === "supermarket";
    case "police":
      return amenity === "police";
    case "hotels":
      return ["hotel", "motel", "guest_house"].includes(tourism);
    default:
      return false;
  }
}

function resolveCategoryLabel(
  specs: SearchSpec[],
  tags: Record<string, string>,
  name: string
) {
  const normalizedName = name.toLowerCase();
  const matched = specs.find((spec) => {
    if (spec.categoryId) {
      return matchCategory(spec.categoryId, tags);
    }
    if (spec.customKeyword) {
      return normalizedName.includes(spec.customKeyword);
    }
    return false;
  });

  if (matched) {
    return matched.label;
  }

  if (tags.amenity) {
    return tags.amenity.replace(/_/g, " ");
  }
  if (tags.shop) {
    return tags.shop.replace(/_/g, " ");
  }
  if (tags.tourism) {
    return tags.tourism.replace(/_/g, " ");
  }

  return "Place";
}

function parseCoordinates(element: OverpassElement) {
  if (typeof element.lat === "number" && typeof element.lon === "number") {
    return {
      lat: element.lat,
      lng: element.lon
    };
  }
  if (element.center) {
    return {
      lat: element.center.lat,
      lng: element.center.lon
    };
  }
  return null;
}

function formatAddress(tags: Record<string, string>) {
  if (tags["addr:full"]) {
    return tags["addr:full"];
  }

  const street = [tags["addr:housenumber"], tags["addr:street"]]
    .filter(Boolean)
    .join(" ");

  const parts = [
    street,
    tags["addr:suburb"],
    tags["addr:city"],
    tags["addr:state"],
    tags["addr:postcode"],
    tags["addr:country"]
  ].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(", ");
  }

  return "Address unavailable";
}

function parseRating(tags: Record<string, string>) {
  const raw = tags.stars || tags.rating || "";
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.min(5, Math.max(0, parsed));
}

function parseReviewCount(tags: Record<string, string>) {
  const raw = tags.reviews || tags.review_count || tags["contact:reviews"] || "";
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.max(0, Math.round(parsed));
}

function dayToken(date: Date) {
  const tokens = ["su", "mo", "tu", "we", "th", "fr", "sa"] as const;
  return tokens[date.getDay()];
}

function expandDays(dayPart: string) {
  const map = ["mo", "tu", "we", "th", "fr", "sa", "su"];
  const normalized = dayPart.toLowerCase().replace(/\s/g, "");
  const dayChunks = normalized.split(",");
  const result = new Set<string>();

  for (const chunk of dayChunks) {
    if (!chunk) {
      continue;
    }
    if (chunk.includes("-")) {
      const [start, end] = chunk.split("-");
      const startIndex = map.indexOf(start);
      const endIndex = map.indexOf(end);
      if (startIndex < 0 || endIndex < 0) {
        continue;
      }
      let index = startIndex;
      while (true) {
        result.add(map[index]);
        if (index === endIndex) {
          break;
        }
        index = (index + 1) % map.length;
      }
      continue;
    }
    if (map.includes(chunk)) {
      result.add(chunk);
    }
  }

  return result;
}

function parseTimeToMinutes(time: string) {
  const [hourText, minuteText] = time.split(":");
  const hours = Number(hourText);
  const minutes = Number(minuteText);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
}

function isOpenNow(openingHours?: string) {
  if (!openingHours) {
    return null;
  }

  const normalized = openingHours.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized.includes("24/7")) {
    return true;
  }
  if (normalized === "closed" || normalized === "off") {
    return false;
  }

  const now = new Date();
  const currentDay = dayToken(now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const segments = normalized
    .split(";")
    .map((segment) => segment.trim())
    .filter(Boolean);

  let parsedRangesForCurrentDay = 0;

  for (const segment of segments) {
    let timePart = segment;

    const match = segment.match(
      /^((?:mo|tu|we|th|fr|sa|su)(?:\s*-\s*(?:mo|tu|we|th|fr|sa|su))?(?:\s*,\s*(?:mo|tu|we|th|fr|sa|su)(?:\s*-\s*(?:mo|tu|we|th|fr|sa|su))?)*)\s+(.+)$/i
    );

    if (match) {
      const days = expandDays(match[1]);
      timePart = match[2];
      if (!days.has(currentDay)) {
        continue;
      }
    }

    if (timePart.includes("off") || timePart.includes("closed")) {
      return false;
    }

    const ranges = timePart.split(",").map((value) => value.trim());
    for (const range of ranges) {
      const rangeMatch = range.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
      if (!rangeMatch) {
        continue;
      }
      const start = parseTimeToMinutes(rangeMatch[1]);
      const end = parseTimeToMinutes(rangeMatch[2]);
      if (start === null || end === null) {
        continue;
      }
      parsedRangesForCurrentDay += 1;

      if (start <= end) {
        if (currentMinutes >= start && currentMinutes <= end) {
          return true;
        }
      } else if (currentMinutes >= start || currentMinutes <= end) {
        return true;
      }
    }
  }

  if (parsedRangesForCurrentDay > 0) {
    return false;
  }

  return null;
}

function formatDuration(seconds?: number | null) {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) {
    return undefined;
  }

  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${remainder} min`;
}

type RouteMetrics = {
  durations: string[];
  distances: Array<number | null>;
};

async function fetchRouteMetrics(
  origin: { lat: number; lng: number },
  destinations: Array<{ lat: number; lng: number }>,
  profile: "driving" | "walking"
): Promise<RouteMetrics> {
  if (destinations.length === 0) {
    return {
      durations: [],
      distances: []
    };
  }

  const coordParam = [origin, ...destinations]
    .map((item) => `${item.lng},${item.lat}`)
    .join(";");

  const url = `${OSRM_TABLE_API_BASE}/${profile}/${coordParam}?annotations=duration,distance&sources=0`;
  const response = await fetchJson<OsrmTableResponse>(url);

  if (response.code !== "Ok") {
    return {
      durations: destinations.map(() => ""),
      distances: destinations.map(() => null)
    };
  }

  const durationRow = response.durations?.[0] || [];
  const distanceRow = response.distances?.[0] || [];

  return {
    durations: destinations.map((_, index) => formatDuration(durationRow[index + 1]) || ""),
    distances: destinations.map((_, index) => {
      const value = distanceRow[index + 1];
      return typeof value === "number" && Number.isFinite(value) ? value : null;
    })
  };
}

async function fetchTravelTimes(
  origin: { lat: number; lng: number },
  destinations: Array<{ lat: number; lng: number }>
) {
  if (destinations.length === 0) {
    return {
      driving: [] as string[],
      walking: [] as string[],
      drivingDistances: [] as Array<number | null>
    };
  }

  const [driving, walking] = await Promise.allSettled([
    fetchRouteMetrics(origin, destinations, "driving"),
    fetchRouteMetrics(origin, destinations, "walking")
  ]);

  const emptyDurations = destinations.map(() => "");
  const emptyDistances = destinations.map(() => null as number | null);

  return {
    driving: driving.status === "fulfilled" ? driving.value.durations : emptyDurations,
    walking: walking.status === "fulfilled" ? walking.value.durations : emptyDurations,
    drivingDistances: driving.status === "fulfilled" ? driving.value.distances : emptyDistances
  };
}

function passesFilters(
  place: {
    rating?: number | null;
    phone?: string | null;
    website?: string | null;
    isOpen?: boolean | null;
  },
  filters: SearchFilters
) {
  if (filters.minRating > 0 && (place.rating === null || place.rating === undefined || place.rating < filters.minRating)) {
    return false;
  }
  if (filters.openNow && place.isOpen !== true) {
    return false;
  }
  if (filters.hasPhone && !place.phone) {
    return false;
  }
  if (filters.hasWebsite && !place.website) {
    return false;
  }
  return true;
}

function queryResultLimitForSpec(spec: SearchSpec) {
  if (!spec.categoryId) {
    return 80;
  }
  if (spec.categoryId === "shops") {
    return 100;
  }
  if (spec.categoryId === "food" || spec.categoryId === "restaurants") {
    return 90;
  }
  return 70;
}

function queryRadiusForSpec(spec: SearchSpec, radiusMeters: number) {
  if (!spec.categoryId) {
    return Math.min(radiusMeters, 25_000);
  }

  if (spec.categoryId === "shops" || spec.categoryId === "food" || spec.categoryId === "restaurants") {
    return Math.min(radiusMeters, 12_000);
  }

  return Math.min(radiusMeters, 30_000);
}

async function fetchOverpassFromAnyEndpoint(query: string) {
  const errors: string[] = [];

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetchJson<OverpassResponse>(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain; charset=utf-8"
        },
        body: query
      });
      return response.elements || [];
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  throw new Error(errors[0] || "All Overpass endpoints failed.");
}

async function fetchOverpassBySpec(params: {
  lat: number;
  lng: number;
  radiusMeters: number;
  spec: SearchSpec;
}) {
  const resultLimit = queryResultLimitForSpec(params.spec);
  const searchRadius = queryRadiusForSpec(params.spec, params.radiusMeters);

  const query = [
    "[out:json][timeout:20];",
    "(",
    ...params.spec.clauses.map(
      (clause) => `  nwr(around:${searchRadius},${params.lat},${params.lng})${clause};`
    ),
    ");",
    `out tags center ${resultLimit};`
  ].join("\n");

  return fetchOverpassFromAnyEndpoint(query);
}

function toPlaceDraft(
  element: OverpassElement,
  origin: { lat: number; lng: number },
  specs: SearchSpec[]
) {
  const coords = parseCoordinates(element);
  if (!coords) {
    return null;
  }

  const tags = element.tags || {};
  const name = tags.name || tags["name:en"] || "Unnamed place";
  const distanceMeters = haversineDistanceMeters(origin, coords);

  const category = resolveCategoryLabel(specs, tags, name);
  const categories = [tags.amenity, tags.shop, tags.tourism, tags.healthcare]
    .filter(Boolean)
    .map((value) => value.replace(/_/g, " "));

  const placeId = `${element.type}-${element.id}`;
  return {
    placeId,
    name,
    category,
    categories,
    address: formatAddress(tags),
    location: coords,
    phone: tags["contact:phone"] || tags.phone || null,
    email: tags["contact:email"] || tags.email || null,
    website: tags["contact:website"] || tags.website || tags.url || null,
    rating: parseRating(tags),
    reviewCount: parseReviewCount(tags),
    isOpen: isOpenNow(tags.opening_hours),
    distanceMeters,
    mapsUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`
  } satisfies PlaceDraft;
}

export async function searchNearbyPlaces(params: {
  lat: number;
  lng: number;
  radiusKm: number;
  categoryIds: string[];
  customCategories: string[];
  filters: SearchFilters;
}) {
  const radiusMeters = Math.max(1000, Math.min(50_000, Math.round(params.radiusKm * 1000)));
  const specs = buildSearchSpecs(params.categoryIds, params.customCategories);

  const settled = await Promise.allSettled(
    specs.map((spec) =>
      fetchOverpassBySpec({
        lat: params.lat,
        lng: params.lng,
        radiusMeters,
        spec
      })
    )
  );

  const successfulResults = settled
    .filter((entry): entry is PromiseFulfilledResult<OverpassElement[]> => entry.status === "fulfilled")
    .flatMap((entry) => entry.value);

  if (successfulResults.length === 0) {
    const firstError = settled.find((entry) => entry.status === "rejected");
    if (firstError && firstError.status === "rejected") {
      throw new Error(
        `Nearby provider is currently busy. Please retry. (${firstError.reason instanceof Error ? firstError.reason.message : "provider error"})`
      );
    }
  }

  const placesMap = new Map<string, PlaceDraft>();
  const origin = { lat: params.lat, lng: params.lng };

  for (const element of successfulResults.slice(0, 1200)) {
    const draft = toPlaceDraft(element, origin, specs);
    if (!draft) {
      continue;
    }
    if (placesMap.has(draft.placeId)) {
      continue;
    }
    placesMap.set(draft.placeId, draft);
  }

  let filtered = Array.from(placesMap.values()).filter((place) =>
    passesFilters(place, params.filters)
  );

  filtered.sort((a, b) => {
    if (params.filters.sortBy === "rating") {
      return (b.rating || 0) - (a.rating || 0);
    }
    if (params.filters.sortBy === "popularity") {
      return (b.reviewCount || 0) - (a.reviewCount || 0);
    }
    return a.distanceMeters - b.distanceMeters;
  });

  const travelTarget = filtered.slice(0, 25);
  const travelTimes = await fetchTravelTimes(
    origin,
    travelTarget.map((item) => item.location)
  );

  const placesWithTravel = filtered.map((place, index) => {
    const roadDistance = travelTimes.drivingDistances[index];
    const distanceMeters =
      typeof roadDistance === "number" && Number.isFinite(roadDistance) && roadDistance > 0
        ? roadDistance
        : place.distanceMeters;

    return {
      ...place,
      distanceMeters,
      travelTimes: {
        driving: travelTimes.driving[index] || undefined,
        walking: travelTimes.walking[index] || undefined
      }
    };
  });

  const places =
    params.filters.sortBy === "distance"
      ? [...placesWithTravel].sort((a, b) => a.distanceMeters - b.distanceMeters)
      : placesWithTravel;

  const response: SearchResponse = {
    center: origin,
    radiusKm: params.radiusKm,
    totalResults: places.length,
    nextPageToken: null,
    places,
    fetchedAt: new Date().toISOString(),
    source: "osm-overpass"
  };

  return response;
}

