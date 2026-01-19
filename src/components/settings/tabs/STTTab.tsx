import { useState, useRef, useCallback, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  type SettingsState, 
  type STTLanguageCode, 
  type VadConfig, 
  type SchemaValues,
  STT_LANGUAGES,
} from "@/state/settings";
import { type StreamConnection } from "@/state/connection";
import { toast } from "sonner";



interface STTTabProps {
  tempSettings: SettingsState;
  setTempSettings: (settings: SettingsState) => void;
  isConnected: boolean;
  createStreamConnection: () => Promise<StreamConnection>;
  onLanguageChange?: (value: STTLanguageCode) => void;
}

export function STTTab({ 
  tempSettings, 
  setTempSettings, 
  isConnected, 
  createStreamConnection,
  onLanguageChange
}: STTTabProps) {
  const [schemaValuesRawText, setSchemaValuesRawText] = useState<string>("");
  const [schemaValuesError, setSchemaValuesError] = useState<string | null>(null);
  const [isSettingSchemaValues, setIsSettingSchemaValues] = useState(false);
  const schemaValuesTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize raw text from tempSettings
  useEffect(() => {
    const currentEnv = tempSettings.environment;
    const schemaValues = tempSettings[currentEnv].stt.schemaValues;
    if (Object.keys(schemaValues).length === 0) {
      setSchemaValuesRawText("");
    } else {
      setSchemaValuesRawText(JSON.stringify(schemaValues, null, 2));
    }
  }, [tempSettings]); // Only re-initialize when environment changes

  const validateSchemaValues = useCallback(
    (jsonText: string): { isValid: boolean; error: string | null; parsed?: SchemaValues } => {
      const trimmed = jsonText.trim();
      if (trimmed === "") return { isValid: true, error: null, parsed: {} };

      try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          return { isValid: false, error: "Schema values must be an object" };
        }

        for (const [key, value] of Object.entries(parsed)) {
          if (!Array.isArray(value)) {
            return { isValid: false, error: `Value for "${key}" must be an array` };
          }
          for (const item of value) {
            if (typeof item !== "string" && typeof item !== "number") {
              return { isValid: false, error: `Items in "${key}" array must be strings or numbers` };
            }
          }
        }
        return { isValid: true, error: null, parsed: parsed as SchemaValues };
      } catch (error) {
        return {
          isValid: false,
          error: error instanceof Error ? `Invalid JSON: ${error.message}` : "Invalid JSON format",
        };
      }
    },
    []
  );

  const handleSetSchemaValues = async () => {
    const validation = validateSchemaValues(schemaValuesRawText);

    if (!validation.isValid) {
      setSchemaValuesError(validation.error);
      schemaValuesTextareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      schemaValuesTextareaRef.current?.focus();
      toast.error(`Schema values validation failed: ${validation.error}`);
      return;
    }

    setSchemaValuesError(null);
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

    if (!isConnected) {
      toast.error("Please connect first before setting schema values");
      return;
    }

    setIsSettingSchemaValues(true);
    try {
      const connection = await createStreamConnection();
      const schemaValues = validation.parsed || {};
      if (Object.keys(schemaValues).length > 0) {
        connection.setSchemaValues(schemaValues, (response: { status: string; message?: string }) => {
          if (response.status === "ok") {
            toast.success("Schema values set successfully");
          } else {
            toast.warning(`Schema values set with warning: ${response.message || "Unknown warning"}`);
          }
          setIsSettingSchemaValues(false);
        });
      } else {
        toast.warning("Schema values are empty. No event sent.");
        setIsSettingSchemaValues(false);
      }
    } catch (error) {
      toast.error(`Failed to set schema values: ${error instanceof Error ? error.message : "Unknown error"}`);
      setIsSettingSchemaValues(false);
    }
  };

  const currentEnv = tempSettings.environment;

  return (
    <section className="config-dialog__section">
      <div className="config-dialog__section-header">
        <h3 className="config-dialog__section-title">Speech-to-Text</h3>
        <p className="config-dialog__section-subtitle">
          Configure speech recognition settings and language preferences
        </p>
      </div>

      <div className="config-dialog__field-group">
        <Label htmlFor="stt-language" className="config-dialog__label config-dialog__label--required">
          Language/Accent
        </Label>
        <Select
          value={tempSettings[currentEnv].stt.language}
          onValueChange={(value) => {
            const newLang = value as STTLanguageCode;
            setTempSettings({
              ...tempSettings,
              [currentEnv]: {
                ...tempSettings[currentEnv],
                stt: {
                  ...tempSettings[currentEnv].stt,
                  language: newLang,
                },
              },
            });
            if (onLanguageChange) {
              onLanguageChange(newLang);
            }
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
          value={tempSettings[currentEnv].stt.keywords.join(", ")}
          onChange={(e) => {
            const newKeywords = e.target.value.split(",").map((k) => k.trim()).filter(Boolean);
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
            setSchemaValuesRawText(e.target.value);
            if (schemaValuesError) setSchemaValuesError(null);
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
            JSON object with dot-notation keys mapping to arrays of strings or numbers.
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
                checked={typeof tempSettings[currentEnv].stt.vad === "object"}
                onChange={(e) => {
                  setTempSettings({
                    ...tempSettings,
                    [currentEnv]: {
                      ...tempSettings[currentEnv],
                      stt: {
                        ...tempSettings[currentEnv].stt,
                        vad: e.target.checked
                          ? { threshold: 0.5, min_speech_ms: 250, min_silence_ms: 500, max_segment_ms: 30000 }
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

          {typeof tempSettings[currentEnv].stt.vad === "object" && (
            <div className="config-dialog__vad-fields">
              {(["threshold", "min_speech_ms", "min_silence_ms", "max_segment_ms"] as const).map((field) => (
                <div key={field} className="config-dialog__vad-field">
                  <Label htmlFor={`vad-${field}`} className="config-dialog__vad-label">
                    {field.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Label>
                  <Input
                    id={`vad-${field}`}
                    type="number"
                    step={field === "threshold" ? "0.1" : "1"}
                    value={(tempSettings[currentEnv].stt.vad as VadConfig)[field]}
                    onChange={(e) => {
                      const vadConfig = tempSettings[currentEnv].stt.vad as VadConfig;
                      setTempSettings({
                        ...tempSettings,
                        [currentEnv]: {
                          ...tempSettings[currentEnv],
                          stt: {
                            ...tempSettings[currentEnv].stt,
                            vad: {
                              ...vadConfig,
                              [field]: field === "threshold" ? parseFloat(e.target.value) : parseInt(e.target.value),
                            },
                          },
                        },
                      });
                    }}
                    className="config-dialog__input"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
