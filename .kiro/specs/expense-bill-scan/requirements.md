# Requirements Document

## Introduction

The Expense Bill Scan feature adds a "Scan Bill" capability to the existing Add Expense dialog in the group travel planning app. Users can upload a photo of a bill or receipt, which is sent to an AI vision model via the OpenRouter API. The AI extracts key expense fields (amount, description/merchant name, date, and category) and pre-fills the expense form. Users can review and edit the extracted values before submitting the expense as normal.

## Glossary

- **Bill_Scanner**: The client-side component responsible for accepting image input and triggering the scan workflow.
- **Scan_API**: The Next.js API route (`/api/ai/scan-bill`) that receives the image, calls the OpenRouter vision model, and returns extracted expense data.
- **Extracted_Data**: The structured object returned by the AI containing `amount`, `description`, `date`, and `category` fields.
- **AddExpenseDialog**: The existing dialog component at `src/components/trip/detail/Expenses/AddExpenseDialog.tsx` that contains the expense form.
- **OpenRouter**: The third-party AI gateway used to call vision-capable language models.
- **Expense_Form**: The set of fields (amount, description, category, date, paid_by, split_between) within the AddExpenseDialog.

---

## Requirements

### Requirement 1: Scan Bill Entry Point

**User Story:** As a trip member, I want a "Scan Bill" button in the Add Expense dialog, so that I can initiate bill scanning without leaving the expense creation flow.

#### Acceptance Criteria

1. THE AddExpenseDialog SHALL display a "Scan Bill" button when in "add new expense" mode (not edit mode).
2. WHEN the user clicks the "Scan Bill" button, THE Bill_Scanner SHALL open a file picker accepting image file types (JPEG, PNG, WEBP, HEIC).
3. THE Bill_Scanner SHALL accept image files up to 10 MB in size.
4. IF the user selects a file exceeding 10 MB, THEN THE Bill_Scanner SHALL display an error message indicating the file size limit.
5. IF the user selects a file with an unsupported type, THEN THE Bill_Scanner SHALL display an error message listing the accepted formats.

---

### Requirement 2: Image Upload and AI Extraction

**User Story:** As a trip member, I want the app to send my bill photo to an AI model, so that expense fields are extracted automatically without manual entry.

#### Acceptance Criteria

1. WHEN a valid image file is selected, THE Bill_Scanner SHALL send the image to the Scan_API as a base64-encoded payload.
2. WHEN the Scan_API receives a request, THE Scan_API SHALL forward the image to the OpenRouter vision model with a structured extraction prompt.
3. THE Scan_API SHALL request the following fields from the AI: total amount (numeric), merchant name or description (string), date (ISO 8601 date string), and expense category (one of: food, travel, accommodation, activities, others).
4. WHEN the OpenRouter API returns a successful response, THE Scan_API SHALL parse the response and return a JSON object containing `amount`, `description`, `date`, and `category`.
5. IF the OpenRouter API returns an error response, THEN THE Scan_API SHALL return an HTTP 502 error with a descriptive message.
6. IF the AI response cannot be parsed into the expected structure, THEN THE Scan_API SHALL return an HTTP 422 error with a descriptive message.
7. THE Scan_API SHALL respond within 30 seconds; IF the OpenRouter API does not respond within 30 seconds, THEN THE Scan_API SHALL return an HTTP 504 error.

---

### Requirement 3: Form Pre-fill from Extracted Data

**User Story:** As a trip member, I want the extracted bill data to pre-fill the expense form fields, so that I can review and submit the expense with minimal manual input.

#### Acceptance Criteria

1. WHEN THE Scan_API returns Extracted_Data, THE AddExpenseDialog SHALL populate the `amount` field with the extracted numeric amount.
2. WHEN THE Scan_API returns Extracted_Data, THE AddExpenseDialog SHALL populate the `description` field with the extracted merchant name or description.
3. WHEN THE Scan_API returns Extracted_Data, THE AddExpenseDialog SHALL populate the `date` field with the extracted date if it is a valid date; IF the extracted date is absent or invalid, THEN THE AddExpenseDialog SHALL retain the current date value.
4. WHEN THE Scan_API returns Extracted_Data, THE AddExpenseDialog SHALL set the `category` field to the extracted category if it matches a valid category value; IF the extracted category does not match a valid value, THEN THE AddExpenseDialog SHALL retain the current category value.
5. AFTER pre-filling, THE AddExpenseDialog SHALL leave the `paid_by` and `split_between` fields unchanged.
6. AFTER pre-filling, THE AddExpenseDialog SHALL allow the user to edit any pre-filled field before submitting.

---

### Requirement 4: Scanning State and User Feedback

**User Story:** As a trip member, I want clear visual feedback during and after the scan process, so that I know the status of the operation at all times.

#### Acceptance Criteria

1. WHILE the Scan_API request is in progress, THE Bill_Scanner SHALL display a loading indicator and disable the "Scan Bill" button.
2. WHILE the Scan_API request is in progress, THE Bill_Scanner SHALL disable the form submit button to prevent premature submission.
3. WHEN the scan completes successfully, THE AddExpenseDialog SHALL display a success notification indicating that fields have been pre-filled.
4. IF the scan fails for any reason, THEN THE AddExpenseDialog SHALL display an error notification with a human-readable message.
5. IF the scan fails, THEN THE AddExpenseDialog SHALL restore the "Scan Bill" button to its enabled state so the user can retry.
6. WHEN the scan completes (success or failure), THE Bill_Scanner SHALL re-enable the form submit button.

---

### Requirement 5: Scan API Authentication and Security

**User Story:** As a system operator, I want the Scan API to be protected, so that only authenticated users of the app can trigger AI vision calls.

#### Acceptance Criteria

1. THE Scan_API SHALL require a valid Supabase session cookie on every request.
2. IF a request to the Scan_API does not include a valid session, THEN THE Scan_API SHALL return an HTTP 401 response.
3. THE Scan_API SHALL NOT expose the OpenRouter API key to the client.
4. THE Scan_API SHALL validate that the uploaded image payload is a valid base64-encoded string before forwarding it to OpenRouter.
5. IF the base64 payload is malformed or empty, THEN THE Scan_API SHALL return an HTTP 400 response.
