import { useState, Suspense, lazy } from "react";
import { useRecoilValue } from "recoil";
import { conversationState } from "@/state/conversation";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { componentClassName } from "@/lib/utils";
import "./Chat.css";

// Lazy load heavy components that aren't needed immediately
const ConfigDialog = lazy(() =>
  import("@/components/settings/ConfigDialog").then((module) => ({
    default: module.ConfigDialog,
  }))
);
const VoiceControls = lazy(() =>
  import("@/components/voice/VoiceControls").then((module) => ({
    default: module.VoiceControls,
  }))
);
const UploadDropzone = lazy(() =>
  import("@/components/voice/UploadDropzone").then((module) => ({
    default: module.UploadDropzone,
  }))
);
const ChatMessageList = lazy(() =>
  import("@/components/chat/ChatMessageList").then((module) => ({
    default: module.ChatMessageList,
  }))
);

// Loading component for suspense fallback
const ComponentLoader = () => (
  <div className="flex items-center justify-center p-4">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
  </div>
);

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
        {/* Messages Area */}
        <div className="chat-page__messages-area">
          <div className="chat-page__messages-container">
            <Suspense fallback={<ComponentLoader />}>
              <ChatMessageList messages={conversation.messages} />
            </Suspense>
          </div>
        </div>
        <div className="chat-page__controls-content">
          {/* Upload Dropzone - Absolutely positioned in bottom left */}
          <div className="chat-page__upload-dropzone">
            <Suspense fallback={<ComponentLoader />}>
              <UploadDropzone />
            </Suspense>
          </div>

          {/* Voice Controls - Absolutely positioned in bottom right */}
          <div className="chat-page__voice-controls">
            <Suspense fallback={<ComponentLoader />}>
              <VoiceControls />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Config Dialog - Rendered at top level with position: fixed */}
      {showConfig && (
        <Suspense fallback={<ComponentLoader />}>
          <ConfigDialog open={showConfig} onOpenChange={setShowConfig} />
        </Suspense>
      )}
    </div>
  );
}
