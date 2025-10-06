import { SttStreamRequestMessage } from "./SttStreamRequestMessage";
import { SttFileRequestMessage } from "./SttFileRequestMessage";
import { TtsRequestMessage } from "./TtsRequestMessage";
import { TranscriptResponseMessage } from "./TranscriptResponseMessage";
import { VoiceResponseMessage } from "./VoiceResponseMessage";
import type { ChatMessage as ChatMessageType } from "@/state/conversation";
import { componentClassName } from "@/lib/utils";
import "./chat-messages.css";

interface ChatMessageProps {
  message: ChatMessageType;
  showTime?: boolean;
}

export function ChatMessage({ message, showTime = true }: ChatMessageProps) {
  const isUser = message.role === "user";

  // Determine which component to render based on message properties
  const renderMessageComponent = () => {
    // User messages (requests) - right aligned
    if (message.role === "user") {
      if (message.kind === "STT Stream") {
        return (
          <SttStreamRequestMessage message={message} showTime={showTime} />
        );
      }
      if (message.kind === "STT File") {
        return <SttFileRequestMessage message={message} showTime={showTime} />;
      }
      if (message.kind === "TTS") {
        return <TtsRequestMessage message={message} showTime={showTime} />;
      }
    }

    // Assistant messages (responses) - left aligned
    if (message.role === "assistant") {
      if (message.kind === "Transcription") {
        return (
          <TranscriptResponseMessage message={message} showTime={showTime} />
        );
      }
      if (message.kind === "Playback") {
        return <VoiceResponseMessage message={message} showTime={showTime} />;
      }
    }

    // Fallback for any unhandled message types
    return (
      <div className="chat-message__unsupported">
        <p className="chat-message__unsupported-title">
          Unsupported message type: {message.kind} / {message.role}
        </p>
        {message.content && (
          <p className="chat-message__unsupported-content">{message.content}</p>
        )}
      </div>
    );
  };

  return (
    <div
      className={componentClassName(
        "ChatMessage",
        "chat-message",
        isUser ? "chat-message--user" : "chat-message--assistant"
      )}
    >
      <div
        className={`chat-message__content ${
          isUser
            ? "chat-message__content--user"
            : "chat-message__content--assistant"
        }`}
      >
        {renderMessageComponent()}
      </div>
    </div>
  );
}
