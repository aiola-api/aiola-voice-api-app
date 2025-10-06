# AIOLA Chat Web App

A modern web application for voice and text interactions using the Aiola SDK, built with React, Vite, Recoil, and shadcn/ui.

## Features

- **Voice Input (STT)**: Real-time speech-to-text with live waveform visualization
- **File Upload**: Upload audio files (WAV, MP3, MP4) for transcription
- **Text-to-Speech (TTS)**: Convert text to speech with multiple voice options
- **Chat Interface**: Stream responses from AI assistant
- **Configuration**: Manage API keys, STT/TTS settings
- **Modern UI**: Built with shadcn/ui components and Tailwind CSS

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **State Management**: Recoil
- **UI Components**: shadcn/ui (New York theme)
- **Icons**: Tabler Icons
- **Styling**: Tailwind CSS
- **SDK**: @aiola/sdk

## Getting Started

### Prerequisites

- Node.js 20.19.0 or higher
- npm or yarn package manager

### Installation

1. Navigate to the web app directory:

   ```bash
   cd apps/web
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create environment file:

   ```bash
   cp env.example .env.local
   ```

4. Configure environment variables in `.env.local`:
   ```env
   VITE_AIOLA_API_URL=https://api.aiola.com
   VITE_ENABLE_CLIENT_SDK=true
   ```

### Development

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

Build for production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Usage

### Configuration

1. Click the **Config** button in the header
2. Set up your Aiola API key in the Connection tab
3. Configure STT language and keywords in the STT tab
4. Select TTS voice in the TTS tab
5. Save settings

### Voice Input

1. Click the microphone button to start recording
2. Speak into your microphone
3. Watch the live waveform and timer
4. Release the button to stop recording
5. The AI will respond with a streamed message

### File Upload

1. Click the upload button
2. Select an audio file (WAV, MP3, MP4)
3. Watch the upload progress
4. The file will be transcribed and processed by the AI

### Text-to-Speech

1. Click the **TTS** button in the header for custom text
2. Or click the speaker icon on any assistant message
3. Select a voice and generate audio
4. Play/pause the generated speech

### Text Chat

1. Type in the composer at the bottom
2. Press Enter to send (Shift+Enter for newline)
3. Receive streamed responses from the AI

## Configuration Options

### Connection

- **API Key**: Required for all Aiola SDK operations
- **Endpoint Override**: Optional custom endpoint URL
- **Remember Key**: Save API key locally (not recommended for production)

### STT (Speech-to-Text)

- **Language**: Supported languages (en_US, es_ES, fr_FR, etc.)
- **Keywords**: Biasing hints for better recognition
- **VAD**: Voice Activity Detection (uses SDK defaults)

### TTS (Text-to-Speech)

- **Voice**: Available voices (tara, zoe, zac, dan, jess, leo, mia, julia, leah)
- **Language**: Fixed to English (en)

## Project Structure

```
src/
├── components/
│   ├── chat/
│   │   └── TTSPlaybackButton.tsx
│   ├── settings/
│   │   └── ConfigDialog.tsx
│   ├── tts/
│   │   └── TTSDialog.tsx
│   ├── ui/              # shadcn/ui components
│   └── voice/
│       ├── AudioLevelMeter.tsx
│       ├── UploadDropzone.tsx
│       └── VoiceControls.tsx
├── lib/
│   └── aiolaClient.ts   # Aiola SDK wrapper
├── pages/
│   └── Chat.tsx         # Main chat page
├── state/
│   ├── audio.ts         # Audio state management
│   ├── conversation.ts  # Chat state management
│   └── settings.ts      # Configuration state
└── styles/
    └── globals.css      # Global styles and CSS variables
```

## Development Notes

- The app uses placeholder implementations for the Aiola SDK
- Replace the mock functions in `src/lib/aiolaClient.ts` with actual SDK calls
- All state is managed through Recoil atoms
- Components are built with shadcn/ui for consistency
- The app supports both light and dark themes

## Troubleshooting

### Microphone Access

- Ensure microphone permissions are granted
- Check browser settings for microphone access
- Try refreshing the page if permission is denied

### API Key Issues

- Verify your Aiola API key is correct
- Check if the key has the required permissions
- Ensure the endpoint URL is accessible

### File Upload

- Supported formats: WAV, MP3, MP4
- Maximum file size: 50MB
- Check browser console for upload errors

## License

This project is part of the Aiola ecosystem.
