import { useRecoilValue } from "recoil";
import { settingsState } from "@/state/settings";
import { useConnection } from "@/hooks/useConnection";
import { useCallback, useState } from "react";

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

        const currentSettings = getCurrentSettings(settings);
        const audioStream = await client.tts.synthesize({
          text,
          voice: (voice || currentSettings.tts.voice) as string,
          language: currentSettings.tts.language,
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
    [getClient, settings]
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
