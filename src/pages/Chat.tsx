import { useState } from "react";
import { useRecoilValue } from "recoil";
import { conversationState } from "@/state/conversation";
import { ConfigDialog } from "@/components/settings/ConfigDialog";
import { VoiceControls } from "@/components/voice/VoiceControls";
import { UploadDropzone } from "@/components/voice/UploadDropzone";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { componentClassName } from "@/lib/utils";
import "./Chat.css";

export function Chat() {
  const [showConfig, setShowConfig] = useState(false);
  const conversation = useRecoilValue(conversationState);

  return (
    <div className={componentClassName("Chat", "chat-page")}>
      {/* Header */}
      <div className="chat-page__header">
        <ChatHeader onSettingsClick={() => setShowConfig(true)} />
      </div>

      {/* Main Content */}
      <div className="chat-page__main">
        {/* Config Dialog - Absolutely positioned and centered */}
        {showConfig && (
          <ConfigDialog open={showConfig} onOpenChange={setShowConfig} />
        )}

        {/* Upload Dropzone - Absolutely positioned in bottom left */}
        <div className="chat-page__upload-dropzone">
          <UploadDropzone />
        </div>

        {/* Voice Controls - Absolutely positioned in bottom right */}
        <div className="chat-page__voice-controls">
          <VoiceControls />
        </div>

        {/* Messages Area */}
        <div className="chat-page__messages-area">
          <div className="chat-page__messages-container">
            <ChatMessageList messages={conversation.messages} />
          </div>
        </div>

        {/* Keep controls section for potential future use */}
        <div className="chat-page__controls">
          <div className="chat-page__controls-content"></div>
        </div>
      </div>
    </div>
  );
}
