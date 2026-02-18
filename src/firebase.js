import { initializeApp } from "firebase/app";
import { getMessaging, isSupported } from "firebase/messaging";

const cleanEnv = (value) => String(value || "").trim().replace(/^['"]|['"]$/g, "");

const requiredConfig = {
  apiKey: cleanEnv(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: cleanEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: cleanEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  messagingSenderId: cleanEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: cleanEnv(import.meta.env.VITE_FIREBASE_APP_ID)
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
