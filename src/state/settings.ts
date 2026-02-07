import { atom, useRecoilState, selector } from "recoil";
import { useEffect } from "react";

export const APP_VERSION = "0.3.0";

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
  | "default"
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

export const STT_LANGUAGES: { value: STTLanguageCode; label: string }[] = [
  { value: "default", label: "Default (Workflow)" },
  { value: "en_US", label: "English (US)" },
  { value: "en_GB", label: "English (UK)" },
  { value: "es_ES", label: "Spanish (Spain)" },
  { value: "fr_FR", label: "French (France)" },
  { value: "de_DE", label: "German (Germany)" },
  { value: "it_IT", label: "Italian (Italy)" },
  { value: "pt_BR", label: "Portuguese (Brazil)" },
  { value: "ja_JP", label: "Japanese (Japan)" },
  { value: "ko_KR", label: "Korean (Korea)" },
  { value: "zh_CN", label: "Chinese (China)" },
];

// Predefined Workflow IDs
export const PREDEFINED_WORKFLOW_IDS = {
  prod: "24dcc04c-2003-4d39-9854-c276f8e709fc",
  dev: "9e153c70-288b-47a5-97a7-1f91273c2420",
  stage: "885417c8-666a-4a6d-a6d2-1ab97656021e",
};

//TODO get form aiOla SDK
export type TTSVoice = "en_us_female";

export const TTS_VOICES: { value: TTSVoice; label: string }[] = [
  { value: "en_us_female", label: "English (US) - Female" },
];

export type Environment = "prod" | "dev" | "stage";

export interface SettingsState {
  environment: Environment;
  prod: {
    connection: {
      apiKey: string;
      baseUrl: string;
      authBaseUrl: string;
      workflowId?: string;
      prefix?: string;
    };
    stt: {
      language: STTLanguageCode;
      keywords: string[];
      vad: "default" | VadConfig;
      rememberFlowid: boolean;
      schemaValues: SchemaValues;
      executionId?: string;
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
      prefix?: string;
    };
    stt: {
      language: STTLanguageCode;
      keywords: string[];
      vad: "default" | VadConfig;
      rememberFlowid: boolean;
      schemaValues: SchemaValues;
      executionId?: string;
    };
    tts: {
      voice: TTSVoice;
      language: "en";
    };
  };
  stage: {
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
      executionId?: string;
    };
    tts: {
      voice: TTSVoice;
      language: "en";
    };
  };
}

// Hardcoded connection defaults for each environment
export const DEFAULT_CONNECTION_SETTINGS: Record<Environment, SettingsState["prod"]["connection"]> = {
  prod: {
    apiKey: "",
    baseUrl: "https://apis.aiola.ai",
    authBaseUrl: "https://auth.aiola.ai",
    workflowId: PREDEFINED_WORKFLOW_IDS.prod,
    prefix: "",
  },
  dev: {
    apiKey: "",
    baseUrl: "https://dev-vp1-api.internal.aiola.ai",
    authBaseUrl: "https://dev-vp1-auth.internal.aiola.ai",
    workflowId: PREDEFINED_WORKFLOW_IDS.dev,
    prefix: "",
  },
  stage: {
    apiKey: "",
    baseUrl: "https://stg-vp1-api.aiola.ai",
    authBaseUrl: "https://stg-vp1-auth.aiola.ai",
    workflowId: PREDEFINED_WORKFLOW_IDS.stage,
  },
};

// Default settings
const defaultSettings: SettingsState = {
  environment: "prod",
  prod: {
    connection: DEFAULT_CONNECTION_SETTINGS.prod,
    stt: {
      language: "en_US",
      keywords: [],
      vad: "default",
      rememberFlowid: true,
      schemaValues: {},
      executionId: "",
    },
    tts: {
      voice: "en_us_female",
      language: "en",
    },
  },
  dev: {
    connection: DEFAULT_CONNECTION_SETTINGS.dev,
    stt: {
      language: "en_US",
      keywords: [],
      vad: "default",
      rememberFlowid: true,
      schemaValues: {},
      executionId: "",
    },
    tts: {
      voice: "en_us_female",
      language: "en",
    },
  },
  stage: {
    connection: DEFAULT_CONNECTION_SETTINGS.stage,
    stt: {
      language: "en_US",
      keywords: [],
      vad: "default",
      rememberFlowid: true,
      schemaValues: {},
      executionId: "",
    },
    tts: {
      voice: "en_us_female",
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
              workflowId: PREDEFINED_WORKFLOW_IDS.prod,
            },
            stt: {
              language: parsed.stt?.language || "en_US",
              keywords: parsed.stt?.keywords || [],
              vad: parsed.stt?.vad || "default",
              rememberFlowid: parsed.stt?.rememberFlowid !== false,
              schemaValues: parsed.stt?.schemaValues || {},
              executionId: "",
            },
            tts: {
              voice: parsed.tts?.voice || "en_us_female",
              language: "en",
            },
          },
          dev: {
            connection: {
              apiKey: "",
              baseUrl: "https://dev-vp1-api.internal.aiola.ai",
              authBaseUrl: "https://dev-vp1-auth.internal.aiola.ai",
              workflowId: PREDEFINED_WORKFLOW_IDS.dev,
            },
            stt: {
              language: "en_US",
              keywords: [],
              vad: "default",
              rememberFlowid: true,
              schemaValues: {},
              executionId: "",
            },
            tts: {
              voice: "en_us_female",
              language: "en",
            },
          },
          stage: {
            connection: {
              apiKey: "",
              baseUrl: "https://stg-vp1-api.aiola.ai",
              authBaseUrl: "https://stg-vp1-auth.aiola.ai",
              workflowId: PREDEFINED_WORKFLOW_IDS.stage,
            },
            stt: {
              language: "en_US",
              keywords: [],
              vad: "default",
              rememberFlowid: true,
              schemaValues: {},
              executionId: "",
            },
            tts: {
              voice: "en_us_female",
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
            workflowId: parsed.prod?.connection?.workflowId || defaultSettings.prod.connection.workflowId,
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
            workflowId: parsed.dev?.connection?.workflowId || defaultSettings.dev.connection.workflowId,
          },
          stt: {
            ...defaultSettings.dev.stt,
            ...(parsed.dev?.stt || {}),
            schemaValues: parsed.dev?.stt?.schemaValues || {},
          },
        },
        stage: {
          ...defaultSettings.stage,
          ...(parsed.stage || parsed.custom || {}),
          connection: {
            ...defaultSettings.stage.connection,
            ...(parsed.stage?.connection || parsed.custom?.connection || {}),
            workflowId: (parsed.stage?.connection || parsed.custom?.connection)?.workflowId || defaultSettings.stage.connection.workflowId,
          },
          stt: {
            ...defaultSettings.stage.stt,
            ...(parsed.stage?.stt || parsed.custom?.stt || {}),
            schemaValues: parsed.stage?.stt?.schemaValues || parsed.custom?.stt?.schemaValues || {},
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
