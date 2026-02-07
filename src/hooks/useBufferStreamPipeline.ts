import { useCallback, useRef, useEffect } from "react";
import { useRecoilState } from "recoil";
import { audioState } from "@/state/audio";
import { conversationState, type ChatMessage } from "@/state/conversation";
import { useSTT } from "./useSTT";
import { useConnection } from "./useConnection";
import { toast } from "sonner";
import type { StreamConnection } from "@/state/connection";
import type { SchemaValues } from "@/state/settings";
import type { SourceMetadata } from "./useAudioSourceLoader";

/**
 * Unified streaming pipeline: ArrayBuffer -> WebSocket
 * Replaces useUrlStreamIntegration with bug fixes:
 * - Ref captured before nulling (fixes dead code)
 * - Connection instance tracking instead of boolean flag (fixes stale closures)
 * - AudioContext closed between streams (fixes memory leak)
 * - Structured event handler included
 */
export function useBufferStreamPipeline() {
  const [audio, setAudio] = useRecoilState(audioState);
  const [, setConversation] = useRecoilState(conversationState);
  const { createStreamConnection } = useSTT();
  const { isOnline, sessionId } = useConnection();

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const connectionRef = useRef<StreamConnection | null>(null);
  const currentMessageIdRef = useRef<string | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);
  const streamStartTimeRef = useRef<number>(0);
  const stopStreamingRef = useRef<(() => void) | null>(null);
  const completionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Track current connection instance to avoid stale closure issues
  const activeConnectionRef = useRef<StreamConnection | null>(null);
  // Track registered handlers so we can remove only ours (not VoiceControls') before re-registering
  const handlersRef = useRef<{
    onConnect: (...args: unknown[]) => void;
    onTranscript: (...args: unknown[]) => void;
    onStructured: (...args: unknown[]) => void;
    onError: (...args: unknown[]) => void;
    onClose: (...args: unknown[]) => void;
  } | null>(null);

  /**
   * Initialize a fresh AudioContext and AudioWorklet
   */
  const initializeAudioContext = useCallback(async () => {
    // Close previous AudioContext if it exists (fixes memory leak between streams)
    if (audioContextRef.current) {
      try {
        await audioContextRef.current.close();
      } catch {
        // Already closed
      }
      audioContextRef.current = null;
      audioWorkletNodeRef.current = null;
    }

    const ctx = new AudioContext({
      sampleRate: 16000,
      latencyHint: "interactive",
    });

    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    await ctx.audioWorklet.addModule(
      `${import.meta.env.BASE_URL}audio-processor.js`
    );

    const workletNode = new AudioWorkletNode(ctx, "audio-processor");

    audioContextRef.current = ctx;
    audioWorkletNodeRef.current = workletNode;

    return { audioContext: ctx, audioWorkletNode: workletNode };
  }, []);

  /**
   * Connect audio worklet output to WebSocket connection
   */
  const connectWorkletToConnection = useCallback(
    (audioWorkletNode: AudioWorkletNode, connection: StreamConnection) => {
      audioWorkletNode.port.onmessage = (event) => {
        if (event.data.audio_data) {
          connection.send(event.data.audio_data);
        }
      };
    },
    []
  );

  /**
   * Start streaming an ArrayBuffer through the WebSocket pipeline
   */
  const startBufferStream = useCallback(
    async (
      arrayBuffer: ArrayBuffer,
      metadata: SourceMetadata,
      keywords?: Record<string, string>,
      schemaValues?: SchemaValues
    ) => {
      try {
        // Create chat message
        const messageId = `buffer_stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const streamSessionId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

        const streamMessage: ChatMessage = {
          id: messageId,
          role: "user",
          content: metadata.source === "url"
            ? `Streaming from URL...`
            : `Streaming file: ${metadata.sourceFileName}...`,
          createdAt: Date.now(),
          conversation_session_id: streamSessionId,
          kind: "STT Stream",
          status: "streaming",
          isRecording: false,
          sourceUrl: metadata.sourceUrl,
          sourceFileName: metadata.sourceFileName,
        };

        // Set refs BEFORE creating connection so handlers can use them
        currentMessageIdRef.current = messageId;
        currentSessionIdRef.current = streamSessionId;
        streamStartTimeRef.current = Date.now();

        console.log("[BufferPipeline] Adding initial stream message:", messageId);

        // Add message to conversation
        setConversation((prev) => {
          console.log("[BufferPipeline] setConversation called, prev messages:", prev.messages.length);
          return {
            ...prev,
            messages: [...prev.messages, streamMessage],
          };
        });

        // Update audio state - set connecting for visual feedback
        // Use "url" source for both URL and file streaming to keep VoiceControls compatible
        setAudio((prev) => ({
          ...prev,
          currentAudioSource: "url",
          streamingUrl: metadata.sourceUrl || metadata.sourceFileName || null,
          microphoneState: "connecting",
        }));

        // Initialize audio context and worklet
        const { audioContext, audioWorkletNode } = await initializeAudioContext();

        // Create/reuse stream connection
        console.log("[BufferPipeline] Creating stream connection...");
        const connection = await createStreamConnection();
        console.log("[BufferPipeline] Got connection:", !!connection, "connected:", connection.connected);
        connectionRef.current = connection;
        // Track this specific connection instance
        activeConnectionRef.current = connection;

        // Remove stale buffer-pipeline handlers from previous streams to prevent duplicates
        // (only remove our handlers, not VoiceControls' handlers on the shared connection)
        if (handlersRef.current) {
          const prev = handlersRef.current;
          connection.off("connect", prev.onConnect);
          connection.off("transcript", prev.onTranscript);
          connection.off("structured", prev.onStructured);
          connection.off("error", prev.onError);
          connection.off("close", prev.onClose);
          handlersRef.current = null;
        }

        // Setup event handlers using connection instance check (not boolean flag)
        const thisConnection = connection;

        // Extracted pipeline setup - called from "connect" handler or directly if already connected
        const setupBufferPipeline = async () => {
          console.log("[BufferPipeline] setupBufferPipeline called");
          console.log("[BufferPipeline] activeRef === this?", activeConnectionRef.current === thisConnection);
          console.log("[BufferPipeline] messageIdRef:", currentMessageIdRef.current);
          console.log("[BufferPipeline] sessionIdRef:", currentSessionIdRef.current);
          // Guard: only process if this is still the active connection
          if (activeConnectionRef.current !== thisConnection) return;
          if (!currentMessageIdRef.current || !currentSessionIdRef.current) return;

          toast.success(
            metadata.source === "url"
              ? "Connected - Streaming URL audio"
              : `Connected - Streaming file: ${metadata.sourceFileName}`
          );

          try {
            // Apply keywords and schema if provided
            if (keywords && Object.keys(keywords).length > 0) {
              connection.setKeywords(keywords);
            }
            if (schemaValues && Object.keys(schemaValues).length > 0) {
              connection.setSchemaValues(schemaValues);
            }

            // Connect worklet to WebSocket
            connectWorkletToConnection(audioWorkletNode, connection);

            // Decode ArrayBuffer to AudioBuffer
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));

            // Check duration (max 60 minutes)
            const durationInMinutes = audioBuffer.duration / 60;
            if (durationInMinutes > 60) {
              throw new Error(
                `Audio duration (${durationInMinutes.toFixed(1)} min) exceeds maximum (60 minutes)`
              );
            }

            // Create AudioBufferSourceNode
            const sourceNode = audioContext.createBufferSource();
            sourceNode.buffer = audioBuffer;
            sourceNode.connect(audioWorkletNode);
            audioSourceRef.current = sourceNode;

            // Handle completion
            sourceNode.onended = () => {
              console.log("[BufferPipeline] sourceNode.onended fired - audio finished playing");
              sourceNode.disconnect();
              // Wait up to 5s for final transcript
              completionTimeoutRef.current = setTimeout(() => {
                console.log("[BufferPipeline] 5s completion timeout fired, calling stopStreaming");
                stopStreamingRef.current?.();
              }, 5000);
            };

            // Start playback
            sourceNode.start(0);

            // Update state to streaming (green)
            setAudio((prev) => ({
              ...prev,
              microphoneState: "streaming",
            }));
          } catch (error) {
            console.error("Failed to setup audio pipeline:", error);

            const isCorsError = error instanceof TypeError && error.message.includes("fetch");
            const errorMessage = isCorsError
              ? "Cannot access URL due to CORS restrictions. The server must allow cross-origin requests."
              : `Failed to stream audio: ${error instanceof Error ? error.message : "Unknown error"}`;

            toast.error(errorMessage);
            stopStreamingRef.current?.();
          }
        };

        // Define named handlers so we can remove them later (prevent duplicate stacking)
        const onConnect = () => {
          console.log("[BufferPipeline] 'connect' event fired!");
          setupBufferPipeline();
        };

        const onTranscript = (data: unknown) => {
          console.log("[BufferPipeline] 'transcript' event fired!", data);
          const { transcript, is_final } = data as { transcript: string; is_final?: boolean };
          console.log("[BufferPipeline] transcript guard check - activeRef===this:", activeConnectionRef.current === thisConnection, "messageIdRef:", currentMessageIdRef.current);
          if (activeConnectionRef.current !== thisConnection) {
            console.warn("[BufferPipeline] BLOCKED: activeConnectionRef doesn't match thisConnection");
            return;
          }
          if (!currentMessageIdRef.current) {
            console.warn("[BufferPipeline] BLOCKED: currentMessageIdRef is null (stopBufferStream already ran?)");
            return;
          }

          const activeSessionId = currentSessionIdRef.current;
          const transcriptionId = `transcription_${activeSessionId}`;

          // Create or update a visible Transcription response message
          // (SttStreamRequestMessage doesn't render content, so we need a separate Transcription message)
          setConversation((prev) => {
            const existingTranscription = prev.messages.find(
              (msg) => msg.id === transcriptionId
            );

            if (existingTranscription) {
              // Append to existing transcription message
              const newContent = existingTranscription.content
                ? `${existingTranscription.content} ${transcript}`
                : transcript;
              return {
                ...prev,
                messages: prev.messages.map((msg) =>
                  msg.id === transcriptionId
                    ? { ...msg, content: newContent, createdAt: Date.now() }
                    : msg
                ),
              };
            } else {
              // Create new transcription message
              const transcriptMessage: ChatMessage = {
                id: transcriptionId,
                role: "assistant",
                content: transcript,
                createdAt: Date.now(),
                kind: "Transcription",
                status: "done",
                conversation_session_id: activeSessionId || "",
              };
              return {
                ...prev,
                messages: [...prev.messages, transcriptMessage],
              };
            }
          });

          // If final, stop streaming
          if (is_final) {
            if (completionTimeoutRef.current) {
              clearTimeout(completionTimeoutRef.current);
              completionTimeoutRef.current = null;
            }
            setTimeout(() => {
              stopStreamingRef.current?.();
            }, 500);
          }
        };

        const onStructured = (data: unknown) => {
          console.log("[BufferPipeline] 'structured' event fired!", data);
          if (activeConnectionRef.current !== thisConnection) return;
          if (!currentSessionIdRef.current) return;

          const activeSessionId = currentSessionIdRef.current;
          const structuredData = data as Record<string, unknown>;

          const structuredMessage: ChatMessage = {
            id: `structured_${Date.now()}`,
            role: "assistant",
            content: `Structured data received (${Object.keys((structuredData?.form as Record<string, unknown>) || {}).length} fields)`,
            createdAt: Date.now(),
            kind: "Structured",
            status: "done",
            conversation_session_id: activeSessionId,
            structuredData,
          };

          setConversation((prev) => ({
            ...prev,
            messages: [...prev.messages, structuredMessage],
          }));
        };

        const onError = (err: unknown) => {
          console.log("[BufferPipeline] 'error' event fired!", err);
          if (activeConnectionRef.current !== thisConnection) return;
          const errorObj = err as { message?: string };
          console.error("Stream error:", err);
          toast.error(`Stream error: ${errorObj.message || "Unknown error"}`);
          stopStreamingRef.current?.();
        };

        const onClose = () => {
          console.log("[BufferPipeline] 'close' event fired!");
          if (activeConnectionRef.current !== thisConnection) return;
          stopStreamingRef.current?.();
        };

        // Store handler refs for cleanup on next stream
        handlersRef.current = { onConnect, onTranscript, onStructured, onError, onClose };

        connection.on("connect", onConnect);
        connection.on("transcript", onTranscript);
        connection.on("structured", onStructured);
        connection.on("error", onError);
        connection.on("close", onClose);

        // Reuse open socket or connect fresh
        if (connection.connected) {
          console.log("[BufferPipeline] Connection already open, setting up pipeline directly...");
          // "connect" event won't fire again, so run setup directly
          setupBufferPipeline();
        } else {
          console.log("[BufferPipeline] Calling connection.connect()...");
          connection.connect();
        }
      } catch (error) {
        console.error("Failed to start buffer streaming:", error);
        toast.error("Failed to start streaming");

        const microphoneState = isOnline && sessionId ? "ready" : "idle";
        setAudio((prev) => ({
          ...prev,
          currentAudioSource: "idle",
          streamingUrl: null,
          microphoneState,
        }));

        stopStreamingRef.current?.();
      }
    },
    [
      createStreamConnection,
      initializeAudioContext,
      connectWorkletToConnection,
      setAudio,
      setConversation,
      isOnline,
      sessionId,
    ]
  );

  /**
   * Stop streaming and clean up resources
   * FIX: Captures messageIdRef BEFORE nulling it
   * FIX: Closes AudioContext between streams
   */
  const stopBufferStream = useCallback(() => {
    console.log("[BufferPipeline] stopBufferStream called", {
      messageId: currentMessageIdRef.current,
      sessionId: currentSessionIdRef.current,
      hasActiveConnection: !!activeConnectionRef.current,
    });
    console.trace("[BufferPipeline] stopBufferStream stack trace");

    // Clear completion timeout
    if (completionTimeoutRef.current) {
      clearTimeout(completionTimeoutRef.current);
      completionTimeoutRef.current = null;
    }

    // FIX: Capture message ID BEFORE nulling refs
    const capturedMessageId = currentMessageIdRef.current;
    const duration = Date.now() - streamStartTimeRef.current;

    // Stop audio source
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
        audioSourceRef.current.disconnect();
      } catch {
        // Node may already be stopped
      }
      audioSourceRef.current = null;
    }

    // FIX: Close AudioContext to free resources between streams
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
      audioWorkletNodeRef.current = null;
    }

    // Clear refs
    currentMessageIdRef.current = null;
    currentSessionIdRef.current = null;
    connectionRef.current = null;
    activeConnectionRef.current = null;

    // Update message status using captured ID (FIX: was dead code before)
    if (capturedMessageId) {
      setConversation((prev) => ({
        ...prev,
        messages: prev.messages.map((msg) =>
          msg.id === capturedMessageId
            ? {
                ...msg,
                status: "done" as const,
                isRecording: false,
                durationMs: duration,
              }
            : msg
        ),
      }));
    }

    // Reset audio state
    const microphoneState = isOnline && sessionId ? "ready" : "idle";
    setAudio((prev) => ({
      ...prev,
      currentAudioSource: "idle",
      streamingUrl: null,
      microphoneState,
    }));

    streamStartTimeRef.current = 0;
  }, [setAudio, setConversation, isOnline, sessionId]);

  // Store stopBufferStream in ref for use in callbacks
  useEffect(() => {
    stopStreamingRef.current = stopBufferStream;
  }, [stopBufferStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentMessageIdRef.current && currentSessionIdRef.current) {
        stopBufferStream();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    startBufferStream,
    stopBufferStream,
    isStreaming: audio.currentAudioSource === "url",
    streamingUrl: audio.streamingUrl,
  };
}
