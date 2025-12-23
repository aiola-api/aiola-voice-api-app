import { IconUser, IconSpeakerphone } from "@tabler/icons-react";
import { withTimeStamp } from "./withTimeStamp";
import { componentClassName, formatDuration } from "@/lib/utils";
import type { ChatMessage } from "@/state/conversation";
import "./chat-messages.css";

interface TtsRequestMessageProps {
  message: ChatMessage;
  showTime?: boolean;
  className?: string;
}

function TtsRequestMessageBase({
  message,
  showTime,
  className,
}: TtsRequestMessageProps) {
  return (
    <div
      className={componentClassName(
        "TtsRequestMessage",
        className,
        "tts-request-message"
      )}
    >
      <div className="voice-message-header">
        <div className="voice-message-info">
          <div className="voice-message-icon-text">
            <IconSpeakerphone className="voice-tts-icon text-black" />
            <span className="voice-message-label text-black">TTS</span>
            <IconUser className="voice-message-icon text-black" />
            <span className="voice-message-time text-black">
              {message.voice || "tara"}
            </span>
            {/* Duration counter inline for TTS messages */}
            {showTime && (
              <span className="voice-message-time text-black">
                {formatDuration(message.durationMs)}
              </span>
            )}
          </div>
        </div>
      </div>
      {message.content && (
        <p className="message-content-request">{message.content}</p>
      )}
    </div>
  );
}

export const TtsRequestMessage = withTimeStamp(TtsRequestMessageBase);
