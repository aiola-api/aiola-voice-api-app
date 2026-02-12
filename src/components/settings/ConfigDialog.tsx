import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  useSettingsWithPersistence,
} from "@/state/settings";
import { useConnection } from "@/hooks/useConnection";
import { useSTT } from "@/hooks/useSTT";
import { toast } from "sonner";
import { componentClassName } from "@/lib/utils";
import { logger } from "@/lib/logger";
import "./ConfigDialog.css";

const TAG = "ConfigDialog";

// Import sub-components
import { ConnectTab } from "./tabs/ConnectTab";
import { STTTab } from "./tabs/STTTab";
import { TTSTab } from "./tabs/TTSTab";
import { getCurrentEnvironmentSettings } from "./shared/utils";
import { type STTLanguageCode, DEFAULT_CONNECTION_SETTINGS } from "@/state/settings";

interface ConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConfigDialog({ open, onOpenChange }: ConfigDialogProps) {
  const [settings, setSettings] = useSettingsWithPersistence();
  const [tempSettings, setTempSettings] = useState(settings);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [hasSettingsChanged, setHasSettingsChanged] = useState(false);
  const { createSession, isConnected } = useConnection();
  const { createStreamConnection } = useSTT();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Function to check if settings have changed
  const checkSettingsChanged = useCallback(
    (original: typeof settings, current: typeof tempSettings) => {
      const originalCurrent = getCurrentEnvironmentSettings(original);
      const currentCurrent = getCurrentEnvironmentSettings(current);
      const currentEnvironment = current.environment;

      // Track environment-specific changes
      const environmentChanged = original.environment !== current.environment;
      const apiKeyChanged = originalCurrent.apiKey !== currentCurrent.apiKey;
      const sttLanguageChanged =
        originalCurrent.stt.language !== currentCurrent.stt.language;
      const sttKeywordsChanged =
        JSON.stringify(originalCurrent.stt.keywords) !==
        JSON.stringify(currentCurrent.stt.keywords);
      const sttSchemaValuesChanged =
        JSON.stringify(originalCurrent.stt.schemaValues) !==
        JSON.stringify(currentCurrent.stt.schemaValues);
      const workflowIdChanged =
        originalCurrent.workflowId !== currentCurrent.workflowId;
      const rememberFlowidChanged =
        originalCurrent.stt.rememberFlowid !==
        currentCurrent.stt.rememberFlowid;
      const ttsVoiceChanged =
        originalCurrent.tts.voice !== currentCurrent.tts.voice;
      const vadConfigChanged =
        JSON.stringify(originalCurrent.stt.vad) !==
        JSON.stringify(currentCurrent.stt.vad);

      if (
        environmentChanged ||
        apiKeyChanged ||
        sttLanguageChanged ||
        sttKeywordsChanged ||
        workflowIdChanged ||
        rememberFlowidChanged ||
        ttsVoiceChanged ||
        vadConfigChanged
      ) {
        logger.debug(TAG, `Settings changed for ${currentEnvironment}`);
      }

      return (
        apiKeyChanged ||
        environmentChanged ||
        sttLanguageChanged ||
        sttKeywordsChanged ||
        sttSchemaValuesChanged ||
        workflowIdChanged ||
        rememberFlowidChanged ||
        ttsVoiceChanged
      );
    },
    []
  );

  // Update tempSettings only when dialog first opens
  useEffect(() => {
    if (open) {
      setTempSettings(settings);
      setHasSettingsChanged(false);
    }
  }, [open, settings]);

  // Track if settings have changed
  useEffect(() => {
    if (open) {
      setHasSettingsChanged(checkSettingsChanged(settings, tempSettings));
    }
  }, [tempSettings, settings, open, checkSettingsChanged]);

  // Handle clicks outside dialog to close it
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      const isInsideDialog = dialogRef.current?.contains(target);
      const isDropdownElement = target.closest(`
        [data-radix-select-viewport],
        [data-radix-popover-content],
        [data-radix-select-content],
        [data-radix-menu-content],
        [role="option"],
        [role="listbox"],
        [role="menu"],
        [role="combobox"],
        [data-state="open"],
        [data-radix-collection-item]
      `);

      if (!isInsideDialog && !isDropdownElement) {
        onOpenChange(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [open, onOpenChange]);

  const handleLanguageChange = (newLang: STTLanguageCode) => {
    // If NOT connected, sync language change immediately to the global state
    // so it reflects in the UI (microphone icon/flag) without needing Save/Connect
    if (!isConnected) {
      const currentEnv = tempSettings.environment;
      const updatedSettings = {
        ...settings,
        [currentEnv]: {
          ...settings[currentEnv],
          stt: {
            ...settings[currentEnv].stt,
            language: newLang,
          },
        },
      };
      setSettings(updatedSettings);
      localStorage.setItem("aiola-settings", JSON.stringify(updatedSettings));
      logger.debug(TAG, "Language synced immediately (no active session)");
    }
  };

  const handleSave = async () => {
    const currentEnv = tempSettings.environment;
    if (!tempSettings[currentEnv].connection.apiKey.trim()) {
      toast.error("API Key is required");
      return;
    }

    // Ensure prod URLs fall back to defaults when no prefix is provided
    let effectiveSettings = tempSettings;
    if (currentEnv === "prod" && !tempSettings.prod.connection.prefix?.trim()) {
      effectiveSettings = {
        ...tempSettings,
        prod: {
          ...tempSettings.prod,
          connection: {
            ...tempSettings.prod.connection,
            prefix: "",
            baseUrl: DEFAULT_CONNECTION_SETTINGS.prod.baseUrl,
            authBaseUrl: DEFAULT_CONNECTION_SETTINGS.prod.authBaseUrl,
          },
        },
      };
    }

    // Always save settings to the global state and localStorage first
    // This ensures that even if connection fails, the settings are remembered
    const settingsToSave = {
      ...effectiveSettings,
      [currentEnv]: {
        ...effectiveSettings[currentEnv],
        stt: {
          ...effectiveSettings[currentEnv].stt,
          rememberFlowid: effectiveSettings[currentEnv].stt.rememberFlowid,
        },
      },
    };

    setSettings(settingsToSave);
    localStorage.setItem("aiola-settings", JSON.stringify(settingsToSave));

    // If already connected and settings changed, we MUST reload to apply changes to the active session
    if (hasSettingsChanged && isConnected) {
      toast.success("Settings saved - Reloading page to apply changes");
      onOpenChange(false);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      return;
    }

    // If NOT connected, attempt to create a session to verify the new settings
    setIsTestingConnection(true);
    try {
      await createSession(true);
      toast.success("Settings saved successfully - Connection verified");
      onOpenChange(false);
    } catch (error) {
      logger.warn(TAG, "Connection test failed, but settings were already saved:", error);
      toast.warning(
        `Settings saved but connection failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      onOpenChange(false);
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Lock body scroll when dialog is open
  useEffect(() => {
    if (open) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [open]);

  // Lock body scroll when dialog is open
  useEffect(() => {
    if (open) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className={componentClassName("ConfigDialog", "config-dialog__container")}>
      <div
        ref={dialogRef}
        className="config-dialog__content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="config-dialog__header">
          <div className="config-dialog__header-content">
            <h2 className="config-dialog__title">Configuration</h2>
            <button
              onClick={() => onOpenChange(false)}
              className="config-dialog__close-button"
              aria-label="Close configuration"
            >
              ×
            </button>
          </div>
          <p className="config-dialog__description">
            Configure your Aiola API settings, speech-to-text, and
            text-to-speech preferences.
          </p>
        </div>

        <div className="config-dialog__main">
          <Tabs defaultValue="connect" className="config-dialog__tabs">
            <div className="config-dialog__tabs-container">
              <TabsList className="config-dialog__tabs-list">
                <TabsTrigger value="connect" className="config-dialog__tabs-trigger">Connect</TabsTrigger>
                <TabsTrigger value="stt" className="config-dialog__tabs-trigger">Speech-to-Text</TabsTrigger>
                <TabsTrigger value="tts" className="config-dialog__tabs-trigger">Text-to-Speech</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="connect">
              <ConnectTab 
                 tempSettings={tempSettings}
                 setTempSettings={setTempSettings}
                 setSettings={setSettings}
                 setHasSettingsChanged={setHasSettingsChanged}
              />
            </TabsContent>

            <TabsContent value="stt">
              <STTTab 
                tempSettings={tempSettings}
                setTempSettings={setTempSettings}
                isConnected={isConnected}
                createStreamConnection={createStreamConnection}
                onLanguageChange={handleLanguageChange}
              />
            </TabsContent>

            <TabsContent value="tts">
              <TTSTab 
                tempSettings={tempSettings}
                setTempSettings={setTempSettings}
              />
            </TabsContent>
          </Tabs>
        </div>

        <div className="config-dialog__footer">
          <div className="config-dialog__button-container">
            <div className="config_buttons">
              <Button
                onClick={handleSave}
                disabled={isTestingConnection}
                className="config-dialog__button config-dialog__button--primary"
              >
                {isTestingConnection
                  ? "Connecting..."
                  : hasSettingsChanged && isConnected
                  ? "Reload"
                  : "Connect"}
              </Button>
            </div>
            <div className="config-dialog__info-box">
              <p className="config-dialog__info-text">
                All configuration settings are automatically cached and will be
                remembered for future sessions
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
