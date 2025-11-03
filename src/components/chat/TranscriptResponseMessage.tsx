import { IconTextCaption } from "@tabler/icons-react";
import { withTimeStamp } from "./withTimeStamp";
import { componentClassName, formatDuration } from "@/lib/utils";
import type { ChatMessage } from "@/state/conversation";
import { TTSPlaybackButton } from "./TTSPlaybackButton";
import "./chat-messages.css";

interface TranscriptResponseMessageProps {
  message: ChatMessage;
  showTime?: boolean;
  className?: string;
}

function TranscriptResponseMessageBase({
  message,
  showTime,
  className,
}: TranscriptResponseMessageProps) {
  return (
    <div className={componentClassName("TranscriptResponseMessage", className)}>
      {/* Header with icon and title */}
      <div className="transcript-message-header">
        <div className="transcript-message-info">
          <div className="transcript-message-icon-text">
            <IconTextCaption className="transcript-message-icon" />
            <span className="transcript-message-label text-black">
              Transcription
            </span>
            {/* Duration counter inline for transcript messages */}
            {showTime && (
              <span className="voice-message-time text-black">
                {formatDuration(message.durationMs)}
              </span>
            )}
          </div>
        </div>
      </div>

      {message.content && (
        <div className="transcript-content-container">
          <p className="message-content-response">{message.content}</p>
          <div className="tts-controls">
            <TTSPlaybackButton
              messageId={message.id}
              text={message.content}
              className="tts-button-response"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export const TranscriptResponseMessage = withTimeStamp(
  TranscriptResponseMessageBase
);
