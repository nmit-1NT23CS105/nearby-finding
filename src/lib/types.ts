export type SortBy = "distance" | "rating" | "popularity";
export type ViewMode = "list" | "map" | "split";

export type Coordinates = {
  lat: number;
  lng: number;
};

export type CategoryOption = {
  id: string;
  label: string;
  overpassClauses: string[];
  keyword?: string;
};

export type TravelTimes = {
  driving?: string;
  walking?: string;
};

export type NearbyPlace = {
  placeId: string;
  name: string;
  category: string;
  categories: string[];
  address: string;
  location: Coordinates;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  isOpen?: boolean | null;
  distanceMeters: number;
  travelTimes?: TravelTimes;
  mapsUrl?: string | null;
  photoReference?: string | null;
};

export type SearchFilters = {
  openNow: boolean;
  minRating: number;
  sortBy: SortBy;
  hasPhone: boolean;
  hasWebsite: boolean;
};

export type SearchRequest = {
  location: Coordinates;
  radiusKm: number;
  categories: string[];
  customCategories: string[];
  filters: SearchFilters;
  pageToken?: string | null;
};

export type SearchResponse = {
  center: Coordinates;
  radiusKm: number;
  totalResults: number;
  nextPageToken?: string | null;
  places: NearbyPlace[];
  fetchedAt: string;
  source: "osm-overpass";
};

export type GeocodeResponse = {
  query: string;
  location: Coordinates;
  formattedAddress: string;
};

export type GeocodeSuggestion = GeocodeResponse & {
  id: string;
  label: string;
};

export type FavoritePlace = {
  placeId: string;
  name: string;
  address: string;
  category: string;
  savedAt: string;
  location: Coordinates;
};

