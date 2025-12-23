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
import {
  settingsState,
  type STTLanguageCode,
  type SettingsState,
} from "@/state/settings";
import { type StreamConnection } from "@/state/connection";
import { useSTT } from "@/hooks/useSTT";
import { useConnection } from "@/hooks/useConnection";
import { toast } from "sonner";

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
  const [conversation, setConversation] = useRecoilState(conversationState);
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
        console.log("🔑 Updating keywords dynamically:", keywordsObj);
        try {
          connection.setKeywords(keywordsObj);
          // Update ref immediately to prevent duplicate calls
          lastAppliedKeywordsRef.current = currentKeywordsJson;
        } catch (error) {
          console.error("❌ Error updating keywords:", error);
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
        console.log("📋 Updating schema values dynamically:", schemaValues);
        try {
          // Update ref immediately before async call to prevent duplicate calls
          lastAppliedSchemaValuesRef.current = currentSchemaValuesJson;
          connection.setSchemaValues(schemaValues, (response) => {
            if (response.status === "ok") {
              console.log("✅ Schema values updated successfully");
            } else {
              console.warn(
                "⚠️ Schema values update warning:",
                response.message
              );
              // Revert ref on error so it can be retried
              lastAppliedSchemaValuesRef.current = "";
            }
          });
        } catch (error) {
          console.error("❌ Error updating schema values:", error);
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

      // Clear processed transcripts for the new recording session (new conversation)
      processedTranscriptsRef.current.clear();

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
            // Apply keywords (only if not empty - don't send empty event)
            const keywords = currentSettings.stt.keywords || [];
            const keywordsObj: Record<string, string> = {};
            keywords.forEach((keyword: string) => {
              keywordsObj[keyword] = keyword;
            });
            if (Object.keys(keywordsObj).length > 0) {
              console.log("🔑 Applying keywords:", keywordsObj);
              connection.setKeywords(keywordsObj);
            }
            lastAppliedKeywordsRef.current = JSON.stringify(keywords);

            // Apply schema values (only if not empty - don't send empty event)
            const schemaValues = currentSettings.stt.schemaValues || {};
            if (Object.keys(schemaValues).length > 0) {
              console.log("📋 Applying schema values:", schemaValues);
              connection.setSchemaValues(schemaValues, (response) => {
                if (response.status === "ok") {
                  console.log("✅ Schema values set successfully");
                } else {
                  console.warn(
                    "⚠️ Schema values set with warning:",
                    response.message
                  );
                }
              });
            }
            lastAppliedSchemaValuesRef.current = JSON.stringify(schemaValues);

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
          let currentSttMessageId = currentRecordingMessageIdRef.current;

          // If no current STT message ID, find an STT Stream message to associate the transcript with
          if (!currentSttMessageId) {
            console.log(
              "🔍 No current STT message ID, looking for STT Stream message to associate transcript..."
            );

            // Debug: Log all message types in conversation
            const messageTypes = conversation.messages.reduce((acc, msg) => {
              const kind = msg.kind || "unknown";
              acc[kind] = (acc[kind] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);
            console.log("🔍 Message types in conversation:", messageTypes);

            // Rule 1: Try to attach to the last STT response conversation (STT Stream that already has a transcription)
            const allSttStreamMessages = conversation.messages.filter(
              (msg) => msg.kind === "STT Stream"
            );
            console.log(
              "🔍 Found",
              allSttStreamMessages.length,
              "STT Stream messages in conversation"
            );

            // If there are no STT Stream messages, but we have other messages, there might be a timing issue
            if (
              allSttStreamMessages.length === 0 &&
              conversation.messages.length > 0
            ) {
              console.warn(
                "⚠️ No STT Stream messages found, but conversation has other messages. This suggests a timing issue."
              );
              console.log(
                "🔍 Latest messages in conversation:",
                conversation.messages.slice(-3)
              );
            }

            const sttStreamWithTranscription = allSttStreamMessages
              .filter((sttMsg) =>
                conversation.messages.some(
                  (msg) =>
                    msg.kind === "Transcription" &&
                    msg.conversation_session_id ===
                      sttMsg.conversation_session_id
                )
              )
              .sort((a, b) => b.createdAt - a.createdAt); // Most recent first

            console.log(
              "🔍 Found",
              sttStreamWithTranscription.length,
              "STT Stream messages with existing transcriptions"
            );

            if (sttStreamWithTranscription.length > 0) {
              currentSttMessageId = sttStreamWithTranscription[0].id;
              console.log(
                "✅ Found STT Stream message with existing transcription:",
                currentSttMessageId,
                "conversation_session_id:",
                sttStreamWithTranscription[0].conversation_session_id
              );
            } else {
              // Rule 2: If no STT Stream with transcription exists, link to the last STT request (any STT Stream)
              const lastSttStreamMessage = allSttStreamMessages.sort(
                (a, b) => b.createdAt - a.createdAt
              ); // Most recent first

              if (lastSttStreamMessage.length > 0) {
                currentSttMessageId = lastSttStreamMessage[0].id;
                console.log(
                  "✅ Using last STT Stream message for new transcription:",
                  currentSttMessageId,
                  "conversation_session_id:",
                  lastSttStreamMessage[0].conversation_session_id
                );
              } else {
                console.warn(
                  "⚠️ No STT Stream message found to associate transcript with, skipping processing"
                );
                return;
              }
            }
          }

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

            // Find the STT Stream message to get the conversation_session_id
            let currentSttMessage = prev.messages.find(
              (msg) => msg.id === currentSttMessageId
            );

            console.log(
              "🔍 STT message for transcript:",
              currentSttMessage?.id,
              currentSttMessage?.conversation_session_id
            );

            // If no STT Stream message was found, scan for existing STT conversations
            if (!currentSttMessage) {
              console.log(
                "📝 No STT Stream message found for ID:",
                currentSttMessageId,
                "scanning for existing STT conversations"
              );

              // Scan for existing STT-related messages (STT Stream or Transcription messages)
              const sttRelatedMessages = prev.messages.filter(
                (msg) =>
                  msg.kind === "STT Stream" ||
                  msg.kind === "Transcription" ||
                  (msg.kind === "STT File" && msg.isTranscription)
              );

              console.log(
                "🔍 Found",
                sttRelatedMessages.length,
                "STT-related messages in conversation"
              );

              if (sttRelatedMessages.length > 0) {
                // Find the most recent STT-related message and use its conversation_session_id
                const mostRecentSttMessage = sttRelatedMessages.sort(
                  (a, b) => b.createdAt - a.createdAt
                )[0];

                const existingConversationSessionId =
                  mostRecentSttMessage.conversation_session_id;

                console.log(
                  "✅ Found existing STT conversation:",
                  existingConversationSessionId,
                  "from message:",
                  mostRecentSttMessage.id
                );

                // Create a new STT Stream message linked to the existing conversation
                const newSttStreamMessage: ChatMessage = {
                  id: `stt_stream_${Date.now()}`,
                  role: "user",
                  content: "🎤 Recording...",
                  createdAt: Date.now(),
                  sessionId: audio.currentSessionId || undefined,
                  conversation_session_id: existingConversationSessionId,
                  kind: "STT Stream",
                  status: "done",
                  isRecording: false,
                };

                console.log(
                  "✅ Creating new STT Stream message linked to existing conversation:",
                  newSttStreamMessage.id,
                  "with conversation_session_id:",
                  existingConversationSessionId
                );

                // Update the conversation state to include the new STT Stream message
                const updatedMessages = [...prev.messages, newSttStreamMessage];
                console.log(
                  "📋 Updated conversation with linked STT Stream message, total messages:",
                  updatedMessages.length
                );

                // Update currentSttMessageId to point to the newly created message
                currentSttMessageId = newSttStreamMessage.id;

                // Find the newly created STT Stream message
                currentSttMessage = newSttStreamMessage;

                // Return the updated conversation state
                const newState = {
                  ...prev,
                  messages: updatedMessages,
                };

                console.log(
                  "✅ Using newly created STT Stream message linked to existing conversation"
                );
                return newState;
              } else {
                console.log(
                  "📝 No existing STT conversations found, creating completely new conversation"
                );

                // Generate a unique conversation session ID for this transcript
                const transcriptSessionId = `transcript_session_${Date.now()}_${Math.random()
                  .toString(36)
                  .substr(2, 6)}`;

                // Create a new STT Stream message with a new conversation
                const newSttStreamMessage: ChatMessage = {
                  id: `stt_stream_${Date.now()}`,
                  role: "user",
                  content: "🎤 Recording...",
                  createdAt: Date.now(),
                  sessionId: audio.currentSessionId || undefined,
                  conversation_session_id: transcriptSessionId,
                  kind: "STT Stream",
                  status: "done",
                  isRecording: false,
                };

                console.log(
                  "✅ Creating new STT Stream message with new conversation:",
                  newSttStreamMessage.id,
                  "with conversation_session_id:",
                  transcriptSessionId
                );

                // Update the conversation state to include the new STT Stream message
                const updatedMessages = [...prev.messages, newSttStreamMessage];
                console.log(
                  "📋 Updated conversation with new STT Stream message, total messages:",
                  updatedMessages.length
                );

                // Update currentSttMessageId to point to the newly created message
                currentSttMessageId = newSttStreamMessage.id;

                // Find the newly created STT Stream message
                currentSttMessage = newSttStreamMessage;

                // Return the updated conversation state
                const newState = {
                  ...prev,
                  messages: updatedMessages,
                };

                console.log(
                  "✅ Using newly created STT Stream message with new conversation"
                );
                return newState;
              }
            }

            if (!currentSttMessage.conversation_session_id) {
              console.warn(
                "⚠️ STT Stream message missing conversation_session_id"
              );
              return prev;
            }

            // Get or create the set of processed transcripts for this conversation session
            // Use conversation_session_id as the key to prevent duplicates across the entire conversation
            const conversationSessionId =
              currentSttMessage.conversation_session_id;
            if (!processedTranscriptsRef.current.has(conversationSessionId)) {
              processedTranscriptsRef.current.set(
                conversationSessionId,
                new Set()
              );
            }
            const processedSet = processedTranscriptsRef.current.get(
              conversationSessionId
            )!;

            // If this transcript has already been processed for this conversation session, skip it
            if (processedSet.has(data.transcript)) {
              console.log(
                "🔄 Skipping duplicate transcript:",
                data.transcript,
                "for conversation:",
                conversationSessionId
              );
              return prev;
            }

            // Mark this transcript as processed for this conversation session
            processedSet.add(data.transcript);
            console.log(
              "✅ Processing transcript:",
              data.transcript,
              "for conversation:",
              conversationSessionId
            );

            // Look for the most recent transcription message with the same conversation_session_id
            const existingTranscriptionMessages = prev.messages.filter(
              (msg) =>
                msg.kind === "Transcription" &&
                msg.conversation_session_id ===
                  currentSttMessage.conversation_session_id
            );

            console.log(
              "🔍 Found",
              existingTranscriptionMessages.length,
              "existing transcription messages with conversation_session_id:",
              currentSttMessage.conversation_session_id
            );

            // Get the most recent transcription message
            const existingTranscriptionMessage =
              existingTranscriptionMessages.length > 0
                ? existingTranscriptionMessages.sort(
                    (a, b) => b.createdAt - a.createdAt
                  )[0]
                : null;

            console.log(
              "🔍 Most recent transcription message:",
              existingTranscriptionMessage?.id,
              existingTranscriptionMessage?.content?.substring(0, 100) + "..." // Truncate for readability
            );

            if (existingTranscriptionMessage) {
              // Update existing transcription message with accumulated content
              const updatedMessages = prev.messages.map((msg) => {
                if (msg.id === existingTranscriptionMessage.id) {
                  const newContent = msg.content
                    ? `${msg.content} ${data.transcript}`
                    : data.transcript;
                  console.log(
                    "✅ Appending transcript to existing transcription:",
                    data.transcript,
                    "conversation_session_id:",
                    currentSttMessage?.conversation_session_id
                  );
                  console.log(
                    "✅ Old content:",
                    msg.content,
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
        connection.on("structured", (data: any) => {
          console.log("🔧 Structured event received:", data);
          console.log("📊 Structured results:", data.results);

          // Check if we have structured data to process
          if (!data.results || typeof data.results !== "object") {
            console.warn("⚠️ No structured results to process");
            return;
          }

          // Get the current recording message ID to link structured data to the conversation
          const currentSttMessageId = currentRecordingMessageIdRef.current;
          if (!currentSttMessageId) {
            console.warn("⚠️ No current STT message ID for structured data");
            return;
          }

          setConversation((prev) => {
            // Find the current STT message to get its conversation_session_id
            const currentSttMessage = prev.messages.find(
              (msg) => msg.id === currentSttMessageId
            );

            if (!currentSttMessage) {
              console.warn("⚠️ Could not find current STT message");
              return prev;
            }

            // Look for an existing structured message with the same conversation_session_id
            const existingStructuredMessage = prev.messages.find(
              (msg) =>
                msg.kind === "Structured" &&
                msg.conversation_session_id ===
                  currentSttMessage.conversation_session_id
            );

            if (existingStructuredMessage) {
              // Update existing structured message with new data (merge results)
              const updatedMessages = prev.messages.map((msg) => {
                if (msg.id === existingStructuredMessage.id) {
                  console.log(
                    "✅ Updating existing structured message with new data"
                  );
                  return {
                    ...msg,
                    structuredData: {
                      ...msg.structuredData,
                      ...data.results,
                    },
                    content: `Structured data updated (${
                      Object.keys(data.results).length
                    } fields)`,
                  };
                }
                return msg;
              });
              return { ...prev, messages: updatedMessages };
            } else {
              // Create new structured message
              const structuredMessage: ChatMessage = {
                id: `structured_${Date.now()}`,
                role: "assistant",
                content: `Structured data received (${
                  Object.keys(data.results).length
                } fields)`,
                createdAt: Date.now(),
                sessionId: audio.currentSessionId || undefined,
                conversation_session_id:
                  currentSttMessage.conversation_session_id,
                kind: "Structured",
                status: "done",
                structuredData: data.results,
              };

              console.log("✅ Creating new structured message:", {
                id: structuredMessage.id,
                conversation_session_id:
                  structuredMessage.conversation_session_id,
                resultsCount: Object.keys(data.results).length,
              });

              return {
                ...prev,
                messages: [...prev.messages, structuredMessage],
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
          // Reset applied refs when connection disconnects
          lastAppliedKeywordsRef.current = "";
          lastAppliedSchemaValuesRef.current = "";
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
      keepaliveTimerRef.current = window.setInterval(() => {
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
      currentSettings.stt.language as STTLanguageCode
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
