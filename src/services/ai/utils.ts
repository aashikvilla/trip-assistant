import type { ParsedItinerary } from "./types";

/**
 * Strips markdown fences, thinking blocks, and trims whitespace from raw LLM output.
 * Extracts the first JSON object or array if surrounded by prose.
 */
export function cleanLLMOutput(raw: string): string {
  let cleaned = raw.trim();
  // Strip reasoning/thinking blocks emitted by models like Qwen3 and DeepSeek-R1
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  // Remove markdown code fences (```json ... ``` or ``` ... ```)
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
  // If the model added prose before/after the JSON, extract the JSON object or array
  const jsonStart = cleaned.search(/[{[]/);
  const jsonEnd = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
  if (jsonStart > 0 && jsonEnd > jsonStart) {
    cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
  }
  return cleaned.trim();
}

/**
 * Pretty-prints a ParsedItinerary as human-readable text.
 */
export function prettyPrint(itinerary: ParsedItinerary): string {
  const lines: string[] = [];
  for (const day of itinerary.days) {
    lines.push(`\nDay ${day.day}: ${day.title}`);
    if (day.morning) {
      if (day.morning.activities?.length) {
        lines.push(`  Morning: ${day.morning.activities.join(", ")}`);
      }
      if (day.morning.breakfast) {
        lines.push(`  Breakfast: ${day.morning.breakfast}`);
      }
    }
    if (day.afternoon) {
      if (day.afternoon.activities?.length) {
        lines.push(`  Afternoon: ${day.afternoon.activities.join(", ")}`);
      }
      if (day.afternoon.lunch) {
        lines.push(`  Lunch: ${day.afternoon.lunch}`);
      }
    }
    if (day.evening) {
      if (day.evening.activities?.length) {
        lines.push(`  Evening: ${day.evening.activities.join(", ")}`);
      }
      if (day.evening.dinner) {
        lines.push(`  Dinner: ${day.evening.dinner}`);
      }
    }
  }
  if (itinerary.closing_note) {
    lines.push(`\nNote: ${itinerary.closing_note}`);
  }
  return lines.join("\n");
}

/**
 * Returns current ISO timestamp string.
 */
export function now(): string {
  return new Date().toISOString();
}

/**
 * Strips PII (emails, UUIDs, phone numbers) from a string before sending to external APIs.
 */
export function sanitizePII(input: string): string {
  return input
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[email]")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "[uuid]")
    .replace(/(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, "[phone]");
}
