import { useEffect, useRef, useState, useMemo } from "react";
import { useRecoilValue } from "recoil";
import WaveSurfer from "wavesurfer.js";
import { conversationState } from "@/state/conversation";
import { logger } from "@/lib/logger";

const TAG = "VoiceWaveform";

interface VoiceWaveformProps {
  isUser?: boolean;
  isRecording?: boolean;
  audioUrl?: string;
  durationMs?: number;
  messageId?: string; // Add messageId to identify which message's amplitude data to use
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
  messageId,
}: VoiceWaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isLoading, setIsLoading] = useState(!!audioUrl);

  // Get amplitude data from conversation state for the specific message
  const conversation = useRecoilValue(conversationState);
  const currentMessage = messageId
    ? conversation.messages.find((msg) => msg.id === messageId)
    : null;
  const amplitudeHistory = useMemo(() => currentMessage?.amplitudeHistory || [], [currentMessage?.amplitudeHistory]);

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
        logger.error(TAG, "WaveSurfer error:", error);
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
  }, [audioUrl, isRecording, isUser, durationMs, amplitudeHistory, messageId]);

  // Show amplitude-based waveform bars when we have amplitude data (during/after recording)
  if (amplitudeHistory.length > 0) {
    const liveBars = 50;

    // Generate bar heights based on amplitude history (final state after recording)
    const getBarHeights = () => {
      if (amplitudeHistory.length > 0) {
        // Use recent amplitude history to create the final waveform
        const recentData = amplitudeHistory.slice(-liveBars);
        return recentData.map((amp) => {
          // Use normalized peak for responsive visualization
          const amplitude = amp?.normalizedPeak || 0;
          return Math.max(6, amplitude * 52 + 6); // Scale to 6-58px range for increased sensitivity
        });
      }
      return [];
    };

    const barHeights = getBarHeights();

    return (
      <div className="flex items-center justify-center gap-0.5 h-16 my-2 px-4 rounded-lg bg-opacity-10 w-full max-w-full overflow-hidden">
        {Array.from({ length: liveBars }).map((_, index) => (
          <div
            key={index}
            className={`w-1 rounded-full ${
              isUser ? "bg-black/80" : "bg-white/80"
            }`}
            style={{
              height: `${barHeights[index] || 6}px`,
            }}
          />
        ))}
      </div>
    );
  }

  // For live recording, show animated bars
  if (isRecording) {
    const liveBars = 50;

    // Generate bar heights based on amplitude data or fallback to random if no data
    const getBarHeights = () => {
      if (amplitudeHistory.length > 0) {
        // Use recent amplitude history to create a moving waveform
        const recentData = amplitudeHistory.slice(-liveBars);
        return recentData.map((amp) => {
          // Use normalized peak for more responsive visualization
          const amplitude = amp?.normalizedPeak || 0;
          return Math.max(6, amplitude * 52 + 6); // Scale to 6-58px range for increased sensitivity
        });
      } else {
        // Fallback to random animation when no amplitude data is available yet
        return Array.from({ length: liveBars }, () => {
          return Math.random() * 52 + 6; // Match the new amplitude scaling range
        });
      }
    };

    const barHeights = getBarHeights();

    return (
      <div className="flex items-center justify-center gap-0.5 h-16 my-2 px-4 rounded-lg bg-opacity-10 w-full max-w-full overflow-hidden">
        {Array.from({ length: liveBars }).map((_, index) => (
          <div
            key={index}
            className={`w-1 rounded-full transition-all duration-100 ${
              isUser ? "bg-black/80" : "bg-white/80"
            }`}
            style={{
              height: `${barHeights[index]}px`,
              animationDelay: `${index * 30}ms`,
              animationDuration: `${800 + Math.random() * 400}ms`,
            }}
          />
        ))}
      </div>
    );
  }

  // For actual audio files (TTS playback, file uploads), show WaveSurfer
  if (audioUrl && !amplitudeHistory.length) {
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

  // Default fallback for no amplitude data and no audio URL
  return (
    <div className="flex items-center justify-center h-16 my-2">
      <span className="text-xs text-gray-400">No waveform data</span>
    </div>
  );
}
