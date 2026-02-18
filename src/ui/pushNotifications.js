import { getToken, onMessage } from "firebase/messaging";
import { api } from "./api.js";
import { getFirebaseMessaging, isPushConfigured } from "../firebase.js";

let activeUnsubscribe = null;
let registeredToken = "";
let lastPushSetup = { enabled: false, reason: "not_started" };
const cleanEnv = (value) => String(value || "").trim().replace(/^['"]|['"]$/g, "");

const reportSetup = (result) => {
  lastPushSetup = result;
  try {
    window.__pushDebug = result;
  } catch {
    // no-op
  }
  return result;
};

const toSwUrlWithConfig = () => {
  const params = new URLSearchParams({
    apiKey: cleanEnv(import.meta.env.VITE_FIREBASE_API_KEY),
    authDomain: cleanEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
    projectId: cleanEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID),
    messagingSenderId: cleanEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
    appId: cleanEnv(import.meta.env.VITE_FIREBASE_APP_ID)
  });
  return `/firebase-messaging-sw.js?${params.toString()}`;
};

const ensureServiceWorker = async () => {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register(toSwUrlWithConfig(), { scope: "/" });
  } catch {
    return null;
  }
};

const showForegroundNotification = (payload) => {
  if (Notification.permission !== "granted") return;
  const title = payload?.notification?.title || "Our Tution";
  const body = payload?.notification?.body || "";
  if (!title && !body) return;
  try {
    const notification = new Notification(title, { body, icon: "/favicon.svg" });
    notification.onclick = () => {
      const target = payload?.data?.clickAction || "/notifications";
      window.open(target, "_blank", "noopener,noreferrer");
      notification.close();
    };
  } catch {
    // no-op
  }
};

export const setupPushForSession = async () => {
  if (!isPushConfigured()) return reportSetup({ enabled: false, reason: "missing_config" });
  if (!("Notification" in window)) return reportSetup({ enabled: false, reason: "no_notification_api" });
  if (Notification.permission === "denied") return reportSetup({ enabled: false, reason: "permission_denied" });

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
  if (permission !== "granted") return reportSetup({ enabled: false, reason: "permission_not_granted" });

  const vapidKey = cleanEnv(import.meta.env.VITE_FIREBASE_VAPID_KEY);
  if (!vapidKey) return reportSetup({ enabled: false, reason: "missing_vapid_key" });

  const messaging = await getFirebaseMessaging();
  if (!messaging) return reportSetup({ enabled: false, reason: "messaging_not_supported" });

  const serviceWorkerRegistration = await ensureServiceWorker();
  if (!serviceWorkerRegistration) return reportSetup({ enabled: false, reason: "service_worker_failed" });

  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration }).catch(() => "");
  if (!token) return reportSetup({ enabled: false, reason: "token_unavailable" });

  if (token !== registeredToken) {
    const registered = await api
      .post("/auth/push-token", { token }, { showGlobalLoader: false })
      .then(() => true)
      .catch(() => false);
    if (!registered) return reportSetup({ enabled: false, reason: "token_registration_failed" });
    registeredToken = token;
  }

  if (activeUnsubscribe) {
    activeUnsubscribe();
    activeUnsubscribe = null;
  }
  activeUnsubscribe = onMessage(messaging, (payload) => showForegroundNotification(payload));

  return reportSetup({ enabled: true, token });
};

export const teardownPushForSession = async () => {
  if (activeUnsubscribe) {
    activeUnsubscribe();
    activeUnsubscribe = null;
  }
  if (!registeredToken) return;
  const tokenToRemove = registeredToken;
  registeredToken = "";
  await api
    .delete("/auth/push-token", {
      data: { token: tokenToRemove },
      showGlobalLoader: false
    })
    .catch(() => {});
};

export const getPushDebugState = () => lastPushSetup;
