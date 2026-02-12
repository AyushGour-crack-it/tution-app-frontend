import { io } from "socket.io-client";

let socketInstance = null;

const resolveSocketBaseUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  return apiUrl.endsWith("/api") ? apiUrl.slice(0, -4) : apiUrl;
};

export const connectSocket = (token) => {
  if (!token) return null;
  if (socketInstance?.connected) return socketInstance;
  if (socketInstance && !socketInstance.connected) {
    socketInstance.auth = { token };
    socketInstance.connect();
    return socketInstance;
  }

  socketInstance = io(resolveSocketBaseUrl(), {
    transports: ["websocket", "polling"],
    autoConnect: true,
    auth: { token }
  });
  return socketInstance;
};

export const getSocket = () => socketInstance;

export const disconnectSocket = () => {
  if (!socketInstance) return;
  socketInstance.disconnect();
  socketInstance = null;
};
