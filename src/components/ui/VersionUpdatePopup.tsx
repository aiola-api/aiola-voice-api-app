import { RotateCcw, XCircle, Rocket } from "lucide-react";
import "./VersionUpdatePopup.css";

interface VersionUpdatePopupProps {
  currentVersion: string;
  onClose: () => void;
}

export function VersionUpdatePopup({ currentVersion, onClose }: VersionUpdatePopupProps) {
  const handleClearCache = () => {
    localStorage.clear();
    localStorage.setItem("lastSeenVersion", currentVersion);
    localStorage.setItem("v0.3_prompt_shown", "true");
    window.location.reload();
  };

  const handleNotNow = () => {
    localStorage.setItem("lastSeenVersion", currentVersion);
    localStorage.setItem("v0.3_prompt_shown", "true");
    onClose();
  };

  return (
    <div className="version-popup-overlay">
      <div className="version-popup-card">
        <div className="version-popup-header">
          <div className="version-popup-icon">
            <Rocket size={32} />
          </div>
          <div className="version-popup-header-text">
            <h2 className="version-popup-title">New Version Available</h2>
            <span className="version-popup-badge">v{currentVersion}</span>
          </div>
        </div>

        <p className="version-popup-message">
          A new version of the Voice API App is now available! To ensure the best experience and access to the latest features, we recommend clearing your application cache.
        </p>

        <div className="version-popup-warning">
          <div className="version-popup-warning-icon">
            <XCircle size={16} />
          </div>
          <p>
            <strong>Note:</strong> Clearing the cache will reset all your settings, including API keys and environment configurations.
          </p>
        </div>

        <div className="version-popup-actions">
          <button className="version-popup-cta-button" onClick={handleClearCache}>
            <RotateCcw size={16} />
            <span>Clear Cache & Reload</span>
          </button>
          <button className="version-popup-secondary-button" onClick={handleNotNow}>
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
}
