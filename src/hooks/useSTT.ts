import { useRecoilValue } from "recoil";
import { type StreamConnection } from "@/state/connection";
import { settingsState, type VadConfig, type SchemaValues, type SettingsState } from "@/state/settings";
import { useConnection } from "@/hooks/useConnection";
import { useCallback } from "react";

// Helper function to get current environment settings
function getCurrentSettings(settings: SettingsState) {
  const env = settings.environment;
  return {
    apiKey: settings[env].connection.apiKey,
    baseUrl: settings[env].connection.baseUrl,
    authBaseUrl: settings[env].connection.authBaseUrl,
    workflowId: settings[env].connection.workflowId,
    environment: env,
    stt: settings[env].stt,
    tts: settings[env].tts,
  };
}

/**
 * Module-level cache for stream connection
 * Note: Cache stores both connection and settings to detect when settings change
 */
let streamCache: {
  connection: StreamConnection;
  settings: {
    language: string;
    keywords: string[];
    flowid?: string;
    vad?: "default" | VadConfig;
    schemaValues: SchemaValues;
  };
} | null = null;

/**
 * React hook for Speech-to-Text (STT) operations using Aiola SDK
 *
 * @description
 * Provides methods to create streaming connections, transcribe files, and manage
 * STT sessions. Uses the centralized useConnection hook for session management.
 *
 * @example
 * ```tsx
 * function VoiceComponent() {
 *   const { createStream, isStreaming, error } = useSTT();
 *
 *   const handleRecord = async () => {
 *     const stream = await createStream();
 *     stream.on('transcript', (data) => {
 *       console.log(data.transcript);
 *     });
 *     stream.connect();
 *   };
 * }
 * ```
 *
 * @returns {Object} STT operations and state
 * @returns {boolean} isConnected - Whether SDK client is connected
 * @returns {boolean} isStreaming - Whether an STT stream is active
 * @returns {string|undefined} error - Current error message, if any
 * @returns {Function} createStream - Creates a new STT streaming connection
 * @returns {Function} transcribeFile - Transcribes an audio file
 * @returns {Function} closeStream - Closes the active stream
 * @returns {Function} testConnection - Tests API credentials
 * @returns {Function} cleanup - Cleans up all connections and cache
 */
export function useSTT() {
  const settings = useRecoilValue(settingsState);
  const {
    getClient,
    isConnected,
    sessionId,
    updateConnectionState,
    isStreaming,
    error: connectionError,
    createSession,
  } = useConnection();

  /**
   * Create a new STT streaming connection (without auto-connecting)
   *
   * @description
   * Creates a WebSocket-based streaming connection for real-time speech-to-text.
   * The connection uses current settings (language, keywords, flowId) from Recoil state.
   * Returns a connection that is NOT yet connected - caller must set up event handlers
   * and then call connect().
   *
   * If settings haven't changed since the last call, returns the cached connection
   * instead of creating a new one.
   *
   * @returns {Promise<StreamConnection>} Stream connection (not yet connected)
   * @throws {Error} If SDK client creation fails or stream initialization fails
   */
  const createStreamConnection =
    useCallback(async (): Promise<StreamConnection> => {
      try {
        const client = await getClient();

        // Build current settings object for comparison
        const currentSettings = getCurrentSettings(settings);
        const keywordsObj: Record<string, string> = {};
        currentSettings.stt.keywords.forEach((keyword: string) => {
          keywordsObj[keyword] = keyword;
        });

        const currentSettingsObj = {
          language: currentSettings.stt.language,
          keywords: currentSettings.stt.keywords,
          workflowId: currentSettings.workflowId,
          vad: currentSettings.stt.vad,
          schemaValues: currentSettings.stt.schemaValues,
        };

        // Check if we can reuse cached connection
        const settingsChanged =
          !streamCache ||
          streamCache.settings.language !== currentSettingsObj.language ||
          JSON.stringify(streamCache.settings.keywords) !==
            JSON.stringify(currentSettingsObj.keywords) ||
          ((streamCache.settings as { workflowId?: string; flowid?: string }).workflowId ||
            (streamCache.settings as { workflowId?: string; flowid?: string }).flowid ||
            "") !== (currentSettingsObj.workflowId || "") ||
          JSON.stringify(streamCache.settings.vad) !==
            JSON.stringify(currentSettingsObj.vad) ||
          JSON.stringify(streamCache.settings.schemaValues) !==
            JSON.stringify(currentSettingsObj.schemaValues);

        console.log("useSTT streamCache", streamCache);

        if (!settingsChanged && streamCache) {
          // Update state metadata (don't store stream object - it's mutable)
          // Don't set isStreaming here - let the caller manage it
          updateConnectionState({
            currentFlowId: currentSettings.workflowId,
            error: undefined,
          });
          return streamCache.connection;
        }

        // Settings changed or no cached connection - create new one

        const streamRequest: {
          langCode?: string;
          keywords: Record<string, string>;
          workflowId?: string;
          vadConfig?: VadConfig;
        } = {
          keywords: keywordsObj,
        };

        // Add langCode only if not set to "default"
        if (currentSettingsObj.language && currentSettingsObj.language !== "default") {
          streamRequest.langCode = currentSettingsObj.language;
        }

        // Add workflowId if present
        if (currentSettingsObj.workflowId) {
          streamRequest.workflowId = currentSettingsObj.workflowId;
        }

        // Add VAD configuration if present and not default
        if (currentSettingsObj.vad && currentSettingsObj.vad !== "default") {
          streamRequest.vadConfig = currentSettingsObj.vad;
        }

        // Create stream connection (this does NOT auto-connect)
        const stream = await client.stt.stream(streamRequest);

        // Cache the new connection with its settings
        streamCache = {
          connection: stream as unknown as StreamConnection,
          settings: currentSettingsObj,
        };

        // Update state metadata (don't store stream object - it's mutable)
        updateConnectionState({
          currentFlowId: currentSettings.workflowId,
          isStreaming: true,
          error: undefined,
        });

        return stream as unknown as StreamConnection;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to create stream";
        updateConnectionState({
          error: errorMessage,
          isStreaming: false,
        });
        throw error;
      }
    }, [getClient, settings, updateConnectionState]);

  /**
   * Transcribe an audio file
   *
   * @description
   * Uploads and transcribes an audio file using the Aiola SDK.
   * Uses current language settings from Recoil state.
   *
   * @param {File} file - Audio file to transcribe (wav, mp3, mp4)
   * @returns {Promise<{text: string}>} Transcription result
   * @throws {Error} If transcription fails or file format is unsupported
   *
   * @example
   * ```tsx
   * const result = await transcribeFile(audioFile);
   * console.log(result.text);
   * ```
   */
  const transcribeFile = useCallback(
    async (file: File): Promise<{ text: string }> => {
      try {
        const client = await getClient();
        const currentSettings = getCurrentSettings(settings);

        const transcribeRequest: {
          file: File;
          language?: string;
        } = {
          file,
        };

        if (currentSettings.stt.language && currentSettings.stt.language !== "default") {
          transcribeRequest.language = currentSettings.stt.language;
        }

        const transcription = await client.stt.transcribeFile(transcribeRequest);

        // Map SDK response to our interface
        return { text: transcription.transcript };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to transcribe file";
        updateConnectionState({
          error: errorMessage,
        });
        throw error;
      }
    },
    [getClient, settings, updateConnectionState]
  );

  /**
   * Close the active streaming connection
   *
   * @description
   * Updates state to mark streaming as inactive. The actual stream
   * disconnection should be handled by the component.
   */
  const closeStream = useCallback(() => {
    // Just update state - stream will be disconnected by component
    updateConnectionState({
      isStreaming: false,
    });
  }, [updateConnectionState]);

  /**
   * Cleanup stream connections
   *
   * @description
   * Closes active streams and clears stream cache.
   * Should be called when component unmounts.
   */
  const cleanup = useCallback(async () => {
    closeStream();
    // Clear stream cache
    streamCache = null;
  }, [closeStream]);

  return {
    // State
    isConnected,
    isStreaming,
    error: connectionError,
    sessionId,

    // Methods
    createStreamConnection,
    transcribeFile,
    closeStream,
    testConnection: createSession,
    cleanup,
  };
}
