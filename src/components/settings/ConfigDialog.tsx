import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useSettingsWithPersistence,
  type STTLanguageCode,
  type TTSVoice,
  type Environment,
  type SettingsState,
} from "@/state/settings";
import { useConnection } from "@/hooks/useConnection";
import { toast } from "sonner";
import { componentClassName } from "@/lib/utils";
import "./ConfigDialog.css";

const STT_LANGUAGES: { value: STTLanguageCode; label: string }[] = [
  { value: "en_US", label: "English (US)" },
  { value: "en_GB", label: "English (UK)" },
  { value: "es_ES", label: "Spanish (Spain)" },
  { value: "fr_FR", label: "French (France)" },
  { value: "de_DE", label: "German (Germany)" },
  { value: "it_IT", label: "Italian (Italy)" },
  { value: "pt_BR", label: "Portuguese (Brazil)" },
  { value: "ja_JP", label: "Japanese (Japan)" },
  { value: "ko_KR", label: "Korean (Korea)" },
  { value: "zh_CN", label: "Chinese (China)" },
];

const TTS_VOICES: { value: TTSVoice; label: string }[] = [
  { value: "tara", label: "Tara" },
  { value: "zoe", label: "Zoe" },
  { value: "zac", label: "Zac" },
  { value: "dan", label: "Dan" },
  { value: "jess", label: "Jess" },
  { value: "leo", label: "Leo" },
  { value: "mia", label: "Mia" },
  { value: "julia", label: "Julia" },
  { value: "leah", label: "Leah" },
];

interface ConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Helper functions for environment-specific settings
function getCurrentEnvironmentSettings(settings: SettingsState) {
  const env = settings.environment;
  return {
    apiKey: settings[env].connection.apiKey,
    baseUrl: settings[env].connection.baseUrl,
    authBaseUrl: settings[env].connection.authBaseUrl,
    workflowId: settings[env].connection.workflowId,
    stt: settings[env].stt,
    tts: settings[env].tts,
  };
}

function setCurrentEnvironmentSettings(
  settings: SettingsState,
  env: Environment,
  newSettings: {
    connection?: Partial<SettingsState[Environment]["connection"]>;
    stt?: Partial<SettingsState[Environment]["stt"]>;
    tts?: Partial<SettingsState[Environment]["tts"]>;
  }
) {
  return {
    ...settings,
    environment: env,
    [env]: {
      connection: {
        ...settings[env].connection,
        ...newSettings.connection,
      },
      stt: {
        ...settings[env].stt,
        ...newSettings.stt,
      },
      tts: {
        ...settings[env].tts,
        ...newSettings.tts,
      },
    },
  };
}

export function ConfigDialog({ open, onOpenChange }: ConfigDialogProps) {
  const [settings, setSettings] = useSettingsWithPersistence();
  const [tempSettings, setTempSettings] = useState(settings);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [hasSettingsChanged, setHasSettingsChanged] = useState(false);
  const { createSession, isConnected } = useConnection();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Function to check if settings have changed
  const checkSettingsChanged = useCallback(
    (original: typeof settings, current: typeof tempSettings) => {
      const originalCurrent = getCurrentEnvironmentSettings(original);
      const currentCurrent = getCurrentEnvironmentSettings(current);
      const currentEnvironment = current.environment;

      // Track environment-specific changes with more detailed logging
      const environmentChanged = original.environment !== current.environment;
      const apiKeyChanged = originalCurrent.apiKey !== currentCurrent.apiKey;
      const sttLanguageChanged =
        originalCurrent.stt.language !== currentCurrent.stt.language;
      const sttKeywordsChanged =
        JSON.stringify(originalCurrent.stt.keywords) !==
        JSON.stringify(currentCurrent.stt.keywords);
      const workflowIdChanged =
        originalCurrent.workflowId !== currentCurrent.workflowId;
      const rememberFlowidChanged =
        originalCurrent.stt.rememberFlowid !==
        currentCurrent.stt.rememberFlowid;
      const ttsVoiceChanged =
        originalCurrent.tts.voice !== currentCurrent.tts.voice;

      // Log environment-specific tracking for debugging
      if (
        environmentChanged ||
        apiKeyChanged ||
        sttLanguageChanged ||
        sttKeywordsChanged ||
        workflowIdChanged ||
        rememberFlowidChanged ||
        ttsVoiceChanged
      ) {
        console.log(
          `[checkSettingsChanged] Settings changed detected for ${currentEnvironment} environment:`,
          {
            environment: {
              changed: environmentChanged,
              from: original.environment,
              to: currentEnvironment,
            },
            apiKey: {
              changed: apiKeyChanged,
              currentLength: currentCurrent.apiKey?.length || 0,
            },
            stt: {
              languageChanged: sttLanguageChanged,
              keywordsChanged: sttKeywordsChanged,
              rememberFlowidChanged: rememberFlowidChanged,
              workflowIdChanged: workflowIdChanged,
            },
            tts: {
              voiceChanged: ttsVoiceChanged,
            },
          }
        );
      }

      return (
        apiKeyChanged ||
        environmentChanged ||
        sttLanguageChanged ||
        sttKeywordsChanged ||
        workflowIdChanged ||
        rememberFlowidChanged ||
        ttsVoiceChanged
      );
    },
    []
  );

  // Function to handle environment switching
  const switchEnvironment = useCallback(
    (newEnvironment: Environment) => {
      // Save current environment settings before switching
      const currentEnv = tempSettings.environment;
      const updatedSettings = setCurrentEnvironmentSettings(
        tempSettings,
        currentEnv,
        getCurrentEnvironmentSettings(tempSettings)
      );

      // Switch to new environment and load its settings
      const newSettings = {
        ...updatedSettings,
        environment: newEnvironment,
      };

      // Only update local temp settings - don't update global state yet
      console.log("ConfigDialog: Switching environment to", newEnvironment);
      console.log("ConfigDialog: New temp settings:", newSettings);
      setTempSettings(newSettings);

      // Mark that settings have changed so connect button shows "Reload"
      setHasSettingsChanged(true);

      // Note: Global settings state and localStorage will be updated only when user clicks Connect/Reload
    },
    [tempSettings]
  );

  // Update tempSettings only when dialog first opens
  // Don't sync on settings changes while dialog is open (to preserve input values)
  useEffect(() => {
    if (open) {
      setTempSettings(settings);
      setHasSettingsChanged(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]); // Only depend on 'open', not 'settings'

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
      // Check if the clicked element is inside the dialog or is a dropdown element
      const target = event.target as Element;
      const isInsideDialog = dialogRef.current?.contains(target);

      // Check for dropdown/popover elements that might be rendered outside the dialog
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

      // Don't close if clicking inside dialog or on dropdown elements
      if (!isInsideDialog && !isDropdownElement) {
        onOpenChange(false);
      }
    };

    // Use capture phase to catch clicks before they reach child components
    document.addEventListener("mousedown", handleClickOutside, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [open, onOpenChange]);

  const handleSave = async () => {
    // Validate API key - use input value (tempSettings), not localStorage
    const currentEnv = tempSettings.environment;
    if (!tempSettings[currentEnv].connection.apiKey.trim()) {
      toast.error("API Key is required");
      return;
    }

    // If settings changed and there's an existing connection, reload the page to start fresh
    if (hasSettingsChanged && isConnected) {
      // Save settings first
      const settingsToSave = {
        ...tempSettings,
        [currentEnv]: {
          ...tempSettings[currentEnv],
          stt: {
            ...tempSettings[currentEnv].stt,
            rememberFlowid: tempSettings[currentEnv].stt.rememberFlowid,
          },
        },
      };

      setSettings(settingsToSave);
      localStorage.setItem("aiola-settings", JSON.stringify(settingsToSave));

      toast.success("Settings saved - Reloading page to apply changes");
      onOpenChange(false);

      // Reload the page after a short delay to allow the toast to show
      setTimeout(() => {
        window.location.reload();
      }, 1000);

      return;
    }

    setIsTestingConnection(true);

    try {
      // Test connection using hook
      await createSession(true);

      // Save to localStorage (API key always saved, flowid saved if rememberFlowid is true)
      const settingsToSave = {
        ...tempSettings,
        [currentEnv]: {
          ...tempSettings[currentEnv],
          stt: {
            ...tempSettings[currentEnv].stt,
            rememberFlowid: tempSettings[currentEnv].stt.rememberFlowid,
          },
        },
      };

      // Update state with the processed settings (not the original tempSettings)
      setSettings(settingsToSave);
      localStorage.setItem("aiola-settings", JSON.stringify(settingsToSave));
      toast.success("Settings saved successfully - Connection verified");
      onOpenChange(false);
    } catch (error) {
      // Connection failed, but still save the settings
      console.warn(
        "Connection test failed, but saving settings anyway:",
        error
      );

      // Save to localStorage (API key always saved, flowid saved if rememberFlowid is true)
      const settingsToSave = {
        ...tempSettings,
        [currentEnv]: {
          ...tempSettings[currentEnv],
          stt: {
            ...tempSettings[currentEnv].stt,
            rememberFlowid: tempSettings[currentEnv].stt.rememberFlowid,
          },
        },
      };

      // Update state with the processed settings (not the original tempSettings)
      setSettings(settingsToSave);
      localStorage.setItem("aiola-settings", JSON.stringify(settingsToSave));

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

  if (!open) return null;

  return (
    <div
      className={componentClassName("ConfigDialog", "config-dialog__container")}
    >
      <div
        ref={dialogRef}
        className="config-dialog__content"
        onClick={(e) => {
          // Prevent clicks inside dialog from propagating to glass backdrop
          e.stopPropagation();
        }}
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
          {/* Connection Section */}
          <section className="config-dialog__section">
            <div className="config-dialog__section-header">
              <h3 className="config-dialog__section-title">Connection</h3>
              <p className="config-dialog__section-subtitle">
                Configure your Aiola API connection and authentication
              </p>
            </div>

            <div className="config-dialog__field-group">
              <Label
                htmlFor="api-key"
                className="config-dialog__label config-dialog__label--required"
              >
                API Key / Access Token
              </Label>
              <Input
                id="api-key"
                type="password"
                value={tempSettings[tempSettings.environment].connection.apiKey}
                onChange={(e) => {
                  const newApiKey = e.target.value;
                  console.log("[ConfigDialog] API key changed:", {
                    hasValue: !!newApiKey,
                    length: newApiKey.length,
                    preview:
                      newApiKey.substring(0, 10) +
                      (newApiKey.length > 10 ? "..." : ""),
                  });
                  const currentEnv = tempSettings.environment;
                  const updatedTempSettings = {
                    ...tempSettings,
                    [currentEnv]: {
                      ...tempSettings[currentEnv],
                      connection: {
                        ...tempSettings[currentEnv].connection,
                        apiKey: newApiKey,
                      },
                    },
                  };
                  setTempSettings(updatedTempSettings);

                  // Always save API key to localStorage immediately
                  const settingsToSave = {
                    ...updatedTempSettings,
                    [currentEnv]: {
                      ...updatedTempSettings[currentEnv],
                      stt: {
                        ...updatedTempSettings[currentEnv].stt,
                        rememberFlowid:
                          updatedTempSettings[currentEnv].stt.rememberFlowid,
                      },
                    },
                  };
                  localStorage.setItem(
                    "aiola-settings",
                    JSON.stringify(settingsToSave)
                  );
                  setSettings(settingsToSave);
                }}
                placeholder="Enter your Aiola API key"
                className="config-dialog__input"
              />
            </div>

            <div className="config-dialog__field-group">
              <Label htmlFor="workflowId" className="config-dialog__label">
                Workflow ID
              </Label>
              <Input
                id="workflowId"
                value={
                  tempSettings[tempSettings.environment].connection
                    .workflowId || ""
                }
                onChange={(e) => {
                  const newWorkflowId = e.target.value;
                  console.log("[ConfigDialog] Workflow ID changed:", {
                    from:
                      tempSettings[tempSettings.environment].connection
                        .workflowId || "",
                    to: newWorkflowId,
                    hasValue: !!newWorkflowId,
                  });
                  const currentEnv = tempSettings.environment;
                  setTempSettings({
                    ...tempSettings,
                    [currentEnv]: {
                      ...tempSettings[currentEnv],
                      connection: {
                        ...tempSettings[currentEnv].connection,
                        workflowId: e.target.value,
                      },
                    },
                  });
                }}
                placeholder="Enter workflow ID for STT processing"
                className="config-dialog__input"
              />
              <p className="config-dialog__helper-text">
                Optional: SDK will use default workflow if empty
              </p>
            </div>

            <div className="config-dialog__field-group">
              <Label className="config-dialog__label">Environment</Label>
              <div className="config-dialog__toggle-container">
                <button
                  type="button"
                  onClick={() => switchEnvironment("prod")}
                  className={`config-dialog__toggle-button ${
                    tempSettings.environment === "prod"
                      ? "config-dialog__toggle-button--active"
                      : ""
                  }`}
                >
                  Prod
                </button>
                <button
                  type="button"
                  onClick={() => switchEnvironment("dev")}
                  className={`config-dialog__toggle-button ${
                    tempSettings.environment === "dev"
                      ? "config-dialog__toggle-button--active"
                      : ""
                  }`}
                >
                  Dev
                </button>
              </div>
              <p className="config-dialog__helper-text">
                Select the API environment: Production or Development
              </p>
            </div>
          </section>

          {/* STT Section */}
          <section className="config-dialog__section">
            <div className="config-dialog__section-header">
              <h3 className="config-dialog__section-title">Speech-to-Text</h3>
              <p className="config-dialog__section-subtitle">
                Configure speech recognition settings and language preferences
              </p>
            </div>

            <div className="config-dialog__field-group">
              <Label
                htmlFor="stt-language"
                className="config-dialog__label config-dialog__label--required"
              >
                Language/Accent
              </Label>
              <Select
                value={tempSettings[tempSettings.environment].stt.language}
                onValueChange={(value) => {
                  console.log("[ConfigDialog] STT language changed:", {
                    from: tempSettings[tempSettings.environment].stt.language,
                    to: value,
                    languageLabel: STT_LANGUAGES.find(
                      (lang) => lang.value === value
                    )?.label,
                  });
                  const currentEnv = tempSettings.environment;
                  setTempSettings({
                    ...tempSettings,
                    [currentEnv]: {
                      ...tempSettings[currentEnv],
                      stt: {
                        ...tempSettings[currentEnv].stt,
                        language: value as STTLanguageCode,
                      },
                    },
                  });
                }}
              >
                <SelectTrigger className="config-dialog__select">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {STT_LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="config-dialog__field-group">
              <Label htmlFor="keywords" className="config-dialog__label">
                Keywords
              </Label>
              <Textarea
                id="keywords"
                value={tempSettings[tempSettings.environment].stt.keywords.join(
                  ", "
                )}
                onChange={(e) => {
                  const newKeywords = e.target.value
                    .split(",")
                    .map((k) => k.trim())
                    .filter(Boolean);
                  console.log("[ConfigDialog] STT keywords changed:", {
                    from: tempSettings[tempSettings.environment].stt.keywords,
                    to: newKeywords,
                    count: newKeywords.length,
                  });
                  const currentEnv = tempSettings.environment;
                  setTempSettings({
                    ...tempSettings,
                    [currentEnv]: {
                      ...tempSettings[currentEnv],
                      stt: {
                        ...tempSettings[currentEnv].stt,
                        keywords: newKeywords,
                      },
                    },
                  });
                }}
                placeholder="[word1, word2] or [{'A Yo La': 'aiola'}, {'bay tar': 'beitar'}]"
                rows={3}
                className="config-dialog__textarea"
              />
              <p className="config-dialog__helper-text">
                Comma-separated keywords to improve recognition accuracy
              </p>
            </div>

            <div className="config-dialog__field-group">
              <Label className="config-dialog__label">VAD Config</Label>
              <div className="config-dialog__info-box">
                <p className="config-dialog__info-text">
                  Using SDK defaults (no override available)
                </p>
              </div>
            </div>
          </section>

          {/* TTS Section */}
          <section className="config-dialog__section">
            <div className="config-dialog__section-header">
              <h3 className="config-dialog__section-title">Text-to-Speech</h3>
              <p className="config-dialog__section-subtitle">
                Configure voice synthesis settings and voice selection
              </p>
            </div>

            <div className="config-dialog__field-group">
              <Label htmlFor="tts-voice" className="config-dialog__label">
                Voice
              </Label>
              <Select
                value={tempSettings[tempSettings.environment].tts.voice}
                onValueChange={(value) => {
                  console.log("[ConfigDialog] TTS voice changed:", {
                    from: tempSettings[tempSettings.environment].tts.voice,
                    to: value,
                    voiceLabel: TTS_VOICES.find(
                      (voice) => voice.value === value
                    )?.label,
                  });
                  const currentEnv = tempSettings.environment;
                  setTempSettings({
                    ...tempSettings,
                    [currentEnv]: {
                      ...tempSettings[currentEnv],
                      tts: {
                        ...tempSettings[currentEnv].tts,
                        voice: value as TTSVoice,
                      },
                    },
                  });
                }}
              >
                <SelectTrigger className="config-dialog__select">
                  <SelectValue placeholder="Select voice" />
                </SelectTrigger>
                <SelectContent>
                  {TTS_VOICES.map((voice) => (
                    <SelectItem key={voice.value} value={voice.value}>
                      {voice.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="config-dialog__info-box">
              <p className="config-dialog__info-text">
                Language/Accent: Fixed to English (en) - non-editable
              </p>
            </div>
          </section>
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
