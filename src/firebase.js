import { initializeApp } from "firebase/app";
import { getMessaging, isSupported } from "firebase/messaging";

const requiredConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

const hasFirebaseClientConfig = Object.values(requiredConfig).every(Boolean);
const app = hasFirebaseClientConfig ? initializeApp(requiredConfig) : null;

export const isPushConfigured = () => hasFirebaseClientConfig;
export const getFirebaseMessaging = async () => {
  if (!app) return null;
  const supported = await isSupported().catch(() => false);
  if (!supported) return null;
  return getMessaging(app);
};
