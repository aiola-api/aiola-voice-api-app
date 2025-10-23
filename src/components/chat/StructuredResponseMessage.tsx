import { IconListDetails } from "@tabler/icons-react";
import { withTimeStamp } from "./withTimeStamp";
import { componentClassName } from "@/lib/utils";
import type { ChatMessage } from "@/state/conversation";
import { TTSPlaybackButton } from "./TTSPlaybackButton";
import "./chat-messages.css";

interface StructuredResponseMessageProps {
  message: ChatMessage;
  showTime?: boolean;
  className?: string;
}

function StructuredResponseMessageBase({
  message,
  showTime: _showTime,
  className,
}: StructuredResponseMessageProps) {
  // Pretty print JSON with syntax highlighting classes
  const formatStructuredData = (data: Record<string, unknown>) => {
    const jsonString = JSON.stringify(data, null, 2);

    // Simple syntax highlighting - replace with more sophisticated solution if needed
    return jsonString
      .replace(/(".*?")(?=\s*:)/g, '<span class="json-key">$1</span>') // Keys
      .replace(/:\s*(".*?")/g, ': <span class="json-string">$1</span>') // Strings
      .replace(/:\s*(\d+(?:\.\d+)?)/g, ': <span class="json-number">$1</span>') // Numbers
      .replace(/:\s*(true|false)/g, ': <span class="json-boolean">$1</span>') // Booleans
      .replace(/:\s*(null)/g, ': <span class="json-null">$1</span>'); // Null
  };

  return (
    <div
      className={componentClassName(
        "StructuredResponseMessage",
        "structured-response-message",
        className
      )}
    >
      {/* Header with icon and title */}
      <div className="transcript-message-header">
        <div className="transcript-message-info">
          <div className="transcript-message-icon-text">
            <IconListDetails className="transcript-message-icon" />
            <span className="transcript-message-label">Structured Data</span>
          </div>
        </div>
      </div>

      {message.structuredData && (
        <div className="structured-data-container">
          <pre
            className="structured-data-json"
            dangerouslySetInnerHTML={{
              __html: formatStructuredData(message.structuredData),
            }}
          />
          <div className="tts-controls">
            <TTSPlaybackButton
              messageId={message.id}
              text={JSON.stringify(message.structuredData, null, 2)}
              className="tts-button-response"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export const StructuredResponseMessage = withTimeStamp(
  StructuredResponseMessageBase
);
