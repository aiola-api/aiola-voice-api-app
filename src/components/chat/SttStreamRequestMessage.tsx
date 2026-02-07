import { IconMicrophone, IconWorldWww, IconFile } from "@tabler/icons-react";
import { VoiceWaveform } from "./VoiceWaveform";
import { withTimeStamp } from "./withTimeStamp";
import { componentClassName, formatDuration } from "@/lib/utils";
import type { ChatMessage } from "@/state/conversation";
import "./chat-messages.css";

// Helper function to truncate URL
function truncateUrl(url: string, maxLength: number): string {
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength - 3) + "...";
}

interface SttStreamRequestMessageProps {
  message: ChatMessage;
  showTime?: boolean;
  className?: string;
}

function SttStreamRequestMessageBase({
  message,
  showTime,
  className,
}: SttStreamRequestMessageProps) {
  const isUrlStream = !!message.sourceUrl;
  const isFileStream = !!message.sourceFileName;

  const getIcon = () => {
    if (isUrlStream) return <IconWorldWww className="voice-message-icon text-black" />;
    if (isFileStream) return <IconFile className="voice-message-icon text-black" />;
    return <IconMicrophone className="voice-message-icon text-black" />;
  };

  const getLabel = () => {
    if (isUrlStream) return "URL Stream";
    if (isFileStream) return "File Stream";
    return "STT Stream";
  };

  return (
    <div className={componentClassName("SttStreamRequestMessage", className)}>
      <div className="voice-message-header">
        {/* First row: Icon + Text */}
        <div className="voice-message-info">
          <div className="voice-message-icon-text">
            {getIcon()}
            <span className="voice-message-label text-black">
              {getLabel()}
            </span>
            {/* Duration counter inline for voice messages */}
            {showTime && (
              <span className="voice-message-time text-black">
                {formatDuration(message.durationMs)}
              </span>
            )}
          </div>
          {/* Show URL source if available */}
          {isUrlStream && message.sourceUrl && (
            <div className="voice-message-source">
              <span className="voice-message-source-label">From:</span>
              <span className="voice-message-source-url" title={message.sourceUrl}>
                {truncateUrl(message.sourceUrl, 50)}
              </span>
            </div>
          )}
          {/* Show file name if available */}
          {isFileStream && message.sourceFileName && (
            <div className="voice-message-source">
              <span className="voice-message-source-label">File:</span>
              <span className="voice-message-source-url" title={message.sourceFileName}>
                {truncateUrl(message.sourceFileName, 50)}
              </span>
            </div>
          )}
        </div>

        {/* Second row: Waveform */}
        <div className="waveform-container">
          <VoiceWaveform
            isUser={true}
            isRecording={message.isRecording || false}
            durationMs={message.durationMs}
            messageId={message.id}
          />
        </div>

        {/* Error message display */}
        {message.status === "error" && message.error && (
          <div className="voice-message-error">
            <span className="voice-message-error-text text-red-600">
              Error: {message.error}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export const SttStreamRequestMessage = withTimeStamp(
  SttStreamRequestMessageBase
);
