import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type SettingsState, type TTSVoice } from "@/state/settings";

export const TTS_VOICES: { value: TTSVoice; label: string }[] = [
  { value: "en_us_female", label: "English (US) - Female" },
];

interface TTSTabProps {
  tempSettings: SettingsState;
  setTempSettings: (settings: SettingsState) => void;
}

export function TTSTab({ tempSettings, setTempSettings }: TTSTabProps) {
  const currentEnv = tempSettings.environment;

  return (
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
          value={tempSettings[currentEnv].tts.voice}
          onValueChange={(value) => {
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
  );
}
