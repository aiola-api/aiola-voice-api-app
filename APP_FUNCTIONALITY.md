# aiOla Voice API App Functionality

This document provides an overview of the aiOla Voice API App's functionality and architecture to assist future agents in understanding the codebase.

## Feature List

### Voice Streaming

- **Initiation**: Clicking the microphone button triggers the following sequence:
  1.  **Session Creation**: If no session exists, a new session is created via the SDK.
  2.  **Connection**: A WebSocket connection is established with the aiOla Voice API.
  3.  **UI Update**: A user chat element is created in the conversation list with a "Recording..." status.
  4.  **Audio Pipeline**: The app accesses the microphone, sets up an `AudioWorklet`, and streams audio data to the socket.
  5.  **Transcription**: As partial transcripts arrive, the user chat element is updated in real-time.
  6.  **Structured Events**: Once processing is complete, a structured event message (containing extracted data) is displayed in the chat, followed by any system responses.

### Browser Detection

- **Automatic Detection**: On app load, the browser is automatically detected using the user agent string.
- **Supported Browsers**: ChatGPT-Atlas and Chrome are the only supported browsers.
- **Unsupported Browser Popup**: If an unsupported browser is detected, a centered modal popup appears with:
  - Warning icon and "Unsupported Browser" title
  - Message explaining browser requirements
  - List of supported browsers
  - "Continue Anyway" button to dismiss the popup
- **User Override**: Users can dismiss the popup and continue using the app in unsupported browsers at their own risk.

### Configuration Management

- **Environment Switching**: Seamlessly switch between Production, Development, and Custom environments.
- **Dynamic Updates**: Changing keywords or schema values in settings immediately updates the active stream without reconnection.
- **Persistence**: Settings are saved to `localStorage` and persist across reloads.
- **Validation**: JSON schema values and URLs are validated before saving.

### Chat Interface

- **Message Types**: The chat interface renders specific components based on the message `kind` and `role`:
  - **User Messages (Right Aligned)**:
    - **`SttStreamRequestMessage`** (`kind: "STT Stream"`): Represents active voice input, showing recording status and real-time partial transcripts.
    - **`SttFileRequestMessage`** (`kind: "STT File"`): Represents an audio file upload for processing.
    - **`TtsRequestMessage`** (`kind: "TTS"`): Represents a text-to-speech request initiated by the user.
  - **Assistant Messages (Left Aligned)**:
    - **`TranscriptResponseMessage`** (`kind: "Transcription"`): Displays the final transcribed text from the user's voice input.
      - **TTS Playback**: Includes a `TTSPlaybackButton` that allows users to listen to the transcript text using the configured TTS voice.
    - **`StructuredResponseMessage`** (`kind: "Structured"`): Displays structured data extracted from the input, formatted as key-value pairs or JSON.
    - **`VoiceResponseMessage`** (`kind: "Playback"`): Displays an audio player for TTS responses or playback of recorded audio.
- **Visualizations**: Real-time amplitude waveform visualization during recording (handled within `SttStreamRequestMessage`).

## Architecture & Key Components

### Entry Point

- `src/App.tsx`: Main entry point. Wraps the app in `RecoilRoot`, initializes settings, and performs browser detection on mount to display the unsupported browser popup if needed.
- `src/pages/Chat.tsx`: The main page layout, orchestrating the header, message list, voice controls, and settings dialog.

### State Management (Recoil)

- `src/state/`: Contains atoms and selectors.
  - `conversationState`: Stores the chat history and message data.
  - `settingsState`: Stores configuration for different environments.
  - `audioState`: Manages microphone status and recording state.
  - `connectionState`: Tracks the SDK connection status.

### Core Components

- **`VoiceControls.tsx`** (`src/components/voice/`):
  - Handles microphone access and audio processing.
  - Manages the STT stream connection using `useSTT` hook.
  - Updates conversation state with real-time transcripts.
- **`ConfigDialog.tsx`** (`src/components/settings/`):
  - Manages the settings UI.
  - Persists settings to `localStorage`.
  - Validates inputs (JSON schema values, URLs).
- **`ChatHeader.tsx`**: Displays title and opens settings.
- **`ChatMessageList.tsx`**: Renders the list of chat messages.
- **`UnsupportedBrowserPopup.tsx`** (`src/components/ui/`):
  - Modal popup component that alerts users when using an unsupported browser.
  - Displays supported browser list and allows dismissal via "Continue Anyway" button.

### Hooks

- `useSTT`: Custom hook for interacting with the aiOla STT SDK.
- `useConnection`: Manages the session and connection lifecycle.
- `useTTS`: Custom hook for generating speech from text using the aiOla TTS API.

### Utilities

- **`browserDetection.ts`** (`src/utils/`):
  - `isSupportedBrowser()`: Checks if the current browser is ChatGPT-Atlas or Chrome.
  - `getBrowserName()`: Returns the detected browser name for display purposes.

## Development Setup

- **Run**: `npm run dev` (starts Vite server on port 3000).
- **Build**: `npm run build`.
- **Lint**: `npm run lint`.

## Notes for Future Agents

- **Microphone Access**: Requires browser permission. In a headless or automated environment, this may fail or require specific flags.
- **API Key**: The app is non-functional without a valid API key configured in the settings.
- **Environment**: Be aware of the selected environment (Dev vs Prod) when debugging connection issues.
