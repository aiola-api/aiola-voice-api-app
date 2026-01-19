import { type SettingsState, type Environment } from "@/state/settings";

export function getCurrentEnvironmentSettings(settings: SettingsState) {
  const env = settings.environment;
  return {
    apiKey: settings[env].connection.apiKey,
    baseUrl: settings[env].connection.baseUrl,
    authBaseUrl: settings[env].connection.authBaseUrl,
    workflowId: settings[env].connection.workflowId,
    stt: settings[env].stt,
    tts: settings[env].tts,
  };
}

export function setCurrentEnvironmentSettings(
  settings: SettingsState,
  env: Environment,
  newSettings: {
    connection?: Partial<SettingsState[Environment]["connection"]>;
    stt?: Partial<SettingsState[Environment]["stt"]>;
    tts?: Partial<SettingsState[Environment]["tts"]>;
  }
) {
  return {
    ...settings,
    environment: env,
    [env]: {
      connection: {
        ...settings[env].connection,
        ...newSettings.connection,
      },
      stt: {
        ...settings[env].stt,
        ...newSettings.stt,
      },
      tts: {
        ...settings[env].tts,
        ...newSettings.tts,
      },
    },
  };
}
