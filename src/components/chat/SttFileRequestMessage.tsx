import { IconLoader2, IconFileUpload } from "@tabler/icons-react";
import { withTimeStamp } from "./withTimeStamp";
import { componentClassName, formatDuration } from "@/lib/utils";
import type { ChatMessage } from "@/state/conversation";
import "./chat-messages.css";

interface SttFileRequestMessageProps {
  message: ChatMessage;
  showTime?: boolean;
  className?: string;
}

function SttFileRequestMessageBase({
  message,
  showTime,
  className,
}: SttFileRequestMessageProps) {
  return (
    <div className={componentClassName("SttFileRequestMessage", className)}>
      {/* File status indicator */}
      <div className="file-message-indicator">
        {message.status === "processing" ? (
          <IconLoader2 className="file-message-icon animate-spin text-black" />
        ) : (
          <IconFileUpload className="file-message-icon text-black" />
        )}
        <span className="file-message-text text-black">
          {message.status === "processing" ? (
            "Processing file..."
          ) : (
            <>
              <span className="voice-message-label text-black">STT File</span>{" "}
              <span className="voice-message-time text-black">
                {message.fileName || "upload"}
              </span>
              {/* Duration counter inline for file messages */}
              {showTime && (
                <span className="voice-message-time text-black">
                  {formatDuration(message.durationMs)}
                </span>
              )}
            </>
          )}
        </span>
      </div>
    </div>
  );
}

export const SttFileRequestMessage = withTimeStamp(SttFileRequestMessageBase);
