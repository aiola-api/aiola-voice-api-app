import { atom } from "recoil";

export interface AmplitudeData {
  average: number;
  peak: number;
  rms: number;
  normalizedAverage: number;
  normalizedPeak: number;
  normalizedRms: number;
}

export interface ChatMessage {
  id: string;
  role: "system" | "user" | "assistant";
  content?: string;
  createdAt: number;
  error?: string;
  sessionId?: string;
  conversation_session_id: string; // Links user messages to their corresponding agent responses
  kind?:
    | "Transcription"
    | "Playback"
    | "STT Stream"
    | "STT File"
    | "TTS"
    | "Structured";
  status?: "recording" | "streaming" | "done" | "error" | "processing";
  durationMs?: number;
  fileName?: string;
  fileType?: string;
  isTranscription?: boolean;
  voice?: string; // For TTS requests - stores the selected voice
  isRecording?: boolean; // Per-message recording state for waveform animation
  structuredData?: Record<string, unknown>; // For structured response messages
  // Per-message amplitude data for waveform visualization
  amplitudeData?: AmplitudeData;
  amplitudeHistory?: AmplitudeData[];
  sourceUrl?: string; // URL source for transcription (when streaming from URL)
  sourceFileName?: string; // File name source for transcription (when streaming from local file)
  audioBlobUrl?: string; // Blob URL for replaying streamed file audio
}

export interface ConversationState {
  id: string;
  messages: ChatMessage[];
  pendingId?: string;
}

export const conversationState = atom<ConversationState>({
  key: "conversationState",
  default: {
    id: "default",
    messages: [
      // Use Case 1: Voice Recording -> Text Transcript
      // {
      //   id: "mock-1",
      //   role: "user",
      //   content: "",
      //   createdAt: Date.now() - 600000,
      //   kind: "STT Stream",
      //   status: "done",
      //   durationMs: 8500,
      //   conversation_session_id: "conv_1",
      // },
      // {
      //   id: "mock-2",
      //   role: "assistant",
      //   content:
      //     "Hey team, I wanted to give you a quick update on the project status. We've completed the first phase and are now moving into testing. Everything looks good so far.",
      //   createdAt: Date.now() - 595000,
      //   kind: "Transcription",
      //   status: "done",
      //   isTranscription: true,
      //   conversation_session_id: "conv_1",
      // },
      // {
      //   id: "mock-10",
      //   role: "assistant",
      //   content: "Structured data received (3 fields)",
      //   createdAt: Date.now() - 45000,
      //   kind: "Structured",
      //   status: "done",
      //   conversation_session_id: "conv_5",
      //   structuredData: {
      //     form: {
      //       name: "John Doe",
      //       email: "john.doe@example.com",
      //       phone: "+1-555-0123",
      //     },
      //   },
      // },
      // // Use Case 2: File Upload -> Text Transcript
      // {
      //   id: "mock-3",
      //   role: "user",
      //   createdAt: Date.now() - 400000,
      //   kind: "STT File",
      //   status: "done",
      //   fileName: "client-meeting-2024.mp3",
      //   fileType: "audio/mpeg",
      //   conversation_session_id: "conv_2",
      // },
      // {
      //   id: "mock-4",
      //   role: "assistant",
      //   content:
      //     "Good morning everyone. This is the recording from yesterday's client meeting where we discussed the Q4 roadmap and budget allocation for the upcoming fiscal year.",
      //   createdAt: Date.now() - 390000,
      //   kind: "Transcription",
      //   status: "done",
      //   isTranscription: true,
      //   conversation_session_id: "conv_2",
      // },
      // // Use Case 3: Text-to-Speech Request -> Voice Response
      // {
      //   id: "mock-5",
      //   role: "user",
      //   createdAt: Date.now() - 200000,
      //   kind: "TTS",
      //   status: "done",
      //   voice: "jess",
      //   conversation_session_id: "conv_3",
      // },
      // {
      //   id: "mock-6",
      //   role: "assistant",
      //   content:
      //     "All hands meeting is scheduled for tomorrow at 3 PM in the main conference room.",
      //   createdAt: Date.now() - 190000,
      //   kind: "Playback",
      //   status: "done",
      //   durationMs: 6200,
      //   conversation_session_id: "conv_3",
      // },
      // // Use Case 4: Simple TTS Request -> Voice Response
      // {
      //   id: "mock-7",
      //   role: "user",
      //   createdAt: Date.now() - 100000,
      //   kind: "TTS",
      //   status: "done",
      //   voice: "dan",
      //   conversation_session_id: "conv_4",
      // },
      // {
      //   id: "mock-8",
      //   role: "assistant",
      //   content:
      //     "Welcome to our quarterly review. Today we'll be discussing our achievements and future goals.",
      //   createdAt: Date.now() - 90000,
      //   kind: "Playback",
      //   status: "done",
      //   durationMs: 7800,
      //   conversation_session_id: "conv_4",
      // },
    ],
  },
});
