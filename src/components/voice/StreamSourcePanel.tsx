import { useState, useRef, useEffect } from "react";
import {
  IconWorldWww,
  IconFile,
  IconCheck,
  IconAlertCircle,
  IconPlayerPlay,
  IconPlayerStop,
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

  // Validate URL on change
  useEffect(() => {
    if (url.trim() === "") {
      setIsUrlValid(false);
      return;
    }
    setIsUrlValid(validateUrl(url));
  }, [url, validateUrl]);

  const handleStartStream = () => {
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
      case "ready":
        return "Ready to stream";
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
              placeholder="https://example.com/audio.mp3"
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
          Supported formats: MP3, WAV, MP4, M4A, OGG, FLAC, WebM
        </div>
      )}
    </div>
  );
}
