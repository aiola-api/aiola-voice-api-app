import { atom } from "recoil";
import type { SchemaValues, SetSchemaValuesResponse } from "@aiola/sdk";

// Type for the streaming connection
// Matches the SDK StreamingClient interface
export interface StreamConnection {
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  off: (event: string, callback?: (...args: unknown[]) => void) => void;
  connect: () => void;
  disconnect: () => void;
  send: (data: ArrayBuffer) => void;
  connected?: boolean;
  // SDK methods for dynamic updates
  setKeywords: (keywords: Record<string, string>) => void;
  setSchemaValues: (
    schemaValues: SchemaValues,
    callback?: (response: SetSchemaValuesResponse) => void
  ) => void;
}

// Connection state - only stores metadata, not the actual SDK client
// (SDK client is mutable and can't be stored in Recoil)
export interface ConnectionState {
  accessToken: string | null;
  isConnected: boolean;
  isStreaming: boolean;
  isConnecting: boolean;
  currentApiKey: string;
  currentBaseUrl?: string;
  currentFlowId?: string;
  currentSessionId?: string;
  error?: string;
}

export const connectionState = atom<ConnectionState>({
  key: "connectionState",
  default: {
    accessToken: null,
    isConnected: false,
    isStreaming: false,
    isConnecting: false,
    currentApiKey: "",
    currentBaseUrl: undefined,
    currentFlowId: undefined,
    currentSessionId: undefined,
    error: undefined,
  },
});
