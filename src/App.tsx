import { RecoilRoot } from "recoil";
import { Chat } from "@/pages/Chat";
import { Toaster } from "@/components/ui/sonner";
import { SettingsInitializer } from "@/state/settings";

function App() {
  return (
    <RecoilRoot>
      <SettingsInitializer />
      <div className="min-h-screen" style={{ backgroundColor: "#d1d5db" }}>
        <Chat />
        <Toaster position="top-right" style={{ marginTop: "40px", marginRight: "50px" }} />
      </div>
    </RecoilRoot>
  );
}

export default App;
