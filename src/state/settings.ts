import { atom, useRecoilState, selector } from "recoil";
import { useEffect } from "react";

//TODO get form aiOla SDK
export type STTLanguageCode =
  | "en_US"
  | "en_GB"
  | "es_ES"
  | "fr_FR"
  | "de_DE"
  | "it_IT"
  | "pt_BR"
  | "ja_JP"
  | "ko_KR"
  | "zh_CN";

//TODO get form aiOla SDK
export type TTSVoice =
  | "tara"
  | "zoe"
  | "zac"
  | "dan"
  | "jess"
  | "leo"
  | "mia"
  | "julia"
  | "leah";

export interface SettingsState {
  connection: {
    apiKey: string;
    endpointOverride?: string;
  };
  stt: {
    language: STTLanguageCode;
    keywords: string[];
    vad: "default";
    flowid?: string;
    rememberFlowid: boolean;
  };
  tts: {
    voice: TTSVoice;
    language: "en";
  };
}

// Default settings
const defaultSettings: SettingsState = {
  connection: {
    apiKey: "",
    endpointOverride: "",
  },
  stt: {
    language: "en_US",
    keywords: [],
    vad: "default",
    flowid: "",
    rememberFlowid: true,
  },
  tts: {
    voice: "tara",
    language: "en",
  },
};

// Load settings from localStorage
function loadSettingsFromStorage(): SettingsState {
  // Check if we're in a browser environment
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return defaultSettings;
  }

  try {
    const savedSettings = localStorage.getItem("aiola-settings");

    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);

      // Validate that apiKey is a string and doesn't contain corrupted data
      if (parsed.connection?.apiKey) {
        const apiKey = parsed.connection.apiKey;

        // Check if it's not a string or contains corrupted data patterns
        if (
          typeof apiKey !== "string" ||
          apiKey.includes("authorization Bearer") ||
          apiKey.includes('{"connection":')
        ) {
          console.warn(
            "Corrupted apiKey detected in localStorage, clearing it"
          );
          parsed.connection.apiKey = "";
          // Save the fixed data back to localStorage
          localStorage.setItem(
            "aiola-settings",
            JSON.stringify({
              ...defaultSettings,
              ...parsed,
              connection: {
                ...defaultSettings.connection,
                ...parsed.connection,
                apiKey: "",
              },
            })
          );
        }
      }

      // Merge with defaults to ensure all properties exist
      const loadedSettings = {
        ...defaultSettings,
        ...parsed,
        connection: {
          ...defaultSettings.connection,
          ...(parsed.connection || {}),
        },
        stt: {
          ...defaultSettings.stt,
          ...(parsed.stt || {}),
        },
        tts: {
          ...defaultSettings.tts,
          ...(parsed.tts || {}),
        },
      };

      console.log(
        "[loadSettingsFromStorage] Settings loaded from localStorage:",
        {
          hasApiKey: !!loadedSettings.connection.apiKey,
          sttLanguage: loadedSettings.stt.language,
          ttsVoice: loadedSettings.tts.voice,
          rememberFlowid: loadedSettings.stt.rememberFlowid,
          source: "localStorage",
        }
      );

      return loadedSettings;
    }
  } catch (error) {
    console.warn("Failed to load settings from localStorage:", error);
    console.log(
      "[loadSettingsFromStorage] Using default settings due to error"
    );
  }

  console.log(
    "[loadSettingsFromStorage] No saved settings found, using defaults"
  );
  return defaultSettings;
}

// Create a function to get the initial settings
function getInitialSettings(): SettingsState {
  // Only load from localStorage if we're in a browser environment
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    return loadSettingsFromStorage();
  }
  return defaultSettings;
}

// Create a selector that always reads from localStorage
export const settingsSelector = selector<SettingsState>({
  key: "settingsSelector",
  get: () => {
    return loadSettingsFromStorage();
  },
});

export const settingsState = atom<SettingsState>({
  key: "settingsState",
  default: getInitialSettings(),
});

// Simple hook that just uses the regular Recoil state
export function useSettingsWithPersistence() {
  return useRecoilState(settingsState);
}

// Component to initialize settings from localStorage
export function SettingsInitializer() {
  const [, setSettings] = useRecoilState(settingsState);

  useEffect(() => {
    // Add a small delay to ensure localStorage is available
    const timer = setTimeout(() => {
      const loadedSettings = loadSettingsFromStorage();
      console.log("[SettingsInitializer] Settings loaded from localStorage:", {
        hasApiKey: !!loadedSettings.connection.apiKey,
        sttLanguage: loadedSettings.stt.language,
        ttsVoice: loadedSettings.tts.voice,
        rememberFlowid: loadedSettings.stt.rememberFlowid,
      });
      setSettings(loadedSettings);
    }, 100);

    return () => clearTimeout(timer);
  }, [setSettings]);

  return null;
}
