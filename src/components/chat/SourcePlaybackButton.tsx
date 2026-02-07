import { useState, useRef, useEffect, useCallback } from "react";
import { useRecoilState } from "recoil";
import { IconPlayerPlay, IconPlayerStop, IconLoader2 } from "@tabler/icons-react";
import { audioState } from "@/state/audio";
import { toast } from "sonner";

interface SourcePlaybackButtonProps {
  messageId: string;
  sourceUrl?: string;
  audioBlobUrl?: string;
}

export function SourcePlaybackButton({
  messageId,
  sourceUrl,
  audioBlobUrl,
}: SourcePlaybackButtonProps) {
  const [audio, setAudio] = useRecoilState(audioState);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

  const isPlaying = audio.playingMessageId === messageId;
  const audioSrc = audioBlobUrl || sourceUrl;

  // Stop and cleanup helper
  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setAudio((prev) => ({
      ...prev,
      playingMessageId: undefined,
      currentAudioElement: null,
    }));
    setCurrentTime(0);
  }, [setAudio]);

  // If another message starts playing, stop ours
  useEffect(() => {
    if (audio.playingMessageId && audio.playingMessageId !== messageId && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  }, [audio.playingMessageId, messageId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlayStop = async () => {
    if (!audioSrc) return;

    if (isPlaying) {
      stopPlayback();
      return;
    }

    // Stop any other playing audio
    if (audio.currentAudioElement) {
      audio.currentAudioElement.pause();
      audio.currentAudioElement.currentTime = 0;
    }

    try {
      setIsLoading(true);

      const el = new Audio(audioSrc);

      // Attach listeners BEFORE play() to avoid missing loadedmetadata
      el.addEventListener("timeupdate", () => {
        setCurrentTime(el.currentTime);
      });
      el.addEventListener("loadedmetadata", () => {
        setDuration(el.duration);
      });
      el.addEventListener("durationchange", () => {
        if (el.duration && isFinite(el.duration)) {
          setDuration(el.duration);
        }
      });
      el.addEventListener("ended", () => {
        setAudio((prev) => ({
          ...prev,
          playingMessageId: undefined,
          currentAudioElement: null,
        }));
        setCurrentTime(0);
      });
      el.addEventListener("error", () => {
        toast.error("Audio playback failed");
        setAudio((prev) => ({
          ...prev,
          playingMessageId: undefined,
          currentAudioElement: null,
        }));
      });

      audioRef.current = el;

      setAudio((prev) => ({
        ...prev,
        playingMessageId: messageId,
        currentAudioElement: el,
      }));

      await el.play();
    } catch {
      toast.error("Failed to play audio");
    } finally {
      setIsLoading(false);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressRef.current) return;

    const rect = progressRef.current.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const newTime = pct * duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (!audioSrc) return null;

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="source-playback">
      <button
        className="source-playback__button"
        onClick={handlePlayStop}
        disabled={isLoading}
        title={isPlaying ? "Stop playback" : "Play audio"}
      >
        {isLoading ? (
          <IconLoader2 className="source-playback__icon source-playback__icon--spin" />
        ) : isPlaying ? (
          <IconPlayerStop className="source-playback__icon" />
        ) : (
          <IconPlayerPlay className="source-playback__icon" />
        )}
      </button>

      {isPlaying && (
        <div className="source-playback__progress-container">
          <div
            className="source-playback__track"
            ref={progressRef}
            onClick={handleProgressClick}
          >
            <div
              className="source-playback__fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="source-playback__time">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      )}
    </div>
  );
}
