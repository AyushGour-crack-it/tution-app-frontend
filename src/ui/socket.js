import { io } from "socket.io-client";

let socketInstance = null;
let socketStatus = "disconnected";
const statusListeners = new Set();

const resolveSocketBaseUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  return apiUrl.endsWith("/api") ? apiUrl.slice(0, -4) : apiUrl;
};

const publishStatus = (nextStatus) => {
  if (!nextStatus || socketStatus === nextStatus) return;
  socketStatus = nextStatus;
  statusListeners.forEach((listener) => {
    try {
      listener(socketStatus);
    } catch {
      // no-op
    }
  });
};

export const connectSocket = (token) => {
  if (!token) return null;
  if (socketInstance?.connected) return socketInstance;
  if (socketInstance && !socketInstance.connected) {
    publishStatus("reconnecting");
    socketInstance.auth = { token };
    socketInstance.connect();
    return socketInstance;
  }

  publishStatus("connecting");
  socketInstance = io(resolveSocketBaseUrl(), {
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 800,
    reconnectionDelayMax: 4000,
    auth: { token }
  });

  socketInstance.on("connect", () => publishStatus("connected"));
  socketInstance.on("disconnect", () => publishStatus("disconnected"));
  socketInstance.io.on("reconnect_attempt", () => publishStatus("reconnecting"));
  socketInstance.io.on("reconnect", () => publishStatus("connected"));
  socketInstance.io.on("error", () => publishStatus("reconnecting"));
  socketInstance.io.on("reconnect_error", () => publishStatus("reconnecting"));

  return socketInstance;
};

export const getSocket = () => socketInstance;
export const getSocketStatus = () => socketStatus;

export const subscribeSocketStatus = (listener) => {
  if (typeof listener !== "function") return () => {};
  statusListeners.add(listener);
  listener(socketStatus);
  return () => statusListeners.delete(listener);
};

export const disconnectSocket = () => {
  if (!socketInstance) return;
  socketInstance.disconnect();
  socketInstance = null;
  publishStatus("disconnected");
};
