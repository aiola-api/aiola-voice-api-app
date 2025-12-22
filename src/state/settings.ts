import { atom, useRecoilState, selector } from "recoil";
import { useEffect } from "react";

// VAD Configuration interface
export interface VadConfig {
  threshold?: number;
  min_speech_ms?: number;
  min_silence_ms?: number;
  max_segment_ms?: number;
}

// Schema Values interface - matches SDK SchemaValues type
export type SchemaValues = Record<string, (string | number)[]>;

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

export type Environment = "prod" | "dev" | "custom";

export interface SettingsState {
  environment: Environment;
  prod: {
    connection: {
      apiKey: string;
      baseUrl: string;
      authBaseUrl: string;
      workflowId?: string;
    };
    stt: {
      language: STTLanguageCode;
      keywords: string[];
      vad: "default" | VadConfig;
      rememberFlowid: boolean;
      schemaValues: SchemaValues;
    };
    tts: {
      voice: TTSVoice;
      language: "en";
    };
  };
  dev: {
    connection: {
      apiKey: string;
      baseUrl: string;
      authBaseUrl: string;
      workflowId?: string;
    };
    stt: {
      language: STTLanguageCode;
      keywords: string[];
      vad: "default" | VadConfig;
      rememberFlowid: boolean;
      schemaValues: SchemaValues;
    };
    tts: {
      voice: TTSVoice;
      language: "en";
    };
  };
  custom: {
    connection: {
      apiKey: string;
      baseUrl: string;
      authBaseUrl: string;
      workflowId?: string;
    };
    stt: {
      language: STTLanguageCode;
      keywords: string[];
      vad: "default" | VadConfig;
      rememberFlowid: boolean;
      schemaValues: SchemaValues;
    };
    tts: {
      voice: TTSVoice;
      language: "en";
    };
  };
}

// Default settings
const defaultSettings: SettingsState = {
  environment: "prod",
  prod: {
    connection: {
      apiKey: "",
      baseUrl: "https://apis.aiola.ai",
      authBaseUrl: "https://auth.aiola.ai",
      workflowId: "",
    },
    stt: {
      language: "en_US",
      keywords: [],
      vad: "default",
      rememberFlowid: true,
      schemaValues: {},
    },
    tts: {
      voice: "tara",
      language: "en",
    },
  },
  dev: {
    connection: {
      apiKey: "",
      baseUrl: "https://dev-vp1-api.internal.aiola.ai",
      authBaseUrl: "https://dev-vp1-auth.internal.aiola.ai",
      workflowId: "",
    },
    stt: {
      language: "en_US",
      keywords: [],
      vad: "default",
      rememberFlowid: true,
      schemaValues: {},
    },
    tts: {
      voice: "tara",
      language: "en",
    },
  },
  custom: {
    connection: {
      apiKey: "",
      baseUrl: "",
      authBaseUrl: "",
      workflowId: "",
    },
    stt: {
      language: "en_US",
      keywords: [],
      vad: "default",
      rememberFlowid: true,
      schemaValues: {},
    },
    tts: {
      voice: "tara",
      language: "en",
    },
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

      // Check if this is the old format (has flat structure)
      if (parsed.connection && typeof parsed.connection.apiKey === "string") {
        console.log(
          "[loadSettingsFromStorage] Migrating from old settings format"
        );

        // Migrate from old format to new format
        const migratedSettings: SettingsState = {
          environment: parsed.environment || "prod",
          prod: {
            connection: {
              apiKey: parsed.connection.apiKey || "",
              baseUrl: "https://apis.aiola.ai",
              authBaseUrl: "https://auth.aiola.ai",
              workflowId: parsed.stt?.flowid || "",
            },
            stt: {
              language: parsed.stt?.language || "en_US",
              keywords: parsed.stt?.keywords || [],
              vad: parsed.stt?.vad || "default",
              rememberFlowid: parsed.stt?.rememberFlowid !== false,
              schemaValues: parsed.stt?.schemaValues || {},
            },
            tts: {
              voice: parsed.tts?.voice || "tara",
              language: "en",
            },
          },
          dev: {
            connection: {
              apiKey: "", // Dev API key starts empty
              baseUrl: "https://dev-vp1-api.internal.aiola.ai",
              authBaseUrl: "https://dev-vp1-auth.internal.aiola.ai",
              workflowId: "",
            },
            stt: {
              language: "en_US",
              keywords: [],
              vad: "default",
              rememberFlowid: true,
              schemaValues: {},
            },
            tts: {
              voice: "tara",
              language: "en",
            },
          },
          custom: {
            connection: {
              apiKey: "",
              baseUrl: "",
              authBaseUrl: "",
              workflowId: "",
            },
            stt: {
              language: "en_US",
              keywords: [],
              vad: "default",
              rememberFlowid: true,
              schemaValues: {},
            },
            tts: {
              voice: "tara",
              language: "en",
            },
          },
        };

        // Save the migrated settings back to localStorage
        localStorage.setItem(
          "aiola-settings",
          JSON.stringify(migratedSettings)
        );

        console.log("[loadSettingsFromStorage] Settings migrated and loaded");
        return migratedSettings;
      }

      // Validate that apiKey is a string and doesn't contain corrupted data
      if (parsed.prod?.connection?.apiKey) {
        const apiKey = parsed.prod.connection.apiKey;

        // Check if it's not a string or contains corrupted data patterns
        if (
          typeof apiKey !== "string" ||
          apiKey.includes("authorization Bearer") ||
          apiKey.includes('{"connection":')
        ) {
          console.warn(
            "Corrupted apiKey detected in localStorage, clearing it"
          );
          parsed.prod.connection.apiKey = "";
          // Save the fixed data back to localStorage
          localStorage.setItem(
            "aiola-settings",
            JSON.stringify({
              ...defaultSettings,
              ...parsed,
              prod: {
                ...defaultSettings.prod,
                ...parsed.prod,
                connection: {
                  ...defaultSettings.prod.connection,
                  ...parsed.prod?.connection,
                  apiKey: "",
                },
              },
            })
          );
        }
      }

      // Also validate dev connection apiKey
      if (parsed.dev?.connection?.apiKey) {
        const apiKey = parsed.dev.connection.apiKey;

        // Check if it's not a string or contains corrupted data patterns
        if (
          typeof apiKey !== "string" ||
          apiKey.includes("authorization Bearer") ||
          apiKey.includes('{"connection":')
        ) {
          console.warn(
            "Corrupted dev apiKey detected in localStorage, clearing it"
          );
          parsed.dev.connection.apiKey = "";
          // Save the fixed data back to localStorage
          localStorage.setItem(
            "aiola-settings",
            JSON.stringify({
              ...defaultSettings,
              ...parsed,
              dev: {
                ...defaultSettings.dev,
                ...parsed.dev,
                connection: {
                  ...defaultSettings.dev.connection,
                  ...parsed.dev?.connection,
                  apiKey: "",
                },
              },
            })
          );
        }
      }

      // Merge with defaults to ensure all properties exist
      const loadedSettings = {
        ...defaultSettings,
        ...parsed,
        prod: {
          ...defaultSettings.prod,
          ...(parsed.prod || {}),
          connection: {
            ...defaultSettings.prod.connection,
            ...(parsed.prod?.connection || {}),
          },
          stt: {
            ...defaultSettings.prod.stt,
            ...(parsed.prod?.stt || {}),
            schemaValues: parsed.prod?.stt?.schemaValues || {},
          },
        },
        dev: {
          ...defaultSettings.dev,
          ...(parsed.dev || {}),
          connection: {
            ...defaultSettings.dev.connection,
            ...(parsed.dev?.connection || {}),
          },
          stt: {
            ...defaultSettings.dev.stt,
            ...(parsed.dev?.stt || {}),
            schemaValues: parsed.dev?.stt?.schemaValues || {},
          },
        },
        custom: {
          ...defaultSettings.custom,
          ...(parsed.custom || {}),
          connection: {
            ...defaultSettings.custom.connection,
            ...(parsed.custom?.connection || {}),
          },
          stt: {
            ...defaultSettings.custom.stt,
            ...(parsed.custom?.stt || {}),
            schemaValues: parsed.custom?.stt?.schemaValues || {},
          },
        },
      };

      console.log(
        "[loadSettingsFromStorage] Settings loaded from localStorage:",
        {
          environment: loadedSettings.environment,
          hasProdApiKey: !!loadedSettings.prod.connection.apiKey,
          hasDevApiKey: !!loadedSettings.dev.connection.apiKey,
          prodSttLanguage: loadedSettings.prod.stt.language,
          prodTtsVoice: loadedSettings.prod.tts.voice,
          devSttLanguage: loadedSettings.dev.stt.language,
          devTtsVoice: loadedSettings.dev.tts.voice,
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
      // Use getCurrentSettings for logging current environment settings
      const currentSettings = {
        apiKey: loadedSettings[loadedSettings.environment].connection.apiKey,
        stt: loadedSettings[loadedSettings.environment].stt,
        tts: loadedSettings[loadedSettings.environment].tts,
      };
      console.log("[SettingsInitializer] Settings loaded from localStorage:", {
        environment: loadedSettings.environment,
        hasApiKey: !!currentSettings.apiKey,
        sttLanguage: currentSettings.stt.language,
        ttsVoice: currentSettings.tts.voice,
        rememberFlowid: currentSettings.stt.rememberFlowid,
      });
      setSettings(loadedSettings);
    }, 100);

    return () => clearTimeout(timer);
  }, [setSettings]);

  return null;
}
