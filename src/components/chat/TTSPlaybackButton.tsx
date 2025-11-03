import { useState, useRef, useEffect } from "react";
import { useRecoilState } from "recoil";
import { Button } from "@/components/ui/button";
import { IconVolume2, IconVolumeOff, IconLoader2 } from "@tabler/icons-react";
import { audioState } from "@/state/audio";
import { settingsState } from "@/state/settings";
import { useTTS } from "@/hooks/useTTS";
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

interface TTSPlaybackButtonProps {
  messageId: string;
  text: string;
  className?: string;
}


export function TTSPlaybackButton({
  messageId,
  text,
  className = "",
}: TTSPlaybackButtonProps) {
  const [audio, setAudio] = useRecoilState(audioState);
  const [settings] = useRecoilState(settingsState);
  const currentSettings = getCurrentSettings(settings);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { generateTTS, isGenerating } = useTTS();

  const isPlaying = audio.playingMessageId === messageId;

  useEffect(() => {
    // Clean up audio when component unmounts
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Clear cache when text or TTS settings change
  useEffect(() => {
    setAudioBlob(null);
  }, [text, currentSettings.tts.voice, currentSettings.tts.language]);

  const handlePlayPause = async () => {
    if (isPlaying) {
      // Stop current playback
      if (audio.currentAudioElement) {
        audio.currentAudioElement.pause();
        audio.currentAudioElement.currentTime = 0;
      }
      setAudio((prev) => ({ ...prev, playingMessageId: undefined, currentAudioElement: null }));
      return;
    }

    // Stop any other playing audio
    if (audio.currentAudioElement) {
      audio.currentAudioElement.pause();
      audio.currentAudioElement.currentTime = 0;
    }

    try {
      if (!currentSettings.apiKey) {
        toast.error("Please configure your API key first");
        return;
      }

      if (!text || text.trim().length === 0) {
        toast.error("No text to convert to speech");
        return;
      }

      let blob: Blob;
      
      // Use cached audio if available, otherwise generate fresh
      if (audioBlob) {
        console.log("TTS Button: Using cached audio");
        blob = audioBlob;
      } else {
        console.log("TTS Button: Generating fresh audio for text:", text.substring(0, 100) + "...");
        blob = await generateTTS(text);
        console.log("TTS Button: Audio generated successfully", { size: blob.size });
        // Cache the blob after successful generation
        setAudioBlob(blob);
      }

      // Create audio element and ensure it's loaded before playing
      const audioUrl = URL.createObjectURL(blob);
      const audioElement = new Audio(audioUrl);
      audioRef.current = audioElement;

      // Wait for the audio to be ready to play with retry logic
      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount <= maxRetries) {
        try {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error("Audio loading timeout"));
            }, 3000);

            audioElement.addEventListener("canplaythrough", () => {
              clearTimeout(timeout);
              resolve();
            }, { once: true });

            audioElement.addEventListener("error", (e) => {
              clearTimeout(timeout);
              console.error("Audio loading error:", e);
              reject(new Error("Audio failed to load"));
            }, { once: true });

            // Start loading the audio
            audioElement.load();
          });
          break; // Success, exit retry loop
        } catch (error) {
          retryCount++;
          if (retryCount > maxRetries) {
            throw error; // Re-throw if we've exhausted retries
          }
          console.log(`TTS: Audio load attempt ${retryCount} failed, retrying...`);
          // Small delay before retry
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      audioElement.addEventListener("ended", () => {
        setAudio((prev) => ({ ...prev, playingMessageId: undefined, currentAudioElement: null }));
        URL.revokeObjectURL(audioUrl);
      });

      audioElement.addEventListener("error", (e) => {
        console.error("Audio playback error:", e);
        toast.error("Audio playback failed");
        setAudio((prev) => ({ ...prev, playingMessageId: undefined, currentAudioElement: null }));
        URL.revokeObjectURL(audioUrl);
      });

      // Set as current audio element and play
      setAudio((prev) => ({ ...prev, playingMessageId: messageId, currentAudioElement: audioElement }));
      await audioElement.play();
    } catch (error) {
      console.error("TTS Error:", error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes("API key")) {
          toast.error("API key is required for text-to-speech");
        } else if (error.message.includes("No audio data")) {
          toast.error("No audio data received from TTS service");
        } else if (error.message.includes("network") || error.message.includes("fetch")) {
          toast.error("Network error: Check your connection and API settings");
        } else {
          toast.error(`TTS failed: ${error.message}`);
        }
      } else {
        toast.error("Text-to-speech failed");
      }
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handlePlayPause}
      disabled={isGenerating}
      className={`h-6 w-6 p-0 hover:bg-transparent ${className}`}
    >
      {isGenerating ? (
        <IconLoader2 className="h-3 w-3 animate-spin" />
      ) : isPlaying ? (
        <IconVolumeOff className="h-3 w-3" />
      ) : (
        <IconVolume2 className="h-3 w-3" />
      )}
    </Button>
  );
}
