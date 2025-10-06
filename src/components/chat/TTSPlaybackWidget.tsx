import { useState, useRef, useEffect } from "react";
import { useRecoilState } from "recoil";
import { Button } from "@/components/ui/button";
import {
  IconVolume2,
  IconVolumeOff,
  IconLoader2,
  IconPlayerPlay,
  IconPlayerPause,
} from "@tabler/icons-react";
import { audioState } from "@/state/audio";
import { settingsState } from "@/state/settings";
import { useTTS } from "@/hooks/useTTS";
import { toast } from "sonner";
import { componentClassName } from "@/lib/utils";
import "./TTSPlaybackWidget.css";

interface TTSPlaybackWidgetProps {
  messageId: string;
  text: string;
  className?: string;
}

export function TTSPlaybackWidget({
  messageId,
  text,
  className = "",
}: TTSPlaybackWidgetProps) {
  const [audio, setAudio] = useRecoilState(audioState);
  const [settings] = useRecoilState(settingsState);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
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

  // Update current time as audio plays
  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;

    const updateTime = () => setCurrentTime(audioElement.currentTime);
    const updateDuration = () => setDuration(audioElement.duration);

    audioElement.addEventListener("timeupdate", updateTime);
    audioElement.addEventListener("loadedmetadata", updateDuration);

    return () => {
      audioElement.removeEventListener("timeupdate", updateTime);
      audioElement.removeEventListener("loadedmetadata", updateDuration);
    };
  }, [isPlaying]);

  const handlePlayPause = async () => {
    if (isPlaying) {
      // Stop current playback
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setAudio((prev) => ({ ...prev, playingMessageId: undefined }));
      return;
    }

    // Stop any other playing audio
    if (audio.playingMessageId) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }

    try {
      setIsLoading(true);

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

      // Set volume
      audioElement.volume = volume;

      audioElement.addEventListener("ended", () => {
        setAudio((prev) => ({ ...prev, playingMessageId: undefined }));
        setCurrentTime(0);
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressRef.current) return;

    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progressWidth = rect.width;
    const percentage = clickX / progressWidth;
    const newTime = percentage * duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={componentClassName("TTSPlaybackWidget", className)}>
      {/* Playback Controls */}
      <div className="tts-playback-controls">
        {/* Top Row: Play Button and Progress */}
        <div className="tts-top-row">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePlayPause}
            disabled={isGenerating || isLoading}
            className="tts-play-button"
          >
            {isGenerating || isLoading ? (
              <IconLoader2 className="h-4 w-4 animate-spin" />
            ) : isPlaying ? (
              <IconPlayerPause className="h-4 w-4" />
            ) : (
              <IconPlayerPlay className="h-4 w-4" />
            )}
          </Button>

          {/* Progress Bar */}
          <div className="tts-progress-container">
            <div className="tts-progress-wrapper">
              <div
                className="tts-progress-track"
                ref={progressRef}
                onClick={handleProgressClick}
              >
                <div
                  className="tts-progress-fill"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
            <div className="tts-time-display">
              <span className="tts-current-time">
                {formatTime(currentTime)}
              </span>
              <span className="tts-duration">{formatTime(duration)}</span>
            </div>
          </div>
        </div>

        {/* Bottom Row: Volume Control (Right-aligned) */}
        <div className="tts-volume-control">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const newVolume = volume > 0 ? 0 : 1;
              setVolume(newVolume);
              if (audioRef.current) {
                audioRef.current.volume = newVolume;
              }
            }}
            className="tts-volume-button"
          >
            {volume > 0 ? (
              <IconVolume2 className="h-4 w-4" />
            ) : (
              <IconVolumeOff className="h-4 w-4" />
            )}
          </Button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={handleVolumeChange}
            className="tts-volume-slider"
          />
        </div>
      </div>
    </div>
  );
}
