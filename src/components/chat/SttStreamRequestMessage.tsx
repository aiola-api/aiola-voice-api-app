import { IconMicrophone } from "@tabler/icons-react";
import { VoiceWaveform } from "./VoiceWaveform";
import { withTimeStamp } from "./withTimeStamp";
import { componentClassName, formatDuration } from "@/lib/utils";
import type { ChatMessage } from "@/state/conversation";
import "./chat-messages.css";

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
  return (
    <div className={componentClassName("SttStreamRequestMessage", className)}>
      <div className="voice-message-header">
        {/* First row: Icon + Text */}
        <div className="voice-message-info">
          <div className="voice-message-icon-text">
            <IconMicrophone className="voice-message-icon text-black" />
            <span className="voice-message-label text-black">STT Stream</span>
            {/* Duration counter inline for voice messages */}
            {showTime && (
              <span className="voice-message-time text-black">
                {formatDuration(message.durationMs)}
              </span>
            )}
          </div>
        </div>

        {/* Second row: Waveform */}
        <div className="waveform-container">
          <VoiceWaveform
            isUser={true}
            isRecording={message.isRecording || false}
            durationMs={message.durationMs}
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
