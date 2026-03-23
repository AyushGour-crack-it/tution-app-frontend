import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./ui/App.jsx";
import "sonner/dist/styles.css";
import { registerSW } from "virtual:pwa-register";

const updateSW = registerSW({
  onNeedRefresh() {
    // Optional: show UI to confirm reload
    if (confirm("New version is available. Update now?")) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.info("App is ready for offline usage.");
  }
});

const Toaster = React.lazy(() =>
  import("sonner").then((module) => ({ default: module.Toaster }))
);

const AppRoot = () => (
  <React.Suspense fallback={<div className="loading-skeleton">Loading app...</div>}>
    <App />
  </React.Suspense>
);

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AppRoot />
    <React.Suspense fallback={null}>
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          duration: 3200
        }}
      />
    </React.Suspense>
  </BrowserRouter>
);

