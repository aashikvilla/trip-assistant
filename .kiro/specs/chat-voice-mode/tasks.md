# Implementation Plan: Chat Voice Mode

## Overview

Tasks are ordered so every dependency is in place before its consumers: types/utilities → hooks → context → components → integration → database migration. The existing `useTripChat` hook and `ChatMessage` component are extended minimally; no existing behaviour is removed.

## Tasks

- [ ] 1. Extend data types and utilities
  - Add `'voice'` to the `message_type` union in `src/hooks/useTripChat.ts`
  - Add `VoiceMetadata` interface (`audio_url`, `duration_seconds`, `waveform_data`) to `src/hooks/useTripChat.ts`
  - Extend `sendMessage` mutationFn to accept and forward an optional `metadata` field to the Supabase insert
  - _Requirements: 2.3, 8.1, 8.2_

- [ ] 2. Waveform analysis utility
  - Create `src/lib/analyseWaveform.ts` exporting `analyseWaveform(blob: Blob, bars?: number): Promise<number[]>`
  - Decode audio with `OfflineAudioContext`, compute RMS per chunk, normalise to [0, 1], return array of length `bars` (default 40)
  - Return `[]` (empty array) when `OfflineAudioContext` is unavailable so callers can treat it as the fallback case
  - _Requirements: 5.1, 5.2, 5.4_

- [ ] 3. `useVoiceRecorder` hook
  - [ ] 3.1 Create `src/hooks/useVoiceRecorder.ts` with state machine: `idle | requesting | recording | processing | error`
    - `startRecording`: calls `getUserMedia`, creates `MediaRecorder` with preferred MIME type fallback chain (`audio/webm;codecs=opus` → `audio/ogg;codecs=opus` → `audio/mp4`)
    - Starts elapsed-second timer on recording start
    - Auto-stops at 120 seconds
    - _Requirements: 1.1, 1.2, 1.6, 7.1, 7.5_
  - [ ] 3.2 Implement `stopRecording` in the hook
    - Rejects (transitions to `idle`) if elapsed < 1 second, sets a 2-second hint message
    - Otherwise transitions to `processing`: calls `analyseWaveform`, uploads blob to Supabase Storage, calls `sendMessage`
    - On upload failure: transitions to `error`, retains blob for retry
    - Releases microphone stream after recording stops
    - _Requirements: 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 7.5_
  - [ ] 3.3 Implement `cancelRecording` and `retryUpload` in the hook
    - `cancelRecording`: stops MediaRecorder, discards blob, transitions to `idle`
    - `retryUpload`: re-attempts upload with retained blob, transitions `error → processing`
    - _Requirements: 1.7, 2.4_
  - [ ] 3.4 Expose `isSupported` boolean (checks `navigator.mediaDevices?.getUserMedia` and `window.MediaRecorder`)
    - _Requirements: 7.1, 7.2_

- [ ] 4. `VoicePlaybackContext`
  - Create `src/contexts/VoicePlaybackContext.tsx` with `activeMessageId` state and `setActiveMessageId` setter
  - Export `VoicePlaybackProvider` and `useVoicePlayback` hook
  - _Requirements: 4.5_

- [ ] 5. `useVoicePlayback` hook
  - Create `src/hooks/useVoicePlayback.ts`
  - Manages an `HTMLAudioElement` ref, `isPlaying`, `currentTime`, and `duration` state
  - On play: calls `setActiveMessageId(messageId)` via context; pauses and resets when `activeMessageId` changes to a different ID
  - Handles `ended` event: resets `currentTime` to 0, sets `isPlaying` to false
  - Handles load error: exposes `hasError` boolean for retry UI
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ] 6. `VoicePlayer` component
  - Create `src/components/trip/VoicePlayer.tsx`
  - Props: `audioUrl`, `durationSeconds`, `waveformData: number[] | null`, `isOwnMessage`, `messageId`
  - Renders: play/pause button (lucide `Play`/`Pause`), 40-bar waveform SVG/div, `mm:ss` duration label
  - Waveform: active bars (before playback position) use accent colour; inactive bars use muted colour; falls back to uniform bars when `waveformData` is null
  - Applies own-message / other-message colour scheme matching existing `ChatMessage` bubble styles
  - Error state: shows retry button when `hasError` is true
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 4.6_

- [ ] 7. `VoiceRecorderButton` component
  - Create `src/components/trip/VoiceRecorderButton.tsx`
  - Props: `tripId`, `replyToId?: string | null`, `onSent: () => void`
  - Uses `useVoiceRecorder` hook internally
  - Hold gesture: `onPointerDown` starts recording, `onPointerUp` stops, `onPointerLeave` cancels; `style={{ touchAction: 'none' }}` on button
  - Vibration API: 50 ms on start, 100 ms on stop (guarded by `navigator.vibrate` check)
  - Minimum touch target: 44 × 44 CSS pixels
  - States rendered:
    - `idle`: microphone icon (hidden when `isSupported` is false)
    - `recording`: pulsing red dot + elapsed timer + "Slide to cancel" label
    - `processing`: spinner
    - `error`: error icon + "Tap to retry" button
  - _Requirements: 1.1, 1.2, 1.3, 1.7, 1.8, 6.1, 6.2, 6.3, 6.4, 6.5, 7.2, 7.3, 7.4_

- [ ] 8. Integrate `VoicePlayer` into `ChatMessage`
  - In `src/components/trip/ChatMessage.tsx`, add a render branch for `message.message_type === 'voice'`
  - Cast `message.metadata` to `VoiceMetadata` and pass fields to `VoicePlayer`
  - Place the `VoicePlayer` inside the existing message bubble `div` in place of the text `<p>` element
  - _Requirements: 3.1, 3.4, 3.5_

- [ ] 9. Integrate `VoiceRecorderButton` and `VoicePlaybackProvider` into `TripChat`
  - In `src/components/trip/TripChat.tsx`:
    - Wrap the messages container with `<VoicePlaybackProvider>`
    - Add `<VoiceRecorderButton>` to the input row, to the left of the text `Input`
    - Pass `replyToMessage` as `replyToId` to `VoiceRecorderButton`
    - Call `setReplyToMessage(null)` in `VoiceRecorderButton.onSent`
  - _Requirements: 1.3, 3.5, 6.2_

- [ ] 10. Database migration
  - Create `supabase/migrations/<timestamp>_add_voice_message_type.sql`
  - Alter `trip_messages` check constraint to include `'voice'`
  - Create `voice-messages` Supabase Storage bucket (non-public)
  - Add Storage RLS policies: trip members can SELECT, authenticated trip members can INSERT
  - _Requirements: 8.1, 8.3, 8.4, 2.5_

- [ ] 11. Checkpoint — end-to-end smoke test
  - Verify: record → upload → send → realtime delivery → playback works in a local dev environment
  - Verify: unsupported browser hides the record button without errors
  - Verify: permission denied shows correct error message
  - Ask the user if any issues arise before closing the spec.

## Notes

- No new npm packages are required; all APIs (MediaRecorder, Web Audio, Vibration, Pointer Events) are browser-native.
- The `metadata` column already exists on `trip_messages` as JSONB; only the check constraint on `message_type` needs updating.
- The `analyseWaveform` utility should be tested with a short silent audio blob to verify the normalisation and round-trip properties.
- Keep `VoicePlayer` and `VoiceRecorderButton` as separate files to allow independent unit testing.
- All Supabase Storage uploads use the authenticated client (not the service-role key) so RLS policies are enforced.
