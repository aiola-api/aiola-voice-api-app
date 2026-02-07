import { atom } from "recoil";

export type MicrophoneState =
  | "idle"
  | "ready"
  | "connected"
  | "connecting"
  | "preparingMic"
  | "streaming";

export type AudioSource = "microphone" | "url" | "idle";

export interface AmplitudeData {
  average: number;
  peak: number;
  rms: number;
  normalizedAverage: number;
  normalizedPeak: number;
  normalizedRms: number;
}

export interface AudioState {
  micAllowed: boolean;
  isRecording: boolean;
  isTranscribing: boolean;
  microphoneState: MicrophoneState;
  partialText: string;
  playingMessageId?: string;
  currentRecordingMessageId?: string;
  startedAtMs: number;
  elapsedMs: number;
  sttRequestStartedAtMs: number;
  sttRequestElapsedMs: number;
  currentSessionId?: string;
  cancelFunction?: () => void;
  cancelChatFunction?: () => void;
  currentAudioElement?: HTMLAudioElement | null;
  currentAudioSource: AudioSource;
  streamingUrl?: string | null;
  /** Set to Date.now() by VoiceControls to signal useBufferStreamPipeline to stop */
  bufferStreamStopRequested: number;
  /** Set to Date.now() by useBufferStreamPipeline to signal VoiceControls to stop mic */
  micStopRequested: number;
}

export const audioState = atom<AudioState>({
  key: "audioState",
  default: {
    micAllowed: false,
    isRecording: false,
    isTranscribing: false,
    microphoneState: "idle",
    partialText: "",
    playingMessageId: undefined,
    currentRecordingMessageId: undefined,
    startedAtMs: 0,
    elapsedMs: 0,
    sttRequestStartedAtMs: 0,
    sttRequestElapsedMs: 0,
    currentSessionId: undefined,
    cancelFunction: undefined,
    cancelChatFunction: undefined,
    currentAudioElement: null,
    currentAudioSource: "idle",
    streamingUrl: null,
    bufferStreamStopRequested: 0,
    micStopRequested: 0,
  },
});
