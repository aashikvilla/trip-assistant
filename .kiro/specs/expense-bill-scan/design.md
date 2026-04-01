# Design Document

## Overview

The Expense Bill Scan feature adds AI-powered receipt scanning to the existing `AddExpenseDialog`. A new "Scan Bill" button triggers an image upload flow. The image is base64-encoded client-side and sent to a new Next.js API route (`/api/ai/scan-bill`) which calls an OpenRouter vision model. The extracted fields are used to pre-fill the expense form.

The design follows the same OpenRouter integration pattern already used in `/api/ai/generate-itinerary/route.ts`.

---

## Architecture

```
AddExpenseDialog
  └── BillScanButton (new component)
        │  (user selects image file)
        ▼
  useBillScan hook
        │  POST /api/ai/scan-bill  { imageBase64, mimeType }
        ▼
  /api/ai/scan-bill/route.ts
        │  Validates session (Supabase SSR)
        │  Calls OpenRouter vision model
        ▼
  OpenRouter API  →  returns ExtractedExpenseData
        │
        ▼
  AddExpenseDialog  ←  pre-fills form fields
```

---

## Components

### 1. `BillScanButton` — `src/components/trip/detail/Expenses/BillScanButton.tsx`

A self-contained button + hidden file input. Handles file validation (type, size) and delegates to the `useBillScan` hook.

Props:
```ts
interface BillScanButtonProps {
  onExtracted: (data: ExtractedExpenseData) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}
```

Responsibilities:
- Renders a `<Button variant="outline">` with a `ScanLine` icon
- Holds a hidden `<input type="file" accept="image/jpeg,image/png,image/webp,image/heic">` 
- Validates file size ≤ 10 MB and MIME type before calling the hook
- Shows a `Loader2` spinner while scanning is in progress

### 2. `useBillScan` hook — `src/hooks/useBillScan.ts`

Encapsulates the async scan logic.

```ts
interface ExtractedExpenseData {
  amount?: number;
  description?: string;
  date?: string;       // ISO 8601 date string YYYY-MM-DD
  category?: 'food' | 'travel' | 'accommodation' | 'activities' | 'others';
}

function useBillScan(): {
  scan: (file: File) => Promise<ExtractedExpenseData>;
  isScanning: boolean;
}
```

- Reads the file as base64 using `FileReader`
- POSTs `{ imageBase64: string, mimeType: string }` to `/api/ai/scan-bill`
- Returns the parsed `ExtractedExpenseData`
- Throws on non-2xx responses (caller handles error display)

### 3. `AddExpenseDialog` — modified

Changes to the existing component:
- Import and render `<BillScanButton>` above the Amount field (only when `!isEditing`)
- Add `handleScanExtracted(data: ExtractedExpenseData)` which merges extracted fields into `formData` using the fallback rules from Requirement 3
- Pass `disabled={isLoading || isScanning}` to the submit button while scanning

```ts
const handleScanExtracted = (data: ExtractedExpenseData) => {
  setFormData(prev => ({
    ...prev,
    amount: data.amount != null ? data.amount.toString() : prev.amount,
    description: data.description ?? prev.description,
    date: data.date && isValidDate(data.date) ? data.date : prev.date,
    category: VALID_CATEGORIES.includes(data.category as any)
      ? (data.category as Category)
      : prev.category,
  }));
};
```

---

## API Route

### `POST /api/ai/scan-bill` — `src/app/api/ai/scan-bill/route.ts`

**Request body:**
```json
{
  "imageBase64": "<base64 string>",
  "mimeType": "image/jpeg"
}
```

**Response (200):**
```json
{
  "amount": 42.50,
  "description": "Sushi Palace",
  "date": "2024-07-15",
  "category": "food"
}
```

**Error responses:** 400, 401, 422, 502, 504

**Implementation steps:**

1. Authenticate via Supabase SSR (`createServerClient` from `@supabase/ssr`) — return 401 if no session.
2. Parse and validate request body — return 400 if `imageBase64` is missing/empty or `mimeType` is not an accepted image type.
3. Build the OpenRouter request with a vision-capable model (default: `google/gemini-flash-1.5`; configurable via `OPENROUTER_VISION_MODEL` env var).
4. Send the image as an inline base64 data URL in the `image_url` content part.
5. Parse the JSON response from the model.
6. Return the structured `ExtractedExpenseData`.

**OpenRouter message structure:**
```json
{
  "model": "google/gemini-flash-1.5",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "image_url",
          "image_url": { "url": "data:image/jpeg;base64,<imageBase64>" }
        },
        {
          "type": "text",
          "text": "<extraction prompt>"
        }
      ]
    }
  ]
}
```

**Extraction prompt:**
```
You are a receipt parser. Extract the following fields from this receipt image and return ONLY valid JSON with no markdown or explanation:
{
  "amount": <total amount as a number, e.g. 42.50>,
  "description": "<merchant name or short description, max 60 chars>",
  "date": "<date in YYYY-MM-DD format, or null if not found>",
  "category": "<one of: food, travel, accommodation, activities, others>"
}
If a field cannot be determined, use null for that field.
```

**Parsing strategy:**
- Extract JSON from the model response using a regex (`/\{[\s\S]*\}/`) to handle any stray whitespace
- Validate `amount` is a positive number
- Validate `date` matches `YYYY-MM-DD` pattern
- Validate `category` is one of the five allowed values
- Return 422 if JSON cannot be extracted at all

---

## Data Flow

```
1. User clicks "Scan Bill"
2. File picker opens → user selects image
3. Client validates: size ≤ 10MB, type in [jpeg, png, webp, heic]
4. FileReader converts to base64
5. POST /api/ai/scan-bill { imageBase64, mimeType }
6. API authenticates session
7. API calls OpenRouter with image + prompt
8. OpenRouter returns JSON string
9. API parses + validates → returns ExtractedExpenseData
10. Client merges into formData (with fallbacks)
11. User reviews pre-filled form → submits normally
```

---

## Error Handling

| Scenario | API response | UI behaviour |
|---|---|---|
| No session | 401 | Toast: "Please sign in to scan bills" |
| File too large | (client-side) | Toast: "File must be under 10 MB" |
| Unsupported file type | (client-side) | Toast: "Please upload a JPEG, PNG, WEBP, or HEIC image" |
| Bad request body | 400 | Toast: "Invalid image data" |
| OpenRouter error | 502 | Toast: "AI service unavailable, please try again" |
| Parse failure | 422 | Toast: "Could not read receipt, please enter values manually" |
| Timeout | 504 | Toast: "Scan timed out, please try again" |

---

## Environment Variables

| Variable | Purpose | Default |
|---|---|---|
| `OPENROUTER_API_KEY` | Existing key, reused | — |
| `OPENROUTER_VISION_MODEL` | Vision model to use | `google/gemini-flash-1.5` |
| `NEXT_PUBLIC_APP_URL` | Referer header | `http://localhost:3000` |

---

## Correctness Properties

1. Round-trip safety: if the AI returns `null` for any field, the form field retains its previous value (no data loss).
2. Category invariant: the `category` field in `formData` is always one of the five valid enum values after a scan, regardless of AI output.
3. Date invariant: the `date` field in `formData` is always a valid `YYYY-MM-DD` string after a scan.
4. Idempotence: clicking "Scan Bill" a second time on the same image produces the same pre-filled values (AI response is deterministic for the same input at temperature 0).
5. Error isolation: a failed scan never clears or corrupts existing form field values.
