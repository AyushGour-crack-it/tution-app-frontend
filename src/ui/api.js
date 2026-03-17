import axios from "axios";
import { getActiveAccountKey, removeAuthAccount } from "./authAccounts.js";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const DEFAULT_GET_CACHE_TTL_MS = 8000;

export const api = axios.create({ baseURL, timeout: 12000 });
const responseCache = new Map();
const SESSION_ERROR_MESSAGES = new Set(["invalid token", "session expired", "missing token"]);
const buildCacheKey = (config) => {
  const method = String(config?.method || "get").toLowerCase();
  const url = String(config?.url || "");
  const params = config?.params ? JSON.stringify(config.params) : "";
  const userScope = localStorage.getItem("auth_user") || "guest";
  return `${method}:${url}:${params}:${userScope}`;
};

api.interceptors.request.use((config) => {
  const method = String(config?.method || "get").toLowerCase();
  if (method !== "get") {
    responseCache.clear();
  }

  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (method === "get" && config?.cache !== false) {
    const key = buildCacheKey(config);
    const ttlMs = Math.max(0, Number(config?.cacheTtlMs ?? DEFAULT_GET_CACHE_TTL_MS));
    const cached = responseCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      config.adapter = async () => ({
        data: cached.data,
        status: 200,
        statusText: "OK",
        headers: cached.headers || {},
        config,
        request: null
      });
      return config;
    }
    config.__cacheKey = key;
    config.__cacheTtlMs = ttlMs;
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    const method = String(response?.config?.method || "get").toLowerCase();
    const cacheKey = response?.config?.__cacheKey;
    const cacheTtlMs = Number(response?.config?.__cacheTtlMs || 0);
    if (method === "get" && cacheKey && cacheTtlMs > 0) {
      responseCache.set(cacheKey, {
        data: response.data,
        headers: response.headers || {},
        expiresAt: Date.now() + cacheTtlMs
      });
    }
    return response;
  },
  (error) => {
    const status = error?.response?.status;
    const hasToken = Boolean(localStorage.getItem("auth_token"));
    const requestUrl = String(error?.config?.url || "");
    const responseMessage = String(error?.response?.data?.message || "").toLowerCase();
    const shouldClearSession =
      status === 401 &&
      hasToken &&
      (requestUrl.includes("/auth/me") || SESSION_ERROR_MESSAGES.has(responseMessage));

    if (shouldClearSession) {
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
