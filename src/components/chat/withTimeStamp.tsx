import React from "react";
import type { ChatMessage } from "@/state/conversation";
import "./chat-messages.css";

interface WithTimeStampProps {
  message: ChatMessage;
  showTime?: boolean;
}

export function withTimeStamp<T extends WithTimeStampProps>(
  WrappedComponent: React.ComponentType<T>
) {
  return function WithTimeStampComponent(props: T) {
    const { message, showTime = true, ...otherProps } = props;

    // Check if this is a TTS playback widget (voice response message)
    const isTTSPlayback =
      message.role === "assistant" && message.kind === "Playback";

    // Use wider max-width for TTS playback widgets
    const maxWidth = isTTSPlayback ? "100%" : "60%";

    return (
      <div className="flex flex-col" style={{ maxWidth }}>
        <WrappedComponent
          {...(otherProps as T)}
          message={message}
          showTime={showTime}
        />
        {
          <span
            className="timestamp"
            style={{
              alignSelf: message.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        }
      </div>
    );
  };
}
