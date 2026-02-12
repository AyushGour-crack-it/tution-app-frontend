import React from "react";

let googleScriptPromise;

const loadGoogleScript = () => {
  if (googleScriptPromise) return googleScriptPromise;
  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Google script")), {
        once: true
      });
      if (window.google?.accounts?.id) resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google script"));
    document.head.appendChild(script);
  });
  return googleScriptPromise;
};

export default function GoogleAuthButton({
  onCredential,
  onError,
  text = "continue_with",
  disabled = false
}) {
  const containerRef = React.useRef(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  React.useEffect(() => {
    let active = true;
    if (!clientId || !containerRef.current || disabled) return undefined;
    loadGoogleScript()
      .then(() => {
        if (!active || !window.google?.accounts?.id || !containerRef.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (!response?.credential) {
              onError?.("Google sign-in failed.");
              return;
            }
            onCredential(response.credential);
          }
        });
        containerRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          text,
          width: 320
        });
      })
      .catch(() => {
        onError?.("Unable to load Google sign-in.");
      });
    return () => {
      active = false;
    };
  }, [clientId, disabled, onCredential, onError, text]);

  if (!clientId) {
    return <div className="auth-note">Google sign-in is not configured.</div>;
  }

  return <div className="google-auth-wrap" ref={containerRef} />;
}
