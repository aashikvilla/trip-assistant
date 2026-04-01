import { z } from "zod";

export const ParsedItineraryDaySchema = z.object({
  day: z.number().int().positive(),
  title: z.string().min(1),
  morning: z
    .object({
      activities: z.array(z.string()).optional(),
      breakfast: z.string().optional(),
    })
    .optional(),
  afternoon: z
    .object({
      activities: z.array(z.string()).optional(),
      lunch: z.string().optional(),
    })
    .optional(),
  evening: z
    .object({
      activities: z.array(z.string()).optional(),
      dinner: z.string().optional(),
      local_travel: z.string().optional(),
    })
    .optional(),
  hotel_recommendations: z.array(z.string()).optional(),
});

export const ParsedItinerarySchema = z.object({
  days: z.array(ParsedItineraryDaySchema).min(1),
  closing_note: z.string().optional(),
});

export const SearchResultSchema = z.object({
  title: z.string(),
  url: z.string(),
  snippet: z.string(),
});

export const WebSearchOutputSchema = z.object({
  results: z.array(SearchResultSchema).max(10),
});

export type ParsedItineraryDayZod = z.infer<typeof ParsedItineraryDaySchema>;
export type ParsedItineraryZod = z.infer<typeof ParsedItinerarySchema>;
