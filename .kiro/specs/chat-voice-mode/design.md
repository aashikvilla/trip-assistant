# Design Document: Chat Voice Mode

## Overview

This feature extends the existing `TripChat` component with a hold-to-record voice message capability. Audio is captured via the browser's MediaRecorder API, analysed with the Web Audio API to produce a waveform, uploaded to Supabase Storage, and sent as a `voice`-typed message. Playback is handled inline by a dedicated `VoicePlayer` component. The design reuses the existing `useTripChat` hook, `ChatMessage` component, and Supabase Realtime subscription with minimal changes.

### Key Design Decisions

- **No new API route**: Audio is uploaded directly from the browser to Supabase Storage using the JS client. This avoids proxying large binary payloads through a Next.js route handler.
- **Metadata in JSONB**: `audio_url`, `duration_seconds`, and `waveform_data` are stored in the existing `trip_messages.metadata` JSONB column, avoiding a schema migration for a new table.
- **Single active player**: A React context (`VoicePlaybackContext`) tracks the currently playing message ID so that starting a new player automatically pauses the previous one.
- **Hold gesture via pointer events**: Using `pointerdown`/`pointerup` with `touch-action: none` on the button covers both mouse and touch without duplicating handlers.
- **Waveform via OfflineAudioContext**: Computed client-side after recording stops; stored as a 40-element normalised float array in metadata.

---

## Architecture

```
TripChat
├── VoiceRecorderButton        (hold-to-record UI + MediaRecorder logic)
│   └── useVoiceRecorder       (hook: state machine for recording lifecycle)
├── ChatMessage
│   └── VoicePlayer            (playback UI for voice messages)
│       └── useVoicePlayback   (hook: Audio element + progress tracking)
└── VoicePlaybackContext       (React context: single active player coordination)
```

### Data Flow

```
[User holds button]
  → useVoiceRecorder: getUserMedia → MediaRecorder.start()
  → WHILE recording: elapsed timer, pulsing indicator
  → [User releases] → MediaRecorder.stop() → Blob
  → analyseWaveform(blob) → Float32Array[40]
  → supabase.storage.upload(path, blob)
  → useTripChat.sendMessage({ messageType: 'voice', metadata: { audio_url, duration_seconds, waveform_data } })
  → Supabase Realtime broadcasts INSERT to all subscribers
  → ChatMessage renders VoicePlayer with waveform + duration
```

---

## Components and Interfaces

### `useVoiceRecorder` hook

```typescript
// src/hooks/useVoiceRecorder.ts
type RecorderState = 'idle' | 'requesting' | 'recording' | 'processing' | 'error';

interface UseVoiceRecorderReturn {
  state: RecorderState;
  elapsedSeconds: number;
  errorMessage: string | null;
  isSupported: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;       // produces blob, triggers upload
  cancelRecording: () => void;     // discards blob
  retryUpload: () => Promise<void>;
}
```

State machine transitions:
- `idle` → `requesting` (startRecording called)
- `requesting` → `recording` (permission granted)
- `requesting` → `error` (permission denied)
- `recording` → `processing` (stopRecording called, ≥1 s elapsed)
- `recording` → `idle` (cancelRecording or <1 s)
- `processing` → `idle` (upload + send success)
- `processing` → `error` (upload failure, blob retained for retry)
- `error` → `processing` (retryUpload called)

### `VoiceRecorderButton` component

```typescript
// src/components/trip/VoiceRecorderButton.tsx
interface VoiceRecorderButtonProps {
  tripId: string;
  replyToId?: string | null;
  onSent: () => void;
}
```

Renders:
- Idle: microphone icon button (44×44 px minimum)
- Recording: pulsing red dot + elapsed timer + cancel affordance
- Processing: spinner
- Error: error icon + retry option

Hold gesture implementation:
```typescript
<button
  onPointerDown={handlePointerDown}
  onPointerUp={handlePointerUp}
  onPointerLeave={handlePointerLeave}   // cancel on slide-off
  style={{ touchAction: 'none' }}       // prevent scroll during hold
/>
```

### `VoicePlayer` component

```typescript
// src/components/trip/VoicePlayer.tsx
interface VoicePlayerProps {
  audioUrl: string;
  durationSeconds: number;
  waveformData: number[] | null;
  isOwnMessage: boolean;
  messageId: string;
}
```

Renders a row containing:
1. Play/Pause button (lucide `Play` / `Pause` icon)
2. Waveform bar chart (40 bars, active bars highlighted based on playback position)
3. Duration label (`mm:ss`)

### `VoicePlaybackContext`

```typescript
// src/contexts/VoicePlaybackContext.tsx
interface VoicePlaybackContextValue {
  activeMessageId: string | null;
  setActiveMessageId: (id: string | null) => void;
}
```

Wrap `TripChat` (or the messages container) with `VoicePlaybackProvider`. Each `VoicePlayer` calls `setActiveMessageId` on play and pauses itself when `activeMessageId` changes to a different ID.

### `analyseWaveform` utility

```typescript
// src/lib/analyseWaveform.ts
async function analyseWaveform(blob: Blob, bars = 40): Promise<number[]>
```

1. `blob.arrayBuffer()` → decode with `OfflineAudioContext`
2. Get `channelData` from decoded buffer
3. Split into `bars` equal chunks, compute RMS per chunk
4. Normalise to [0, 1] range
5. Return `number[]` of length `bars`

Falls back to `null` (caught by caller) if `OfflineAudioContext` is unavailable.

---

## Database Changes

### `trip_messages` message_type enum

Add `'voice'` to the allowed values. The existing `message_type` column uses a check constraint or Postgres enum. Migration:

```sql
-- If using a check constraint:
ALTER TABLE trip_messages
  DROP CONSTRAINT IF EXISTS trip_messages_message_type_check;

ALTER TABLE trip_messages
  ADD CONSTRAINT trip_messages_message_type_check
  CHECK (message_type IN ('text', 'image', 'poll', 'system', 'voice'));
```

### `trip_messages.metadata` JSONB shape for voice messages

```json
{
  "audio_url": "https://<project>.supabase.co/storage/v1/object/public/voice-messages/<tripId>/<messageId>.webm",
  "duration_seconds": 14,
  "waveform_data": [0.12, 0.45, 0.78, ...]
}
```

No new columns or tables are required.

### Supabase Storage bucket

```sql
-- Create bucket (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-messages', 'voice-messages', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: trip members can read files under their trip prefix
CREATE POLICY "Trip members can read voice messages"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'voice-messages'
  AND auth.uid() IN (
    SELECT user_id FROM trip_members
    WHERE trip_id = (storage.foldername(name))[1]::uuid
  )
);

-- RLS: authenticated users can upload to their trip prefix
CREATE POLICY "Authenticated users can upload voice messages"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'voice-messages'
  AND auth.uid() IS NOT NULL
  AND auth.uid() IN (
    SELECT user_id FROM trip_members
    WHERE trip_id = (storage.foldername(name))[1]::uuid
  )
);
```

---

## Changes to Existing Files

### `src/hooks/useTripChat.ts`

- Extend `ChatMessage.message_type` union: `'text' | 'image' | 'poll' | 'system' | 'voice'`
- Add `VoiceMetadata` interface:
  ```typescript
  interface VoiceMetadata {
    audio_url: string;
    duration_seconds: number;
    waveform_data: number[] | null;
  }
  ```
- Extend `sendMessage` mutationFn to accept `metadata?: Record<string, unknown>` and pass it to the Supabase insert.

### `src/components/trip/ChatMessage.tsx`

- Add a branch in the message body renderer:
  ```tsx
  {message.message_type === 'voice' && message.metadata && (
    <VoicePlayer
      audioUrl={(message.metadata as VoiceMetadata).audio_url}
      durationSeconds={(message.metadata as VoiceMetadata).duration_seconds}
      waveformData={(message.metadata as VoiceMetadata).waveform_data}
      isOwnMessage={isOwnMessage}
      messageId={message.message_id}
    />
  )}
  ```

### `src/components/trip/TripChat.tsx`

- Import and render `VoiceRecorderButton` next to the existing text `Input` + `Send` button.
- Wrap the messages container with `VoicePlaybackProvider`.
- Pass `replyToMessage` to `VoiceRecorderButton` so voice replies are threaded correctly.

---

## Correctness Properties

1. **Waveform round-trip**: `JSON.parse(JSON.stringify(waveformData))` produces an array equal in length and values to the original — verifies Requirement 5.3.
2. **Waveform normalisation**: Every value in the array returned by `analyseWaveform` is in [0, 1] — verifies Requirement 5.1.
3. **Minimum duration guard**: `stopRecording` called before 1 second elapsed discards the blob and transitions to `idle`, never reaching `processing` — verifies Requirement 1.5.
4. **Maximum duration auto-stop**: After 120 seconds the recorder transitions from `recording` to `processing` without user action — verifies Requirement 1.6.
5. **Single active player**: Setting `activeMessageId` to a new value causes any other `VoicePlayer` observing the context to pause — verifies Requirement 4.5.
6. **Upload path format**: The storage path for every uploaded file matches `{tripId}/{uuid}.{ext}` — verifies Requirement 2.1.
7. **Metadata shape**: Every `voice` message inserted into `trip_messages` has a `metadata` object containing `audio_url` (non-empty string), `duration_seconds` (positive number), and `waveform_data` (array or null) — verifies Requirement 2.3 and 8.2.
