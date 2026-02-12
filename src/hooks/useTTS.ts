import { useRecoilValue } from "recoil";
import { settingsState, type SettingsState } from "@/state/settings";
import { useConnection } from "@/hooks/useConnection";
import { useCallback, useState } from "react";
import { logger } from "@/lib/logger";

const TAG = "TTS";

// Helper function to get current environment settings
function getCurrentSettings(settings: SettingsState) {
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
        logger.debug(TAG, "Starting generation", { text: text.substring(0, 50) + "...", voice });

        const client = await getClient();

        const currentSettings = getCurrentSettings(settings);

        const audioStream = await client.tts.synthesize({
          text,
          voice_id: (voice || currentSettings.tts.voice) as string,
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
        logger.debug(TAG, "Total audio length", totalLength);

        if (totalLength === 0) {
          throw new Error("No audio data received from TTS service");
        }

        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }

        // Create blob with audio/mpeg MIME type
        const blob = new Blob([combined], { type: "audio/mpeg" });
        logger.debug(TAG, "Blob created", { size: blob.size, type: blob.type });

        return blob;
      } catch (error) {
        logger.error(TAG, "Generation error:", error);
        throw error;
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
