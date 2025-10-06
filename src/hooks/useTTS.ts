import { useRecoilValue } from "recoil";
import { settingsState } from "@/state/settings";
import { useConnection } from "@/hooks/useConnection";
import { useCallback, useState } from "react";

export function useTTS() {
  const settings = useRecoilValue(settingsState);
  const { getClient, isConnected, sessionId } = useConnection();
  const [isGenerating, setIsGenerating] = useState(false);

  /**
   * Generate TTS audio
   */
  const generateTTS = useCallback(
    async (text: string, voice?: string): Promise<Blob> => {
      try {
        setIsGenerating(true);
        const client = await getClient();

        const audioStream = await client.tts.synthesize({
          text,
          voice: (voice || settings.tts.voice) as string,
          language: settings.tts.language,
        });

        // Convert stream to blob
        const chunks: Uint8Array[] = [];
        const reader = audioStream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
          }
        } finally {
          reader.releaseLock();
        }

        const totalLength = chunks.reduce(
          (acc, chunk) => acc + chunk.length,
          0
        );
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }

        return new Blob([combined], { type: "audio/mpeg" });
      } finally {
        setIsGenerating(false);
      }
    },
    [getClient, settings.tts]
  );

  return {
    // State
    isGenerating,
    isConnected,
    sessionId,

    // Methods
    generateTTS,
  };
}
