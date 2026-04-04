import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./ui/App.jsx";
import "sonner/dist/styles.css";
import { registerSW } from "virtual:pwa-register";

// Register custom service worker for offline functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Custom Service Worker registered:', registration);
      })
      .catch((error) => {
        console.log('Custom Service Worker registration failed:', error);
      });
  });
}

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
      if (!localStorage.getItem("update_handled")) {
        setUpdateAvailable(true);
      }
    },
    onOfflineReady() {
      console.info("App is ready for offline usage.");
    }
  });

  const handleRefresh = () => {
    localStorage.setItem("update_handled", "true");
    updateSW(true, true);
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

