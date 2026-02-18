import axios from "axios";
import { getActiveAccountKey, removeAuthAccount } from "./authAccounts.js";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const api = axios.create({ baseURL });
let activeRequests = 0;
const activityListeners = new Set();

const notifyActivity = () => {
  const isActive = activeRequests > 0;
  activityListeners.forEach((listener) => {
    try {
      listener(isActive);
    } catch {
      // no-op
    }
  });
};

const beginRequest = (config) => {
  if (config?.showGlobalLoader === false) return config;
  activeRequests += 1;
  config.__countedForLoader = true;
  notifyActivity();
  return config;
};

const endRequest = (config) => {
  if (!config?.__countedForLoader) return;
  activeRequests = Math.max(0, activeRequests - 1);
  notifyActivity();
};

export const subscribeApiActivity = (listener) => {
  if (typeof listener !== "function") return () => {};
  activityListeners.add(listener);
  listener(activeRequests > 0);
  return () => activityListeners.delete(listener);
};

api.interceptors.request.use((config) => {
  beginRequest(config);
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    endRequest(response?.config);
    return response;
  },
  (error) => {
    endRequest(error?.config);
    const status = error?.response?.status;
    const hasToken = Boolean(localStorage.getItem("auth_token"));
    if (status === 401 && hasToken) {
      const activeKey = getActiveAccountKey();
      if (activeKey) {
        removeAuthAccount(activeKey);
      } else {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
      }
    }
    return Promise.reject(error);
  }
);

export const fetcher = (path) => api.get(path).then((res) => res.data);
