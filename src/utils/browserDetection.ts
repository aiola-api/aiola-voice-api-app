/**
 * Browser Detection Utility
 * Detects if the current browser is supported by the application
 */

/**
 * Checks if the current browser is supported
 * Supported browsers: ChatGPT-Atlas, Chrome, and Safari
 * @returns true if browser is supported, false otherwise
 */
export function isSupportedBrowser(): boolean {
  const userAgent = navigator.userAgent;

  // Check for ChatGPT-Atlas
  if (userAgent.includes("ChatGPT-Atlas")) {
    return true;
  }

  // Check for Chrome (but not Edge which also contains "Chrome" in user agent)
  if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) {
    return true;
  }

  // Check for Safari (but not Chrome-based browsers which also contain "Safari" in user agent)
  if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
    return true;
  }

  return false;
}

/**
 * Gets the name of the current browser
 * @returns Browser name or "Unknown"
 */
export function getBrowserName(): string {
  const userAgent = navigator.userAgent;

  if (userAgent.includes("ChatGPT-Atlas")) {
    return "ChatGPT-Atlas";
  }
  if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) {
    return "Chrome";
  }
  if (userAgent.includes("Firefox")) {
    return "Firefox";
  }
  if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
    return "Safari";
  }
  if (userAgent.includes("Edg")) {
    return "Edge";
  }

  return "Unknown";
}
