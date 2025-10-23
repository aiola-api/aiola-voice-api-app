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
        console.log("TTS: Starting generation", { text: text.substring(0, 50) + "...", voice });
        
        const client = await getClient();
        console.log("TTS: Client obtained");

        const currentSettings = getCurrentSettings(settings);
        console.log("TTS: Settings", { 
          voice: voice || currentSettings.tts.voice, 
          language: currentSettings.tts.language,
          hasApiKey: !!currentSettings.apiKey 
        });

        const audioStream = await client.tts.synthesize({
          text,
          voice: (voice || currentSettings.tts.voice) as string,
          language: currentSettings.tts.language,
        });
        console.log("TTS: Stream obtained");

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
        console.log("TTS: Total audio length", totalLength);
        
        if (totalLength === 0) {
          throw new Error("No audio data received from TTS service");
        }

        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }

        // Try different MIME types for better browser compatibility
        let blob: Blob;
        try {
          // First try with audio/mpeg
          blob = new Blob([combined], { type: "audio/mpeg" });
          console.log("TTS: Blob created with audio/mpeg", { 
            size: blob.size, 
            type: blob.type
          });
        } catch (error) {
          // Fallback to audio/mp3 if audio/mpeg fails
          console.log("TTS: audio/mpeg failed, trying audio/mp3");
          blob = new Blob([combined], { type: "audio/mp3" });
          console.log("TTS: Blob created with audio/mp3", { 
            size: blob.size, 
            type: blob.type
          });
        }
        
        return blob;
      } catch (error) {
        console.error("TTS Generation Error:", error);
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
