"use client";

import { motion } from "framer-motion";
import {
  Clock3,
  ExternalLink,
  Globe,
  MapPinned,
  Navigation,
  Phone,
  Share2,
  Star,
  Heart,
  HeartOff
} from "lucide-react";
import { NearbyPlace } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceKm, formatRating } from "@/lib/utils";

export function PlaceCard({
  place,
  selected,
  isFavorite,
  onSelect,
  onSave,
  onShare
}: {
  place: NearbyPlace;
  selected: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onSave: () => void;
  onShare: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      layout
    >
      <Card
        className={`cursor-pointer border transition-all ${selected ? "border-primary ring-2 ring-primary/30" : "hover:border-primary/40"}`}
        onClick={onSelect}
      >
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h3 className="line-clamp-2 text-base font-semibold md:text-lg">{place.name}</h3>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="default">{place.category}</Badge>
                <Badge variant="secondary">{formatDistanceKm(place.distanceMeters)}</Badge>
              </div>
            </div>
            <div className="text-right text-sm">
              <div className="inline-flex items-center gap-1 text-amber-500">
                <Star className="h-4 w-4 fill-current" />
                <span className="font-medium text-foreground">{place.rating ? place.rating.toFixed(1) : "-"}</span>
              </div>
              <p className="text-xs text-muted-foreground">{place.reviewCount ? `${place.reviewCount} reviews` : "No reviews"}</p>
            </div>
          </div>

          <div className="space-y-1 text-sm text-muted-foreground">
            <p className="line-clamp-2">{place.address}</p>
            <p className="inline-flex items-center gap-2">
              <Clock3 className="h-4 w-4" />
              <span className={place.isOpen ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                {place.isOpen === null ? "Status unavailable" : place.isOpen ? "Open now" : "Closed now"}
              </span>
            </p>
            <p>{formatRating(place.rating, place.reviewCount)}</p>
          </div>

          <div className="grid gap-2 text-sm md:grid-cols-2">
            <div className="rounded-xl bg-muted/60 p-2">
              <p className="text-xs text-muted-foreground">Drive</p>
              <p className="font-medium">{place.travelTimes?.driving || "N/A"}</p>
            </div>
            <div className="rounded-xl bg-muted/60 p-2">
              <p className="text-xs text-muted-foreground">Walk</p>
              <p className="font-medium">{place.travelTimes?.walking || "N/A"}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            {place.phone ? (
              <a
                href={`tel:${place.phone}`}
                className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 hover:bg-muted"
                onClick={(event) => event.stopPropagation()}
              >
                <Phone className="h-4 w-4" />
                Call
              </a>
            ) : null}
            {place.website ? (
              <a
                href={place.website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 hover:bg-muted"
                onClick={(event) => event.stopPropagation()}
              >
                <Globe className="h-4 w-4" />
                Website
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
            {place.email ? (
              <a
                href={`mailto:${place.email}`}
                className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 hover:bg-muted"
                onClick={(event) => event.stopPropagation()}
              >
                Email
              </a>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                window.open(
                  place.mapsUrl ||
                    `https://www.google.com/maps/dir/?api=1&destination=${place.location.lat},${place.location.lng}`,
                  "_blank",
                  "noopener,noreferrer"
                );
              }}
            >
              <Navigation className="h-4 w-4" />
              Get Directions
            </Button>

            <Button
              variant={isFavorite ? "secondary" : "outline"}
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                onSave();
              }}
            >
              {isFavorite ? <HeartOff className="h-4 w-4" /> : <Heart className="h-4 w-4" />}
              {isFavorite ? "Unsave" : "Save"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                onShare();
              }}
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                window.open(
                  `https://www.google.com/maps/search/?api=1&query=${place.location.lat},${place.location.lng}`,
                  "_blank",
                  "noopener,noreferrer"
                );
              }}
            >
              <MapPinned className="h-4 w-4" />
              Map
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
