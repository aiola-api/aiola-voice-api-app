import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  IconAdjustmentsAlt,
  IconBrandGithub,
  IconCircleFilled,
  IconCopy,
  IconInfoCircle,
  IconTerminal2,
} from "@tabler/icons-react";
import { Tooltip } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useSettingsWithPersistence } from "@/state/settings";
import type { SettingsState } from "@/state/settings";
import { useRecoilValue } from "recoil";
import { conversationState } from "@/state/conversation";
import { audioState } from "@/state/audio";
import { componentClassName } from "@/lib/utils";
import { APP_VERSION, AIOLA_SDK_VERSION } from "@/lib/constants";
import { logger, type LogLevel } from "@/lib/logger";
import { QuickVoicePicker } from "@/components/voice/QuickVoicePicker";
import "./ChatHeader.css";

const TAG = "ChatHeader";

const LOG_LEVELS: LogLevel[] = ["error", "warn", "info", "debug"];

// Helper function to get current environment settings
function getCurrentSettings(settings: SettingsState) {
  const env = settings.environment;
  return {
    apiKey: settings[env].connection.apiKey,
    baseUrl: settings[env].connection.baseUrl,
    authBaseUrl: settings[env].connection.authBaseUrl,
    workflowId: settings[env].connection.workflowId,
    environment: env,
    stt: settings[env].stt,
    tts: settings[env].tts,
  };
}

// Version injected at build time from package.json
const VERSION = APP_VERSION;

interface ChatHeaderProps {
  onSettingsClick: () => void;
}

export function ChatHeader({ onSettingsClick }: ChatHeaderProps) {
  const [settings] = useSettingsWithPersistence();
  const currentSettings = getCurrentSettings(settings);
  const conversation = useRecoilValue(conversationState);
  const audio = useRecoilValue(audioState);
  const [logLevel, setLogLevel] = useState<LogLevel>(logger.getLevel());

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch (err) {
      logger.error(TAG, "Failed to copy:", err);
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <header className={componentClassName("ChatHeader", "chat-header")}>
      <div className="chat-header__container">
        <div className="chat-header__left-section">
          <div className="chat-header__content">
            <div className="chat-header__title-row">
              <h1 className="chat-header__title">VAP</h1>
              <div className="chat-header__environment-chip">
                {currentSettings.environment.toUpperCase()}
              </div>
              <div className="chat-header__status">
                <div className="chat-header__microphone-status">
                  <IconCircleFilled
                    className={`chat-header__microphone-indicator ${audio.microphoneState === "connected"
                      ? "chat-header__microphone-indicator--connected"
                      : audio.microphoneState === "streaming"
                        ? "chat-header__microphone-indicator--streaming"
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
                    className={`chat-header__microphone-text ${audio.microphoneState === "connected"
                      ? "chat-header__microphone-text--connected"
                      : audio.microphoneState === "streaming"
                        ? "chat-header__microphone-text--streaming"
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
                      : audio.microphoneState === "streaming"
                        ? "Streaming"
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
                  {currentSettings.apiKey
                    ? `...${currentSettings.apiKey.slice(-15)}`
                    : "Not set"}
                </span>
                {currentSettings.apiKey && (
                  <IconCopy
                    className="chat-header__copy-icon"
                    onClick={() =>
                      copyToClipboard(currentSettings.apiKey, "API Key")
                    }
                  />
                )}
              </div>
              <div className="chat-header__connection-item">
                <span className="chat-header__connection-label">
                  Workflow Id:
                </span>
                <span className="chat-header__connection-value">
                  {currentSettings.workflowId || "default"}
                </span>
                {currentSettings.workflowId && (
                  <IconCopy
                    className="chat-header__copy-icon"
                    onClick={() =>
                      copyToClipboard(
                        currentSettings.workflowId || "",
                        "Workflow Id"
                      )
                    }
                  />
                )}
              </div>
              <div className="chat-header__connection-item">
                <span className="chat-header__connection-label">Session:</span>
                <span className="chat-header__connection-value">
                  {(() => {
                    const displayValue = audio.currentSessionId
                      ? `...${audio.currentSessionId.slice(-16)}`
                      : "connection required❗️";
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
                <span className="chat-header__connection-value">
                  {currentSettings.stt.executionId || "default"}
                </span>
                {currentSettings.stt.executionId && (
                  <IconCopy
                    className="chat-header__copy-icon"
                    onClick={() =>
                      copyToClipboard(
                        currentSettings.stt.executionId || "",
                        "Execution Id"
                      )
                    }
                  />
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="chat-header__actions">
          <QuickVoicePicker className="chat-header__voice-picker" />
          <Button
            variant="ghost"
            size="default"
            onClick={onSettingsClick}
            className="chat-header__settings-button"
          >
            <IconAdjustmentsAlt />
          </Button>
        </div>
        <div className="chat-header__top-actions">
          <div className="chat-header__log-level-toggle">
            <IconTerminal2 className="chat-header__log-level-icon" />
            <select
              className="chat-header__log-level-select"
              value={logLevel}
              onChange={(e) => {
                const next = e.target.value as LogLevel;
                logger.setLevel(next);
                setLogLevel(next);
              }}
              aria-label="Log level"
            >
              {LOG_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <Tooltip
            className="chat-header__version-icon"
            content={`version: ${VERSION}
aiOlaSDK: ${AIOLA_SDK_VERSION}`}
          >
            <IconInfoCircle />
          </Tooltip>
          <a
            href="https://github.com/aiola-api/aiola-voice-api-app"
            target="_blank"
            rel="noopener noreferrer"
            className="chat-header__github-link"
            aria-label="View on GitHub"
          >
            <IconBrandGithub />
          </a>
        </div>
      </div>
    </header>
  );
}
