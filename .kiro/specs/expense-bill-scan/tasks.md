# Tasks

## Task List

- [ ] 1. Create the Scan Bill API route
  - [ ] 1.1 Create `src/app/api/ai/scan-bill/route.ts` with POST handler
  - [ ] 1.2 Add Supabase SSR session authentication (return 401 if unauthenticated)
  - [ ] 1.3 Validate request body (`imageBase64` non-empty string, `mimeType` in allowed list)
  - [ ] 1.4 Build OpenRouter vision request with base64 image data URL and extraction prompt
  - [ ] 1.5 Parse and validate the AI JSON response (amount, description, date, category)
  - [ ] 1.6 Return structured `ExtractedExpenseData` or appropriate error codes (400/401/422/502/504)

- [ ] 2. Create the `useBillScan` hook
  - [ ] 2.1 Create `src/hooks/useBillScan.ts` with `scan(file: File)` function and `isScanning` state
  - [ ] 2.2 Implement `FileReader` base64 encoding of the selected file
  - [ ] 2.3 POST to `/api/ai/scan-bill` and return parsed `ExtractedExpenseData`
  - [ ] 2.4 Throw descriptive errors on non-2xx responses for caller to handle

- [ ] 3. Create the `BillScanButton` component
  - [ ] 3.1 Create `src/components/trip/detail/Expenses/BillScanButton.tsx`
  - [ ] 3.2 Render button with `ScanLine` icon and hidden file input (accept jpeg/png/webp/heic)
  - [ ] 3.3 Validate file size ≤ 10 MB and MIME type on selection; call `onError` if invalid
  - [ ] 3.4 Call `useBillScan.scan()` on valid file; show `Loader2` spinner while scanning
  - [ ] 3.5 Call `onExtracted` with result on success; call `onError` with message on failure

- [ ] 4. Integrate `BillScanButton` into `AddExpenseDialog`
  - [ ] 4.1 Import and render `<BillScanButton>` above the Amount field (hidden when `isEditing`)
  - [ ] 4.2 Implement `handleScanExtracted` to merge `ExtractedExpenseData` into `formData` with fallback rules
  - [ ] 4.3 Disable the form submit button while `isScanning` is true
  - [ ] 4.4 Show success toast when fields are pre-filled; show error toast on scan failure

- [ ] 5. Add environment variable documentation
  - [ ] 5.1 Add `OPENROUTER_VISION_MODEL` to `.env.example` with default value and comment
