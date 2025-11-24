import { getBrowserName } from "@/utils/browserDetection";
import "./UnsupportedBrowserPopup.css";

interface UnsupportedBrowserPopupProps {
  onClose: () => void;
}

export function UnsupportedBrowserPopup({ onClose }: UnsupportedBrowserPopupProps) {
  const currentBrowser = getBrowserName();

  return (
    <div className="browser-popup-overlay" onClick={onClose}>
      <div className="browser-popup-card" onClick={(e) => e.stopPropagation()}>
        <div className="browser-popup-header">
          <div className="browser-popup-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="browser-popup-title">Unsupported Browser</h2>
        </div>

        <p className="browser-popup-message">
          This application requires a supported browser for optimal performance and functionality.
          Please switch to one of the supported browsers listed below.
        </p>

        <div className="browser-popup-supported-list">
          <h4>Supported Browsers:</h4>
          <ul>
            <li>ChatGPT-Atlas</li>
            <li>Chrome</li>
          </ul>
        </div>

        <button className="browser-popup-close-button" onClick={onClose}>
          Continue Anyway
        </button>

        {currentBrowser !== "Unknown" && (
          <p className="browser-popup-current-browser">
            Current browser: {currentBrowser}
          </p>
        )}
      </div>
    </div>
  );
}
