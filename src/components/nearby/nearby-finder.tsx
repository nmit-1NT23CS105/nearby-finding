"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Compass,
  Crosshair,
  Filter,
  List,
  Loader2,
  Map as MapIcon,
  MapPinned,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  TriangleAlert
} from "lucide-react";
import { CATEGORY_OPTIONS, EMERGENCY_CATEGORY_IDS } from "@/lib/categories";
import { geocodeAddress, geocodeSuggestions, searchPlaces } from "@/lib/client/api";
import {
  Coordinates,
  FavoritePlace,
  GeocodeSuggestion,
  NearbyPlace,
  SearchFilters,
  SearchRequest,
  SearchResponse,
  ViewMode
} from "@/lib/types";
import { useDebounce } from "@/hooks/use-debounce";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PlaceCard } from "@/components/place/place-card";
import { PlaceCardSkeleton } from "@/components/place/place-card-skeleton";
import { ThemeToggle } from "@/components/nearby/theme-toggle";
import { cn } from "@/lib/utils";

const NearbyMap = dynamic(
  () => import("@/components/map/nearby-map").then((module) => module.NearbyMap),
  {
    ssr: false,
    loading: () => <div className="h-[420px] w-full animate-pulse rounded-2xl bg-muted md:h-full" />
  }
);

const PAGE_SIZE = 12;

const defaultFilters: SearchFilters = {
  openNow: false,
  minRating: 0,
  sortBy: "distance",
  hasPhone: false,
  hasWebsite: false
};

function toFavorite(place: NearbyPlace): FavoritePlace {
  return {
    placeId: place.placeId,
    name: place.name,
    address: place.address,
    category: place.category,
    savedAt: new Date().toISOString(),
    location: place.location
  };
}

function parseNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function clampRadius(radius: number) {
  return Math.min(50, Math.max(1, radius));
}

export function NearbyFinder() {
  const router = useRouter();

  const [searchMode, setSearchMode] = useState<"place" | "coords">("place");
  const [placeQuery, setPlaceQuery] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [locationLabel, setLocationLabel] = useState("");
  const [radiusKm, setRadiusKm] = useState(5);

  const [categories, setCategories] = useState<string[]>(["restaurants", "shops"]);
  const [customCategoryInput, setCustomCategoryInput] = useState("");
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
  const [placeSuggestions, setPlaceSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [showPlaceSuggestions, setShowPlaceSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [hasSearched, setHasSearched] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);

  const [favorites, setFavorites, favoritesHydrated] = useLocalStorage<FavoritePlace[]>(
    "nearby-finder:favorites",
    []
  );

  const listEndRef = useRef<HTMLDivElement | null>(null);
  const clientCache = useRef<Map<string, SearchResponse>>(new Map());

  const autoRefreshKey = useDebounce(
    JSON.stringify({
      radiusKm,
      categories: [...categories].sort(),
      customCategories: [...customCategories].sort(),
      filters
    }),
    450
  );
  const debouncedPlaceQuery = useDebounce(placeQuery.trim(), 280);

  const displayedPlaces = useMemo(
    () => response?.places.slice(0, visibleCount) || [],
    [response?.places, visibleCount]
  );

  const hasMore = !!response && visibleCount < response.places.length;
  const favoriteSet = useMemo(() => new Set(favorites.map((item) => item.placeId)), [favorites]);

  const updateRouteState = useCallback(
    (params: { q?: string; lat: number; lng: number; radius: number }) => {
      const query = new URLSearchParams();
      if (params.q) {
        query.set("q", params.q);
      }
      query.set("lat", params.lat.toFixed(6));
      query.set("lng", params.lng.toFixed(6));
      query.set("radius", String(params.radius));
      router.replace(`/?${query.toString()}`, { scroll: false });
    },
    [router]
  );

  const runSearch = useCallback(
    async (coords: Coordinates, opts?: { forceNetwork?: boolean; label?: string; query?: string }) => {
      const payload: SearchRequest = {
        location: coords,
        radiusKm,
        categories,
        customCategories,
        filters
      };
      const key = JSON.stringify(payload);
      setError(null);
      setHasSearched(true);
      setLocation(coords);

      if (!opts?.forceNetwork) {
        const hit = clientCache.current.get(key);
        if (hit) {
          setResponse(hit);
          setSelectedPlaceId(hit.places[0]?.placeId || null);
          setVisibleCount(PAGE_SIZE);
          setLocationLabel(opts?.label || locationLabel || "Current search center");
          updateRouteState({
            q: opts?.query || (searchMode === "place" ? placeQuery : undefined),
            lat: coords.lat,
            lng: coords.lng,
            radius: radiusKm
          });
          return;
        }
      }

      setIsLoading(true);
      try {
        const data = await searchPlaces(payload);
        clientCache.current.set(key, data);
        setResponse(data);
        setSelectedPlaceId(data.places[0]?.placeId || null);
        setVisibleCount(PAGE_SIZE);
        if (opts?.label) {
          setLocationLabel(opts.label);
        }
        updateRouteState({
          q: opts?.query || (searchMode === "place" ? placeQuery : undefined),
          lat: coords.lat,
          lng: coords.lng,
          radius: radiusKm
        });
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Search failed.");
      } finally {
        setIsLoading(false);
      }
    },
    [categories, customCategories, filters, locationLabel, placeQuery, radiusKm, searchMode, updateRouteState]
  );

  const selectPlaceSuggestion = useCallback(
    async (suggestion: GeocodeSuggestion) => {
      setPlaceQuery(suggestion.formattedAddress);
      setLatitude(String(suggestion.location.lat));
      setLongitude(String(suggestion.location.lng));
      setPlaceSuggestions([]);
      setShowPlaceSuggestions(false);
      setActiveSuggestionIndex(-1);
      await runSearch(suggestion.location, {
        forceNetwork: true,
        label: suggestion.formattedAddress,
        query: suggestion.formattedAddress
      });
    },
    [runSearch]
  );

  const handleSearch = useCallback(async () => {
    if (searchMode === "place") {
      if (!placeQuery.trim()) {
        setError("Please enter a place name.");
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const geocode = await geocodeAddress(placeQuery.trim());
        setLatitude(String(geocode.location.lat));
        setLongitude(String(geocode.location.lng));
        await runSearch(geocode.location, {
          forceNetwork: true,
          label: geocode.formattedAddress,
          query: geocode.query
        });
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unable to geocode place.");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const lat = parseNumber(latitude);
    const lng = parseNumber(longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setError("Please enter valid latitude and longitude values.");
      return;
    }

    await runSearch(
      { lat, lng },
      {
        forceNetwork: true,
        label: `${lat.toFixed(5)}, ${lng.toFixed(5)}`
      }
    );
  }, [latitude, longitude, placeQuery, runSearch, searchMode]);

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }

    setError(null);
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setSearchMode("coords");
        setLatitude(coords.lat.toFixed(6));
        setLongitude(coords.lng.toFixed(6));
        await runSearch(coords, {
          forceNetwork: true,
          label: "My current location"
        });
        setIsLoading(false);
      },
      (geoError) => {
        setIsLoading(false);
        setError(geoError.message || "Unable to access current location.");
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }, [runSearch]);

  useEffect(() => {
    if (searchMode !== "place") {
      setPlaceSuggestions([]);
      setShowPlaceSuggestions(false);
      setActiveSuggestionIndex(-1);
      return;
    }

    if (debouncedPlaceQuery.length < 2) {
      setPlaceSuggestions([]);
      setShowPlaceSuggestions(false);
      setActiveSuggestionIndex(-1);
      return;
    }

    let isCancelled = false;
    setIsSuggestionLoading(true);

    geocodeSuggestions(debouncedPlaceQuery, 6)
      .then((suggestions) => {
        if (isCancelled) {
          return;
        }
        setPlaceSuggestions(suggestions);
        setShowPlaceSuggestions(true);
        setActiveSuggestionIndex(suggestions.length ? 0 : -1);
      })
      .catch(() => {
        if (isCancelled) {
          return;
        }
        setPlaceSuggestions([]);
        setShowPlaceSuggestions(false);
        setActiveSuggestionIndex(-1);
      })
      .finally(() => {
        if (!isCancelled) {
          setIsSuggestionLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [debouncedPlaceQuery, searchMode]);

  const addCustomCategory = useCallback(() => {
    const normalized = customCategoryInput.trim();
    if (!normalized) {
      return;
    }
    if (customCategories.some((entry) => entry.toLowerCase() === normalized.toLowerCase())) {
      setCustomCategoryInput("");
      return;
    }
    setCustomCategories((prev) => [...prev, normalized]);
    setCustomCategoryInput("");
  }, [customCategoryInput, customCategories]);

  const toggleCategory = useCallback((id: string) => {
    setCategories((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }, []);

  const toggleFavorite = useCallback(
    (place: NearbyPlace) => {
      const exists = favoriteSet.has(place.placeId);
      if (exists) {
        setFavorites((prev) => prev.filter((item) => item.placeId !== place.placeId));
        toast({
          title: "Removed from saved",
          description: place.name
        });
        return;
      }
      setFavorites((prev) => [toFavorite(place), ...prev].slice(0, 200));
      toast({
        title: "Saved to favorites",
        description: place.name
      });
    },
    [favoriteSet, setFavorites]
  );

  const sharePlace = useCallback(async (place: NearbyPlace) => {
    const shareUrl =
      place.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${place.location.lat},${place.location.lng}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: place.name,
          text: `${place.name} - ${place.address}`,
          url: shareUrl
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link copied",
          description: "Place URL copied to clipboard."
        });
      }
    } catch {
      toast({
        title: "Unable to share",
        description: "Sharing is blocked on this device.",
        variant: "destructive"
      });
    }
  }, []);

  const triggerEmergencyMode = useCallback(async () => {
    setCategories(EMERGENCY_CATEGORY_IDS);
    setCustomCategories([]);
    setFilters((prev) => {
      if (prev.sortBy === "distance" && !prev.openNow && prev.minRating === 0) {
        return prev;
      }
      return { ...prev, sortBy: "distance", openNow: false, minRating: 0 };
    });
    setRadiusKm(3);
    setAdvancedOpen(false);

    if (location) {
      await runSearch(location, { forceNetwork: true, label: locationLabel || "Emergency mode" });
    } else {
      detectLocation();
    }
  }, [detectLocation, location, locationLabel, runSearch]);

  useEffect(() => {
    if (!hasSearched || !location) {
      return;
    }
    void runSearch(location);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefreshKey]);

  useEffect(() => {
    if (!hasMore || !listEndRef.current) {
      return;
    }
    const element = listEndRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !isLoading) {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, response?.places.length || prev + PAGE_SIZE));
        }
      },
      {
        rootMargin: "240px"
      }
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, [hasMore, isLoading, response?.places.length]);

  const favoritesCount = favoritesHydrated ? favorites.length : 0;

  return (
    <main className="min-h-screen bg-hero-light dark:bg-hero-dark">
      <header className="glass-header sticky top-0 z-50">
        <div className="container flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/12 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Premium Nearby Search
            </div>
            <h1 className="text-2xl font-semibold md:text-3xl">Nearby Finder</h1>
            <p className="text-sm text-muted-foreground">Find the right place fast with map-grade nearby intelligence.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Dialog open={favoritesOpen} onOpenChange={setFavoritesOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  Saved ({favoritesCount})
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] overflow-auto">
                <DialogHeader>
                  <DialogTitle>Saved Places</DialogTitle>
                  <DialogDescription>Your locally saved places in this browser.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  {favoritesCount === 0 ? (
                    <p className="text-sm text-muted-foreground">No saved places yet.</p>
                  ) : (
                    favorites.map((favorite) => (
                      <Card key={favorite.placeId}>
                        <CardContent className="space-y-2 p-4">
                          <p className="font-semibold">{favorite.name}</p>
                          <p className="text-sm text-muted-foreground">{favorite.address}</p>
                          <div className="flex items-center justify-between">
                            <Badge>{favorite.category}</Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setFavorites((prev) => prev.filter((item) => item.placeId !== favorite.placeId))}
                            >
                              Remove
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <section className="container py-5">
        <Card className="bg-card/85 backdrop-blur-md">
          <CardContent className="space-y-5 p-5 md:p-6">
            <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
              <div className="space-y-2">
                <Label>Search Mode</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant={searchMode === "place" ? "default" : "outline"} onClick={() => setSearchMode("place")}>
                    Place
                  </Button>
                  <Button variant={searchMode === "coords" ? "default" : "outline"} onClick={() => setSearchMode("coords")}>
                    Coordinates
                  </Button>
                </div>
              </div>

              {searchMode === "place" ? (
                <div className="space-y-2 md:col-span-1">
                  <Label htmlFor="placeName">Place name</Label>
                  <div className="relative flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="placeName"
                        placeholder="City, district, landmark..."
                        value={placeQuery}
                        onChange={(event) => {
                          setPlaceQuery(event.target.value);
                          setShowPlaceSuggestions(true);
                        }}
                        onFocus={() => {
                          if (placeSuggestions.length > 0) {
                            setShowPlaceSuggestions(true);
                          }
                        }}
                        onKeyDown={(event) => {
                          if (
                            showPlaceSuggestions &&
                            placeSuggestions.length > 0 &&
                            (event.key === "ArrowDown" || event.key === "ArrowUp")
                          ) {
                            event.preventDefault();
                            const nextIndex =
                              event.key === "ArrowDown"
                                ? Math.min(activeSuggestionIndex + 1, placeSuggestions.length - 1)
                                : Math.max(activeSuggestionIndex - 1, 0);
                            setActiveSuggestionIndex(nextIndex);
                            return;
                          }

                          if (
                            event.key === "Enter" &&
                            showPlaceSuggestions &&
                            activeSuggestionIndex >= 0 &&
                            placeSuggestions[activeSuggestionIndex]
                          ) {
                            event.preventDefault();
                            void selectPlaceSuggestion(placeSuggestions[activeSuggestionIndex]);
                            return;
                          }

                          if (event.key === "Escape") {
                            setShowPlaceSuggestions(false);
                            return;
                          }

                          if (event.key === "Enter") {
                            event.preventDefault();
                            void handleSearch();
                          }
                        }}
                      />

                      {showPlaceSuggestions && (placeSuggestions.length > 0 || isSuggestionLoading) ? (
                        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-72 overflow-auto rounded-xl border bg-card shadow-soft">
                          {isSuggestionLoading ? (
                            <div className="px-3 py-2 text-sm text-muted-foreground">Loading suggestions...</div>
                          ) : null}
                          {placeSuggestions.map((suggestion, index) => (
                            <button
                              key={suggestion.id}
                              type="button"
                              className={cn(
                                "w-full border-b px-3 py-2 text-left last:border-b-0 hover:bg-muted/70",
                                index === activeSuggestionIndex ? "bg-muted/70" : ""
                              )}
                              onMouseDown={(event) => {
                                event.preventDefault();
                                void selectPlaceSuggestion(suggestion);
                              }}
                            >
                              <p className="line-clamp-1 text-sm font-medium">{suggestion.label}</p>
                              <p className="line-clamp-1 text-xs text-muted-foreground">{suggestion.formattedAddress}</p>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <Button onClick={() => void handleSearch()} disabled={isLoading}>
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      Search
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 md:col-span-1">
                  <Label>Latitude & Longitude</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Latitude"
                      inputMode="decimal"
                      value={latitude}
                      onChange={(event) => setLatitude(event.target.value)}
                    />
                    <Input
                      placeholder="Longitude"
                      inputMode="decimal"
                      value={longitude}
                      onChange={(event) => setLongitude(event.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-end gap-2">
                {searchMode === "coords" ? (
                  <Button className="w-full" onClick={() => void handleSearch()} disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Search
                  </Button>
                ) : null}
                <Button variant="secondary" className="w-full md:w-auto" onClick={detectLocation} disabled={isLoading}>
                  <Crosshair className="h-4 w-4" />
                  Use Current
                </Button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="radius">Radius ({radiusKm} km)</Label>
                  <Badge variant="secondary">Auto-refresh enabled</Badge>
                </div>
                <input
                  id="radius"
                  type="range"
                  min={1}
                  max={50}
                  value={radiusKm}
                  onChange={(event) => setRadiusKm(clampRadius(Number(event.target.value)))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
                />
              </div>

              <div className="flex items-center gap-3 rounded-xl border bg-muted/35 p-3">
                <Switch
                  checked={filters.openNow}
                  onCheckedChange={(checked) =>
                    setFilters((prev) => (prev.openNow === checked ? prev : { ...prev, openNow: checked }))
                  }
                  aria-label="Open now filter"
                />
                <div>
                  <p className="text-sm font-medium">Open now</p>
                  <p className="text-xs text-muted-foreground">Only show currently open businesses</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>Categories</Label>
                <div className="flex gap-2">
                  <Dialog open={advancedOpen} onOpenChange={setAdvancedOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <SlidersHorizontal className="h-4 w-4" />
                        Advanced Filters
                      </Button>
                    </DialogTrigger>
	                    <DialogContent className="max-h-[85vh] overflow-auto">
	                      <DialogHeader>
	                        <DialogTitle>Advanced Filters</DialogTitle>
	                        <DialogDescription>Refine results by quality, availability, and completeness.</DialogDescription>
	                      </DialogHeader>

	                      <div className="space-y-5">
	                        <div className="space-y-2">
	                          <div className="flex items-center justify-between">
	                            <Label>Minimum rating ({filters.minRating.toFixed(1)}+)</Label>
	                            <Star className="h-4 w-4 text-amber-500" />
	                          </div>
	                          <input
	                            type="range"
	                            min={0}
	                            max={5}
	                            step={0.5}
	                            value={filters.minRating}
	                            onChange={(event) => {
	                              const nextRating = Number(event.target.value);
	                              setFilters((prev) =>
	                                prev.minRating === nextRating ? prev : { ...prev, minRating: nextRating }
	                              );
	                            }}
	                            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
	                          />
	                        </div>

	                        <div className="space-y-2">
	                          <Label>Sort by</Label>
	                          <select
	                            className="h-11 w-full rounded-xl border bg-background px-3 text-sm"
	                            value={filters.sortBy}
	                            onChange={(event) => {
	                              const nextSort = event.target.value as SearchFilters["sortBy"];
	                              setFilters((prev) => (prev.sortBy === nextSort ? prev : { ...prev, sortBy: nextSort }));
	                            }}
	                          >
	                            <option value="distance">Distance</option>
	                            <option value="rating">Rating</option>
	                            <option value="popularity">Popularity</option>
	                          </select>
	                        </div>

	                        <div className="space-y-3">
	                          <div className="flex items-center gap-3">
	                            <Switch
	                              checked={filters.openNow}
	                              onCheckedChange={(checked) =>
	                                setFilters((prev) => (prev.openNow === checked ? prev : { ...prev, openNow: checked }))
	                              }
	                            />
	                            <span className="text-sm">Open now only</span>
	                          </div>
	                          <div className="flex items-center gap-3">
	                            <Switch
	                              checked={filters.hasPhone}
	                              onCheckedChange={(checked) =>
	                                setFilters((prev) => (prev.hasPhone === checked ? prev : { ...prev, hasPhone: checked }))
	                              }
	                            />
	                            <span className="text-sm">Has phone number</span>
	                          </div>
	                          <div className="flex items-center gap-3">
	                            <Switch
	                              checked={filters.hasWebsite}
	                              onCheckedChange={(checked) =>
	                                setFilters((prev) =>
	                                  prev.hasWebsite === checked ? prev : { ...prev, hasWebsite: checked }
	                                )
	                              }
	                            />
	                            <span className="text-sm">Has website</span>
	                          </div>
	                        </div>

	                        <div className="rounded-xl border bg-muted/30 p-4">
	                          <p className="text-sm font-medium">Emergency Quick Mode</p>
	                          <p className="mt-1 text-xs text-muted-foreground">
	                            Instantly search Hospitals, Clinics, Pharmacies, and Police stations within 3km.
	                          </p>
	                          <Button
	                            variant="destructive"
	                            className="mt-3 w-full"
	                            onClick={() => void triggerEmergencyMode()}
	                          >
	                            <TriangleAlert className="h-4 w-4" />
	                            Activate Emergency Mode
	                          </Button>
	                        </div>
	                      </div>
	                    </DialogContent>
	                  </Dialog>
	
	                  <Button
	                    variant="outline"
	                    size="sm"
	                    onClick={() => {
	                      setFilters(defaultFilters);
	                      setCustomCategories([]);
	                    }}
	                  >
	                    Reset
	                  </Button>
	                </div>
	              </div>
	
	              <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
	                {CATEGORY_OPTIONS.map((option) => (
	                  <label
	                    key={option.id}
	                    className={cn(
	                      "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors",
	                      categories.includes(option.id) ? "border-primary bg-primary/10" : "hover:bg-muted/50"
	                    )}
	                  >
	                    <Checkbox
	                      checked={categories.includes(option.id)}
	                      onCheckedChange={() => toggleCategory(option.id)}
	                      aria-label={option.label}
	                    />
	                    <span>{option.label}</span>
	                  </label>
	                ))}
	              </div>
	
	              <div className="space-y-2">
	                <Label>Custom category</Label>
	                <div className="flex gap-2">
	                  <Input
	                    placeholder="e.g. dentist, yoga studio, coworking"
	                    value={customCategoryInput}
	                    onChange={(event) => setCustomCategoryInput(event.target.value)}
	                    onKeyDown={(event) => {
	                      if (event.key === "Enter") {
	                        event.preventDefault();
	                        addCustomCategory();
	                      }
	                    }}
	                  />
	                  <Button variant="secondary" onClick={addCustomCategory}>
	                    Add
	                  </Button>
	                </div>
	                {customCategories.length > 0 ? (
	                  <div className="flex flex-wrap gap-2">
	                    {customCategories.map((category) => (
	                      <Badge
	                        key={category}
	                        className="cursor-pointer"
	                        onClick={() => setCustomCategories((prev) => prev.filter((item) => item !== category))}
	                      >
	                        {category} x
	                      </Badge>
	                    ))}
	                  </div>
	                ) : null}
	              </div>
	            </div>
	          </CardContent>
	        </Card>
	      </section>
	
	      <section className="container pb-24 md:pb-8">
	        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
	          <div>
	            <p className="text-sm text-muted-foreground">
	              {locationLabel ? `Search center: ${locationLabel}` : "Search to start finding places nearby"}
	            </p>
	            <p className="text-base font-medium">
	              {response ? `${response.totalResults.toLocaleString()} results found` : "No search yet"}
	            </p>
	          </div>
	
	          <div className="inline-flex rounded-xl border bg-card p-1">
	            <Button
	              size="sm"
	              variant={viewMode === "list" ? "secondary" : "ghost"}
	              onClick={() => setViewMode("list")}
	            >
	              <List className="h-4 w-4" />
	              List
	            </Button>
	            <Button
	              size="sm"
	              variant={viewMode === "map" ? "secondary" : "ghost"}
	              onClick={() => setViewMode("map")}
	            >
	              <MapIcon className="h-4 w-4" />
	              Map
	            </Button>
	            <Button
	              size="sm"
	              variant={viewMode === "split" ? "secondary" : "ghost"}
	              onClick={() => setViewMode("split")}
	            >
	              <MapPinned className="h-4 w-4" />
	              Split
	            </Button>
	          </div>
	        </div>
	
	        {error ? (
	          <Card className="mb-4 border-destructive/40">
	            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
	              <div className="inline-flex items-start gap-2 text-sm text-destructive">
	                <AlertCircle className="mt-0.5 h-4 w-4" />
	                <span>{error}</span>
	              </div>
	              {location ? (
	                <Button variant="destructive" size="sm" onClick={() => void runSearch(location, { forceNetwork: true })}>
	                  Retry
	                </Button>
	              ) : null}
	            </CardContent>
	          </Card>
	        ) : null}
	
	        <div
	          className={cn(
	            "grid gap-4",
	            viewMode === "split"
	              ? "grid-cols-1 xl:grid-cols-[430px_1fr]"
	              : viewMode === "map"
	                ? "grid-cols-1"
	                : "grid-cols-1"
	          )}
	        >
	          {(viewMode === "list" || viewMode === "split") && (
	            <div className="space-y-3">
	              {isLoading && !response ? (
	                <>
	                  {Array.from({ length: 6 }).map((_, index) => (
	                    <PlaceCardSkeleton key={index} />
	                  ))}
	                </>
	              ) : null}
	
	              {!isLoading && response && response.places.length === 0 ? (
	                <Card className="border-dashed">
	                  <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
	                    <Compass className="h-8 w-8 text-muted-foreground" />
	                    <h3 className="text-lg font-semibold">No places found</h3>
	                    <p className="max-w-md text-sm text-muted-foreground">
	                      Try increasing radius, selecting different categories, or reducing strict filters.
	                    </p>
	                  </CardContent>
	                </Card>
	              ) : null}
	
	              <AnimatePresence>
	                {displayedPlaces.map((place) => (
	                  <PlaceCard
	                    key={place.placeId}
	                    place={place}
	                    selected={selectedPlaceId === place.placeId}
	                    isFavorite={favoriteSet.has(place.placeId)}
	                    onSelect={() => setSelectedPlaceId(place.placeId)}
	                    onSave={() => toggleFavorite(place)}
	                    onShare={() => void sharePlace(place)}
	                  />
	                ))}
	              </AnimatePresence>
	
	              {hasMore ? (
	                <div className="space-y-3">
	                  <div ref={listEndRef} />
	                  <Button variant="outline" className="w-full" onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}>
	                    Load more
	                  </Button>
	                </div>
	              ) : null}
	            </div>
	          )}
	
	          {(viewMode === "map" || viewMode === "split") && (
	            <Card className={cn("overflow-hidden p-0", viewMode === "split" ? "h-[72vh]" : "h-[78vh]")}>
	              <CardContent className="h-full p-0">
	                {response ? (
	                  <NearbyMap
	                    center={response.center}
	                    radiusKm={response.radiusKm}
	                    places={response.places}
	                    selectedPlaceId={selectedPlaceId}
	                    onSelectPlace={setSelectedPlaceId}
	                  />
	                ) : (
	                  <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
	                    <MapIcon className="h-8 w-8" />
	                    <p>Map preview appears after first search.</p>
	                  </div>
	                )}
	              </CardContent>
	            </Card>
	          )}
	        </div>
	      </section>
	
	      <motion.div
	        initial={{ y: 40, opacity: 0 }}
	        animate={{ y: 0, opacity: 1 }}
	        className="fixed bottom-3 left-0 right-0 z-40 px-4 md:hidden"
	      >
	        <Card className="mx-auto max-w-lg border-primary/25">
	          <CardContent className="flex items-center gap-2 p-3">
	            <Filter className="h-4 w-4 text-muted-foreground" />
	            <input
	              type="range"
	              min={1}
	              max={50}
	              value={radiusKm}
	              onChange={(event) => setRadiusKm(clampRadius(Number(event.target.value)))}
	              className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-muted accent-primary"
	            />
	            <Badge>{radiusKm}km</Badge>
	            <Button size="sm" variant="secondary" onClick={() => setAdvancedOpen(true)}>
	              <Filter className="h-4 w-4" />
	            </Button>
	          </CardContent>
	        </Card>
	      </motion.div>
	    </main>
	  );
}
