import { useRecoilState, useRecoilValue } from "recoil";
import { AiolaClient } from "@aiola/sdk";
import { connectionState, type ConnectionState } from "@/state/connection";
import { settingsState, type Environment } from "@/state/settings";
import { useCallback, useEffect } from "react";
import { toast } from "sonner";

/**
 * Module-level cache for SDK client and session
 * Note: Can't store in Recoil due to object freezing in development mode
 */
let connectionCache: {
  client: AiolaClient;
  accessToken: string;
  apiKey: string;
  baseUrl?: string;
  authBaseUrl?: string;
  workflowId?: string;
  environment: Environment;
  sessionId?: string;
} | null = null;

/**
 * Module-level variable to track the last notified session ID
 * Prevents duplicate toast notifications when multiple components use useConnection
 */
let lastNotifiedSessionId: string | undefined = undefined;

/**
 * Module-level variable to track the last error that was shown
 * Prevents duplicate error toast notifications
 */
let lastNotifiedError: string | undefined = undefined;

/**
 * Get current environment settings
 */
function getCurrentSettings(settings: any) {
  const env = settings.environment;
  console.log("getCurrentSettings", { env, settings });
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

/**
 * React hook for managing overall connection to Aiola services
 *
 * @description
 * Provides centralized connection management, session handling, and SDK client
 * lifecycle. Used by both STT and TTS hooks to ensure consistent session state
 * and avoid duplicate client creation.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isConnected, sessionId, getClient } = useConnection();
 *
 *   const handleConnect = async () => {
 *     const client = await getClient();
 *     // Use client for STT/TTS operations
 *   };
 * }
 * ```
 *
 * @returns {Object} Connection operations and state
 * @returns {boolean} isConnected - Whether connection is established
 * @returns {string|undefined} sessionId - Current session ID if connected
 * @returns {string|undefined} error - Current error message, if any
 * @returns {boolean} isConnecting - Whether currently establishing connection
 * @returns {boolean} isOnline - Whether service is online
 * @returns {'Offline'|'Ready'|'Connecting'|'error'} status - Current connection status
 * @returns {string} reason - Reason for current status
 * @returns {Function} getClient - Gets or creates SDK client instance
 * @returns {Function} createSession - Creates new session and tests connection
 * @returns {Function} disconnect - Disconnects and cleans up
 */
export function useConnection() {
  const [connection, setConnection] = useRecoilState(connectionState);
  const settings = useRecoilValue(settingsState);

  // Show toast when sessionId is established (only once per session)
  useEffect(() => {
    const currentSessionId = connection.currentSessionId;

    if (currentSessionId && currentSessionId !== lastNotifiedSessionId) {
      toast.success("Connection established successfully", {
        description: `Session: ${currentSessionId.substring(0, 16)}...`,
      });
      lastNotifiedSessionId = currentSessionId;
    } else if (!currentSessionId && lastNotifiedSessionId) {
      toast.error("Connection lost", {
        description: "Session has been terminated",
      });
      lastNotifiedSessionId = undefined;
    }
  }, [connection.currentSessionId]);

  // Show toast for connection errors (only once per error)
  useEffect(() => {
    if (connection.error && connection.error !== lastNotifiedError) {
      toast.error("Connection Error", {
        description: connection.error,
      });
      lastNotifiedError = connection.error;
    } else if (!connection.error && lastNotifiedError) {
      // Reset error tracking when error is cleared
      lastNotifiedError = undefined;
    }
  }, [connection.error]);

  /**
   * Get or create Aiola SDK client instance
   *
   * @param {boolean} forceNew - Force creation of a new client even if cached
   * @returns {Promise<AiolaClient>} Configured SDK client instance
   * @throws {Error} If API key is not configured
   */
  const getClient = useCallback(
    async (forceNew: boolean = false): Promise<AiolaClient> => {
      const currentSettings = getCurrentSettings(settings);
      const { apiKey, baseUrl, authBaseUrl, workflowId, environment } =
        currentSettings;

      if (!apiKey) {
        throw new Error("API key is required");
      }

      if (environment === "dev" && !workflowId) {
        throw new Error("Workflow ID is required for development environment");
      }

      // Check if we need to create a new client
      const needsNewClient =
        forceNew ||
        !connectionCache ||
        connectionCache.apiKey !== apiKey ||
        connectionCache.baseUrl !== baseUrl ||
        connectionCache.authBaseUrl !== authBaseUrl ||
        connectionCache.workflowId !== workflowId ||
        connectionCache.environment !== environment;

      if (needsNewClient) {
        // Close existing session if any
        console.log(
          "useConnection closing existing session: ",
          connectionCache
        );
        if (connectionCache) {
          try {
            await AiolaClient.closeSession(connectionCache.accessToken, {
              apiKey: connectionCache.apiKey,
              authBaseUrl: connectionCache.authBaseUrl,
              workflowId: connectionCache.workflowId,
            });
          } catch {
            // Failed to close previous session - continue anyway
          }
        }

        // Set connecting state
        setConnection((prev) => ({
          ...prev,
          isConnecting: true,
          error: undefined,
        }));

        try {
          // Create new access token
          console.log("useConnection creating new access token", {
            apiKey,
            authBaseUrl,
            workflowId: environment === "dev" ? workflowId : undefined,
          });
          const { accessToken } = await AiolaClient.grantToken({
            apiKey,
            authBaseUrl,
            workflowId: environment === "dev" ? workflowId : undefined,
          });

          // Create new client
          const client = new AiolaClient({
            accessToken,
            baseUrl,
            authBaseUrl,
            workflowId: environment === "dev" ? workflowId : null,
          });

          // Use access token as session ID (this is what the user means by "session")
          let sessionId: string | undefined;
          if (accessToken) {
            sessionId = accessToken;
          }

          // Cache client in module scope
          connectionCache = {
            client,
            accessToken,
            apiKey,
            baseUrl,
            authBaseUrl,
            workflowId,
            environment,
            sessionId,
          };

          // Update Recoil state with metadata
          setConnection((prev) => ({
            ...prev,
            accessToken,
            currentApiKey: apiKey,
            currentBaseUrl: baseUrl,
            currentSessionId: sessionId,
            isConnected: true,
            isConnecting: false,
            error: undefined,
          }));

          return client;
        } catch (error) {
          // Set error state and clear connecting state
          setConnection((prev) => ({
            ...prev,
            isConnecting: false,
            error: error instanceof Error ? error.message : String(error),
          }));

          throw error;
        }
      }

      // Return cached client
      return connectionCache!.client;
    },
    [settings, setConnection]
  );

  // Watch for settings changes and recreate client when connection settings change
  useEffect(() => {
    const currentSettings = getCurrentSettings(settings);
    const { apiKey, baseUrl, authBaseUrl, workflowId, environment } =
      currentSettings;

    // Only recreate client if we have an existing client and connection settings changed
    if (connectionCache && connection.isConnected) {
      const needsNewClient =
        connectionCache.apiKey !== apiKey ||
        connectionCache.baseUrl !== baseUrl ||
        connectionCache.authBaseUrl !== authBaseUrl ||
        connectionCache.workflowId !== workflowId ||
        connectionCache.environment !== environment;

      if (needsNewClient) {
        console.log(
          "useConnection: Connection settings changed, recreating client",
          {
            oldApiKey: connectionCache.apiKey,
            newApiKey: apiKey,
            oldBaseUrl: connectionCache.baseUrl,
            newBaseUrl: baseUrl,
            oldAuthBaseUrl: connectionCache.authBaseUrl,
            newAuthBaseUrl: authBaseUrl,
            oldWorkflowId: connectionCache.workflowId,
            newWorkflowId: workflowId,
            oldEnvironment: connectionCache.environment,
            newEnvironment: environment,
          }
        );

        // Force recreation of client with new settings
        getClient(true).catch((error) => {
          console.error(
            "Failed to recreate client after settings change:",
            error
          );
          // Error handling is already done in getClient()
        });
      }
    }
  }, [settings, connection.isConnected, getClient]);

  /**
   * Test connection credentials
   *
   * @description
   * Validates API key and endpoint by attempting to create a new SDK client.
   * Useful for testing credentials in settings dialogs.
   *
   * @returns {Promise<void>} Resolves if credentials are valid
   * @throws {Error} If credentials are invalid or connection fails
   */
  const createSession = useCallback(
    async (booleanForceNew: boolean = false): Promise<void> => {
      await getClient(booleanForceNew);
    },
    [getClient]
  );

  /**
   * Disconnect and cleanup connection
   *
   * @description
   * Closes active session, clears cache, and resets connection state.
   * Should be called on logout or when connection should be terminated.
   */
  const disconnect = useCallback(async (): Promise<void> => {
    // Clear stream connections (handled by individual hooks)
    // Note: We don't directly manage streams here

    if (connectionCache) {
      try {
        await AiolaClient.closeSession(connectionCache.accessToken, {
          apiKey: connectionCache.apiKey,
          authBaseUrl: connectionCache.authBaseUrl,
          workflowId: connectionCache.workflowId,
        });
      } catch {
        // Failed to close session - continue anyway
      }
      connectionCache = null;
    }

    setConnection({
      accessToken: null,
      isConnected: false,
      isStreaming: false,
      isConnecting: false,
      currentApiKey: "",
      currentBaseUrl: undefined,
      currentFlowId: undefined,
      currentSessionId: undefined,
      error: undefined,
    });
  }, [setConnection]);

  // Determine connection status based on current state
  const getConnectionStatus = () => {
    if (connection.error) {
      return {
        isOnline: false,
        status: "error" as const,
        reason: connection.error,
      };
    }

    const currentSettings = getCurrentSettings(settings);
    if (!currentSettings.apiKey || currentSettings.apiKey.trim().length === 0) {
      return {
        isOnline: false,
        status: "Offline" as const,
        reason: "No API key configured",
      };
    }

    if (connection.isConnecting) {
      return {
        isOnline: false,
        status: "Connecting" as const,
        reason: "Establishing connection...",
      };
    }

    if (connection.isConnected) {
      return {
        isOnline: true,
        status: "Ready" as const,
        reason: "Connected",
      };
    }

    // Has API key but not connected and not connecting - ready to connect
    return {
      isOnline: false,
      status: "Offline" as const,
      reason: "Ready to connect",
    };
  };

  const statusInfo = getConnectionStatus();

  /**
   * Update connection state (for use by STT/TTS hooks)
   */
  const updateConnectionState = useCallback(
    (updates: Partial<ConnectionState>) => {
      setConnection((prev) => ({
        ...prev,
        ...updates,
      }));
    },
    [setConnection]
  );

  const returnValue = {
    // State
    isConnected: connection.isConnected,
    sessionId: connection.currentSessionId,
    error: connection.error,
    isStreaming: connection.isStreaming,
    isConnecting: connection.isConnecting,
    currentFlowId: connection.currentFlowId,

    // Status information (compatible with useConnectionStatus)
    isOnline: statusInfo.isOnline,
    status: statusInfo.status,
    reason: statusInfo.reason,

    // Methods
    getClient,
    createSession,
    disconnect,
    updateConnectionState,
  };

  return returnValue;
}
