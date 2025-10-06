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
      return (
        original.connection.apiKey !== current.connection.apiKey ||
        original.connection.endpointOverride !==
          current.connection.endpointOverride ||
        original.stt.language !== current.stt.language ||
        JSON.stringify(original.stt.keywords) !==
          JSON.stringify(current.stt.keywords) ||
        original.stt.flowid !== current.stt.flowid ||
        original.stt.rememberFlowid !== current.stt.rememberFlowid ||
        original.tts.voice !== current.tts.voice
      );
    },
    []
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
    if (!tempSettings.connection.apiKey.trim()) {
      toast.error("API Key is required");
      return;
    }

    // If settings changed and there's an existing connection, reload the page to start fresh
    if (hasSettingsChanged && isConnected) {
      // Save settings first
      const settingsToSave = {
        ...tempSettings,
        connection: {
          ...tempSettings.connection,
          apiKey: tempSettings.connection.apiKey,
        },
        stt: {
          ...tempSettings.stt,
          flowid: tempSettings.stt.rememberFlowid
            ? tempSettings.stt.flowid
            : "",
          rememberFlowid: tempSettings.stt.rememberFlowid,
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
        connection: {
          ...tempSettings.connection,
          apiKey: tempSettings.connection.apiKey,
        },
        stt: {
          ...tempSettings.stt,
          flowid: tempSettings.stt.rememberFlowid
            ? tempSettings.stt.flowid
            : "",
          rememberFlowid: tempSettings.stt.rememberFlowid,
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
        connection: {
          ...tempSettings.connection,
          apiKey: tempSettings.connection.apiKey,
        },
        stt: {
          ...tempSettings.stt,
          flowid: tempSettings.stt.rememberFlowid
            ? tempSettings.stt.flowid
            : "",
          rememberFlowid: tempSettings.stt.rememberFlowid,
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
                value={tempSettings.connection.apiKey}
                onChange={(e) => {
                  const newApiKey = e.target.value;
                  console.log("[ConfigDialog] API key changed:", {
                    hasValue: !!newApiKey,
                    length: newApiKey.length,
                    preview:
                      newApiKey.substring(0, 10) +
                      (newApiKey.length > 10 ? "..." : ""),
                  });
                  const updatedTempSettings = {
                    ...tempSettings,
                    connection: {
                      ...tempSettings.connection,
                      apiKey: newApiKey,
                    },
                  };
                  setTempSettings(updatedTempSettings);

                  // Always save API key to localStorage immediately
                  const settingsToSave = {
                    ...updatedTempSettings,
                    connection: {
                      ...updatedTempSettings.connection,
                      apiKey: newApiKey,
                    },
                    stt: {
                      ...updatedTempSettings.stt,
                      flowid: updatedTempSettings.stt.rememberFlowid
                        ? updatedTempSettings.stt.flowid
                        : "",
                      rememberFlowid: updatedTempSettings.stt.rememberFlowid,
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
              <Label htmlFor="endpoint" className="config-dialog__label">
                Endpoint Override
              </Label>
              <Input
                id="endpoint"
                value={tempSettings.connection.endpointOverride || ""}
                onChange={(e) => {
                  const newEndpoint = e.target.value;
                  console.log("[ConfigDialog] Endpoint override changed:", {
                    from: tempSettings.connection.endpointOverride || "",
                    to: newEndpoint,
                    hasValue: !!newEndpoint,
                  });
                  setTempSettings({
                    ...tempSettings,
                    connection: {
                      ...tempSettings.connection,
                      endpointOverride: e.target.value,
                    },
                  });
                }}
                placeholder="Leave empty to use SDK default"
                className="config-dialog__input"
              />
              <p className="config-dialog__helper-text">
                Optional: Override the default API endpoint URL
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
              <Label htmlFor="flowid" className="config-dialog__label">
                Flow ID
              </Label>
              <Input
                id="flowid"
                value={tempSettings.stt.flowid}
                onChange={(e) => {
                  const newFlowid = e.target.value;
                  console.log("[ConfigDialog] STT Flow ID changed:", {
                    from: tempSettings.stt.flowid || "",
                    to: newFlowid,
                    hasValue: !!newFlowid,
                  });
                  setTempSettings({
                    ...tempSettings,
                    stt: {
                      ...tempSettings.stt,
                      flowid: e.target.value,
                    },
                  });
                }}
                placeholder="Enter flow ID for STT processing"
                className="config-dialog__input"
              />
              <p className="config-dialog__helper-text">
                Optional: SDK will use default flow if empty
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
                value={tempSettings.stt.language}
                onValueChange={(value) => {
                  console.log("[ConfigDialog] STT language changed:", {
                    from: tempSettings.stt.language,
                    to: value,
                    languageLabel: STT_LANGUAGES.find(
                      (lang) => lang.value === value
                    )?.label,
                  });
                  setTempSettings({
                    ...tempSettings,
                    stt: {
                      ...tempSettings.stt,
                      language: value as STTLanguageCode,
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
                value={tempSettings.stt.keywords.join(", ")}
                onChange={(e) => {
                  const newKeywords = e.target.value
                    .split(",")
                    .map((k) => k.trim())
                    .filter(Boolean);
                  console.log("[ConfigDialog] STT keywords changed:", {
                    from: tempSettings.stt.keywords,
                    to: newKeywords,
                    count: newKeywords.length,
                  });
                  setTempSettings({
                    ...tempSettings,
                    stt: {
                      ...tempSettings.stt,
                      keywords: newKeywords,
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

            <div className="config-dialog__info-box">
              <p className="config-dialog__info-text">
                VAD Config: Using SDK defaults (no override available)
              </p>
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
                value={tempSettings.tts.voice}
                onValueChange={(value) => {
                  console.log("[ConfigDialog] TTS voice changed:", {
                    from: tempSettings.tts.voice,
                    to: value,
                    voiceLabel: TTS_VOICES.find(
                      (voice) => voice.value === value
                    )?.label,
                  });
                  setTempSettings({
                    ...tempSettings,
                    tts: {
                      ...tempSettings.tts,
                      voice: value as TTSVoice,
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
                remembered for future sessions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
