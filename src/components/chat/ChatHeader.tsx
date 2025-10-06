import { Button } from "@/components/ui/button";
import {
  IconAdjustmentsAlt,
  IconCircleFilled,
  IconCopy,
} from "@tabler/icons-react";
import { useSettingsWithPersistence } from "@/state/settings";
import { useRecoilValue } from "recoil";
import { conversationState } from "@/state/conversation";
import { audioState } from "@/state/audio";
import { componentClassName } from "@/lib/utils";
import { APP_VERSION } from "@/lib/constants";
import "./ChatHeader.css";

// Version injected at build time from package.json
const VERSION = APP_VERSION;

interface ChatHeaderProps {
  onSettingsClick: () => void;
}

export function ChatHeader({ onSettingsClick }: ChatHeaderProps) {
  const [settings] = useSettingsWithPersistence();
  const conversation = useRecoilValue(conversationState);
  const audio = useRecoilValue(audioState);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add toast notification here if available
      console.log(`${label} copied to clipboard`);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <header className={componentClassName("ChatHeader", "chat-header")}>
      <div className="chat-header__container">
        <div className="chat-header__left-section">
          <div className="chat-header__content">
            <div className="chat-header__title-row">
              <h1 className="chat-header__title">Aiola Voice-Api APP</h1>
              <div className="chat-header__status">
                <div className="chat-header__microphone-status">
                  <IconCircleFilled
                    className={`chat-header__microphone-indicator ${
                      audio.microphoneState === "connected"
                        ? "chat-header__microphone-indicator--connected"
                        : audio.microphoneState === "ready"
                        ? "chat-header__microphone-indicator--ready"
                        : audio.microphoneState === "connecting"
                        ? "chat-header__microphone-indicator--connecting"
                        : audio.microphoneState === "preparingMic"
                        ? "chat-header__microphone-indicator--preparingMic"
                        : "chat-header__microphone-indicator--idle"
                    }`}
                  />
                  <span
                    className={`chat-header__microphone-text ${
                      audio.microphoneState === "connected"
                        ? "chat-header__microphone-text--connected"
                        : audio.microphoneState === "ready"
                        ? "chat-header__microphone-text--ready"
                        : audio.microphoneState === "connecting"
                        ? "chat-header__microphone-text--connecting"
                        : audio.microphoneState === "preparingMic"
                        ? "chat-header__microphone-text--preparingMic"
                        : "chat-header__microphone-text--idle"
                    }`}
                  >
                    {audio.microphoneState === "connected"
                      ? "Recording"
                      : audio.microphoneState === "ready"
                      ? "Ready"
                      : audio.microphoneState === "connecting"
                      ? "Connecting"
                      : audio.microphoneState === "preparingMic"
                      ? "Preparing Mic"
                      : "Idle"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="chat-header__content-below">
            <div className="chat-header__connection-info">
              <div className="chat-header__connection-item">
                <span className="chat-header__connection-label">API Key:</span>
                <span className="chat-header__connection-value">
                  {settings.connection.apiKey
                    ? `${settings.connection.apiKey.slice(0, 8)}...`
                    : "Not set"}
                </span>
                {settings.connection.apiKey && (
                  <IconCopy
                    className="chat-header__copy-icon"
                    onClick={() =>
                      copyToClipboard(settings.connection.apiKey, "API Key")
                    }
                  />
                )}
              </div>
              <div className="chat-header__connection-item">
                <span className="chat-header__connection-label">Flow Id:</span>
                <span className="chat-header__connection-value">default</span>
                {settings.stt.flowid && (
                  <IconCopy
                    className="chat-header__copy-icon"
                    onClick={() =>
                      copyToClipboard(settings.stt.flowid!, "Flow Id")
                    }
                  />
                )}
              </div>
              <div className="chat-header__connection-item">
                <span className="chat-header__connection-label">Session:</span>
                <span className="chat-header__connection-value">
                  {(() => {
                    const displayValue = audio.currentSessionId
                      ? `${audio.currentSessionId.substring(0, 16)}...`
                      : "not-set";
                    return displayValue;
                  })()}
                </span>
                <IconCopy
                  className="chat-header__copy-icon"
                  onClick={() =>
                    copyToClipboard(
                      audio.currentSessionId || conversation.id,
                      "Session"
                    )
                  }
                />
              </div>
              <div className="chat-header__connection-item">
                <span className="chat-header__connection-label">
                  Execution Id:
                </span>
                <span className="chat-header__connection-value">TBD</span>
              </div>
            </div>
          </div>
        </div>
        <div className="chat-header__actions">
          <div className="chat-header__version">v{VERSION}</div>
          <Button
            variant="ghost"
            size="default"
            onClick={onSettingsClick}
            className="chat-header__settings-button"
          >
            <IconAdjustmentsAlt />
          </Button>
        </div>
      </div>
    </header>
  );
}
