import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/integrations/supabase/server";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const VALID_CATEGORIES = ["food", "travel", "accommodation", "activities", "others"] as const;
type Category = (typeof VALID_CATEGORIES)[number];

interface ExtractedExpenseData {
  amount?: number;
  description?: string;
  date?: string;
  category?: Category;
}

function isValidBase64(str: string): boolean {
  if (!str || str.trim() === "") return false;
  try {
    return btoa(atob(str)) === str;
  } catch {
    // btoa/atob strict check may fail for valid padded base64; fallback regex
    return /^[A-Za-z0-9+/]*={0,2}$/.test(str) && str.length > 0;
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  // 1. Authenticate
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse and validate body
  let imageBase64: string;
  let mimeType: string;

  try {
    const body = (await request.json()) as { imageBase64?: unknown; mimeType?: unknown };
    imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64 : "";
    mimeType = typeof body.mimeType === "string" ? body.mimeType : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!imageBase64 || !isValidBase64(imageBase64)) {
    return NextResponse.json({ error: "imageBase64 is missing or malformed" }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return NextResponse.json(
      { error: `mimeType must be one of: ${ALLOWED_MIME_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  // 3. Call OpenRouter vision model
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI service not configured" }, { status: 502 });
  }

  const model = process.env.OPENROUTER_VISION_MODEL ?? "google/gemini-flash-1.5";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const extractionPrompt = `You are a receipt parser. Extract the following fields from this receipt image and return ONLY valid JSON with no markdown or explanation:
{
  "amount": <total amount as a number, e.g. 42.50>,
  "description": "<merchant name or short description, max 60 chars>",
  "date": "<date in YYYY-MM-DD format, or null if not found>",
  "category": "<one of: food, travel, accommodation, activities, others>"
}
If a field cannot be determined, use null for that field.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 29_000);

  let openRouterResponse: Response;
  try {
    openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": appUrl,
        "X-Title": "Vibe Trip",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${imageBase64}` },
              },
              {
                type: "text",
                text: extractionPrompt,
              },
            ],
          },
        ],
      }),
    });
  } catch (err: unknown) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json({ error: "Scan timed out, please try again" }, { status: 504 });
    }
    return NextResponse.json({ error: "AI service unavailable, please try again" }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }

  if (!openRouterResponse.ok) {
    return NextResponse.json({ error: "AI service unavailable, please try again" }, { status: 502 });
  }

  // 4. Parse AI response
  let rawContent: string;
  try {
    const json = (await openRouterResponse.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    rawContent = json.choices?.[0]?.message?.content ?? "";
  } catch {
    return NextResponse.json({ error: "Could not read receipt, please enter values manually" }, { status: 422 });
  }

  const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return NextResponse.json({ error: "Could not read receipt, please enter values manually" }, { status: 422 });
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Could not read receipt, please enter values manually" }, { status: 422 });
  }

  // 5. Validate and sanitise fields
  const result: ExtractedExpenseData = {};

  const rawAmount = parsed.amount;
  if (typeof rawAmount === "number" && isFinite(rawAmount) && rawAmount > 0) {
    result.amount = rawAmount;
  } else if (typeof rawAmount === "string") {
    const num = parseFloat(rawAmount);
    if (!isNaN(num) && num > 0) result.amount = num;
  }

  if (typeof parsed.description === "string" && parsed.description.trim() !== "") {
    result.description = parsed.description.trim().slice(0, 60);
  }

  if (typeof parsed.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) {
    result.date = parsed.date;
  }

  if (typeof parsed.category === "string" && (VALID_CATEGORIES as readonly string[]).includes(parsed.category)) {
    result.category = parsed.category as Category;
  }

  return NextResponse.json(result, { status: 200 });
}
