import { atom } from "recoil";

export type MicrophoneState =
  | "idle"
  | "ready"
  | "connected"
  | "connecting"
  | "preparingMic";

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
  },
});
