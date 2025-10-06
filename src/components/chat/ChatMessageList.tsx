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

  // Sort messages by createdAt in descending order (newest first)
  const sortedMessages = [...messages].sort(
    (a, b) => b.createdAt - a.createdAt
  );

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
