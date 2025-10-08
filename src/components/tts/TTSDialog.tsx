import { useState } from "react";
import { useRecoilState } from "recoil";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { settingsState, type TTSVoice } from "@/state/settings";
import { useTTS } from "@/hooks/useTTS";
import { toast } from "sonner";
import { IconVolume2, IconVolumeOff, IconLoader2 } from "@tabler/icons-react";

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

interface TTSDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TTSDialog({ open, onOpenChange }: TTSDialogProps) {
  const [settings] = useRecoilState(settingsState);
  const currentSettings = getCurrentSettings(settings);
  const [text, setText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState<TTSVoice>(
    currentSettings.tts.voice
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const audioRef = useState<HTMLAudioElement | null>(null)[0];
  const { generateTTS, isGenerating } = useTTS();

  const handleGenerate = async () => {
    if (!text.trim()) {
      toast.error("Please enter text to convert to speech");
      return;
    }

    if (!currentSettings.apiKey) {
      toast.error("Please configure your API key first");
      return;
    }

    try {
      // Generate TTS audio using hook with custom voice
      const blob = await generateTTS(text.trim(), selectedVoice);

      setAudioBlob(blob);
      toast.success("Audio generated successfully");
    } catch (error) {
      console.error("TTS Generation Error:", error);
      toast.error("Failed to generate audio");
    }
  };

  const handlePlayPause = async () => {
    if (!audioBlob) {
      toast.error("Please generate audio first");
      return;
    }

    if (isPlaying) {
      // Stop current playback
      if (audioRef) {
        audioRef.pause();
        audioRef.currentTime = 0;
      }
      setIsPlaying(false);
      return;
    }

    try {
      // Stop any other playing audio
      if (audioRef) {
        audioRef.pause();
        audioRef.currentTime = 0;
      }

      // Create audio element and play
      const audioUrl = URL.createObjectURL(audioBlob);
      const audioElement = new Audio(audioUrl);

      audioElement.addEventListener("ended", () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      });

      audioElement.addEventListener("error", (e) => {
        console.error("Audio playback error:", e);
        toast.error("Audio playback failed");
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      });

      setIsPlaying(true);
      await audioElement.play();
    } catch (error) {
      console.error("Audio Playback Error:", error);
      toast.error("Audio playback failed");
      setIsPlaying(false);
    }
  };

  const handleClose = () => {
    // Stop any playing audio
    if (audioRef && isPlaying) {
      audioRef.pause();
      audioRef.currentTime = 0;
    }
    setText("");
    setAudioBlob(null);
    setIsPlaying(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Text-to-Speech</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tts-text">Text to convert</Label>
            <Textarea
              id="tts-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text to convert to speech..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tts-voice">Voice</Label>
            <select
              id="tts-voice"
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value as TTSVoice)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {TTS_VOICES.map((voice) => (
                <option key={voice.value} value={voice.value}>
                  {voice.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleGenerate}
              disabled={!text.trim() || isGenerating}
              className="flex-1"
            >
              {isGenerating ? (
                <>
                  <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Audio"
              )}
            </Button>

            <Button
              onClick={handlePlayPause}
              disabled={!audioBlob}
              variant="outline"
              className="flex-1"
            >
              {isPlaying ? (
                <>
                  <IconVolumeOff className="h-4 w-4 mr-2" />
                  Stop
                </>
              ) : (
                <>
                  <IconVolume2 className="h-4 w-4 mr-2" />
                  Play
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
