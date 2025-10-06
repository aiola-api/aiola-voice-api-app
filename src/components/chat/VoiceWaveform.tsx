import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

interface VoiceWaveformProps {
  isUser?: boolean;
  isRecording?: boolean;
  audioUrl?: string;
  durationMs?: number;
}

// Generate a realistic default waveform pattern for visualization
const generateDefaultWaveform = (length: number = 100): number[] => {
  const bars: number[] = [];
  for (let i = 0; i < length; i++) {
    // Create a wave-like pattern with some randomness
    const wave = Math.sin(i / 8) * 0.4 + 0.5;
    const random = Math.random() * 0.3;
    bars.push(Math.max(0.1, Math.min(1, wave + random)));
  }
  return bars;
};

export function VoiceWaveform({
  isUser = false,
  isRecording = false,
  audioUrl,
  durationMs,
}: VoiceWaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isLoading, setIsLoading] = useState(!!audioUrl);

  useEffect(() => {
    if (!containerRef.current) return;

    // If we have an audio URL, use WaveSurfer
    if (audioUrl && !isRecording) {
      const wavesurfer = WaveSurfer.create({
        container: containerRef.current,
        waveColor: isUser ? "rgba(0, 0, 0, 0.5)" : "rgba(255, 255, 255, 0.5)",
        progressColor: isUser ? "#000000" : "#ffffff",
        height: 60,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        cursorWidth: 0,
        normalize: true,
        url: audioUrl,
      });

      wavesurfer.on("ready", () => {
        setIsLoading(false);
      });

      wavesurfer.on("error", (error) => {
        console.error("WaveSurfer error:", error);
        setIsLoading(false);
      });

      wavesurferRef.current = wavesurfer;

      return () => {
        wavesurfer.destroy();
      };
    } else if (!isRecording) {
      // For finished recordings without audio URL, show static waveform using WaveSurfer with peaks
      const peaks = generateDefaultWaveform(100);

      const wavesurfer = WaveSurfer.create({
        container: containerRef.current,
        waveColor: isUser ? "rgba(0, 0, 0, 0.6)" : "rgba(255, 255, 255, 0.6)",
        progressColor: isUser ? "#000000" : "#ffffff",
        height: 60,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        cursorWidth: 0,
        normalize: true,
      });

      // Load the waveform with generated peaks (wrapped in array for mono channel)
      wavesurfer.load("", [peaks], durationMs ? durationMs / 1000 : 5);
      wavesurferRef.current = wavesurfer;
      setIsLoading(false);

      return () => {
        wavesurfer.destroy();
      };
    }
  }, [audioUrl, isRecording, isUser, durationMs]);

  // For live recording, show animated bars
  if (isRecording) {
    const liveBars = 50;
    return (
      <div className="flex items-center justify-center gap-0.5 h-16 my-2 px-4 rounded-lg bg-opacity-10 w-full max-w-full overflow-hidden">
        {Array.from({ length: liveBars }).map((_, index) => (
          <div
            key={index}
            className={`w-1 rounded-full ${
              isUser ? "bg-black/80" : "bg-white/80"
            } animate-pulse`}
            style={{
              height: `${Math.random() * 40 + 20}px`,
              animationDelay: `${index * 30}ms`,
              animationDuration: `${800 + Math.random() * 400}ms`,
            }}
          />
        ))}
      </div>
    );
  }

  // For finished recordings, show WaveSurfer
  return (
    <div className="my-2 px-2 min-w-[300px]">
      {isLoading && (
        <div className="flex items-center justify-center h-16">
          <span className="text-xs text-gray-500">Loading waveform...</span>
        </div>
      )}
      <div ref={containerRef} className={`${isLoading ? "hidden" : ""}`} />
    </div>
  );
}
