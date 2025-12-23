import {
  IconMicrophone,
  IconFile,
  IconVolume2,
  IconLoader2,
} from "@tabler/icons-react";

interface MessageStatusIndicatorProps {
  kind?: "Transcription" | "Playback" | "STT Stream" | "STT File" | "TTS";
  status?: "recording" | "processing" | "done" | "streaming" | "error";
  fileName?: string;
  durationMs?: number;
  isTranscription?: boolean;
}

export function MessageStatusIndicator({
  kind,
  status,
  fileName,
  durationMs,
  isTranscription,
}: MessageStatusIndicatorProps) {
  // STT Stream - recording
  if (kind === "STT Stream" && status === "recording") {
    return (
      <div className="flex items-center gap-2 mb-2 text-[#6c757d]">
        <IconMicrophone className="h-4 w-4 animate-pulse" />
        <span className="text-xs">Recording...</span>
      </div>
    );
  }

  // STT Stream - done
  if (kind === "STT Stream" && status === "done") {
    return (
      <div className="flex items-center gap-2 mb-2 text-[#6c757d]">
        <IconMicrophone className="h-4 w-4" />
        <span className="text-xs">Recording completed</span>
      </div>
    );
  }

  // STT File - processing
  if (kind === "STT File" && status === "processing") {
    return (
      <div className="flex items-center gap-2 mb-2 text-[#6c757d]">
        <IconLoader2 className="h-4 w-4 animate-spin" />
        <span className="text-xs">Processing file...</span>
      </div>
    );
  }

  // STT File - done
  if (kind === "STT File" && status === "done") {
    return (
      <div className="flex items-center gap-2 mb-2 text-[#6c757d]">
        <IconFile className="h-4 w-4" />
        <span className="text-xs">{fileName}</span>
      </div>
    );
  }

  // Playback - done
  if (kind === "Playback" && status === "done") {
    return (
      <div className="flex items-center gap-2 mb-2 text-[#6c757d]">
        <IconVolume2 className="h-4 w-4" />
        <span className="text-xs">
          {durationMs ? `${Math.round(durationMs / 1000)}s` : "Voice message"}
          {isTranscription && " • Transcribed"}
        </span>
      </div>
    );
  }

  return null;
}
