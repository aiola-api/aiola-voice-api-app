import { useState, useEffect, useRef } from "react";
import { useRecoilState } from "recoil";
import { Button } from "@/components/ui/button";
import {
  IconMicrophone,
  IconMicrophoneOff,
  IconMicrophoneFilled,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerStopFilled,
} from "@tabler/icons-react";
import { audioState } from "@/state/audio";
import { conversationState, type ChatMessage } from "@/state/conversation";
import {
  settingsState,
  type STTLanguageCode,
  type SettingsState,
} from "@/state/settings";
import { type StreamConnection } from "@/state/connection";
import { useSTT } from "@/hooks/useSTT";
import { useConnection } from "@/hooks/useConnection";
import { toast } from "sonner";
import { logger, formatError } from "@/lib/logger";

const TAG = "VoiceControls";

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
import { componentClassName } from "@/lib/utils";
import "./VoiceControls.css";

// Language mapping for display
const STT_LANGUAGES: {
  value: STTLanguageCode;
  label: string;
  shortLabel: string;
}[] = [
  { value: "default", label: "Default (Workflow)", shortLabel: "DEF" },
  { value: "en_US", label: "English (US)", shortLabel: "EN" },
  { value: "en_GB", label: "English (UK)", shortLabel: "EN" },
  { value: "es_ES", label: "Spanish (Spain)", shortLabel: "ES" },
  { value: "fr_FR", label: "French (France)", shortLabel: "FR" },
  { value: "de_DE", label: "German (Germany)", shortLabel: "DE" },
  { value: "it_IT", label: "Italian (Italy)", shortLabel: "IT" },
  { value: "pt_BR", label: "Portuguese (Brazil)", shortLabel: "PT" },
  { value: "ja_JP", label: "Japanese (Japan)", shortLabel: "JA" },
  { value: "ko_KR", label: "Korean (Korea)", shortLabel: "KO" },
  { value: "zh_CN", label: "Chinese (China)", shortLabel: "ZH" },
];

// Helper function to get language short label
const getLanguageShortLabel = (languageCode: STTLanguageCode): string => {
  const language = STT_LANGUAGES.find((lang) => lang.value === languageCode);
  return language?.shortLabel || languageCode;
};

export function VoiceControls() {
  const [audio, setAudio] = useRecoilState(audioState);
  const [, setConversation] = useRecoilState(conversationState);
  const [settings] = useRecoilState(settingsState);
  const currentSettings = getCurrentSettings(settings);

  // Track the current recording message ID
  const currentRecordingMessageIdRef = useRef<string | null>(null);
  const { createStreamConnection, closeStream } = useSTT();
  const {
    isConnected,
    sessionId,
    createSession,
    isConnecting,
    isOnline,
    updateConnectionState,
  } = useConnection();

  // Temporary state to test animation
  const [testConnecting, setTestConnecting] = useState(false);

  // State to track microphone preparation phase
  const [preparingMic, setPreparingMic] = useState(false);

  // Compute microphone state based on connection and recording state
  const computedMicrophoneState = (() => {
    // If URL streaming is active, don't override the state - let URL streaming control it
    if (audio.currentAudioSource === "url") {
      return audio.microphoneState;
    }

    if (audio.isRecording) return "connected";
    if (preparingMic) return "preparingMic";
    // Only show connecting state for microphone-specific operations, not general connection state
    if (testConnecting) return "connecting";
    if (isOnline && sessionId) return "ready";
    return "idle";
  })();

  // Show connecting animation for 3 seconds when button is clicked in idle state
  useEffect(() => {
    if (testConnecting) {
      const timer = setTimeout(() => {
        setTestConnecting(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [testConnecting]);

  // Use computed microphone state for display
  const displayMicrophoneState = computedMicrophoneState;

  // Debug logging for connecting state
  useEffect(() => {
    logger.debug(TAG, "State:", {
      computedMicrophoneState,
      isConnecting,
      isConnected,
      sessionId,
      audioState: audio.microphoneState,
    });
  }, [
    computedMicrophoneState,
    isConnecting,
    isConnected,
    sessionId,

    audio.microphoneState,
  ]);

  // Sync computed microphone state with audio state
  useEffect(() => {
    logger.debug(TAG, "Sync effect:", {
      audioState: audio.microphoneState,
      computedState: computedMicrophoneState,
      isRecording: audio.isRecording,
    });

    if (audio.microphoneState !== computedMicrophoneState) {
      logger.debug(TAG, "Syncing state:", audio.microphoneState, "->", computedMicrophoneState);
      const newSessionId = sessionId || audio.currentSessionId;

      setAudio((prev) => ({
        ...prev,
        microphoneState: computedMicrophoneState,
        currentSessionId: newSessionId,
      }));
    }
  }, [
    computedMicrophoneState,
    audio.microphoneState,
    audio.currentSessionId,
    audio.isRecording,
    sessionId,
    setAudio,
  ]);

  // Watch for external mic-stop signal from buffer pipeline (file streaming started)
  useEffect(() => {
    if (audio.micStopRequested > 0) {
      if (audio.isRecording) {
        logger.info(TAG, "Mic stop requested by buffer pipeline");
        stopRecording();
      }
      // Always reset signal (even if mic already stopped naturally)
      setAudio((prev) => ({ ...prev, micStopRequested: 0 }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audio.micStopRequested]);

  // Refs for audio processing
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const connectionRef = useRef<StreamConnection | null>(null);
  const sttRequestStartTimeRef = useRef<number>(0);
  const keepaliveTimerRef = useRef<number | null>(null);

  // Track which connections we've already set up handlers for
  const connectionHandlersRef = useRef<Set<StreamConnection>>(new Set());

  // Track last applied keywords and schema values to avoid unnecessary updates
  const lastAppliedKeywordsRef = useRef<string>("");
  const lastAppliedSchemaValuesRef = useRef<string>("");

  // Timer effect for both recording and STT request
  useEffect(() => {
    if (sttRequestStartTimeRef.current === 0 || !audio.isRecording) return;

    const interval = setInterval(() => {
      const now = Date.now();

      // Update audio state
      setAudio((prev) => {
        const newSttRequestElapsedMs =
          sttRequestStartTimeRef.current > 0
            ? now - sttRequestStartTimeRef.current
            : 0;

        return {
          ...prev,
          elapsedMs: prev.startedAtMs > 0 ? now - prev.startedAtMs : 0,
          sttRequestElapsedMs: newSttRequestElapsedMs,
        };
      });

      // Update conversation message duration separately
      if (
        currentRecordingMessageIdRef.current &&
        sttRequestStartTimeRef.current > 0
      ) {
        setConversation((convPrev) => ({
          ...convPrev,
          messages: convPrev.messages.map((msg) => {
            if (msg.id === currentRecordingMessageIdRef.current) {
              return {
                ...msg,
                durationMs: now - sttRequestStartTimeRef.current,
              };
            }
            return msg;
          }),
        }));
      }
    }, 100);

    return () => clearInterval(interval);
  }, [
    audio.isRecording,
    audio.startedAtMs,
    audio.sttRequestStartedAtMs,
    audio.currentSessionId,
    setAudio,
    setConversation,
    sttRequestStartTimeRef,
  ]);

  // Dynamically update keywords and schema values when settings change during active stream
  useEffect(() => {
    const connection = connectionRef.current;
    if (!connection || !connection.connected) {
      return;
    }

    // Get current values from settings (use direct access to avoid dependency issues)
    const env = settings.environment;
    const keywords = settings[env].stt.keywords || [];
    const schemaValues = settings[env].stt.schemaValues || {};

    // Check if keywords changed
    const currentKeywordsJson = JSON.stringify(keywords);
    if (currentKeywordsJson !== lastAppliedKeywordsRef.current) {
      const keywordsObj: Record<string, string> = {};
      keywords.forEach((keyword: string) => {
        keywordsObj[keyword] = keyword;
      });
      // Only set keywords if there are any (don't send empty event)
      if (Object.keys(keywordsObj).length > 0) {
        logger.debug(TAG, "Updating keywords dynamically:", keywordsObj);
        try {
          connection.setKeywords(keywordsObj);
          // Update ref immediately to prevent duplicate calls
          lastAppliedKeywordsRef.current = currentKeywordsJson;
        } catch (error) {
          logger.error(TAG, "Error updating keywords:", error);
        }
      } else {
        // Update ref even if empty to prevent re-checking
        lastAppliedKeywordsRef.current = currentKeywordsJson;
      }
    }

    // Check if schema values changed
    const currentSchemaValuesJson = JSON.stringify(schemaValues);
    if (currentSchemaValuesJson !== lastAppliedSchemaValuesRef.current) {
      // Only set schema values if there are any (don't send empty event)
      if (Object.keys(schemaValues).length > 0) {
        logger.debug(TAG, "Updating schema values dynamically:", schemaValues);
        try {
          // Update ref immediately before async call to prevent duplicate calls
          lastAppliedSchemaValuesRef.current = currentSchemaValuesJson;
          connection.setSchemaValues(schemaValues, (response) => {
            if (response.status === "ok") {
              logger.debug(TAG, "Schema values updated successfully");
            } else {
              logger.warn(TAG, "Schema values update warning:", response.message);
              // Revert ref on error so it can be retried
              lastAppliedSchemaValuesRef.current = "";
            }
          });
        } catch (error) {
          logger.error(TAG, "Error updating schema values:", error);
          // Revert ref on error so it can be retried
          lastAppliedSchemaValuesRef.current = "";
        }
      } else {
        // Update ref even if empty to prevent re-checking
        lastAppliedSchemaValuesRef.current = currentSchemaValuesJson;
      }
    }
  }, [settings]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop keepalive timer
      if (keepaliveTimerRef.current) {
        clearInterval(keepaliveTimerRef.current);
        keepaliveTimerRef.current = null;
      }

      closeStream();
      cleanupMicrophone();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanupMicrophone = () => {
    if (microphoneStreamRef.current) {
      microphoneStreamRef.current.getTracks().forEach((track) => track.stop());
      microphoneStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    audioWorkletNodeRef.current = null;
  };

  const setupAudioPipeline = async (connection: StreamConnection) => {
    logger.info(TAG, "Setting up audio pipeline");

    // Update connection state to streaming
    updateConnectionState({
      isStreaming: true,
      error: undefined,
    });

    // Stop keepalive timer since we're now actively using the connection
    if (keepaliveTimerRef.current) {
      clearInterval(keepaliveTimerRef.current);
      keepaliveTimerRef.current = null;
    }

    // Update STT request message status to streaming
    setConversation((prev) => {
      const updatedMessages = prev.messages.map((msg) => {
        if (msg.id === currentRecordingMessageIdRef.current) {
          return {
            ...msg,
            status: "streaming" as const,
            content: "🎤 Recording... (Streaming)",
            isRecording: true,
          };
        } else {
          return {
            ...msg,
            isRecording: false,
          };
        }
      });
      return { ...prev, messages: updatedMessages };
    });

    try {
      // Create audio source and worklet node
      const source = audioContextRef.current!.createMediaStreamSource(
        microphoneStreamRef.current!
      );
      audioWorkletNodeRef.current = new AudioWorkletNode(
        audioContextRef.current!,
        "audio-processor"
      );

      // Set up audio data handler
      let audioPacketCount = 0;
      audioWorkletNodeRef.current.port.onmessage = (event) => {
        try {
          // Send audio data to STT connection
          connection.send(event.data.audio_data);

          // Handle amplitude data for waveform visualization
          if (event.data.amplitude) {
            const amplitudeData = event.data.amplitude;

            // Update conversation state with amplitude data for the current recording message
            const currentRecordingMessageId =
              currentRecordingMessageIdRef.current;
            if (currentRecordingMessageId) {
              setConversation((prev) => {
                const updatedMessages = prev.messages.map((msg) => {
                  if (msg.id === currentRecordingMessageId) {
                    const newHistory = [
                      ...(msg.amplitudeHistory || []),
                      amplitudeData,
                    ];
                    // Keep only the last 50 amplitude readings for performance
                    const trimmedHistory = newHistory.slice(-50);

                    return {
                      ...msg,
                      amplitudeData,
                      amplitudeHistory: trimmedHistory,
                    };
                  }
                  return msg;
                });

                return {
                  ...prev,
                  messages: updatedMessages,
                };
              });
            }
          }

          audioPacketCount++;
          if (audioPacketCount % 50 === 0) {
            logger.debug(TAG, `Sent ${audioPacketCount} audio packets`);
          }
        } catch (error) {
          if (audioPacketCount % 100 === 0) {
            logger.error(TAG, "Error sending audio data:", error);
          }
        }
      };

      // Connect the audio nodes
      source.connect(audioWorkletNodeRef.current);
      logger.info(TAG, "Audio pipeline connected");

      // Update state - transition to connected state
      setAudio((prev) => {
        return {
          ...prev,
          micAllowed: true,
          isRecording: true,
          startedAtMs: Date.now(),
          elapsedMs: 0,
        };
      });

      // Clear preparingMic state as recording has started
      setPreparingMic(false);

      logger.info(TAG, "Recording started");
    } catch (error) {
      logger.error(TAG, "Error setting up audio pipeline:", error);
      toast.error(`Failed to set up audio: ${formatError(error)}`);

      // Stop keepalive timer on error
      if (keepaliveTimerRef.current) {
        clearInterval(keepaliveTimerRef.current);
        keepaliveTimerRef.current = null;
      }

      throw error;
    }
  };

  const startRecording = async () => {
    logger.info(TAG, "Starting recording");
    if (!currentSettings.apiKey) {
      toast.error("Please configure your API key first");
      return;
    }

    // Stop any active buffer stream before starting mic (one stream at a time)
    if (audio.currentAudioSource === "url") {
      logger.debug(TAG, "Stopping active buffer stream before starting mic");
      setAudio((prev) => ({ ...prev, bufferStreamStopRequested: Date.now() }));
      // Brief wait for the buffer pipeline to clean up
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    try {
      // Create STT request message in chat when recording starts
      const messageId = `stt_request_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Generate unique conversation session ID that includes session and timestamp
      // This ensures each recording session gets a unique conversation_session_id
      const recordingSessionId = `recording_${
        audio.currentSessionId || "default"
      }_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      const sttRequestMessage: ChatMessage = {
        id: messageId,
        role: "user",
        content: "🎤 Recording...",
        createdAt: Date.now(),
        sessionId: audio.currentSessionId || undefined,
        conversation_session_id: recordingSessionId, // Use unique recording session ID
        kind: "STT Stream",
        status: "recording",
        isRecording: true,
      };

      logger.debug(TAG, "Creating STT message:", messageId);

      // Set the current recording message ID FIRST
      currentRecordingMessageIdRef.current = messageId;

      setAudio((prev) => ({
        ...prev,
        currentRecordingMessageId: messageId,
      }));

      // Update all messages: set isRecording to false for all existing, then add new one
      setConversation((prev) => {
        const updatedMessages = prev.messages.map((msg) => ({
          ...msg,
          isRecording: false,
        }));

        const newMessages = [...updatedMessages, sttRequestMessage];
        return {
          ...prev,
          messages: newMessages,
        };
      });

      // Start the STT request timer
      sttRequestStartTimeRef.current = Date.now();

      // Set preparingMic state after AudioContext setup but before recording starts
      setPreparingMic(true);

      // STEP 1: Get microphone stream (permission already granted)
      logger.debug(TAG, "Accessing microphone stream");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      logger.debug(TAG, "Microphone stream accessed");
      microphoneStreamRef.current = stream;

      // STEP 2: Set up AudioContext
      logger.debug(TAG, "Setting up AudioContext");
      try {
        audioContextRef.current = new AudioContext({
          sampleRate: 16000,
          latencyHint: "interactive",
        });

        // Monitor AudioContext state changes — auto-resume if suspended under CPU pressure
        audioContextRef.current.onstatechange = () => {
          const ctx = audioContextRef.current;
          if (!ctx) return;
          logger.debug(TAG, `AudioContext state changed: ${ctx.state}`);
          if (ctx.state === "suspended" || ctx.state === "interrupted") {
            logger.warn(TAG, "AudioContext suspended/interrupted, attempting resume");
            ctx.resume().catch((err) => {
              logger.error(TAG, "Failed to resume AudioContext:", err);
            });
          }
        };

        // Resume AudioContext if it's suspended (required by some browsers)
        if (audioContextRef.current.state === "suspended") {
          await audioContextRef.current.resume();
        }

        await audioContextRef.current.audioWorklet.addModule(
          `${import.meta.env.BASE_URL}audio-processor.js`
        );
        logger.debug(TAG, "Audio worklet loaded");
      } catch (audioError) {
        logger.error(TAG, "AudioContext setup failed:", audioError);
        toast.error(
          "Failed to initialize audio system. Please check your browser settings."
        );
        cleanupMicrophone();
        return;
      }

      // Session is already created in createSessionAndStartRecording
      // Just update the STT request timing

      // STEP 3: Create STT connection
      logger.debug(TAG, "Creating STT stream");

      const connection = await createStreamConnection();

      // Check if we've already set up handlers for this connection
      if (connectionHandlersRef.current.has(connection)) {
        logger.debug(TAG, "Reusing existing connection handlers");
        // For already connected connections, we need to manually trigger the audio setup
        // since the "connect" event won't fire again
        if (connection.connected) {
          logger.debug(TAG, "Connection already connected, setting up audio pipeline");
          setTimeout(async () => {
            try {
              await setupAudioPipeline(connection);
            } catch (error) {
              logger.error(TAG, "Error setting up audio pipeline for existing connection:", error);
            }
          }, 0);
        }
      } else {
        logger.debug(TAG, "Setting up new connection handlers");
        connectionHandlersRef.current.add(connection);

        // Set up event handlers for new connections
        connection.on("connect", async () => {
          logger.info(TAG, "Stream connected");
          toast.success("Connected - Recording started");

          try {
            // Apply keywords (only if not empty - don't send empty event)
            const keywords = currentSettings.stt.keywords || [];
            const keywordsObj: Record<string, string> = {};
            keywords.forEach((keyword: string) => {
              keywordsObj[keyword] = keyword;
            });
            if (Object.keys(keywordsObj).length > 0) {
              logger.debug(TAG, "Applying keywords:", keywordsObj);
              connection.setKeywords(keywordsObj);
            }
            lastAppliedKeywordsRef.current = JSON.stringify(keywords);

            // Apply schema values (only if not empty - don't send empty event)
            const schemaValues = currentSettings.stt.schemaValues || {};
            if (Object.keys(schemaValues).length > 0) {
              logger.debug(TAG, "Applying schema values:", schemaValues);
              connection.setSchemaValues(schemaValues, (response) => {
                if (response.status === "ok") {
                  logger.debug(TAG, "Schema values set successfully");
                } else {
                  logger.warn(TAG, "Schema values set with warning:", response.message);
                }
              });
            }
            lastAppliedSchemaValuesRef.current = JSON.stringify(schemaValues);

            await setupAudioPipeline(connection);
          } catch (error) {
            logger.error(TAG, "Error in connect handler:", error);
            stopRecording();
          }
        });

        // Per-session transcript: only fires when mic is active
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        connection.on("transcript", (data: any) => {
          const sttMessageId = currentRecordingMessageIdRef.current;
          if (!sttMessageId) return;

          setConversation((prev) => {
            const sttMessage = prev.messages.find(
              (msg) => msg.id === sttMessageId
            );
            if (!sttMessage?.conversation_session_id) return prev;

            const sessionId = sttMessage.conversation_session_id;
            const existing = prev.messages.find(
              (msg) =>
                msg.kind === "Transcription" &&
                msg.conversation_session_id === sessionId
            );

            if (existing) {
              const newContent = existing.content
                ? `${existing.content} ${data.transcript}`
                : data.transcript;
              return {
                ...prev,
                messages: prev.messages.map((msg) =>
                  msg.id === existing.id
                    ? { ...msg, content: newContent, createdAt: Date.now() }
                    : msg
                ),
              };
            }

            const transcriptionMessage: ChatMessage = {
              id: `transcript_${sessionId}`,
              role: "assistant",
              content: data.transcript,
              createdAt: Date.now(),
              conversation_session_id: sessionId,
              kind: "Transcription",
              status: "done",
              isTranscription: true,
            };
            return {
              ...prev,
              messages: [...prev.messages, transcriptionMessage],
            };
          });
        });

        // Per-session structured: only fires when mic is active
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        connection.on("structured", (data: any) => {
          const sttMessageId = currentRecordingMessageIdRef.current;
          if (!sttMessageId) return;
          if (!data.results || typeof data.results !== "object") return;

          setConversation((prev) => {
            const sttMessage = prev.messages.find(
              (msg) => msg.id === sttMessageId
            );
            if (!sttMessage?.conversation_session_id) return prev;

            const sessionId = sttMessage.conversation_session_id;
            const existing = prev.messages.find(
              (msg) =>
                msg.kind === "Structured" &&
                msg.conversation_session_id === sessionId
            );

            if (existing) {
              const mergedData = {
                ...existing.structuredData,
                ...data.results,
              };
              return {
                ...prev,
                messages: prev.messages.map((msg) =>
                  msg.id === existing.id
                    ? {
                        ...msg,
                        structuredData: mergedData,
                        content: `Structured data updated (${Object.keys(mergedData).length} fields)`,
                        createdAt: Date.now(),
                      }
                    : msg
                ),
              };
            }

            const structuredMessage: ChatMessage = {
              id: `structured_${sessionId}`,
              role: "assistant",
              content: `Structured data received (${Object.keys(data.results).length} fields)`,
              createdAt: Date.now(),
              conversation_session_id: sessionId,
              kind: "Structured",
              status: "done",
              structuredData: data.results,
            };
            return {
              ...prev,
              messages: [...prev.messages, structuredMessage],
            };
          });
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        connection.on("error", (error: any) => {
          logger.error(TAG, "Connection error:", error);
          toast.error(`Connection error: ${formatError(error)}`);

          // Update STT request message to error status
          if (currentRecordingMessageIdRef.current) {
            setConversation((prev) => {
              const updatedMessages = prev.messages.map((msg) => {
                if (msg.id === currentRecordingMessageIdRef.current) {
                  return {
                    ...msg,
                    status: "error" as const,
                    content: "🎤 Recording failed",
                    error: error?.message || "Connection failed",
                    isRecording: false,
                  };
                } else {
                  return {
                    ...msg,
                    isRecording: false,
                  };
                }
              });
              return { ...prev, messages: updatedMessages };
            });
          }

          // Clear the current recording message ID on error
          currentRecordingMessageIdRef.current = null;
          setAudio((prev) => ({
            ...prev,
            currentRecordingMessageId: undefined,
          }));

          stopRecording();
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        connection.on("disconnect", (reason: any) => {
          // Reset applied refs when connection disconnects
          lastAppliedKeywordsRef.current = "";
          lastAppliedSchemaValuesRef.current = "";
          logger.info(TAG, "Disconnected:", reason);
          if (reason && reason !== "io client disconnect") {
            toast.error(`Disconnected: ${reason}`);
          }

          // Stop keepalive timer when connection is lost
          if (keepaliveTimerRef.current) {
            clearInterval(keepaliveTimerRef.current);
            keepaliveTimerRef.current = null;
          }
        });
      }

      connectionRef.current = connection;
      logger.debug(TAG, "STT stream created and handlers set up");

      // Handle connection state properly for pause/resume
      if (connection.connected) {
        logger.debug(TAG, "Reusing existing STT connection");
        // For already connected connections, we need to manually trigger the audio setup
        // since the "connect" event won't fire again
        setTimeout(async () => {
          try {
            await setupAudioPipeline(connection);
          } catch (error) {
            logger.error(TAG, "Error setting up audio pipeline for existing connection:", error);
          }
        }, 0);
      } else {
        // Connection was closed (possibly by server timeout), create new one
        logger.debug(TAG, "Connection was closed, creating new STT stream");
        connection.connect();
      }
    } catch (error) {
      logger.error(TAG, "Error starting recording:", error);

      let errorMessage = "Failed to start recording";
      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          errorMessage =
            "Microphone access denied. Please allow microphone permissions.";
        } else if (error.name === "NotFoundError") {
          errorMessage =
            "No microphone found. Please connect a microphone and try again.";
        } else if (error.name === "NotReadableError") {
          errorMessage = "Microphone is already in use by another application.";
        } else if (error.name === "OverconstrainedError") {
          errorMessage =
            "Microphone doesn't support the required audio format.";
        } else {
          errorMessage = formatError(error);
        }
      }

      toast.error(errorMessage);
      cleanupMicrophone();

      // Update STT request message to error status
      if (currentRecordingMessageIdRef.current) {
        setConversation((prev) => {
          const updatedMessages = prev.messages.map((msg) => {
            if (msg.id === currentRecordingMessageIdRef.current) {
              return {
                ...msg,
                status: "error" as const,
                content: "🎤 Recording failed",
                error: errorMessage,
                isRecording: false,
              };
            } else {
              return {
                ...msg,
                isRecording: false,
              };
            }
          });
          return { ...prev, messages: updatedMessages };
        });
      }

      // Reset STT request timer on error
      currentRecordingMessageIdRef.current = null;
      setAudio((prev) => ({
        ...prev,
        sttRequestStartedAtMs: 0,
        sttRequestElapsedMs: 0,
        currentRecordingMessageId: undefined,
      }));
      sttRequestStartTimeRef.current = 0;
    }
  };

  const stopRecording = () => {
    logger.info(TAG, "Stopping recording for message:", currentRecordingMessageIdRef.current);

    // Update STT request message to done status
    if (currentRecordingMessageIdRef.current) {
      const finalDuration =
        sttRequestStartTimeRef.current > 0
          ? Date.now() - sttRequestStartTimeRef.current
          : 0;

      setConversation((prev) => {
        const updatedMessages = prev.messages.map((msg) => {
          if (msg.id === currentRecordingMessageIdRef.current) {
            return {
              ...msg,
              status: "done" as const,
              durationMs: finalDuration,
              isRecording: false,
            };
          } else {
            return {
              ...msg,
              isRecording: false,
            };
          }
        });
        return { ...prev, messages: updatedMessages };
      });
    }

    // Update connection state to not streaming (keep connection alive)
    updateConnectionState({
      isStreaming: false,
    });

    // Start keepalive to prevent connection timeout
    if (connectionRef.current && !keepaliveTimerRef.current) {
      keepaliveTimerRef.current = window.setInterval(() => {
        if (connectionRef.current && connectionRef.current.connected) {
          // Send a minimal ping to keep connection alive
          try {
            connectionRef.current.send(new ArrayBuffer(0));
          } catch (error) {
            logger.debug(TAG, "Keepalive ping failed:", error);
            // Stop keepalive if connection is dead
            if (keepaliveTimerRef.current) {
              clearInterval(keepaliveTimerRef.current);
              keepaliveTimerRef.current = null;
            }
          }
        }
      }, 30000); // Ping every 30 seconds
    }

    // Clean up microphone only (don't close connection)
    cleanupMicrophone();

    // Clear the current recording message ID
    currentRecordingMessageIdRef.current = null;

    setAudio((prev) => ({
      ...prev,
      isRecording: false,
      partialText: "",
      currentRecordingMessageId: undefined,
      sttRequestStartedAtMs: 0,
      sttRequestElapsedMs: 0,
    }));

    logger.info(TAG, "Recording stopped");

    // Keep session active for next recording
    sttRequestStartTimeRef.current = 0;
  };

  const handleMicPress = async () => {
    logger.debug(TAG, "Mic button clicked", {
      computedState: computedMicrophoneState,
      isRecording: audio.isRecording,
    });

    // If buffer streaming or paused (file/URL active), toggle pause/resume
    if (audio.currentAudioSource === "url") {
      logger.debug(TAG, "Pause/resume buffer stream requested");
      setAudio((prev) => ({
        ...prev,
        bufferStreamPauseRequested: Date.now(),
      }));
      return;
    }

    // If currently recording (connected state), stop recording and go to ready state
    if (computedMicrophoneState === "connected") {
      logger.debug(TAG, "Currently recording, stopping");
      stopRecording();
      return;
    }

    // If ready state (session exists but not connected), start recording
    if (computedMicrophoneState === "ready") {
      logger.debug(TAG, "In ready state, starting recording");
      await startRecording();
      return;
    }

    // If no session exists, create session and go to ready state
    if (!sessionId) {
      logger.debug(TAG, "No session exists, creating session");
      // First show the connecting animation for testing
      setTestConnecting(true);
      try {
        await createSessionAndStartRecording();
      } catch (error) {
        logger.error(TAG, "Error creating session:", error);
        setTestConnecting(false); // Hide animation on error
      }
      return;
    }
  };

  const createSessionAndStartRecording = async () => {
    try {
      logger.info(TAG, "Creating new session for microphone recording");
      await createSession();

      logger.debug(TAG, "Session created:", sessionId);

      // Now start recording with the new session
      await startRecording();
    } catch (error) {
      logger.error(TAG, "Failed to create session:", error);
      toast.error(`Failed to create session: ${formatError(error)}`);
      // Reset connecting animation on error
      setTestConnecting(false);
    }
  };

  // Helper function to render microphone state indicator
  const renderMicrophoneIndicator = () => {
    const languageShortLabel = getLanguageShortLabel(
      currentSettings.stt.language as STTLanguageCode
    );

    // Buffer stream active (connecting or streaming) — show stop icon
    const isBufferStreamActive = audio.currentAudioSource === "url";

    switch (displayMicrophoneState) {
      case "connecting":
        if (isBufferStreamActive) {
          // Buffer stream connecting — show stop icon with loading animation
          return (
            <div className="voice-controls__mic-container">
              <div className="voice-controls__connecting-indicator">
                <div className="voice-controls__connecting-dot--white" />
              </div>
              <IconPlayerStopFilled className="voice-controls__mic-icon--connecting" />
              <div className="voice-controls__language-indicator">
                {languageShortLabel}
              </div>
            </div>
          );
        }
        return (
          <div className="voice-controls__mic-container">
            <div className="voice-controls__connecting-indicator">
              <div className="voice-controls__connecting-dot" />
            </div>
            <IconMicrophone className="voice-controls__mic-icon--connecting" />
            <div className="voice-controls__language-indicator">
              {languageShortLabel}
            </div>
          </div>
        );
      case "streaming":
        return (
          <div className="voice-controls__mic-container">
            <IconPlayerPauseFilled className="voice-controls__mic-icon--connected" />
            <div className="voice-controls__language-indicator">
              {languageShortLabel}
            </div>
          </div>
        );
      case "paused":
        return (
          <div className="voice-controls__mic-container">
            <IconPlayerPlayFilled className="voice-controls__mic-icon--connected" />
            <div className="voice-controls__language-indicator">
              {languageShortLabel}
            </div>
          </div>
        );
      case "connected":
        return (
          <div className="voice-controls__mic-container">
            <IconMicrophoneFilled className="voice-controls__mic-icon--connected" />
            <div className="voice-controls__language-indicator">
              {languageShortLabel}
            </div>
          </div>
        );
      case "ready":
        return (
          <div className="voice-controls__mic-container">
            <IconMicrophoneOff className="voice-controls__mic-icon--ready" />
            <div className="voice-controls__language-indicator">
              {languageShortLabel}
            </div>
          </div>
        );
      case "preparingMic":
        return (
          <div className="voice-controls__mic-container">
            <div className="voice-controls__connecting-indicator">
              <div className="voice-controls__connecting-dot--white" />
            </div>
            <IconMicrophoneOff className="voice-controls__mic-icon--preparing" />
            <div className="voice-controls__language-indicator">
              {languageShortLabel}
            </div>
          </div>
        );
      default:
        return (
          <div className="voice-controls__mic-container">
            <IconMicrophone className="voice-controls__mic-icon--idle" />
            <div className="voice-controls__language-indicator">
              {languageShortLabel}
            </div>
          </div>
        );
    }
  };

  // Helper function to get button className based on state
  const getButtonClassName = () => {
    const baseClass = "voice-controls__mic-button";
    const stateClass = (() => {
      switch (displayMicrophoneState) {
        case "streaming":
          return "voice-controls__mic-button--streaming";
        case "paused":
          return "voice-controls__mic-button--paused";
        case "connected":
          return "voice-controls__mic-button--connected";
        case "ready":
          return "voice-controls__mic-button--ready";
        case "connecting":
          return "voice-controls__mic-button--connecting";
        case "preparingMic":
          return "voice-controls__mic-button--preparingMic";
        default:
          return "voice-controls__mic-button--idle";
      }
    })();

    return `${baseClass} ${stateClass}`;
  };

  return (
    <div
      className={componentClassName("VoiceControls", "voice-controls-buttons")}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={handleMicPress}
        disabled={isConnecting}
        className={`voice-controls__mic-button ${getButtonClassName()}`}
      >
        {renderMicrophoneIndicator()}
      </Button>
    </div>
  );
}
