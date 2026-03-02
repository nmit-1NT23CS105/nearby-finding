import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDistanceKm(meters: number) {
  if (!Number.isFinite(meters) || meters < 0) {
    return "N/A";
  }
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  const km = meters / 1000;
  const precision = km < 10 ? 2 : 1;
  return `${km.toFixed(precision)} km`;
}

export function formatRating(rating?: number | null, count?: number | null) {
  if (!rating) {
    return "No rating";
  }
  if (!count) {
    return `${rating.toFixed(1)} stars`;
  }
  return `${rating.toFixed(1)} (${count.toLocaleString()} reviews)`;
}

export function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

