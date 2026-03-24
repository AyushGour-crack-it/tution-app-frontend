import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./ui/App.jsx";
import "sonner/dist/styles.css";
import { registerSW } from "virtual:pwa-register";

const UpdatePopup = ({ onRefresh }) => (
  <div className="update-popup-overlay" onClick={onRefresh}>
    <div className="update-popup-card" onClick={(e) => e.stopPropagation()}>
      <div className="update-popup-icon">👉</div>
      <h2 className="update-popup-title">New update available</h2>
      <p className="update-popup-text">Refresh to get the latest version</p>
      <button className="btn update-popup-btn" onClick={onRefresh}>
        Refresh Now
      </button>
    </div>
  </div>
);

const MainApp = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const updateSW = registerSW({
    onNeedRefresh() {
      setUpdateAvailable(true);
    },
    onOfflineReady() {
      console.info("App is ready for offline usage.");
    }
  });

  const handleRefresh = () => {
    updateSW(true);
    setUpdateAvailable(false);
  };

  const Toaster = React.lazy(() =>
    import("sonner").then((module) => ({ default: module.Toaster }))
  );

  const AppRoot = () => (
    <React.Suspense fallback={<div className="loading-skeleton">Loading app...</div>}>
      <App />
    </React.Suspense>
  );

  return (
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
      {updateAvailable && <UpdatePopup onRefresh={handleRefresh} />}
    </BrowserRouter>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<MainApp />);

