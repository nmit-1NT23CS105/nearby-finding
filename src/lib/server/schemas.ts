import { z } from "zod";

export const geocodeQuerySchema = z.object({
  query: z.string().min(2).max(200)
});

export const geocodeSuggestQuerySchema = z.object({
  query: z.string().min(2).max(200),
  limit: z.coerce.number().int().min(1).max(10).default(6)
});

export const searchRequestSchema = z.object({
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }),
  radiusKm: z.number().min(1).max(50),
  categories: z.array(z.string().min(1)).max(20),
  customCategories: z.array(z.string().min(1).max(60)).max(10).default([]),
  filters: z.object({
    openNow: z.boolean().default(false),
    minRating: z.number().min(0).max(5).default(0),
    sortBy: z.enum(["distance", "rating", "popularity"]).default("distance"),
    hasPhone: z.boolean().default(false),
    hasWebsite: z.boolean().default(false)
  }),
  pageToken: z.string().optional().nullable()
});
