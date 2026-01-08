# 🎤 Aiola Voice API App

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/) [![Vite](https://img.shields.io/badge/Vite-B73BFE?logo=vite&logoColor=FFD62E)](https://vitejs.dev/) [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

https://aiola-api.github.io/aiola-voice-api-app/

A powerful **aiOla SDK-powered** voice interaction web application that showcases the full capabilities of aiOla's advanced speech processing technology. Built with React and designed specifically to demonstrate aiOla's enterprise-grade voice AI features including real-time speech-to-text, intelligent transcription, text-to-speech synthesis, and conversational AI in a polished, production-ready interface.

## ✨ Features

### 🎯 **Core aiOla SDK Capabilities**

- **🎙️ STT Streaming**: Real-time speech-to-text with live waveform visualization, audio level monitoring, and continuous streaming transcription powered by aiOla's enterprise-grade speech recognition engine
- **📁 File Upload**: Upload audio files (WAV, MP3, MP4) for high-accuracy transcription and processing using aiOla's advanced audio analysis algorithms
- **🔊 TTS Synthesis**: Convert text to speech with multiple aiOla voice options, natural intonation, and seamless playback controls showcasing aiOla's neural voice technology

## 📋 Table of Contents

- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Usage](#-usage)
- [Scripts](#-scripts)
- [Configuration](#-configuration)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)

## 🛠️ Tech Stack

### Core Technologies

- **Web**: React 18 + TypeScript
- **Build Tool**: Vite 5.4+
- **Language**: TypeScript 5.9+

### State Management & Data

- **State Management**: Recoil 0.7.7 😘
- **SDK**: @aiola/sdk 2.1.4 🤯

### UI & Styling

- **UI Components**: shadcn/ui (New York theme)
- **Styling**: Tailwind CSS 4.1+
- **Icons**: Lucide React & Tabler Icons
- **CSS Variables**: Dynamic theme support

### Audio Processing

- **Waveform Visualization**: WaveSurfer.js 7.11+
- **Audio Utilities**: Custom audio processing hooks

### Development Tools

- **Linting**: ESLint 9.36+ with React hooks plugin
- **Type Checking**: TypeScript with strict configuration
- **Build Optimization**: Vite with React plugin

## 📋 Prerequisites

Before running this project, ensure you have:

- **Node.js**: Version 20.19.0 or higher
- **Package Manager**: npm or yarn
- **Browser**: Modern browser with Web Audio API support
- **Microphone**: Required for voice input features
- **Aiola API Key**: Required for SDK functionality

## 🚀 Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd aiola-voice-api-app
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

## 🎯 Usage

### Development Server

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Production Build

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

### Basic Workflow

1. **Configure API Key**: Click the Config button and enter your Aiola API key
2. **Voice Recording**: Click the microphone button to start recording
3. **File Upload**: Drag and drop or select audio files for transcription
4. **Text-to-Speech**: Click the speaker icon on messages or use the TTS dialog
5. **Chat Interaction**: Type messages or use voice input for AI conversations

## 📜 Scripts

| Script            | Description                              |
| ----------------- | ---------------------------------------- |
| `npm run dev`     | Start development server with hot reload |
| `npm run build`   | Build for production                     |
| `npm run preview` | Preview production build locally         |
| `npm run lint`    | Run ESLint code analysis                 |

## ⚙️ Configuration

### Application Settings

Access the configuration dialog through the app header:

- **Connection Section**: API key, endpoint, and connection settings
- **STT Section**: Speech-to-text language and keyword configuration
- **TTS Section**: Text-to-speech voice selection and preferences

#### Getting an API Key

To use this application, you'll need an aiOla API key:

1. Visit the [aiOla Platform](https://platform.aiola.ai/) to create your account
2. Navigate to your API keys section in the platform dashboard
3. Generate a new API key for your application
4. Copy the API key and paste it into the **Connection Section** of the configuration dialog

## 📁 Project Structure

```
aiola-voice-api-app/
├── public/                 # Static assets
│   └── audio-processor.js  # WebAssembly audio processing
├── src/
│   ├── components/         # React components
│   │   ├── chat/          # Chat-related components
│   │   ├── settings/      # Configuration dialogs
│   │   ├── tts/           # Text-to-speech components
│   │   ├── ui/            # Reusable UI components (shadcn/ui)
│   │   └── voice/         # Voice interaction components
│   ├── hooks/             # Custom React hooks
│   │   ├── useConnection.ts
│   │   ├── useSTT.ts
│   │   └── useTTS.ts
│   ├── lib/               # Utilities and SDK wrapper
│   │   ├── constants.ts
│   │   └── utils.ts
│   ├── pages/             # Page components
│   │   └── Chat.tsx       # Main chat interface
│   ├── state/             # Recoil state management
│   │   ├── audio.ts       # Audio state atoms
│   │   ├── connection.ts  # Connection state atoms
│   │   ├── conversation.ts # Chat conversation atoms
│   │   └── settings.ts    # Configuration atoms
│   └── styles/            # Global styles and CSS variables
├── docs/                  # Production build output
├── index.html             # Entry point
└── vite.config.ts         # Vite configuration
```

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Install dependencies: `npm install`
4. Make your changes
5. Run tests and linting: `npm run lint`
6. Commit changes: `git commit -m 'Add amazing feature'`
7. Push to branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Development Guidelines

- Follow TypeScript strict mode requirements
- Use ESLint configuration for code style
- Write clear, concise commit messages
- Update documentation for new features
- Test changes across different browsers

### Code Style

- Use functional components with hooks
- Follow React best practices
- Maintain consistent file naming (PascalCase for components)
- Use meaningful variable and function names

## 🔧 Troubleshooting

### Common Issues

**Microphone Access Issues**

- Ensure browser permissions are granted for microphone access
- Check browser settings and security preferences
- Try refreshing the page if permissions were previously denied

**API Key Problems**

- Verify your Aiola API key is valid and active
- Check that the key has appropriate permissions
- Ensure network connectivity to the API endpoint

**File Upload Errors**

- Supported formats: WAV, MP3, MP4
- Maximum file size: 50MB
- Check browser console for detailed error messages

**Audio Playback Issues**

- Ensure browser supports Web Audio API
- Check system audio settings and volume levels
- Verify no other applications are using the audio device

### Getting Help

1. Check the browser developer console for error messages
2. Verify all environment variables are correctly set
3. Ensure all dependencies are properly installed
4. Test with a minimal configuration first

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

**Made with ❤️ for the Aiola ecosystem**
// test
