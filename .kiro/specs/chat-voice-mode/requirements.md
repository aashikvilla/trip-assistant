# Requirements Document

## Introduction

This feature adds a voice message mode to the existing TripChat component in the group travel planning app. Users can hold a button to record audio using the browser's MediaRecorder API, upload the recording to Supabase Storage, and send it as a voice message in the chat. Other trip members can play back voice messages inline, with a waveform/progress bar and duration display. The hold-to-record interaction is optimised for mobile (native feel) while remaining fully functional on desktop.

## Glossary

- **Voice_Recorder**: The browser-side component responsible for capturing audio via the MediaRecorder API.
- **Voice_Message**: A chat message of type `voice` containing a reference to an uploaded audio file, its duration, and optional waveform data.
- **Voice_Player**: The inline playback component rendered inside a chat message bubble for voice messages.
- **Audio_Storage**: The Supabase Storage bucket used to persist recorded audio files.
- **TripChat**: The existing group chat component (`src/components/trip/TripChat.tsx`) that this feature extends.
- **Chat_Hook**: The `useTripChat` hook (`src/hooks/useTripChat.ts`) that manages message state and mutations.
- **Waveform**: A visual representation of audio amplitude over time, rendered as a series of bars or a SVG path.
- **Hold_Gesture**: A pointer-down / touch-start interaction held for the duration of recording, released to stop.

---

## Requirements

### Requirement 1: Record a Voice Message

**User Story:** As a trip member, I want to hold a button to record a voice message, so that I can communicate quickly without typing.

#### Acceptance Criteria

1. WHEN the user presses and holds the record button, THE Voice_Recorder SHALL begin capturing audio using the browser's MediaRecorder API with the `audio/webm;codecs=opus` MIME type, falling back to `audio/ogg;codecs=opus`, then `audio/mp4` if the preferred type is unsupported.
2. WHILE recording is active, THE Voice_Recorder SHALL display a live elapsed-time counter updated every second.
3. WHILE recording is active, THE TripChat SHALL display a visual recording indicator (pulsing red dot) visible to the user.
4. WHEN the user releases the record button after recording for at least 1 second, THE Voice_Recorder SHALL stop capturing and produce an audio Blob.
5. IF the user releases the record button before 1 second has elapsed, THEN THE Voice_Recorder SHALL discard the recording and display a "Hold longer to record" hint message for 2 seconds.
6. WHEN recording reaches 120 seconds, THE Voice_Recorder SHALL automatically stop capturing and proceed to send the message.
7. IF the user slides the pointer off the record button while holding, THEN THE Voice_Recorder SHALL cancel the recording and display a "Slide up to cancel" affordance during the gesture.
8. THE Voice_Recorder SHALL request microphone permission before the first recording attempt and SHALL display a descriptive error message if permission is denied.

---

### Requirement 2: Upload and Send a Voice Message

**User Story:** As a trip member, I want my recorded voice message to be uploaded and sent to the chat, so that other members can hear it.

#### Acceptance Criteria

1. WHEN a valid audio Blob is produced, THE Voice_Recorder SHALL upload the Blob to the `voice-messages` Supabase Storage bucket under the path `{tripId}/{messageId}.{ext}`.
2. WHILE the upload is in progress, THE TripChat SHALL display an upload progress indicator in place of the send button.
3. WHEN the upload completes successfully, THE Chat_Hook SHALL insert a row into `trip_messages` with `message_type = 'voice'` and `metadata` containing `{ audio_url, duration_seconds, waveform_data }`.
4. IF the upload fails, THEN THE TripChat SHALL display an error toast and retain the recorded audio Blob so the user can retry without re-recording.
5. THE Audio_Storage bucket SHALL enforce a maximum file size of 10 MB per upload.
6. THE Chat_Hook SHALL generate a client-side UUID for the message before upload so the storage path and message row share the same identifier.

---

### Requirement 3: Display Voice Messages in Chat

**User Story:** As a trip member, I want to see voice messages rendered inline in the chat, so that I can identify and play them easily.

#### Acceptance Criteria

1. WHEN a message with `message_type = 'voice'` is rendered, THE Voice_Player SHALL display a play/pause button, a waveform progress bar, and the total duration in `mm:ss` format.
2. THE Voice_Player SHALL render the waveform as a series of amplitude bars derived from `waveform_data` stored in the message metadata.
3. IF `waveform_data` is absent or malformed, THEN THE Voice_Player SHALL render a static placeholder waveform of uniform bar heights.
4. THE Voice_Player SHALL apply the same own-message / other-message colour scheme used by existing text message bubbles (blue gradient for own, white/blue-tinted for others).
5. WHEN a voice message is received via Supabase Realtime, THE TripChat SHALL render it immediately without requiring a page refresh.

---

### Requirement 4: Play Back a Voice Message

**User Story:** As a trip member, I want to play a voice message inline, so that I can listen without leaving the chat.

#### Acceptance Criteria

1. WHEN the user taps the play button on a Voice_Player, THE Voice_Player SHALL begin audio playback using the HTML `<audio>` element and update the progress bar in real time.
2. WHILE a voice message is playing, THE Voice_Player SHALL animate the progress bar to reflect the current playback position.
3. WHEN the user taps the pause button during playback, THE Voice_Player SHALL pause audio and retain the current playback position.
4. WHEN playback reaches the end of the audio, THE Voice_Player SHALL reset the progress bar to the start position and display the play button.
5. WHEN the user taps a different Voice_Player while another is playing, THE TripChat SHALL pause the currently playing message before starting the new one.
6. IF the audio URL is unreachable, THEN THE Voice_Player SHALL display an error state with a retry button.

---

### Requirement 5: Waveform Generation

**User Story:** As a trip member, I want to see a waveform that reflects the actual audio content, so that I can gauge the message before playing it.

#### Acceptance Criteria

1. WHEN recording stops, THE Voice_Recorder SHALL sample the audio Blob using the Web Audio API `OfflineAudioContext` and produce an array of 40 normalised amplitude values in the range [0, 1].
2. THE Voice_Recorder SHALL encode the amplitude array as a JSON array and store it in the `waveform_data` field of the message metadata.
3. FOR ALL valid `waveform_data` arrays, decoding the JSON and re-encoding SHALL produce an equivalent array (round-trip property).
4. IF the Web Audio API is unavailable, THEN THE Voice_Recorder SHALL store `null` for `waveform_data` and the Voice_Player SHALL render the static placeholder waveform.

---

### Requirement 6: Mobile Hold-to-Record UX

**User Story:** As a mobile user, I want the hold-to-record interaction to feel native, so that recording is intuitive and comfortable on a touchscreen.

#### Acceptance Criteria

1. THE Voice_Recorder SHALL respond to both `pointerdown`/`pointerup` events (desktop) and `touchstart`/`touchend` events (mobile) for the hold gesture.
2. WHILE recording on a touch device, THE TripChat SHALL prevent default scroll behaviour to avoid accidental page scrolls during recording.
3. THE record button SHALL have a minimum touch target size of 44 × 44 CSS pixels.
4. WHEN the user begins a hold gesture, THE TripChat SHALL provide haptic feedback via the Vibration API if available on the device.
5. WHERE the device supports the Vibration API, THE Voice_Recorder SHALL vibrate for 50 ms on recording start and 100 ms on recording stop.

---

### Requirement 7: Permissions and Browser Compatibility

**User Story:** As a developer, I want the feature to degrade gracefully on unsupported browsers, so that users on older browsers are not left with a broken UI.

#### Acceptance Criteria

1. WHEN the TripChat component mounts, THE Voice_Recorder SHALL check for `navigator.mediaDevices.getUserMedia` and `window.MediaRecorder` support.
2. IF MediaRecorder is not supported, THEN THE TripChat SHALL hide the record button and display no error to the user (silent degradation).
3. IF microphone permission is denied by the user, THEN THE Voice_Recorder SHALL display the message "Microphone access is required to send voice messages" and offer a link to browser settings.
4. IF microphone permission is denied by the browser policy, THEN THE Voice_Recorder SHALL display the message "Microphone access is blocked by your browser settings."
5. THE Voice_Recorder SHALL release the microphone stream by calling `MediaStream.getTracks().forEach(t => t.stop())` immediately after recording stops.

---

### Requirement 8: Data Model Extension

**User Story:** As a developer, I want the voice message data to be stored consistently with existing message types, so that the chat history remains coherent.

#### Acceptance Criteria

1. THE `trip_messages` table SHALL accept `message_type = 'voice'` as a valid enum value.
2. WHEN a voice message is stored, THE `trip_messages.metadata` JSONB column SHALL contain the fields `audio_url` (string), `duration_seconds` (number), and `waveform_data` (array of numbers or null).
3. THE `trip_messages` table RLS policies SHALL allow trip members to read voice messages for their trips and allow the message author to insert voice messages.
4. THE Audio_Storage bucket `voice-messages` SHALL have an RLS policy permitting authenticated trip members to read files under their trip's path prefix and permitting the uploader to insert files.
