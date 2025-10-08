import { useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatEmptyState } from "./ChatEmptyState";
import type { ChatMessage as ChatMessageType } from "@/state/conversation";
import { componentClassName } from "@/lib/utils";
import "./ChatMessageList.css";

interface ChatMessageListProps {
  messages: ChatMessageType[];
}

export function ChatMessageList({ messages }: ChatMessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Sort messages to ensure structured messages appear above transcript messages in the same conversation session
  const sortedMessages = [...messages].sort((a, b) => {
    // First, sort by conversation_session_id to group related messages
    if (a.conversation_session_id !== b.conversation_session_id) {
      // Newer sessions first
      return b.createdAt - a.createdAt;
    }

    // Within the same conversation session, prioritize structured messages over transcript messages
    const aIsStructured = a.kind === "Structured";
    const bIsStructured = b.kind === "Structured";
    const aIsTranscript = a.kind === "Transcription";
    const bIsTranscript = b.kind === "Transcription";

    if (aIsStructured && bIsTranscript) {
      // Structured message should appear before transcript message
      return -1;
    }
    if (aIsTranscript && bIsStructured) {
      // Transcript message should appear after structured message
      return 1;
    }

    // For same types or other combinations, sort by createdAt (newest first)
    return b.createdAt - a.createdAt;
  });

  // Auto-scroll to top when new messages are added
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [messages.length]);

  if (messages.length === 0) {
    return <ChatEmptyState />;
  }

  return (
    <div
      ref={containerRef}
      className={componentClassName("ChatMessageList", "chat-message-list")}
    >
      {sortedMessages.map((message) => (
        <ChatMessage key={message.id} message={message} showTime={true} />
      ))}
    </div>
  );
}
