import axios from "axios";
import { getActiveAccountKey, removeAuthAccount } from "./authAccounts.js";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const DEFAULT_GET_CACHE_TTL_MS = 30 * 1000; // 30 sec in-memory (fast)
const LOCAL_UI_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h persistent
const LOCAL_CACHE_PREFIX = "api-persistent:";

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

const buildLocalCacheKey = (key) => `${LOCAL_CACHE_PREFIX}${key}`;

const getLocalCache = (key) => {
  try {
    const raw = localStorage.getItem(buildLocalCacheKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.expiresAt || !parsed.data) return null;
    if (Date.now() > parsed.expiresAt) {
      localStorage.removeItem(buildLocalCacheKey(key));
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
};

const setLocalCache = (key, data, ttl = LOCAL_UI_CACHE_TTL_MS) => {
  try {
    localStorage.setItem(
      buildLocalCacheKey(key),
      JSON.stringify({ data, expiresAt: Date.now() + ttl })
    );
  } catch {
    // ignore quota/storage errors
  }
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
    const cachedMemory = responseCache.get(key);

    if (cachedMemory && cachedMemory.expiresAt > Date.now()) {
      config.adapter = async () => ({
        data: cachedMemory.data,
        status: 200,
        statusText: "OK",
        headers: cachedMemory.headers || {},
        config,
        request: null
      });
      return config;
    }

    const cachedLocal = getLocalCache(key);
    if (!navigator.onLine && cachedLocal != null) {
      config.adapter = async () => ({
        data: cachedLocal,
        status: 200,
        statusText: "OK",
        headers: {},
        config,
        request: null
      });
      return config;
    }

    config.__cacheKey = key;
    config.__cacheTtlMs = ttlMs;
    config.__localCacheKey = key;
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    const method = String(response?.config?.method || "get").toLowerCase();
    const cacheKey = response?.config?.__cacheKey;
    const cacheTtlMs = Number(response?.config?.__cacheTtlMs || 0);
    const localCacheKey = response?.config?.__localCacheKey;

    if (method === "get" && cacheKey && cacheTtlMs > 0) {
      responseCache.set(cacheKey, {
        data: response.data,
        headers: response.headers || {},
        expiresAt: Date.now() + cacheTtlMs
      });
    }

    if (method === "get" && localCacheKey) {
      setLocalCache(localCacheKey, response.data);
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
