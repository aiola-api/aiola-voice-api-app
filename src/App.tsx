import { useState, useEffect } from "react";
import { RecoilRoot } from "recoil";
import { Chat } from "@/pages/Chat";
import { Toaster } from "@/components/ui/sonner";
import { SettingsInitializer } from "@/state/settings";
import { UnsupportedBrowserPopup } from "@/components/ui/UnsupportedBrowserPopup";
import { isSupportedBrowser } from "@/utils/browserDetection";

function App() {
  const [showUnsupportedBrowserPopup, setShowUnsupportedBrowserPopup] = useState(false);

  useEffect(() => {
    // Check if browser is supported on app load
    if (!isSupportedBrowser()) {
      setShowUnsupportedBrowserPopup(true);
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
    </RecoilRoot>
  );
}

export default App;
