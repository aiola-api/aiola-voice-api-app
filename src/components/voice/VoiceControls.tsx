import { useState, useEffect, useRef } from "react";
import { useRecoilState } from "recoil";
import { Button } from "@/components/ui/button";
import {
  IconMicrophone,
  IconMicrophoneOff,
  IconMicrophoneFilled,
} from "@tabler/icons-react";
import { audioState } from "@/state/audio";
import { conversationState, type ChatMessage } from "@/state/conversation";
import { settingsState, type STTLanguageCode } from "@/state/settings";
import { type StreamConnection } from "@/state/connection";
import { useSTT } from "@/hooks/useSTT";
import { useConnection } from "@/hooks/useConnection";
import { toast } from "sonner";

// Helper function to get current environment settings
function getCurrentSettings(settings: any) {
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

// Logging function to display conversation state
const logConversationState = (
  messages: ChatMessage[],
  title: string = "Conversation Update"
) => {
  console.group(`📋 ${title}`);
  console.log(`Total messages: ${messages.length}`);

  const sttMessages = messages.filter((msg) => msg.kind === "STT Stream");
  const recordingMessages = messages.filter((msg) => msg.isRecording === true);

  console.log(`STT messages: ${sttMessages.length}`);
  console.log(`Currently recording: ${recordingMessages.length}`);

  messages.forEach((msg, index) => {
    const isRecording = msg.isRecording ? "🔴" : "⚪";
    const status = msg.status || "unknown";
    const kind = msg.kind || "unknown";
    const duration = msg.durationMs
      ? `${(msg.durationMs / 1000).toFixed(1)}s`
      : "0s";

    console.log(
      `${index + 1}. ${isRecording} [${kind}] ${msg.id.substring(
        0,
        20
      )}... | ${status} | ${duration}`
    );
  });

  if (recordingMessages.length > 0) {
    console.log("🎤 Currently recording:", recordingMessages[0].id);
  }

  console.groupEnd();
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
    if (audio.isRecording) return "connected";
    if (preparingMic) return "preparingMic";
    if (isConnecting || testConnecting) return "connecting";
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
    console.log("🔍 VoiceControls state:", {
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
    console.log("🔍 Sync effect triggered:", {
      audioState: audio.microphoneState,
      computedState: computedMicrophoneState,
      isRecording: audio.isRecording,
      shouldSync: audio.microphoneState !== computedMicrophoneState,
    });

    if (audio.microphoneState !== computedMicrophoneState) {
      console.log("🔄 Syncing audio state with computed state:", {
        from: audio.microphoneState,
        to: computedMicrophoneState,
      });
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

  // Refs for audio processing
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const connectionRef = useRef<StreamConnection | null>(null);
  const sttRequestStartTimeRef = useRef<number>(0);
  const keepaliveTimerRef = useRef<number | null>(null);

  // Track processed transcripts to prevent duplicates per conversation session
  const processedTranscriptsRef = useRef<Map<string, Set<string>>>(new Map());

  // Track which connections we've already set up handlers for
  const connectionHandlersRef = useRef<Set<StreamConnection>>(new Set());

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

        // Debug log to see if timer is running
        if (newSttRequestElapsedMs > 0 && newSttRequestElapsedMs % 1000 < 100) {
          console.log(`Timer running: ${newSttRequestElapsedMs}ms`);
        }

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
        console.log("🔄 Updating conversation message duration:", {
          currentMessageId: currentRecordingMessageIdRef.current,
          sttStartTime: sttRequestStartTimeRef.current,
          elapsed: now - sttRequestStartTimeRef.current,
        });

        setConversation((convPrev) => ({
          ...convPrev,
          messages: convPrev.messages.map((msg) => {
            if (msg.id === currentRecordingMessageIdRef.current) {
              console.log(
                "📝 Updating STT message:",
                msg.id,
                "duration:",
                now - sttRequestStartTimeRef.current
              );
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
    console.log("🎵 Setting up audio pipeline...");

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
    console.log(
      "🔄 Updating message status to streaming for:",
      currentRecordingMessageIdRef.current
    );
    setConversation((prev) => {
      const updatedMessages = prev.messages.map((msg) => {
        if (msg.id === currentRecordingMessageIdRef.current) {
          console.log("✅ Setting streaming status for message:", msg.id);
          return {
            ...msg,
            status: "streaming" as const,
            content: "🎤 Recording... (Streaming)",
            isRecording: true,
          };
        } else {
          if (msg.isRecording) {
            console.log(
              "❌ Clearing isRecording for non-current message:",
              msg.id
            );
          }
          return {
            ...msg,
            isRecording: false,
          };
        }
      });
      logConversationState(
        updatedMessages,
        "Message Status Updated to Streaming"
      );
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
          connection.send(event.data.audio_data);
          audioPacketCount++;
          if (audioPacketCount % 50 === 0) {
            console.log(`🔊 Sent ${audioPacketCount} audio packets`);
          }
        } catch (error) {
          if (audioPacketCount % 100 === 0) {
            console.error("⚠️ Error sending audio data:", error);
          }
        }
      };

      // Connect the audio nodes
      source.connect(audioWorkletNodeRef.current);
      console.log("✅ Audio pipeline connected");

      // Update state - transition to connected state
      setAudio((prev) => {
        console.log("🎯 Setting isRecording to true, current state:", {
          isRecording: prev.isRecording,
          microphoneState: prev.microphoneState,
        });

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

      console.log("✅ Recording started successfully", {
        isRecording: true,
        currentSessionId: audio.currentSessionId,
        micAllowed: true,
      });
    } catch (error) {
      console.error("❌ Error setting up audio pipeline:", error);
      toast.error("Failed to set up audio");

      // Stop keepalive timer on error
      if (keepaliveTimerRef.current) {
        clearInterval(keepaliveTimerRef.current);
        keepaliveTimerRef.current = null;
      }

      throw error;
    }
  };

  const startRecording = async () => {
    console.log("🎤 Starting recording...");
    if (!currentSettings.apiKey) {
      toast.error("Please configure your API key first");
      return;
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

      console.log(
        "🎤 Creating new STT message:",
        messageId,
        "with isRecording: true"
      );

      // Set the current recording message ID FIRST
      currentRecordingMessageIdRef.current = messageId;

      // Clear processed transcripts for the new recording session
      processedTranscriptsRef.current.delete(messageId);

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
        logConversationState(newMessages, "New STT Message Created");

        return {
          ...prev,
          messages: newMessages,
        };
      });

      // Start the STT request timer
      sttRequestStartTimeRef.current = Date.now();

      console.log(
        "💬 Added STT request message to chat:",
        sttRequestMessage.id,
        "Timer started at:",
        sttRequestStartTimeRef.current
      );

      // Set preparingMic state after AudioContext setup but before recording starts
      setPreparingMic(true);

      // STEP 1: Get microphone stream (permission already granted)
      console.log("🎤 Step 1: Accessing microphone stream...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      console.log("✅ Microphone stream accessed");
      microphoneStreamRef.current = stream;

      // STEP 2: Set up AudioContext
      console.log("🎤 Step 2: Setting up AudioContext...");
      try {
        audioContextRef.current = new AudioContext({
          sampleRate: 16000,
          latencyHint: "interactive",
        });

        // Resume AudioContext if it's suspended (required by some browsers)
        if (audioContextRef.current.state === "suspended") {
          await audioContextRef.current.resume();
        }

        await audioContextRef.current.audioWorklet.addModule(
          `${import.meta.env.BASE_URL}audio-processor.js`
        );
        console.log("✅ Audio worklet loaded");

        console.log("🔧 Microphone preparation phase started");
      } catch (audioError) {
        console.error("❌ AudioContext setup failed:", audioError);
        toast.error(
          "Failed to initialize audio system. Please check your browser settings."
        );
        cleanupMicrophone();
        return;
      }

      // Session is already created in createSessionAndStartRecording
      // Just update the STT request timing

      // STEP 3: Create STT connection
      console.log("📡 Step 3: Creating STT stream...");

      const connection = await createStreamConnection();

      // Check if we've already set up handlers for this connection
      if (connectionHandlersRef.current.has(connection)) {
        console.log("🔄 Reusing existing connection handlers");
        // For already connected connections, we need to manually trigger the audio setup
        // since the "connect" event won't fire again
        if (connection.connected) {
          console.log(
            "🔌 Connection already connected, setting up audio pipeline..."
          );
          setTimeout(async () => {
            try {
              await setupAudioPipeline(connection);
            } catch (error) {
              console.error(
                "❌ Error setting up audio pipeline for existing connection:",
                error
              );
            }
          }, 0);
        }
      } else {
        console.log("🔧 Setting up new connection handlers");
        connectionHandlersRef.current.add(connection);

        // Set up event handlers for new connections
        connection.on("connect", async () => {
          console.log("✅ Stream connected - Setting up audio pipeline...");
          toast.success("Connected - Recording started");

          try {
            await setupAudioPipeline(connection);
          } catch (error) {
            console.error("❌ Error in connect handler:", error);
            stopRecording();
          }
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        connection.on("transcript", (data: any) => {
          console.log(
            "test-x New transcript arriving from SDK:",
            data.transcript
          );
          console.log("📝 Transcript received:", data.transcript);
          console.log(
            "🔍 Current recording message ID:",
            currentRecordingMessageIdRef.current
          );

          // Check for duplicate transcripts to prevent appending the same transcript multiple times
          const currentSttMessageId = currentRecordingMessageIdRef.current;
          if (!currentSttMessageId) {
            console.warn(
              "⚠️ No current STT message ID, skipping transcript processing"
            );
            return;
          }

          // Get or create the set of processed transcripts for this conversation session
          if (!processedTranscriptsRef.current.has(currentSttMessageId)) {
            processedTranscriptsRef.current.set(currentSttMessageId, new Set());
          }
          const processedSet =
            processedTranscriptsRef.current.get(currentSttMessageId)!;

          // If this transcript has already been processed, skip it
          if (processedSet.has(data.transcript)) {
            console.log("🔄 Skipping duplicate transcript:", data.transcript);
            return;
          }

          // Mark this transcript as processed
          processedSet.add(data.transcript);
          console.log("✅ Processing new transcript:", data.transcript);

          setConversation((prev) => {
            console.log("🔍 Total messages:", prev.messages.length);
            console.log(
              "🔍 STT Stream messages:",
              prev.messages.filter((msg) => msg.kind === "STT Stream").length
            );
            console.log(
              "🔍 Transcription messages:",
              prev.messages.filter((msg) => msg.kind === "Transcription").length
            );

            // Find the current STT Stream message to get the conversation_session_id
            const currentSttMessage = prev.messages.find(
              (msg) => msg.id === currentRecordingMessageIdRef.current
            );

            console.log(
              "🔍 Current STT message:",
              currentSttMessage?.id,
              currentSttMessage?.conversation_session_id
            );

            if (
              !currentSttMessage ||
              !currentSttMessage.conversation_session_id
            ) {
              console.warn(
                "⚠️ No current STT Stream message found or missing conversation_session_id"
              );
              return prev;
            }

            // Look for an existing transcription message with the same conversation_session_id
            const existingTranscriptionMessage = prev.messages.find(
              (msg) =>
                msg.kind === "Transcription" &&
                msg.conversation_session_id ===
                  currentSttMessage.conversation_session_id &&
                msg.role === "assistant"
            );

            console.log(
              "🔍 Existing transcription message:",
              existingTranscriptionMessage?.id,
              existingTranscriptionMessage?.content?.substring(0, 100) + "..." // Truncate for readability
            );

            console.log(
              "🔍 Looking for transcription message with conversation_session_id:",
              currentSttMessage.conversation_session_id
            );

            if (existingTranscriptionMessage) {
              // Update existing transcription message with accumulated content
              const updatedMessages = prev.messages.map((msg) => {
                if (msg.id === existingTranscriptionMessage.id) {
                  const newContent = msg.content
                    ? `${msg.content} ${data.transcript}`
                    : data.transcript;
                  console.log(
                    "test-x Agent STT response updated:",
                    data.transcript,
                    "conversation_session_id:",
                    currentSttMessage?.conversation_session_id
                  );
                  console.log(
                    "✅ Updating existing transcription message:",
                    data.transcript,
                    "→ New content:",
                    newContent
                  );
                  return {
                    ...msg,
                    content: newContent,
                    createdAt: Date.now(), // Update timestamp to keep it current
                  };
                }
                return msg;
              });

              return {
                ...prev,
                messages: updatedMessages,
              };
            } else {
              // Create new transcription message with the same conversation_session_id
              const transcriptionMessage: ChatMessage = {
                id: `transcript_${Date.now()}`,
                role: "assistant",
                content: data.transcript,
                createdAt: Date.now(),
                sessionId: audio.currentSessionId || undefined,
                conversation_session_id:
                  currentSttMessage.conversation_session_id,
                kind: "Transcription",
                status: "done",
                isTranscription: true,
              };

              console.log(
                "test-x New agent STT response created:",
                data.transcript
              );
              console.log(
                "✅ Creating new transcription message:",
                data.transcript,
                "with conversation_session_id:",
                currentSttMessage.conversation_session_id
              );
              console.log(
                "📋 Total messages before adding new transcription:",
                prev.messages.length
              );
              return {
                ...prev,
                messages: [...prev.messages, transcriptionMessage],
              };
            }
          });
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        connection.on("error", (error: any) => {
          console.error("❌ Connection Error:", error);
          toast.error(`Error: ${error?.message || "Connection failed"}`);

          // Update STT request message to error status
          console.log(
            "❌ Setting error status for message:",
            currentRecordingMessageIdRef.current
          );
          if (currentRecordingMessageIdRef.current) {
            setConversation((prev) => {
              const updatedMessages = prev.messages.map((msg) => {
                if (msg.id === currentRecordingMessageIdRef.current) {
                  console.log("✅ Setting error status for message:", msg.id);
                  return {
                    ...msg,
                    status: "error" as const,
                    content: "🎤 Recording failed",
                    error: error?.message || "Connection failed",
                    isRecording: false,
                  };
                } else {
                  if (msg.isRecording) {
                    console.log("❌ Clearing isRecording for message:", msg.id);
                  }
                  return {
                    ...msg,
                    isRecording: false,
                  };
                }
              });
              logConversationState(updatedMessages, "Recording Error");
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
          console.log("🔌 Disconnected:", reason);
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
      console.log("✅ STT stream created and handlers set up");

      // Handle connection state properly for pause/resume
      if (connection.connected) {
        console.log("🔌 Reusing existing STT connection...");
        // For already connected connections, we need to manually trigger the audio setup
        // since the "connect" event won't fire again
        setTimeout(async () => {
          try {
            await setupAudioPipeline(connection);
          } catch (error) {
            console.error(
              "❌ Error setting up audio pipeline for existing connection:",
              error
            );
          }
        }, 0);
      } else {
        // Connection was closed (possibly by server timeout), create new one
        console.log("🔌 Connection was closed, creating new STT stream...");
        connection.connect();
      }
    } catch (error) {
      console.error("❌ Error starting recording:", error);

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
          errorMessage = error.message;
        }
      }

      toast.error(errorMessage);
      cleanupMicrophone();

      // Update STT request message to error status
      console.log(
        "❌ Setting error status for message (startRecording):",
        currentRecordingMessageIdRef.current
      );
      if (currentRecordingMessageIdRef.current) {
        setConversation((prev) => {
          const updatedMessages = prev.messages.map((msg) => {
            if (msg.id === currentRecordingMessageIdRef.current) {
              console.log("✅ Setting error status for message:", msg.id);
              return {
                ...msg,
                status: "error" as const,
                content: "🎤 Recording failed",
                error: errorMessage,
                isRecording: false,
              };
            } else {
              if (msg.isRecording) {
                console.log("❌ Clearing isRecording for message:", msg.id);
              }
              return {
                ...msg,
                isRecording: false,
              };
            }
          });
          logConversationState(updatedMessages, "Recording Error (Start)");
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
    console.log(
      "🔴 Stopping recording for message:",
      currentRecordingMessageIdRef.current
    );

    // Update STT request message to done status
    if (currentRecordingMessageIdRef.current) {
      const finalDuration =
        sttRequestStartTimeRef.current > 0
          ? Date.now() - sttRequestStartTimeRef.current
          : 0;

      console.log(
        "📝 Setting message to done status:",
        currentRecordingMessageIdRef.current,
        "duration:",
        finalDuration
      );

      setConversation((prev) => {
        const updatedMessages = prev.messages.map((msg) => {
          if (msg.id === currentRecordingMessageIdRef.current) {
            console.log("✅ Setting done status for message:", msg.id);
            return {
              ...msg,
              status: "done" as const,
              durationMs: finalDuration,
              isRecording: false,
            };
          } else {
            if (msg.isRecording) {
              console.log("❌ Clearing isRecording for message:", msg.id);
            }
            return {
              ...msg,
              isRecording: false,
            };
          }
        });
        logConversationState(updatedMessages, "Recording Completed");
        return { ...prev, messages: updatedMessages };
      });
    }

    // Update connection state to not streaming (keep connection alive)
    updateConnectionState({
      isStreaming: false,
    });

    // Start keepalive to prevent connection timeout
    if (connectionRef.current && !keepaliveTimerRef.current) {
      keepaliveTimerRef.current = setInterval(() => {
        if (connectionRef.current && connectionRef.current.connected) {
          // Send a minimal ping to keep connection alive
          try {
            connectionRef.current.send(new ArrayBuffer(0));
          } catch (error) {
            console.log("Keepalive ping failed:", error);
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
    const previousMessageId = currentRecordingMessageIdRef.current;
    currentRecordingMessageIdRef.current = null;

    console.log("🧹 Clearing current recording message ID:", previousMessageId);

    setAudio((prev) => ({
      ...prev,
      isRecording: false,
      partialText: "",
      currentRecordingMessageId: undefined,
      sttRequestStartedAtMs: 0,
      sttRequestElapsedMs: 0,
    }));

    console.log("🔴 Recording stopped, microphone in ready state", {
      isRecording: false,
      microphoneState: "ready", // This will be synced by the effect
      currentSessionId: audio.currentSessionId,
      previousMessageId,
      micAllowed: true,
    });

    // Keep session active for next recording
    sttRequestStartTimeRef.current = 0;
  };

  const handleMicPress = async () => {
    console.log("🎤 Microphone button clicked", {
      computedState: computedMicrophoneState,
      audioState: audio.microphoneState,
      isConnected,
      sessionId: audio.currentSessionId,
      isRecording: audio.isRecording,
    });

    // If currently recording (connected state), stop recording and go to ready state
    if (computedMicrophoneState === "connected") {
      console.log("🔴 Currently connected/recording, stopping...");
      stopRecording();
      return;
    }

    // If ready state (session exists but not connected), start recording
    if (computedMicrophoneState === "ready") {
      console.log("🎤 In ready state, starting recording...");
      await startRecording();
      return;
    }

    // If no session exists, create session and go to ready state
    if (!sessionId) {
      console.log("🎤 No session exists, creating session...");
      // First show the connecting animation for testing
      setTestConnecting(true);
      try {
        await createSessionAndStartRecording();
      } catch (error) {
        console.error("❌ Error creating session:", error);
        setTestConnecting(false); // Hide animation on error
      }
      return;
    }
  };

  const createSessionAndStartRecording = async () => {
    try {
      console.log("🔧 Creating new session for microphone recording...");
      await createSession();

      // The state sync effect will handle updating the microphone state to "ready"
      console.log("✅ Session created successfully:", sessionId);

      // Now start recording with the new session
      await startRecording();
    } catch (error) {
      console.error("❌ Failed to create session:", error);
      toast.error(
        "Failed to create session. Please check your API key in the settings and try again →"
      );
      // Reset connecting animation on error
      setTestConnecting(false);
    }
  };

  // Helper function to render microphone state indicator
  const renderMicrophoneIndicator = () => {
    const languageShortLabel = getLanguageShortLabel(
      currentSettings.stt.language
    );

    switch (displayMicrophoneState) {
      case "connecting":
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
    console.log(
      "🔍 getButtonClassName-> Getting button class name for state:",
      displayMicrophoneState
    );
    const baseClass = "voice-controls__mic-button";
    const stateClass = (() => {
      switch (displayMicrophoneState) {
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
