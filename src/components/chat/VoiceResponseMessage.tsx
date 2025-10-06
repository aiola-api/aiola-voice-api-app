import { TTSPlaybackWidget } from "./TTSPlaybackWidget";
import { withTimeStamp } from "./withTimeStamp";
import { componentClassName, formatDuration } from "@/lib/utils";
import type { ChatMessage } from "@/state/conversation";
import { IconVolume } from "@tabler/icons-react";
import "./chat-messages.css";

interface VoiceResponseMessageProps {
  message: ChatMessage;
  showTime?: boolean;
  className?: string;
}

function VoiceResponseMessageBase({
  message,
  showTime,
  className,
}: VoiceResponseMessageProps) {
  return (
    <div className={componentClassName("VoiceResponseMessage", className)}>
      {/* Header with icon and title */}
      <div className="transcript-message-header">
        <div className="transcript-message-info">
          <div className="transcript-message-icon-text">
            <IconVolume className="transcript-message-icon" />
            <span className="transcript-message-label text-black">
              TTS Playback
            </span>
            {/* Duration counter inline for TTS playback messages */}
            {showTime && message.durationMs && (
              <span className="voice-message-time">
                {formatDuration(message.durationMs)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* TTS playback widget as content */}
      <TTSPlaybackWidget
        messageId={message.id}
        text={message.content}
        className="tts-playback-widget-content"
      />
    </div>
  );
}

export const VoiceResponseMessage = withTimeStamp(VoiceResponseMessageBase);
