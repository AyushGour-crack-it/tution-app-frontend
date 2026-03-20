import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import App from "./ui/App.jsx";
import "./ui/styles.css";
import "sonner/dist/styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
    <Toaster
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        duration: 3200
      }}
    />
  </BrowserRouter>
);
