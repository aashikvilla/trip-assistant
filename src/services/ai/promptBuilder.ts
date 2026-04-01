import type { N8NComprehensiveRequest, N8NComprehensiveOutput } from "@/types/n8n";

/**
 * Builds the system prompt for Claude itinerary generation.
 */
export function buildSystemPrompt(): string {
  return `You are an expert travel planner. Given trip details, travelers, and preferences, generate a detailed day-by-day itinerary.

You MUST respond with valid JSON matching this exact structure — no markdown, no explanation, just the JSON object:

{
  "hotel_recommendations": [
    {
      "name": "Hotel Name",
      "location": "Area/Neighborhood, City",
      "description": "Why this hotel fits the trip style and budget",
      "link": "https://booking-link-or-empty-string"
    }
  ],
  "itinerary": [
    {
      "day_number": 1,
      "title": "Day title/theme",
      "activities": [
        {
          "time_slot": "9:00 AM - 11:00 AM",
          "activity_name": "Activity name",
          "description": "What to do and why it's great",
          "food_suggestion": "Nearby restaurant or food recommendation (or null)",
          "link": "https://relevant-link-or-null"
        }
      ]
    }
  ],
  "closing_note": "A brief, friendly closing note about the trip"
}

Rules:
- Generate 3-5 activities per day with realistic time slots
- Include 2-3 hotel recommendations matching the budget
- time_slot format: "H:MM AM - H:MM PM" (12-hour)
- Respect dietary restrictions in food suggestions
- Incorporate must-do activities naturally into the schedule
- Match the vibe and travel style in your recommendations
- Be specific with real place names, not generic suggestions`;
}

/**
 * Builds the user prompt from trip request data.
 */
export function buildUserPrompt(request: N8NComprehensiveRequest): string {
  const { trip_details, travelers, global_preferences } = request;

  const parts: string[] = [
    `Plan a ${trip_details.trip_length_days}-day trip to ${trip_details.destinations.join(", ") || "an unspecified destination"}.`,
    `Trip name: "${trip_details.trip_name}"`,
    `Dates: ${trip_details.travel_dates.start_date} to ${trip_details.travel_dates.end_date}`,
    `Travel style: ${trip_details.travel_style}`,
    `Vibe: ${trip_details.vibe}`,
    `Budget: ${trip_details.budget}`,
  ];

  if (trip_details.activity_level) {
    parts.push(`Activity level: ${trip_details.activity_level}`);
  }

  if (trip_details.must_do.length > 0) {
    parts.push(`Must-do activities: ${trip_details.must_do.join(", ")}`);
  }

  if (trip_details.description) {
    parts.push(`Description: ${trip_details.description}`);
  }

  if (travelers.length > 0) {
    parts.push(`\nTravelers (${travelers.length}):`);
    travelers.forEach((t) => {
      const interests = t.interests.length > 0 ? t.interests.join(", ") : "none specified";
      const dietary = t.dietary_restrictions.length > 0 ? t.dietary_restrictions.join(", ") : "none";
      parts.push(`- ${t.id}: interests=[${interests}], dietary=[${dietary}]`);
    });
  }

  if (global_preferences.dietary.length > 0) {
    parts.push(`\nGroup dietary restrictions: ${global_preferences.dietary.join(", ")}`);
  }

  return parts.join("\n");
}

/**
 * Parses Claude's JSON response into the expected output shape.
 * Throws if the response is not valid JSON or missing required fields.
 */
export function parseAIResponse(text: string): N8NComprehensiveOutput {
  // Strip markdown code fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  const parsed = JSON.parse(cleaned);

  // Validate required top-level fields
  if (!parsed.itinerary || !Array.isArray(parsed.itinerary)) {
    throw new Error("AI response missing 'itinerary' array");
  }

  return {
    hotel_recommendations: Array.isArray(parsed.hotel_recommendations)
      ? parsed.hotel_recommendations.map((h: Record<string, unknown>) => ({
          name: String(h.name || ""),
          location: String(h.location || ""),
          description: String(h.description || ""),
          link: h.link ? String(h.link) : undefined,
        }))
      : [],
    itinerary: parsed.itinerary.map((day: Record<string, unknown>, i: number) => ({
      day_number: Number(day.day_number) || i + 1,
      title: String(day.title || `Day ${i + 1}`),
      activities: Array.isArray(day.activities)
        ? day.activities.map((a: Record<string, unknown>) => ({
            time_slot: String(a.time_slot || ""),
            activity_name: String(a.activity_name || "Untitled"),
            description: String(a.description || ""),
            food_suggestion: a.food_suggestion ? String(a.food_suggestion) : null,
            link: a.link ? String(a.link) : undefined,
          }))
        : [],
    })),
    closing_note: String(parsed.closing_note || ""),
  };
}
