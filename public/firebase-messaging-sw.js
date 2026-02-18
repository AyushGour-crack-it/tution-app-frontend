importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

const swUrl = new URL(self.location.href);
const config = {
  apiKey: swUrl.searchParams.get("apiKey") || "",
  authDomain: swUrl.searchParams.get("authDomain") || "",
  projectId: swUrl.searchParams.get("projectId") || "",
  messagingSenderId: swUrl.searchParams.get("messagingSenderId") || "",
  appId: swUrl.searchParams.get("appId") || ""
};

const hasConfig = Object.values(config).every(Boolean);
if (hasConfig) {
  firebase.initializeApp(config);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title = payload?.notification?.title || "Our Tution";
    const options = {
      body: payload?.notification?.body || "",
      icon: "/favicon.svg",
      data: {
        clickAction: payload?.data?.clickAction || "/notifications"
      }
    };
    self.registration.showNotification(title, options);
  });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const clickAction = event.notification?.data?.clickAction || "/notifications";
  event.waitUntil(clients.openWindow(clickAction));
});
