import { useState, useEffect } from "react";
import { RecoilRoot } from "recoil";
import { Chat } from "@/pages/Chat";
import { Toaster } from "@/components/ui/sonner";
import { SettingsInitializer, APP_VERSION } from "@/state/settings";
import { UnsupportedBrowserPopup } from "@/components/ui/UnsupportedBrowserPopup";
import { VersionUpdatePopup } from "@/components/ui/VersionUpdatePopup";
import { isSupportedBrowser } from "@/utils/browserDetection";

function App() {
  const [showUnsupportedBrowserPopup, setShowUnsupportedBrowserPopup] = useState(false);
  const [showVersionPopup, setShowVersionPopup] = useState(false);

  useEffect(() => {
    // Check if browser is supported on app load
    if (!isSupportedBrowser()) {
      setShowUnsupportedBrowserPopup(true);
    }

    // Version Update Detection
    const lastSeenVersion = localStorage.getItem("lastSeenVersion");
    const v03PromptShown = localStorage.getItem("v0.3_prompt_shown");

    if (lastSeenVersion !== APP_VERSION) {
      if (lastSeenVersion) {
        setShowVersionPopup(true);
      } else if (!v03PromptShown && APP_VERSION >= "0.3.0") {
        // One-time prompt for users moving into the versioned state
        setShowVersionPopup(true);
      } else {
        localStorage.setItem("lastSeenVersion", APP_VERSION);
      }
    }
  }, []);

  return (
    <RecoilRoot>
      <SettingsInitializer />
      <div className="min-h-screen" style={{ backgroundColor: "#d1d5db" }}>
        <Chat />
        <Toaster position="top-right" style={{ marginTop: "40px", marginRight: "50px" }} />
      </div>
      {showUnsupportedBrowserPopup && (
        <UnsupportedBrowserPopup onClose={() => setShowUnsupportedBrowserPopup(false)} />
      )}
      {showVersionPopup && (
        <VersionUpdatePopup 
          currentVersion={APP_VERSION} 
          onClose={() => setShowVersionPopup(false)} 
        />
      )}
    </RecoilRoot>
  );
}

export default App;
