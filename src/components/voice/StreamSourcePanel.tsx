import { useState, useRef, useEffect, useCallback } from "react";
import {
  IconWorldWww,
  IconFile,
  IconCheck,
  IconAlertCircle,
  IconPlayerPlay,
  IconPlayerStop,
  IconPlayerPause,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AudioSourceError, AudioSourceStatus } from "@/hooks/useAudioSourceLoader";
import "./StreamSourcePanel.css";

type SourceType = "url" | "file";

interface StreamSourcePanelProps {
  onStartStream: (source: string | File) => void;
  onStopStream: () => void;
  isStreaming: boolean;
  error?: AudioSourceError | null;
  status?: AudioSourceStatus;
  validateUrl: (url: string) => boolean;
}

const PREDEFINED_URLS = [
  { label: "Short sample", url: "https://cdn.freesound.org/previews/645/645385_13590673-lq.mp3" },
  { label: "Long sample", url: "https://cdn.freesound.org/previews/322/322026_689000-lq.mp3" },
];

const ACCEPTED_EXTENSIONS = ".mp3,.wav,.mp4,.m4a,.ogg,.flac,.webm";

function formatTime(time: number) {
  if (isNaN(time) || !isFinite(time)) return "0:00";
  const m = Math.floor(time / 60);
  const s = Math.floor(time % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function StreamSourcePanel({
  onStartStream,
  onStopStream,
  isStreaming,
  error,
  status,
  validateUrl,
}: StreamSourcePanelProps) {
  const [sourceType, setSourceType] = useState<SourceType>("url");
  const [url, setUrl] = useState("");
  const [isUrlValid, setIsUrlValid] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewBlobUrlRef = useRef<string | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

  // Validate URL on change
  useEffect(() => {
    if (url.trim() === "") {
      setIsUrlValid(false);
      return;
    }
    setIsUrlValid(validateUrl(url));
  }, [url, validateUrl]);

  // --- Preview player logic ---

  const destroyPreview = useCallback(() => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    if (previewBlobUrlRef.current) {
      URL.revokeObjectURL(previewBlobUrlRef.current);
      previewBlobUrlRef.current = null;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  // Reset preview when source input changes or streaming starts
  useEffect(() => {
    destroyPreview();
  }, [sourceType, url, selectedFile, isStreaming, destroyPreview]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      if (previewBlobUrlRef.current) {
        URL.revokeObjectURL(previewBlobUrlRef.current);
      }
    };
  }, []);

  const getPreviewSrc = useCallback((): string | null => {
    if (sourceType === "url" && isUrlValid) return url;
    if (sourceType === "file" && selectedFile) {
      if (!previewBlobUrlRef.current) {
        previewBlobUrlRef.current = URL.createObjectURL(selectedFile);
      }
      return previewBlobUrlRef.current;
    }
    return null;
  }, [sourceType, isUrlValid, url, selectedFile]);

  /** Wire all listeners directly on the audio element (avoids useEffect race) */
  const attachListeners = useCallback((audio: HTMLAudioElement) => {
    audio.addEventListener("timeupdate", () => {
      setCurrentTime(audio.currentTime);
    });
    audio.addEventListener("loadedmetadata", () => {
      setDuration(audio.duration);
    });
    audio.addEventListener("durationchange", () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    });
    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });
    audio.addEventListener("error", () => {
      destroyPreview();
    });
  }, [destroyPreview]);

  const handlePlayPause = async () => {
    // Pause
    if (isPlaying && previewAudioRef.current) {
      previewAudioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    // Resume existing audio element
    if (!isPlaying && previewAudioRef.current && previewAudioRef.current.src) {
      try {
        await previewAudioRef.current.play();
        setIsPlaying(true);
      } catch {
        destroyPreview();
      }
      return;
    }

    // Create new audio element with listeners attached before play()
    const src = getPreviewSrc();
    if (!src) return;

    const audio = new Audio(src);
    attachListeners(audio);
    previewAudioRef.current = audio;

    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      destroyPreview();
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!previewAudioRef.current || !progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = pct * duration;
    previewAudioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const canPreview =
    !isStreaming &&
    (sourceType === "url" ? isUrlValid : !!selectedFile);

  const showPlayer = canPreview || isPlaying;
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  // --- Stream logic ---

  const handleStartStream = () => {
    destroyPreview();
    if (sourceType === "url" && isUrlValid && !isStreaming) {
      onStartStream(url);
    } else if (sourceType === "file" && selectedFile && !isStreaming) {
      onStartStream(selectedFile);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && isUrlValid && !isStreaming) {
      handleStartStream();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "fetching":
        return "Fetching audio file...";
      case "reading":
        return "Reading file...";
      default:
        return "";
    }
  };

  const getUrlStatusIcon = () => {
    if (error && sourceType === "url") {
      return <IconAlertCircle size={16} className="stream-source-icon error" />;
    }
    if (isUrlValid && url.trim() !== "") {
      return <IconCheck size={16} className="stream-source-icon valid" />;
    }
    return <IconWorldWww size={16} className="stream-source-icon" />;
  };

  const canStart =
    sourceType === "url" ? isUrlValid && !isStreaming : !!selectedFile && !isStreaming;

  return (
    <div className="space-y-4">
      {/* Source type toggle */}
      <div className="stream-source-toggle">
        <button
          type="button"
          className={`stream-source-toggle-btn ${sourceType === "url" ? "active" : ""}`}
          onClick={() => setSourceType("url")}
          disabled={isStreaming}
        >
          <IconWorldWww size={16} />
          Remote URL
        </button>
        <button
          type="button"
          className={`stream-source-toggle-btn ${sourceType === "file" ? "active" : ""}`}
          onClick={() => setSourceType("file")}
          disabled={isStreaming}
        >
          <IconFile size={16} />
          Local File
        </button>
      </div>

      {/* URL mode */}
      {sourceType === "url" && (
        <div className="space-y-2">
          <div className="stream-source-presets">
            {PREDEFINED_URLS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className={`stream-source-preset-btn ${url === preset.url ? "active" : ""}`}
                onClick={() => setUrl(preset.url)}
                disabled={isStreaming}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
          <div className="stream-source-url-wrapper flex-1">
            {getUrlStatusIcon()}
            <Input
              type="url"
              placeholder="https://example.com/audio.mp3 or presigned URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isStreaming}
              className="stream-source-url-input"
            />
          </div>

          {isStreaming ? (
            <Button onClick={onStopStream} variant="outline" className="stream-source-action-btn stop">
              <IconPlayerStop size={18} className="mr-2" />
              Stop
            </Button>
          ) : (
            <Button onClick={handleStartStream} disabled={!canStart} className="stream-source-action-btn start">
              <IconPlayerPlay size={18} className="mr-2" />
              Stream
            </Button>
          )}
          </div>
        </div>
      )}

      {/* File mode */}
      {sourceType === "file" && (
        <div className="flex gap-2 items-center">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            onChange={handleFileChange}
            className="stream-source-file-hidden"
          />
          <div
            className="stream-source-file-picker flex-1"
            onClick={() => !isStreaming && fileInputRef.current?.click()}
          >
            <IconFile size={16} className="stream-source-file-icon" />
            <span className="stream-source-file-label">
              {selectedFile ? selectedFile.name : "Click to select audio file..."}
            </span>
          </div>

          {isStreaming ? (
            <Button onClick={onStopStream} variant="outline" className="stream-source-action-btn stop">
              <IconPlayerStop size={18} className="mr-2" />
              Stop
            </Button>
          ) : (
            <Button onClick={handleStartStream} disabled={!canStart} className="stream-source-action-btn start">
              <IconPlayerPlay size={18} className="mr-2" />
              Stream
            </Button>
          )}
        </div>
      )}

      {/* Preview Player */}
      {showPlayer && (
        <div className="stream-preview-player">
          <button
            type="button"
            className="stream-preview-player__play-btn"
            onClick={handlePlayPause}
            title={isPlaying ? "Pause" : "Play preview"}
          >
            {isPlaying ? (
              <IconPlayerPause size={16} />
            ) : (
              <IconPlayerPlay size={16} />
            )}
          </button>

          <div className="stream-preview-player__progress">
            <div
              className="stream-preview-player__track"
              ref={progressRef}
              onClick={handleProgressClick}
            >
              <div
                className="stream-preview-player__fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <span className="stream-preview-player__time">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      )}

      {/* Status/Error Messages */}
      {status && status !== "idle" && !error && (
        <div className="stream-source-status">{getStatusText()}</div>
      )}

      {error && (
        <div className="stream-source-error">
          <IconAlertCircle size={16} />
          <span>{error.message}</span>
        </div>
      )}

      {/* Format Hints */}
      {!error && !isStreaming && (
        <div className="stream-source-hint">
          Supported formats: MP3, WAV, MP4, M4A, OGG, FLAC, WebM &middot; AWS presigned URLs supported
        </div>
      )}
    </div>
  );
}
