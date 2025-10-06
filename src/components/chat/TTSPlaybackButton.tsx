import { useState, useRef, useEffect } from "react";
import { useRecoilState } from "recoil";
import { Button } from "@/components/ui/button";
import { IconVolume2, IconVolumeOff, IconLoader2 } from "@tabler/icons-react";
import { audioState } from "@/state/audio";
import { settingsState } from "@/state/settings";
import { useTTS } from "@/hooks/useTTS";
import { toast } from "sonner";

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

  const handlePlayPause = async () => {
    if (isPlaying) {
      // Stop current playback
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setAudio((prev) => ({ ...prev, playingMessageId: undefined }));
      return;
    }

    // Stop any other playing audio
    if (audio.playingMessageId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }

    try {
      // Check if we already have the audio blob cached
      if (!audioBlob) {
        if (!settings.connection.apiKey) {
          toast.error("Please configure your API key first");
          return;
        }

        // Generate TTS audio using hook
        const blob = await generateTTS(text);
        setAudioBlob(blob);
      }

      // Create audio element and play
      const audioUrl = URL.createObjectURL(audioBlob || new Blob());
      const audioElement = new Audio(audioUrl);
      audioRef.current = audioElement;

      audioElement.addEventListener("ended", () => {
        setAudio((prev) => ({ ...prev, playingMessageId: undefined }));
        URL.revokeObjectURL(audioUrl);
      });

      audioElement.addEventListener("error", (e) => {
        console.error("Audio playback error:", e);
        toast.error("Audio playback failed");
        setAudio((prev) => ({ ...prev, playingMessageId: undefined }));
        URL.revokeObjectURL(audioUrl);
      });

      setAudio((prev) => ({ ...prev, playingMessageId: messageId }));
      await audioElement.play();
    } catch (error) {
      console.error("TTS Error:", error);
      toast.error("Text-to-speech failed");
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
