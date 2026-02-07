# URL Streaming Redesign - Architecture & Frontend Plan

## Current Problems

### 1. Architecture: Massively Duplicated Infrastructure
The `useUrlStreamIntegration` hook (372 lines) recreates ~80% of what `VoiceControls` already does:
- Creates its **own** AudioContext + AudioWorklet (duplicate of VoiceControls)
- Sets up its **own** WebSocket connection handlers (transcript, error, close, connect)
- Manages its **own** set of refs (audioContextRef, audioWorkletNodeRef, connectionRef, etc.)
- Duplicates transcript processing, message creation, and state management

**The core audio pipeline is identical**: AudioSource -> AudioWorkletNode -> WebSocket. The only difference is the source (microphone vs. URL AudioBuffer).

### 2. UX: Dialog + Tabs Is Wrong
- URL streaming is buried inside a dialog behind the upload button, under a "Stream URL" tab
- User has to: click upload icon -> switch to URL tab -> paste URL -> click Stream -> dialog auto-closes
- No visual feedback on the main UI about what's streaming or progress
- Disjointed from the microphone workflow - feels like a separate feature

### 3. State Coupling Issues
- `useUrlStreamIntegration` manipulates `microphoneState` in `audioState` (setting it to "connecting"/"streaming") - leaking URL concerns into microphone state
- The `currentAudioSource` field exists but the VoiceControls component barely uses it
- Handler setup uses `handlersSetupRef` boolean which prevents re-registering handlers, but also means stale closures over `url` variable

### 4. CSS: Hardcoded Colors & !important Abuse
- Both UrlInputPanel.css and UploadDropzone.css use `!important` excessively
- Hardcoded hex colors instead of CSS variables
- Monospace font stack repeated in every single class

---

## Proposed Approach: Unified Audio Source Architecture

### Core Idea
Instead of a separate hook + component, **unify URL streaming into the existing VoiceControls pipeline** with a new "source selector" UX.

### Architecture Changes

#### A. Eliminate `useUrlStreamIntegration` entirely
Merge URL streaming capability directly into `VoiceControls` by extracting just the URL-specific logic (fetch + decode) from `useUrlStream` and using it as an alternative audio source within the existing `startRecording` flow.

**New flow:**
1. User provides a URL (via new inline input, not dialog)
2. `VoiceControls.startRecording()` gets an optional `audioSource` parameter
3. If source is "url", fetch + decode the audio, then connect the `AudioBufferSourceNode` to the same `audioWorkletNode` that microphone uses
4. All downstream logic (connection handlers, transcript processing, message creation) stays identical

#### B. Simplify `useUrlStream` hook
Keep only the pure utility functions:
- `validateUrl()` - URL format validation
- `fetchAndDecodeAudio()` - fetch URL, decode to AudioBuffer
- `stopUrlStream()` - stop an AudioBufferSourceNode

Remove all state management (`status`, `error` atoms) - let VoiceControls handle that.

#### C. New `audioState` shape (minimal changes)
```typescript
// Keep existing fields, just use currentAudioSource more consistently
currentAudioSource: "microphone" | "url" | "idle"
streamingUrl?: string | null  // Already exists
// REMOVE: No need for special "streaming" microphoneState -
// just use "connected" for both mic and URL
```

### Frontend / UX Changes

#### D. Replace Dialog-based URL input with inline collapsible panel
Instead of URL input being inside the upload dialog:

**New layout in the bottom control bar:**
```
[Upload] [URL input field (collapsible)] -------- [Mic Button]
```

- Small link/globe icon next to the upload button
- Clicking it reveals a sleek inline URL input field that slides in from the left
- Pressing Enter or clicking the stream button starts streaming
- The mic button changes to show "URL streaming" state (same as recording, but with globe icon overlay)
- Clicking the mic button while URL streaming stops it

#### E. Visual Design Direction: "Industrial Control Panel"
Match the existing app's black/white/mono aesthetic but with more intentional design:

**URL Input Panel (inline, not dialog):**
- Flush with the bottom control bar
- Monochrome with sharp borders matching existing buttons
- Compact: single row - icon | input | action button
- Animated state transitions (slide-in, pulse on streaming)
- Progress indicator during fetch/decode phases

**States shown on mic button:**
- Idle: current gray
- Ready: current style
- Recording (mic): current red
- Streaming (URL): green ring with globe icon overlay
- Fetching URL: amber pulsing ring

### Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useUrlStream.ts` | Simplify to pure utility functions only (no state) |
| `src/hooks/useUrlStreamIntegration.ts` | **DELETE** - merge into VoiceControls |
| `src/components/voice/VoiceControls.tsx` | Add URL source support to existing recording pipeline |
| `src/components/voice/VoiceControls.css` | Add URL streaming states |
| `src/components/voice/UrlInputPanel.tsx` | Redesign as inline collapsible panel |
| `src/components/voice/UrlInputPanel.css` | Redesign styling |
| `src/components/voice/UploadDropzone.tsx` | Remove URL tab (file upload only) |
| `src/components/voice/UploadDropzone.css` | Remove tab styles, simplify |
| `src/state/audio.ts` | Minor: remove "streaming" from MicrophoneState if not needed |
| `src/pages/Chat.tsx` | Update layout to include inline URL panel |
| `src/pages/Chat.css` | Update control bar layout |

### Implementation Sequence

1. **Simplify `useUrlStream.ts`** - Strip to pure utility functions
2. **Extend `VoiceControls`** - Add `startUrlRecording(url)` method that:
   - Creates AudioContext + Worklet (reuses existing)
   - Fetches + decodes URL audio
   - Connects AudioBufferSourceNode to existing worklet
   - Uses existing connection + handler pipeline
3. **Redesign `UrlInputPanel`** - Inline collapsible component
4. **Update `Chat.tsx` layout** - Place URL panel in control bar
5. **Clean up `UploadDropzone`** - Remove URL tab, back to file-upload only
6. **Delete `useUrlStreamIntegration.ts`**
7. **Update styles** - Unified design language

### Benefits
- ~400 lines of duplicated code eliminated
- Single audio pipeline to maintain and debug
- Better UX: URL input is always accessible, not buried in dialogs
- Consistent state management through one component
- Easier to add future audio sources (e.g., system audio capture)
