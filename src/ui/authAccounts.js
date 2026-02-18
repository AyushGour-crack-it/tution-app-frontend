const ACCOUNTS_KEY = "auth_accounts";

const safeParse = (value, fallback) => {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const accountKeyForUser = (user) => {
  if (!user) return "";
  if (user.id) return String(user.id);
  if (user._id) return String(user._id);
  if (user.email) return String(user.email).toLowerCase();
  return `${String(user.name || "user").toLowerCase()}_${String(user.role || "member").toLowerCase()}`;
};

export const getActiveAccountKey = () => {
  const raw = localStorage.getItem("auth_user");
  if (!raw) return "";
  const user = safeParse(raw, null);
  return accountKeyForUser(user);
};

export const getAuthAccounts = () => {
  const raw = localStorage.getItem(ACCOUNTS_KEY);
  const accounts = safeParse(raw || "[]", []);
  if (!Array.isArray(accounts)) return [];
  return accounts.filter((item) => item && item.token && item.user && item.accountKey);
};

export const saveAuthAccounts = (accounts) => {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts.slice(0, 20)));
};

export const setActiveAuthSession = ({ token, user }) => {
  if (!token || !user) return;
  localStorage.setItem("auth_token", token);
  localStorage.setItem("auth_user", JSON.stringify(user));

  const accountKey = accountKeyForUser(user);
  const nextEntry = {
    accountKey,
    token,
    user,
    lastUsedAt: new Date().toISOString()
  };
  const current = getAuthAccounts();
  const withoutCurrent = current.filter((item) => item.accountKey !== accountKey);
  saveAuthAccounts([nextEntry, ...withoutCurrent]);
};

export const switchActiveAuthAccount = (accountKey) => {
  const accounts = getAuthAccounts();
  const target = accounts.find((item) => item.accountKey === accountKey);
  if (!target) return null;
  setActiveAuthSession({ token: target.token, user: target.user });
  return target.user;
};

export const removeAuthAccount = (accountKey) => {
  const accounts = getAuthAccounts();
  const target = accounts.find((item) => item.accountKey === accountKey);
  if (!target) return;
  const next = accounts.filter((item) => item.accountKey !== accountKey);
  saveAuthAccounts(next);

  const activeRaw = localStorage.getItem("auth_user");
  const active = activeRaw ? safeParse(activeRaw, null) : null;
  const activeKey = accountKeyForUser(active);
  if (activeKey === accountKey) {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
  }
};

export const clearActiveSessionOnly = () => {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
};
