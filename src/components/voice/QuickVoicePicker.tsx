import { useState } from "react";
import { useRecoilState } from "recoil";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { IconChevronDown } from "@tabler/icons-react";
import { settingsState, type TTSVoice } from "@/state/settings";
import { toast } from "sonner";
import { componentClassName } from "@/lib/utils";
import "./QuickVoicePicker.css";

const TTS_VOICES: { value: TTSVoice; label: string }[] = [
  { value: "en_us_female", label: "English (US) - Female" },
];

// Helper function to get current environment settings
function getCurrentSettings(settings: any) {
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

interface QuickVoicePickerProps {
  className?: string;
}

export function QuickVoicePicker({ className = "" }: QuickVoicePickerProps) {
  const [settings, setSettings] = useRecoilState(settingsState);
  const [isOpen, setIsOpen] = useState(false);

  const currentSettings = getCurrentSettings(settings);
  const currentVoice = currentSettings.tts.voice;
  const currentVoiceLabel = TTS_VOICES.find(v => v.value === currentVoice)?.label || currentVoice;

  const handleVoiceChange = (newVoice: TTSVoice) => {
    const currentEnv = settings.environment;

    // Update the TTS voice in settings
    const updatedSettings = {
      ...settings,
      [currentEnv]: {
        ...settings[currentEnv],
        tts: {
          ...settings[currentEnv].tts,
          voice: newVoice,
        },
      },
    };

    setSettings(updatedSettings);
    localStorage.setItem("aiola-settings", JSON.stringify(updatedSettings));

    toast.success(`Voice changed to ${TTS_VOICES.find(v => v.value === newVoice)?.label}`);
    setIsOpen(false);
  };

  return (
    <div className={componentClassName("QuickVoicePicker", className)}>
      <Select
        value={currentVoice}
        onValueChange={handleVoiceChange}
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <SelectTrigger className="quick-voice-picker__trigger" showIcon={false}>
          <div className="quick-voice-picker__content">
            <span className="quick-voice-picker__label">Voice:</span>
            <span className="quick-voice-picker__current-voice">{currentVoiceLabel}</span>
            <IconChevronDown className="quick-voice-picker__chevron" />
          </div>
        </SelectTrigger>
        <SelectContent className="quick-voice-picker__content">
          {TTS_VOICES.map((voice) => (
            <SelectItem
              key={voice.value}
              value={voice.value}
              className="quick-voice-picker__item"
            >
              <span className="quick-voice-picker__item-label">{voice.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
