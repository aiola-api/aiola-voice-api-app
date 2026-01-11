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
  type VadConfig,
  type SchemaValues,
  PREDEFINED_WORKFLOW_IDS,
  DEFAULT_CONNECTION_SETTINGS,
} from "@/state/settings";
import { useConnection } from "@/hooks/useConnection";
import { useSTT } from "@/hooks/useSTT";
import { toast } from "sonner";
import { componentClassName } from "@/lib/utils";
import {
  Copy,
  Check,
  RotateCcw,
} from "lucide-react";
import "./ConfigDialog.css";

// Helper component for copying to clipboard
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      const displayValue = value.length > 20 
        ? `${value.substring(0, 10)}...${value.substring(value.length - 5)}`
        : value;
      
      toast.success(`Copied: ${displayValue}`);
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="config-dialog__copy-button"
      title="Copy to clipboard"
      type="button"
    >
      {copied ? (
        <Check size={14} className="config-dialog__copy-icon--success" />
      ) : (
        <Copy size={14} />
      )}
    </button>
  );
}

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
  { value: "en_us_female", label: "English (US) - Female" },
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
  const [schemaValuesError, setSchemaValuesError] = useState<string | null>(
    null
  );
  const [isSettingSchemaValues, setIsSettingSchemaValues] = useState(false);
  const [schemaValuesRawText, setSchemaValuesRawText] = useState<string>("");
  const { createSession, isConnected } = useConnection();
  const { createStreamConnection } = useSTT();
  const dialogRef = useRef<HTMLDivElement>(null);
  const schemaValuesTextareaRef = useRef<HTMLTextAreaElement>(null);

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

      // Log environment-specific tracking for debugging
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
              schemaValuesChanged: sttSchemaValuesChanged,
              rememberFlowidChanged: rememberFlowidChanged,
              workflowIdChanged: workflowIdChanged,
              vadConfigChanged: vadConfigChanged,
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
        sttSchemaValuesChanged ||
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

      // Auto-fill workflowId if it's empty in the new environment
      // (This handles the case where it wasn't set in previous state)
      if (!newSettings[newEnvironment].connection.workflowId) {
        newSettings[newEnvironment].connection = {
          ...newSettings[newEnvironment].connection,
          workflowId: PREDEFINED_WORKFLOW_IDS[newEnvironment as keyof typeof PREDEFINED_WORKFLOW_IDS],
        };
      }

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
      // Initialize raw text with current schema values
      const currentEnv = settings.environment;
      const schemaValues = settings[currentEnv].stt.schemaValues;
      // If schema values is empty object, show empty string instead of {}
      if (Object.keys(schemaValues).length === 0) {
        setSchemaValuesRawText("");
      } else {
        setSchemaValuesRawText(
          JSON.stringify(schemaValues, null, 2)
        );
      }
      setSchemaValuesError(null);
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

  const handleResetConnection = () => {
    const currentEnv = tempSettings.environment;
    setTempSettings({
      ...tempSettings,
      [currentEnv]: {
        ...tempSettings[currentEnv],
        connection: {
          ...tempSettings[currentEnv].connection,
          ...DEFAULT_CONNECTION_SETTINGS[currentEnv],
        },
      },
    });
    toast.success("Settings reset to defaults");
  };

  const handleResetWorkflowId = () => {
    const currentEnv = tempSettings.environment;
    setTempSettings({
      ...tempSettings,
      [currentEnv]: {
        ...tempSettings[currentEnv],
        connection: {
          ...tempSettings[currentEnv].connection,
          workflowId: PREDEFINED_WORKFLOW_IDS[currentEnv as keyof typeof PREDEFINED_WORKFLOW_IDS],
        },
      },
    });
    toast.success("Workflow ID reset to default");
  };

  const handleSave = async () => {
    // Validate API key - use input value (tempSettings), not localStorage
    const currentEnv = tempSettings.environment;
    if (!tempSettings[currentEnv].connection.apiKey.trim()) {
      toast.error("API Key is required");
      return;
    }

    // Validate custom/prod environment URLs
    if (currentEnv === "prod") {
      if (!tempSettings.prod.connection.prefix?.trim()) {
        toast.error("Prefix is required for PROD environment");
        return;
      }
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

  // Validation function for schema values
  const validateSchemaValues = useCallback(
    (
      jsonText: string
    ): { isValid: boolean; error: string | null; parsed?: SchemaValues } => {
      const trimmed = jsonText.trim();

      // Allow empty string (treated as empty object)
      if (trimmed === "") {
        return { isValid: true, error: null, parsed: {} };
      }

      // Try to parse JSON
      try {
        const parsed = JSON.parse(trimmed);

        // Validate structure matches SchemaValues type
        if (
          typeof parsed !== "object" ||
          parsed === null ||
          Array.isArray(parsed)
        ) {
          return {
            isValid: false,
            error: "Schema values must be an object",
          };
        }

        // Validate each value is an array of strings or numbers
        for (const [key, value] of Object.entries(parsed)) {
          if (!Array.isArray(value)) {
            return {
              isValid: false,
              error: `Value for "${key}" must be an array`,
            };
          }
          for (const item of value) {
            if (typeof item !== "string" && typeof item !== "number") {
              return {
                isValid: false,
                error: `Items in "${key}" array must be strings or numbers`,
              };
            }
          }
        }

        // Valid schema values
        return { isValid: true, error: null, parsed: parsed as SchemaValues };
      } catch (error) {
        // Invalid JSON
        return {
          isValid: false,
          error:
            error instanceof Error
              ? `Invalid JSON: ${error.message}`
              : "Invalid JSON format",
        };
      }
    },
    []
  );

  const handleSetSchemaValues = async () => {
    // Get current raw text value
    const jsonText = schemaValuesRawText;

    // Validate the current value
    const validation = validateSchemaValues(jsonText);

    if (!validation.isValid) {
      // Set and display the error
      setSchemaValuesError(validation.error);

      // Scroll to the error
      const textarea = schemaValuesTextareaRef.current;
      if (textarea) {
        textarea.scrollIntoView({ behavior: "smooth", block: "center" });
        textarea.focus();
      }

      // Show toast with error
      toast.error(`Schema values validation failed: ${validation.error}`);
      return;
    }

    // Clear any previous errors
    setSchemaValuesError(null);

    // Update tempSettings with validated values
    const currentEnv = tempSettings.environment;
    setTempSettings({
      ...tempSettings,
      [currentEnv]: {
        ...tempSettings[currentEnv],
        stt: {
          ...tempSettings[currentEnv].stt,
          schemaValues: validation.parsed || {},
        },
      },
    });

    // Check if connected
    if (!isConnected) {
      toast.error("Please connect first before setting schema values");
      return;
    }

    setIsSettingSchemaValues(true);

    try {
      // Create or get stream connection
      const connection = await createStreamConnection();

      // Set schema values (use validated parsed value)
      const schemaValues = validation.parsed || {};
      // Only set schema values if there are any (don't send empty event)
      if (Object.keys(schemaValues).length > 0) {
        connection.setSchemaValues(schemaValues, (response) => {
          if (response.status === "ok") {
            toast.success("Schema values set successfully");
            console.log("✅ Schema values set successfully:", schemaValues);
          } else {
            toast.warning(
              `Schema values set with warning: ${
                response.message || "Unknown warning"
              }`
            );
            console.warn("⚠️ Schema values set with warning:", response.message);
          }
          setIsSettingSchemaValues(false);
        });
      } else {
        toast.warning("Schema values are empty. No event sent.");
        setIsSettingSchemaValues(false);
      }
    } catch (error) {
      console.error("❌ Error setting schema values:", error);
      toast.error(
        `Failed to set schema values: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setIsSettingSchemaValues(false);
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
              <div className="config-dialog__input-actions-container">
                <Input
                  id="api-key"
                  type="password"
                  value={tempSettings[tempSettings.environment].connection.apiKey}
                  onChange={(e) => {
                    const newApiKey = e.target.value;
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
                <div className="config-dialog__input-actions">
                  <CopyButton value={tempSettings[tempSettings.environment].connection.apiKey} />
                </div>
              </div>
            </div>

            <div className="config-dialog__field-group">
              <Label htmlFor="workflowId" className="config-dialog__label">
                Workflow ID
              </Label>
              <div className="config-dialog__input-actions-container">
                <Input
                  id="workflowId"
                  value={
                    tempSettings[tempSettings.environment].connection
                      .workflowId || ""
                  }
                  onChange={(e) => {
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
                <div className="config-dialog__input-actions">
                  <CopyButton value={tempSettings[tempSettings.environment].connection.workflowId || ""} />
                  {tempSettings[tempSettings.environment].connection.workflowId !== PREDEFINED_WORKFLOW_IDS[tempSettings.environment as keyof typeof PREDEFINED_WORKFLOW_IDS] && (
                    <button
                      onClick={handleResetWorkflowId}
                      className="config-dialog__field-reset-button"
                      title="Reset to default workflow ID"
                      type="button"
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}
                </div>
              </div>

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
                <button
                  type="button"
                  onClick={() => switchEnvironment("stage")}
                  className={`config-dialog__toggle-button ${
                    tempSettings.environment === "stage"
                      ? "config-dialog__toggle-button--active"
                      : ""
                  }`}
                >
                  Stage
                </button>
              </div>
              <p className="config-dialog__helper-text">
                Select the API environment: Production, Development, or Stage
              </p>
            </div>



            <div className="config-dialog__section-header config-dialog__section-header--with-input" style={{ marginTop: "1.5rem", borderBottom: "2px solid #e5e7eb" }}>
              <div className="config-dialog__header-title-group">
                <h4 className="config-dialog__section-title" style={{ fontSize: "0.85rem", marginBottom: 0 }}>Environment URLs</h4>
                
                {tempSettings.environment === "prod" && (
                  <div className="config-dialog__header-input-group">
                    <Label htmlFor="prod-prefix" className="config-dialog__label--compact-horizontal">Prefix:</Label>
                    <div className="config-dialog__input-actions-container">
                      <Input
                        id="prod-prefix"
                        value={tempSettings.prod.connection.prefix || ""}
                        onChange={(e) => {
                          const prefix = e.target.value;
                          const baseUrl = prefix ? `https://${prefix}-api.aiola.ai` : "https://apis.aiola.ai";
                          const authBaseUrl = prefix ? `https://${prefix}-auth.aiola.ai` : "https://auth.aiola.ai";
                          
                          setTempSettings({
                            ...tempSettings,
                            prod: {
                              ...tempSettings.prod,
                              connection: {
                                ...tempSettings.prod.connection,
                                prefix,
                                baseUrl,
                                authBaseUrl,
                              },
                            },
                          });
                        }}
                        placeholder="e.g. pg-vp2"
                        className="config-dialog__input--compact"
                      />
                      {tempSettings.prod.connection.prefix && (
                        <div className="config-dialog__input-actions">
                          <button
                            onClick={handleResetConnection}
                            className="config-dialog__reset-button"
                            title="Clear prefix and reset defaults"
                            type="button"
                          >
                            <RotateCcw size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="config-dialog__field-row" style={{ marginTop: "1rem" }}>
              <Label className="config-dialog__label config-dialog__label--compact">Base URL</Label>
              <div className="config-dialog__url-display-container">
                <div className="config-dialog__url-text">
                  {tempSettings[tempSettings.environment].connection.baseUrl}
                </div>
                <CopyButton value={tempSettings[tempSettings.environment].connection.baseUrl} />
              </div>
            </div>

            <div className="config-dialog__field-row">
              <Label className="config-dialog__label config-dialog__label--compact">Auth URL</Label>
              <div className="config-dialog__url-display-container">
                <div className="config-dialog__url-text">
                  {tempSettings[tempSettings.environment].connection.authBaseUrl}
                </div>
                <CopyButton value={tempSettings[tempSettings.environment].connection.authBaseUrl} />
              </div>
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
              <Label htmlFor="schema-values" className="config-dialog__label">
                Schema Values
              </Label>
              <Textarea
                ref={schemaValuesTextareaRef}
                id="schema-values"
                value={schemaValuesRawText}
                onChange={(e) => {
                  // Just update the raw text - no validation while typing
                  setSchemaValuesRawText(e.target.value);
                  // Clear any existing errors when user starts typing
                  if (schemaValuesError) {
                    setSchemaValuesError(null);
                  }
                }}
                placeholder='{"contact.name": ["John Doe", "Jane Smith"], "contact.email": ["john@example.com"]}'
                rows={6}
                className={`config-dialog__textarea ${
                  schemaValuesError ? "config-dialog__textarea--error" : ""
                }`}
              />
              {schemaValuesError ? (
                <p className="config-dialog__error-text">{schemaValuesError}</p>
              ) : (
                <p className="config-dialog__helper-text">
                  JSON object with dot-notation keys mapping to arrays of
                  strings or numbers. Supports copy/paste. Example: {"{"}
                  "contact.name": ["John Doe", "Jane Smith"]{"}"}
                </p>
              )}
              <div style={{ marginTop: "0.75rem" }}>
                <Button
                  onClick={handleSetSchemaValues}
                  disabled={isSettingSchemaValues || !isConnected}
                  className="config-dialog__button config-dialog__button--primary"
                >
                  {isSettingSchemaValues ? "Setting..." : "Set Schema Values"}
                </Button>
              </div>
            </div>

            <div className="config-dialog__field-group">
              <Label className="config-dialog__label">VAD Config</Label>
              <div className="config-dialog__vad-config">
                <div className="config-dialog__vad-toggle">
                  <label className="config-dialog__checkbox-label">
                    <input
                      type="checkbox"
                      checked={
                        typeof tempSettings[tempSettings.environment].stt
                          .vad === "object"
                      }
                      onChange={(e) => {
                        const currentEnv = tempSettings.environment;
                        setTempSettings({
                          ...tempSettings,
                          [currentEnv]: {
                            ...tempSettings[currentEnv],
                            stt: {
                              ...tempSettings[currentEnv].stt,
                              vad: e.target.checked
                                ? {
                                    threshold: 0.5,
                                    min_speech_ms: 250,
                                    min_silence_ms: 500,
                                    max_segment_ms: 30000,
                                  }
                                : "default",
                            },
                          },
                        });
                      }}
                      className="config-dialog__checkbox"
                    />
                    <span>Use custom VAD configuration</span>
                  </label>
                </div>

                {typeof tempSettings[tempSettings.environment].stt.vad ===
                  "object" && (
                  <div className="config-dialog__vad-fields">
                    <div className="config-dialog__vad-field">
                      <Label
                        htmlFor="vad-threshold"
                        className="config-dialog__vad-label"
                      >
                        Threshold (0.0 - 1.0)
                      </Label>
                      <Input
                        id="vad-threshold"
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={
                          (
                            tempSettings[tempSettings.environment].stt
                              .vad as VadConfig
                          ).threshold || 0.5
                        }
                        onChange={(e) => {
                          const currentEnv = tempSettings.environment;
                          const vadConfig = tempSettings[currentEnv].stt
                            .vad as VadConfig;
                          setTempSettings({
                            ...tempSettings,
                            [currentEnv]: {
                              ...tempSettings[currentEnv],
                              stt: {
                                ...tempSettings[currentEnv].stt,
                                vad: {
                                  ...vadConfig,
                                  threshold: parseFloat(e.target.value) || 0.5,
                                },
                              },
                            },
                          });
                        }}
                        className="config-dialog__input"
                      />
                    </div>

                    <div className="config-dialog__vad-field">
                      <Label
                        htmlFor="vad-min-speech"
                        className="config-dialog__vad-label"
                      >
                        Min Speech (ms)
                      </Label>
                      <Input
                        id="vad-min-speech"
                        type="number"
                        min="0"
                        value={
                          (
                            tempSettings[tempSettings.environment].stt
                              .vad as VadConfig
                          ).min_speech_ms || 250
                        }
                        onChange={(e) => {
                          const currentEnv = tempSettings.environment;
                          const vadConfig = tempSettings[currentEnv].stt
                            .vad as VadConfig;
                          setTempSettings({
                            ...tempSettings,
                            [currentEnv]: {
                              ...tempSettings[currentEnv],
                              stt: {
                                ...tempSettings[currentEnv].stt,
                                vad: {
                                  ...vadConfig,
                                  min_speech_ms:
                                    parseInt(e.target.value) || 250,
                                },
                              },
                            },
                          });
                        }}
                        className="config-dialog__input"
                      />
                    </div>

                    <div className="config-dialog__vad-field">
                      <Label
                        htmlFor="vad-min-silence"
                        className="config-dialog__vad-label"
                      >
                        Min Silence (ms)
                      </Label>
                      <Input
                        id="vad-min-silence"
                        type="number"
                        min="0"
                        value={
                          (
                            tempSettings[tempSettings.environment].stt
                              .vad as VadConfig
                          ).min_silence_ms || 500
                        }
                        onChange={(e) => {
                          const currentEnv = tempSettings.environment;
                          const vadConfig = tempSettings[currentEnv].stt
                            .vad as VadConfig;
                          setTempSettings({
                            ...tempSettings,
                            [currentEnv]: {
                              ...tempSettings[currentEnv],
                              stt: {
                                ...tempSettings[currentEnv].stt,
                                vad: {
                                  ...vadConfig,
                                  min_silence_ms:
                                    parseInt(e.target.value) || 500,
                                },
                              },
                            },
                          });
                        }}
                        className="config-dialog__input"
                      />
                    </div>

                    <div className="config-dialog__vad-field">
                      <Label
                        htmlFor="vad-max-segment"
                        className="config-dialog__vad-label"
                      >
                        Max Segment (ms)
                      </Label>
                      <Input
                        id="vad-max-segment"
                        type="number"
                        min="0"
                        value={
                          (
                            tempSettings[tempSettings.environment].stt
                              .vad as VadConfig
                          ).max_segment_ms || 30000
                        }
                        onChange={(e) => {
                          const currentEnv = tempSettings.environment;
                          const vadConfig = tempSettings[currentEnv].stt
                            .vad as VadConfig;
                          setTempSettings({
                            ...tempSettings,
                            [currentEnv]: {
                              ...tempSettings[currentEnv],
                              stt: {
                                ...tempSettings[currentEnv].stt,
                                vad: {
                                  ...vadConfig,
                                  max_segment_ms:
                                    parseInt(e.target.value) || 30000,
                                },
                              },
                            },
                          });
                        }}
                        className="config-dialog__input"
                      />
                    </div>
                  </div>
                )}
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
