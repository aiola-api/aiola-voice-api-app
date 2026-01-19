import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RotateCcw } from "lucide-react";
import { CopyButton } from "../shared/CopyButton";
import { 
  type SettingsState, 
  type Environment, 
  PREDEFINED_WORKFLOW_IDS, 
  DEFAULT_CONNECTION_SETTINGS 
} from "@/state/settings";
import { toast } from "sonner";
import { useCallback } from "react";

interface ConnectTabProps {
  tempSettings: SettingsState;
  setTempSettings: (settings: SettingsState) => void;
  setSettings: (settings: SettingsState) => void;
  setHasSettingsChanged: (changed: boolean) => void;
}

import { getCurrentEnvironmentSettings, setCurrentEnvironmentSettings } from "../shared/utils";

export function ConnectTab({ 
  tempSettings, 
  setTempSettings, 
  setSettings,
  setHasSettingsChanged 
}: ConnectTabProps) {
  
  const switchEnvironment = useCallback(
    (newEnvironment: Environment) => {
      const currentEnv = tempSettings.environment;
      const updatedSettings = setCurrentEnvironmentSettings(
        tempSettings,
        currentEnv,
        getCurrentEnvironmentSettings(tempSettings)
      );

      const newSettings = {
        ...updatedSettings,
        environment: newEnvironment,
      };

      if (!newSettings[newEnvironment].connection.workflowId) {
        newSettings[newEnvironment].connection = {
          ...newSettings[newEnvironment].connection,
          workflowId: PREDEFINED_WORKFLOW_IDS[newEnvironment as keyof typeof PREDEFINED_WORKFLOW_IDS],
        };
      }

      setTempSettings(newSettings);
      setHasSettingsChanged(true);
    },
    [tempSettings, setTempSettings, setHasSettingsChanged]
  );

  const handleResetConnection = () => {
    const currentEnv = tempSettings.environment;
    setTempSettings({
      ...tempSettings,
      [currentEnv]: {
        ...tempSettings[currentEnv],
        connection: {
          ...tempSettings[currentEnv].connection,
          ...DEFAULT_CONNECTION_SETTINGS[currentEnv],
        },
      },
    });
    toast.success("Settings reset to defaults");
  };

  const handleResetWorkflowId = () => {
    const currentEnv = tempSettings.environment;
    setTempSettings({
      ...tempSettings,
      [currentEnv]: {
        ...tempSettings[currentEnv],
        connection: {
          ...tempSettings[currentEnv].connection,
          workflowId: PREDEFINED_WORKFLOW_IDS[currentEnv as keyof typeof PREDEFINED_WORKFLOW_IDS],
        },
      },
    });
    toast.success("Workflow ID reset to default");
  };

  return (
    <section className="config-dialog__section">
      <div className="config-dialog__section-header">
        <h3 className="config-dialog__section-title">Connection</h3>
        <p className="config-dialog__section-subtitle">
          Configure your Aiola API connection and authentication
        </p>
      </div>

      <div className="config-dialog__field-group">
        <Label
          htmlFor="api-key"
          className="config-dialog__label config-dialog__label--required"
        >
          API Key / Access Token
        </Label>
        <div className="config-dialog__input-actions-container">
          <Input
            id="api-key"
            type="password"
            value={tempSettings[tempSettings.environment].connection.apiKey}
            onChange={(e) => {
              const newApiKey = e.target.value;
              const currentEnv = tempSettings.environment;
              const updatedTempSettings = {
                ...tempSettings,
                [currentEnv]: {
                  ...tempSettings[currentEnv],
                  connection: {
                    ...tempSettings[currentEnv].connection,
                    apiKey: newApiKey,
                  },
                },
              };
              setTempSettings(updatedTempSettings);

              const settingsToSave = {
                ...updatedTempSettings,
                [currentEnv]: {
                  ...updatedTempSettings[currentEnv],
                  stt: {
                    ...updatedTempSettings[currentEnv].stt,
                    rememberFlowid:
                      updatedTempSettings[currentEnv].stt.rememberFlowid,
                  },
                },
              };
              localStorage.setItem(
                "aiola-settings",
                JSON.stringify(settingsToSave)
              );
              setSettings(settingsToSave);
            }}
            placeholder="Enter your Aiola API key"
            className="config-dialog__input"
          />
          <div className="config-dialog__input-actions">
            <CopyButton value={tempSettings[tempSettings.environment].connection.apiKey} />
          </div>
        </div>
      </div>

      <div className="config-dialog__field-group">
        <Label htmlFor="workflowId" className="config-dialog__label">
          Workflow ID
        </Label>
        <div className="config-dialog__input-actions-container">
          <Input
            id="workflowId"
            value={tempSettings[tempSettings.environment].connection.workflowId || ""}
            onChange={(e) => {
              const currentEnv = tempSettings.environment;
              setTempSettings({
                ...tempSettings,
                [currentEnv]: {
                  ...tempSettings[currentEnv],
                  connection: {
                    ...tempSettings[currentEnv].connection,
                    workflowId: e.target.value,
                  },
                },
              });
            }}
            placeholder="Enter workflow ID for STT processing"
            className="config-dialog__input"
          />
          <div className="config-dialog__input-actions">
            <CopyButton value={tempSettings[tempSettings.environment].connection.workflowId || ""} />
            {tempSettings[tempSettings.environment].connection.workflowId !== PREDEFINED_WORKFLOW_IDS[tempSettings.environment as keyof typeof PREDEFINED_WORKFLOW_IDS] && (
              <button
                onClick={handleResetWorkflowId}
                className="config-dialog__field-reset-button"
                title="Reset to default workflow ID"
                type="button"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="config-dialog__field-group">
        <Label className="config-dialog__label">Environment</Label>
        <div className="config-dialog__toggle-container">
          {(["prod", "dev", "stage"] as Environment[]).map((env) => (
            <button
              key={env}
              type="button"
              onClick={() => switchEnvironment(env)}
              className={`config-dialog__toggle-button ${
                tempSettings.environment === env
                  ? "config-dialog__toggle-button--active"
                  : ""
              }`}
            >
              {env.charAt(0).toUpperCase() + env.slice(1)}
            </button>
          ))}
        </div>
        <p className="config-dialog__helper-text">
          Select the API environment: Production, Development, or Stage
        </p>
      </div>

      <div className="config-dialog__ultra-compact-row">
        <div className="config-dialog__ultra-compact-header">
          <h4 className="config-dialog__section-title--micro">Environment URLs</h4>
          {tempSettings.environment === "prod" && (
            <div className="config-dialog__inline-input-group">
              <Label htmlFor="prod-prefix" className="config-dialog__label--tiny">Prefix:</Label>
              <div className="config-dialog__input-actions-container">
                <Input
                  id="prod-prefix"
                  value={tempSettings.prod.connection.prefix || ""}
                  onChange={(e) => {
                    const prefix = e.target.value;
                    const baseUrl = prefix ? `https://${prefix}-api.aiola.ai` : "https://apis.aiola.ai";
                    const authBaseUrl = prefix ? `https://${prefix}-auth.aiola.ai` : "https://auth.aiola.ai";
                    
                    setTempSettings({
                      ...tempSettings,
                      prod: {
                        ...tempSettings.prod,
                        connection: {
                          ...tempSettings.prod.connection,
                          prefix,
                          baseUrl,
                          authBaseUrl,
                        },
                      },
                    });
                  }}
                  placeholder="e.g. pg-vp2"
                  className="config-dialog__input--micro"
                />
                {tempSettings.prod.connection.prefix && (
                  <div className="config-dialog__input-actions">
                    <button
                      onClick={handleResetConnection}
                      className="config-dialog__reset-button"
                      title="Clear prefix and reset defaults"
                      type="button"
                    >
                      <RotateCcw size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="config-dialog__ultra-compact-content">
          <div className="config-dialog__url-pill">
            <span className="config-dialog__url-pill-label">BASE:</span>
            <span className="config-dialog__url-pill-value">{tempSettings[tempSettings.environment].connection.baseUrl}</span>
            <CopyButton value={tempSettings[tempSettings.environment].connection.baseUrl} />
          </div>
          
          <div className="config-dialog__url-pill">
            <span className="config-dialog__url-pill-label">AUTH:</span>
            <span className="config-dialog__url-pill-value">{tempSettings[tempSettings.environment].connection.authBaseUrl}</span>
            <CopyButton value={tempSettings[tempSettings.environment].connection.authBaseUrl} />
          </div>
        </div>
      </div>
    </section>
  );
}
