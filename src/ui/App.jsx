import React from "react";
import { Routes, Route, NavLink, Navigate, useNavigate, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import Classes from "./pages/Classes.jsx";
import Students from "./pages/Students.jsx";
import TeacherStudentProfile from "./pages/TeacherStudentProfile.jsx";
import Homework from "./pages/Homework.jsx";
import Syllabus from "./pages/Syllabus.jsx";
import Attendance from "./pages/Attendance.jsx";
import Fees from "./pages/Fees.jsx";
import Holidays from "./pages/Holidays.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import StudentPortal from "./pages/StudentPortal.jsx";
import Chat from "./pages/Chat.jsx";
import Profile from "./pages/Profile.jsx";
import Marks from "./pages/Marks.jsx";
import Notifications from "./pages/Notifications.jsx";
import Leaderboard from "./pages/Leaderboard.jsx";
import { api, subscribeApiActivity } from "./api.js";
import StudentDirectory from "./pages/StudentDirectory.jsx";
import StudentPublicProfile from "./pages/StudentPublicProfile.jsx";
import Badges from "./pages/Badges.jsx";
import BadgeRequests from "./pages/BadgeRequests.jsx";
import StudentAccessPending from "./pages/StudentAccessPending.jsx";
import QuizDashboard from "../features/quiz/Dashboard.jsx";
import LevelJourneyPage from "./pages/LevelJourneyPage.jsx";
import LevelUpOverlay from "./components/LevelUpOverlay.jsx";
import { LEVEL_UP_EVENT } from "./levelSystem.js";
import { setupPushForSession, teardownPushForSession } from "./pushNotifications.js";
import {
  clearActiveSessionOnly,
  getActiveAccountKey,
  getAuthAccounts,
  removeAuthAccount,
  setActiveAuthSession,
  switchActiveAuthAccount
} from "./authAccounts.js";
import {
  connectSocket,
  disconnectSocket,
  getSocketStatus,
  subscribeSocketStatus
} from "./socket.js";

const SECTION_EVENT_ROUTE_MAP = {
  "classes:updated": "/classes",
  "students:updated": "/students",
  "homework:updated": "/homework",
  "syllabus:updated": "/syllabus",
  "attendance:updated": "/attendance",
  "marks:updated": "/marks",
  "fee:updated": "/fees",
  "holidays:updated": "/holidays",
  "leaderboard:updated": "/leaderboard",
  "badges:updated": "/student/badges",
  "badge:request-updated": "/badge-requests"
};

const normalizeSectionPath = (pathname) => {
  if (pathname === "/student/homework") return "/homework";
  if (pathname === "/student/fees") return "/fees";
  if (pathname === "/student/students") return "/students";
  return pathname;
};

const inferSectionPathFromNotification = (item) => {
  const title = String(item?.title || "").toLowerCase();
  const message = String(item?.message || "").toLowerCase();
  const text = `${title} ${message}`;
  if (text.includes("badge")) return "/badge-requests";
  if (text.includes("fee") || text.includes("payment")) return "/fees";
  if (text.includes("homework")) return "/homework";
  if (text.includes("attendance")) return "/attendance";
  if (text.includes("mark")) return "/marks";
  if (text.includes("syllabus")) return "/syllabus";
  if (text.includes("holiday")) return "/holidays";
  if (text.includes("class")) return "/classes";
  if (text.includes("leaderboard")) return "/leaderboard";
  if (text.includes("student")) return "/students";
  return "";
};

const NavItem = ({ to, label, onNavigate, badgeCount = 0 }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `nav-link${isActive ? " nav-link-active" : ""}`
    }
    onClick={(event) => {
      onNavigate?.(event);
    }}
  >
    <span className="nav-link-label">{label}</span>
    {badgeCount > 0 ? (
      <span className="nav-badge">{badgeCount > 99 ? "99+" : badgeCount}</span>
    ) : null}
  </NavLink>
);

const getSession = () => {
  const raw = localStorage.getItem("auth_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = React.useState(() => getSession());
  const [authReady, setAuthReady] = React.useState(false);
  const [theme, setTheme] = React.useState(
    () => localStorage.getItem("ui_theme") || "light"
  );
  const [accounts, setAccounts] = React.useState(() => getAuthAccounts());
  const [navOpen, setNavOpen] = React.useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = React.useState(0);
  const [unreadChatCount, setUnreadChatCount] = React.useState(0);
  const [routeLoading, setRouteLoading] = React.useState(false);
  const [apiLoading, setApiLoading] = React.useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = React.useState(false);
  const [badgeUnlockQueue, setBadgeUnlockQueue] = React.useState([]);
  const [feePaymentQueue, setFeePaymentQueue] = React.useState([]);
  const [rewardPopupQueue, setRewardPopupQueue] = React.useState([]);
  const [levelUpPayload, setLevelUpPayload] = React.useState(null);
  const [socketStatus, setSocketStatus] = React.useState(() => getSocketStatus());
  const [sectionUnread, setSectionUnread] = React.useState({});
  const locationPathRef = React.useRef(location.pathname);
  const notificationSeenKey = React.useMemo(
    () => (user?.id ? `notifications_last_seen_${user.id}` : ""),
    [user?.id]
  );
  const chatSeenKey = React.useMemo(
    () => (user?.id ? `chat_last_seen_${user.id}` : ""),
    [user?.id]
  );
  const badgePopupSeenKey = React.useMemo(
    () => (user?.id ? `badge_unlock_popup_seen_${user.id}` : ""),
    [user?.id]
  );
  const rewardPopupSeenKey = React.useMemo(
    () => (user?.id ? `reward_popup_seen_${user.id}` : ""),
    [user?.id]
  );
  const activeBadgeUnlock = badgeUnlockQueue.length ? badgeUnlockQueue[0] : null;
  const activeFeePayment = feePaymentQueue.length ? feePaymentQueue[0] : null;
  const activeRewardPopup = rewardPopupQueue.length ? rewardPopupQueue[0] : null;
  const closeMobileNavOnNavigate = React.useCallback(() => {
    if (window.matchMedia("(max-width: 1024px)").matches) {
      setNavOpen(false);
    }
  }, []);
  const markNotificationsSeen = React.useCallback(() => {
    if (!notificationSeenKey) return;
    localStorage.setItem(notificationSeenKey, new Date().toISOString());
    setUnreadNotificationCount(0);
  }, [notificationSeenKey]);
  const markChatSeen = React.useCallback(() => {
    if (!chatSeenKey) return;
    const prevSeen = localStorage.getItem(chatSeenKey);
    if (prevSeen) {
      localStorage.setItem(`chat_prev_seen_${user?.id || "guest"}`, prevSeen);
    }
    localStorage.setItem(chatSeenKey, new Date().toISOString());
    setUnreadChatCount(0);
  }, [chatSeenKey, user?.id]);

  const bumpSectionIndicator = React.useCallback((path) => {
    if (!path) return;
    const currentPath = normalizeSectionPath(locationPathRef.current || "");
    if (currentPath === path || locationPathRef.current === path) return;
    setSectionUnread((prev) => ({
      ...prev,
      [path]: Math.min(99, Number(prev[path] || 0) + 1)
    }));
  }, []);

  const switchAccount = React.useCallback(
    async (accountKey) => {
      if (!accountKey) return;
      const currentKey = getActiveAccountKey();
      if (currentKey === accountKey) return;
      await teardownPushForSession();
      disconnectSocket();
      const nextUser = switchActiveAuthAccount(accountKey);
      setAccounts(getAuthAccounts());
      if (!nextUser) {
        setUser(null);
        navigate("/login");
        return;
      }
      setUser(nextUser);
      navigate(nextUser.role === "teacher" ? "/" : "/student");
    },
    [navigate]
  );

  const addAnotherAccount = React.useCallback(async () => {
    await teardownPushForSession();
    disconnectSocket();
    clearActiveSessionOnly();
    setUser(null);
    navigate("/login");
  }, [navigate]);

  const logout = async () => {
    await teardownPushForSession();
    disconnectSocket();
    const activeKey = getActiveAccountKey();
    if (activeKey) {
      removeAuthAccount(activeKey);
    } else {
      clearActiveSessionOnly();
    }
    setAccounts(getAuthAccounts());
    setUser(null);
    navigate("/login");
  };

  const refreshCurrentUser = React.useCallback(async (overrideUser = null) => {
    if (overrideUser) {
      const token = localStorage.getItem("auth_token");
      if (token) {
        setActiveAuthSession({ token, user: overrideUser });
      } else {
        localStorage.setItem("auth_user", JSON.stringify(overrideUser));
      }
      setAccounts(getAuthAccounts());
      setUser(overrideUser);
      return;
    }
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const fresh = await api.get("/auth/me", { showGlobalLoader: false }).then((res) => res?.data?.user || null);
      if (!fresh) return;
      const token = localStorage.getItem("auth_token");
      if (token) {
        setActiveAuthSession({ token, user: fresh });
      } else {
        localStorage.setItem("auth_user", JSON.stringify(fresh));
      }
      setAccounts(getAuthAccounts());
      setUser(fresh);
    } catch {
      // no-op
    }
  }, []);

  React.useEffect(() => {
    locationPathRef.current = location.pathname;
  }, [location.pathname]);

  React.useEffect(() => {
    setSectionUnread({});
  }, [user?.id, user?.role]);

  React.useEffect(() => {
    setAccounts(getAuthAccounts());
  }, [user?.id]);

  React.useEffect(() => {
    const handler = (event) => {
      const detail = event?.detail || {};
      setLevelUpPayload({
        oldLevel: Number(detail.oldLevel || 1),
        newLevel: Number(detail.newLevel || 1),
        xpGained: Number(detail.xpGained || 0),
        badgeUnlocked: detail.badgeUnlocked || null
      });
    };
    window.addEventListener(LEVEL_UP_EVENT, handler);
    return () => window.removeEventListener(LEVEL_UP_EVENT, handler);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem("auth_token");
    const timeoutId = setTimeout(() => {
      if (!cancelled) setAuthReady(true);
    }, 7000);

    if (!token) {
      clearTimeout(timeoutId);
      setAuthReady(true);
      return;
    }

    api
      .get("/auth/me")
      .then((res) => {
        if (cancelled) return;
        const freshUser = res?.data?.user || null;
        if (freshUser) {
          const currentToken = localStorage.getItem("auth_token");
          if (currentToken) {
            setActiveAuthSession({ token: currentToken, user: freshUser });
            setAccounts(getAuthAccounts());
          } else {
            localStorage.setItem("auth_user", JSON.stringify(freshUser));
          }
          setUser(freshUser);
        } else {
          clearActiveSessionOnly();
          setUser(null);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        const status = error?.response?.status;
        if (status === 401 || status === 403) {
          clearActiveSessionOnly();
          setUser(null);
          return;
        }
        // Keep existing local session on transient backend/network failures.
        const existingSession = getSession();
        if (existingSession) {
          setUser(existingSession);
        }
      })
      .finally(() => {
        if (!cancelled) {
          clearTimeout(timeoutId);
          setAuthReady(true);
        }
      });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, []);

  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("ui_theme", theme);
  }, [theme]);

  React.useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  React.useEffect(() => {
    setRouteLoading(true);
    const timeoutId = setTimeout(() => setRouteLoading(false), 240);
    return () => clearTimeout(timeoutId);
  }, [location.pathname]);

  React.useEffect(() => {
    let offTimer = null;
    const unsubscribe = subscribeApiActivity((active) => {
      if (active) {
        if (offTimer) {
          clearTimeout(offTimer);
          offTimer = null;
        }
        setApiLoading(true);
        return;
      }
      offTimer = setTimeout(() => setApiLoading(false), 150);
    });
    return () => {
      if (offTimer) clearTimeout(offTimer);
      unsubscribe();
    };
  }, []);

  React.useEffect(() => {
    const sessionUser = getSession();
    if (sessionUser && !user) {
      setAccounts(getAuthAccounts());
      setUser(sessionUser);
      return;
    }
    if (!sessionUser && !localStorage.getItem("auth_token") && user) {
      setUser(null);
    }
  }, [location.pathname, user]);

  React.useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!user?.id || !token) return;
    setupPushForSession()
      .then((result) => {
        if (!result?.enabled) {
          // eslint-disable-next-line no-console
          console.warn("Push notifications disabled:", result?.reason || "unknown");
        }
      })
      .catch(() => {
        // eslint-disable-next-line no-console
        console.warn("Push notifications setup failed");
      });
  }, [user?.id]);

  React.useEffect(() => {
    if (!user?.id || user?.role !== "student") return;
    api
      .post("/auth/daily-xp", {}, { showGlobalLoader: false })
      .then(() => {})
      .catch(() => {});
  }, [user?.id, user?.role]);

  React.useEffect(() => {
    if (user?.id) return;
    teardownPushForSession().catch(() => {});
  }, [user?.id]);

  React.useEffect(() => {
    if (!user?.id) return undefined;
    let cancelled = false;

    const loadUnreadCount = async () => {
      try {
        const items = await api
          .get("/notifications", { showGlobalLoader: false })
          .then((res) => res.data || []);
        if (cancelled) return;
        const existingSeen = localStorage.getItem(notificationSeenKey);
        if (!existingSeen) {
          localStorage.setItem(notificationSeenKey, new Date().toISOString());
          setUnreadNotificationCount(0);
          return;
        }
        const seenTime = new Date(existingSeen).getTime();
        const freshCount = items.filter((item) => {
          const createdAt = item?.createdAt ? new Date(item.createdAt).getTime() : 0;
          return createdAt > seenTime;
        }).length;
        setUnreadNotificationCount(freshCount);

        if (badgePopupSeenKey) {
          let seenIds = [];
          try {
            const raw = localStorage.getItem(badgePopupSeenKey);
            seenIds = raw ? JSON.parse(raw) : [];
          } catch {
            seenIds = [];
          }
          const seenSet = new Set(Array.isArray(seenIds) ? seenIds : []);
          const unlockEvents = items
            .filter(
              (item) =>
                item?.title === "Badge Approved" &&
                item?._id &&
                !seenSet.has(item._id)
            )
            .map((item) => {
              const rawMessage = String(item?.message || "");
              const match = rawMessage.match(/You unlocked "(.+)" \(\+(\d+)\s*XP\)\./i);
              return {
                id: item._id,
                badgeName: match?.[1] || "New Badge",
                xpValue: Number(match?.[2]) || 0,
                message: rawMessage
              };
            });

          if (unlockEvents.length) {
            setBadgeUnlockQueue((prev) => {
              const existingIds = new Set(prev.map((entry) => entry.id));
              const freshEntries = unlockEvents.filter((entry) => !existingIds.has(entry.id));
              return freshEntries.length ? [...prev, ...freshEntries] : prev;
            });
            const merged = [...seenSet, ...unlockEvents.map((entry) => entry.id)];
            localStorage.setItem(badgePopupSeenKey, JSON.stringify(merged.slice(-200)));
          }
        }

        if (user?.role === "teacher") {
          const feeSeenKey = `fee_payment_popup_seen_${user.id}`;
          let seenFeeIds = [];
          try {
            const raw = localStorage.getItem(feeSeenKey);
            seenFeeIds = raw ? JSON.parse(raw) : [];
          } catch {
            seenFeeIds = [];
          }
          const seenFeeSet = new Set(Array.isArray(seenFeeIds) ? seenFeeIds : []);
          const feeEvents = items
            .filter(
              (item) =>
                item?.title === "Fee Received" &&
                item?._id &&
                !seenFeeSet.has(item._id)
            )
            .map((item) => ({
              id: item._id,
              title: item.title,
              message: String(item?.message || ""),
              createdAt: item?.createdAt || null
            }));

          if (feeEvents.length) {
            setFeePaymentQueue((prev) => {
              const existingIds = new Set(prev.map((entry) => entry.id));
              const freshEntries = feeEvents.filter((entry) => !existingIds.has(entry.id));
              return freshEntries.length ? [...prev, ...freshEntries] : prev;
            });
            const merged = [...seenFeeSet, ...feeEvents.map((entry) => entry.id)];
            localStorage.setItem(feeSeenKey, JSON.stringify(merged.slice(-200)));
          }
        }

        if (rewardPopupSeenKey && user?.role === "student") {
          let seenRewardIds = [];
          try {
            const raw = localStorage.getItem(rewardPopupSeenKey);
            seenRewardIds = raw ? JSON.parse(raw) : [];
          } catch {
            seenRewardIds = [];
          }
          const seenRewardSet = new Set(Array.isArray(seenRewardIds) ? seenRewardIds : []);
          const rewardEvents = items
            .filter(
              (item) =>
                item?._id &&
                !seenRewardSet.has(item._id) &&
                (item?.title === "Payment Received" ||
                  item?.title === "Daily XP Bonus" ||
                  item?.title === "Birthday XP Gift" ||
                  item?.title === "Offline Payment Approved")
            )
            .map((item) => ({
              id: item._id,
              title: String(item?.title || "XP Update"),
              message: String(item?.message || "")
            }));

          if (rewardEvents.length) {
            setRewardPopupQueue((prev) => {
              const existingIds = new Set(prev.map((entry) => entry.id));
              const freshEntries = rewardEvents.filter((entry) => !existingIds.has(entry.id));
              return freshEntries.length ? [...prev, ...freshEntries] : prev;
            });
            localStorage.setItem(
              rewardPopupSeenKey,
              JSON.stringify([...seenRewardSet, ...rewardEvents.map((entry) => entry.id)].slice(-300))
            );
          }
        }
      } catch {
        if (!cancelled) setUnreadNotificationCount(0);
      }
    };

    loadUnreadCount();
    const intervalId = setInterval(loadUnreadCount, 30000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [user?.id, user?.role, location.pathname, notificationSeenKey, badgePopupSeenKey, rewardPopupSeenKey]);

  React.useEffect(() => {
    if (location.pathname === "/notifications") {
      markNotificationsSeen();
    }
  }, [location.pathname, markNotificationsSeen]);

  React.useEffect(() => {
    if (!location.pathname) return;
    const sectionPath = normalizeSectionPath(location.pathname);
    setSectionUnread((prev) => {
      if (!prev[sectionPath] && !prev[location.pathname]) return prev;
      const next = { ...prev };
      delete next[sectionPath];
      delete next[location.pathname];
      return next;
    });
  }, [location.pathname]);

  React.useEffect(() => {
    if (!user?.id) return undefined;
    let cancelled = false;

    const loadUnreadChat = async () => {
      try {
        const items = await api
          .get("/chat/messages", { showGlobalLoader: false })
          .then((res) => res.data || []);
        if (cancelled) return;
        const existingSeen = localStorage.getItem(chatSeenKey);
        if (!existingSeen) {
          localStorage.setItem(chatSeenKey, new Date().toISOString());
          setUnreadChatCount(0);
          return;
        }
        const seenTime = new Date(existingSeen).getTime();
        const freshCount = items.filter((item) => {
          const createdAt = item?.createdAt ? new Date(item.createdAt).getTime() : 0;
          const senderId = String(item?.senderId || "");
          return createdAt > seenTime && senderId !== String(user.id || "");
        }).length;
        setUnreadChatCount(freshCount);
      } catch {
        if (!cancelled) setUnreadChatCount(0);
      }
    };

    loadUnreadChat();
    const intervalId = setInterval(loadUnreadChat, 30000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [user?.id, user?.role, chatSeenKey, location.pathname]);

  React.useEffect(() => {
    const unsubscribe = subscribeSocketStatus((status) => setSocketStatus(status));
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    if (location.pathname === "/chat") {
      markChatSeen();
    }
  }, [location.pathname, markChatSeen]);

  React.useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!user?.id || !token) {
      disconnectSocket();
      return undefined;
    }
    const socket = connectSocket(token);
    if (!socket) return undefined;

    const syncUnreadCounters = async () => {
      try {
        const [notifications, chatItems] = await Promise.all([
          api.get("/notifications", { showGlobalLoader: false }).then((res) => res.data || []),
          api.get("/chat/messages", { showGlobalLoader: false }).then((res) => res.data || [])
        ]);

        const seenNotification = localStorage.getItem(notificationSeenKey);
        const notificationSeenAt = seenNotification ? new Date(seenNotification).getTime() : Date.now();
        const nextNotificationCount = notifications.filter((item) => {
          const createdAt = item?.createdAt ? new Date(item.createdAt).getTime() : 0;
          return createdAt > notificationSeenAt;
        }).length;
        if (locationPathRef.current !== "/notifications") {
          setUnreadNotificationCount(nextNotificationCount);
        }

        const seenChat = localStorage.getItem(chatSeenKey);
        const chatSeenAt = seenChat ? new Date(seenChat).getTime() : Date.now();
        const nextChatCount = chatItems.filter((item) => {
          const createdAt = item?.createdAt ? new Date(item.createdAt).getTime() : 0;
          const senderId = String(item?.senderId || "");
          return createdAt > chatSeenAt && senderId !== String(user.id || "");
        }).length;
        if (locationPathRef.current !== "/chat") {
          setUnreadChatCount(nextChatCount);
        }
      } catch {
        // no-op on transient sync errors
      }
    };

    const onChatNew = (message) => {
      const senderId = String(message?.senderId || "");
      if (senderId === String(user.id || "")) return;
      if (locationPathRef.current === "/chat") return;
      setUnreadChatCount((prev) => prev + 1);
    };

    const onNotificationNew = (item) => {
      if (item?._id && badgePopupSeenKey && item?.title === "Badge Approved") {
        let seenIds = [];
        try {
          const raw = localStorage.getItem(badgePopupSeenKey);
          seenIds = raw ? JSON.parse(raw) : [];
        } catch {
          seenIds = [];
        }
        if (!seenIds.includes(item._id)) {
          const rawMessage = String(item?.message || "");
          const match = rawMessage.match(/You unlocked "(.+)" \(\+(\d+)\s*XP\)\./i);
          const unlockEvent = {
            id: item._id,
            badgeName: match?.[1] || "New Badge",
            xpValue: Number(match?.[2]) || 0,
            message: rawMessage
          };
          setBadgeUnlockQueue((prev) => {
            if (prev.some((entry) => entry.id === unlockEvent.id)) return prev;
            return [...prev, unlockEvent];
          });
          localStorage.setItem(
            badgePopupSeenKey,
            JSON.stringify([...seenIds, item._id].slice(-200))
          );
        }
      }

      if (item?._id && user?.role === "teacher" && item?.title === "Fee Received") {
        const feeSeenKey = `fee_payment_popup_seen_${user.id}`;
        let seenFeeIds = [];
        try {
          const raw = localStorage.getItem(feeSeenKey);
          seenFeeIds = raw ? JSON.parse(raw) : [];
        } catch {
          seenFeeIds = [];
        }
        if (!seenFeeIds.includes(item._id)) {
          const feeEvent = {
            id: item._id,
            title: item.title,
            message: String(item?.message || ""),
            createdAt: item?.createdAt || null
          };
          setFeePaymentQueue((prev) => {
            if (prev.some((entry) => entry.id === feeEvent.id)) return prev;
            return [...prev, feeEvent];
          });
          localStorage.setItem(
            feeSeenKey,
            JSON.stringify([...seenFeeIds, item._id].slice(-200))
          );
        }
      }

      if (
        item?._id &&
        rewardPopupSeenKey &&
        user?.role === "student" &&
        (item?.title === "Payment Received" ||
          item?.title === "Daily XP Bonus" ||
          item?.title === "Birthday XP Gift" ||
          item?.title === "Offline Payment Approved")
      ) {
        let seenRewardIds = [];
        try {
          const raw = localStorage.getItem(rewardPopupSeenKey);
          seenRewardIds = raw ? JSON.parse(raw) : [];
        } catch {
          seenRewardIds = [];
        }
        if (!seenRewardIds.includes(item._id)) {
          const rewardEvent = {
            id: item._id,
            title: String(item?.title || "XP Update"),
            message: String(item?.message || "")
          };
          setRewardPopupQueue((prev) => {
            if (prev.some((entry) => entry.id === rewardEvent.id)) return prev;
            return [...prev, rewardEvent];
          });
          localStorage.setItem(
            rewardPopupSeenKey,
            JSON.stringify([...seenRewardIds, item._id].slice(-300))
          );
        }
      }

      const inferredPath = inferSectionPathFromNotification(item);
      if (inferredPath) {
        if (inferredPath === "/badge-requests") {
          const targetPath = user?.role === "teacher" ? "/badge-requests" : "/student/badges";
          bumpSectionIndicator(targetPath);
        } else {
          bumpSectionIndicator(inferredPath);
        }
      }

      if (locationPathRef.current === "/notifications") return;
      setUnreadNotificationCount((prev) => prev + 1);
    };

    const onSectionEvent = (eventName) => {
      const mappedPath = SECTION_EVENT_ROUTE_MAP[eventName];
      if (!mappedPath) return;

      if (eventName === "badge:request-updated") {
        const targetPath = user?.role === "teacher" ? "/badge-requests" : "/student/badges";
        bumpSectionIndicator(targetPath);
        return;
      }

      if (eventName === "badges:updated") {
        const targetPath = user?.role === "teacher" ? "/badge-requests" : "/student/badges";
        bumpSectionIndicator(targetPath);
        return;
      }

      bumpSectionIndicator(mappedPath);
    };

    const sectionEvents = Object.keys(SECTION_EVENT_ROUTE_MAP);
    const sectionHandlers = new Map();
    sectionEvents.forEach((eventName) => {
      const handler = () => onSectionEvent(eventName);
      sectionHandlers.set(eventName, handler);
      socket.on(eventName, handler);
    });

    socket.on("chat:new", onChatNew);
    socket.on("notification:new", onNotificationNew);
    socket.on("connect", syncUnreadCounters);
    syncUnreadCounters();

    return () => {
      sectionEvents.forEach((eventName) => {
        const handler = sectionHandlers.get(eventName);
        if (handler) socket.off(eventName, handler);
      });
      socket.off("chat:new", onChatNew);
      socket.off("notification:new", onNotificationNew);
      socket.off("connect", syncUnreadCounters);
    };
  }, [
    user?.id,
    user?.role,
    badgePopupSeenKey,
    notificationSeenKey,
    chatSeenKey,
    rewardPopupSeenKey,
    bumpSectionIndicator
  ]);

  React.useEffect(() => {
    if (!user) return;
    const pending = localStorage.getItem("welcome_popup_pending");
    if (pending === "1") {
      setShowWelcomePopup(true);
      localStorage.removeItem("welcome_popup_pending");
    }
  }, [user]);

  if (!authReady) {
    return (
      <div className="auth-shell">
        <div className="card auth-card">
          <h1 className="page-title">Loading your session...</h1>
          <p className="page-subtitle">Please wait.</p>
        </div>
      </div>
    );
  }

  if (
    !user &&
    (location.pathname === "/login" ||
      location.pathname === "/register" ||
      location.pathname === "/forgot")
  ) {
    return (
      <>
        {routeLoading || apiLoading ? (
          <div className="global-loading-overlay">
            <div className="global-loading-spinner" />
          </div>
        ) : null}
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot" element={<ForgotPassword />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "student" && user.studentApprovalStatus && user.studentApprovalStatus !== "approved") {
    return <StudentAccessPending user={user} onRefresh={refreshCurrentUser} onLogout={logout} />;
  }

  return (
    <div className="app-shell">
      {routeLoading || apiLoading ? (
        <div className="global-loading-overlay">
          <div className="global-loading-spinner" />
        </div>
      ) : null}
      {levelUpPayload ? (
        <LevelUpOverlay data={levelUpPayload} onDone={() => setLevelUpPayload(null)} />
      ) : null}
      {activeFeePayment ? (
        <div
          className="fee-alert-popup-overlay"
          onClick={() => setFeePaymentQueue((prev) => prev.slice(1))}
        >
          <div
            className="fee-alert-popup-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="fee-alert-popup-pill">Payment Received</div>
            <h2 className="fee-alert-popup-title">New Fee Payment</h2>
            <p className="fee-alert-popup-text">{activeFeePayment.message}</p>
            <div className="fee-alert-popup-date">
              {activeFeePayment.createdAt
                ? new Date(activeFeePayment.createdAt).toLocaleString()
                : ""}
            </div>
            <button
              className="btn"
              type="button"
              onClick={() => setFeePaymentQueue((prev) => prev.slice(1))}
            >
              Got It
            </button>
          </div>
        </div>
      ) : null}
      {activeBadgeUnlock ? (
        <div
          className="badge-unlock-popup-overlay"
          onClick={() => setBadgeUnlockQueue((prev) => prev.slice(1))}
        >
          <div
            className="badge-unlock-popup-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="badge-unlock-popup-pill">Badge Unlocked</div>
            <h2 className="badge-unlock-popup-title">
              You Unlocked <span>{activeBadgeUnlock.badgeName}</span>
            </h2>
            <p className="badge-unlock-popup-text">
              Massive progress. Keep this streak alive.
            </p>
            <div className="badge-unlock-popup-xp">+{activeBadgeUnlock.xpValue} XP</div>
            <button
              className="btn"
              type="button"
              onClick={() => setBadgeUnlockQueue((prev) => prev.slice(1))}
            >
              Awesome
            </button>
          </div>
        </div>
      ) : null}
      {activeRewardPopup ? (
        <div
          className="fee-success-popup-overlay"
          onClick={() => setRewardPopupQueue((prev) => prev.slice(1))}
        >
          <div
            className="fee-success-popup-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="fee-success-popup-pill">{activeRewardPopup.title}</div>
            <h2 className="fee-success-popup-title">Your progress was updated</h2>
            <p className="fee-success-popup-text">{activeRewardPopup.message}</p>
            <button
              className="btn"
              type="button"
              onClick={() => setRewardPopupQueue((prev) => prev.slice(1))}
            >
              Nice
            </button>
          </div>
        </div>
      ) : null}
      {showWelcomePopup ? (
        <div className="welcome-popup-overlay" onClick={() => setShowWelcomePopup(false)}>
          <div className="welcome-popup-card" onClick={(event) => event.stopPropagation()}>
            <div className="welcome-popup-badge">New Session Ready</div>
            <h2 className="welcome-popup-title">
              Welcome to <span className="welcome-popup-brand">Our Tution</span> Arena
            </h2>
            <p className="welcome-popup-text">Use larger screens for seamless experience.</p>
            <p className="welcome-popup-subtext">
              Track classes, badges, performance, and progress in one premium workspace.
            </p>
            <button className="btn" type="button" onClick={() => setShowWelcomePopup(false)}>
              Continue
            </button>
          </div>
        </div>
      ) : null}
      <button
        className="mobile-nav-toggle"
        type="button"
        onClick={() => setNavOpen((prev) => !prev)}
      >
        {navOpen ? "Close" : "Menu"}
      </button>
      {navOpen ? <div className="mobile-nav-overlay" onClick={() => setNavOpen(false)} /> : null}
      <aside className={`sidebar${navOpen ? " sidebar-open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">OT</span>
          <div>
            <div className="brand-title">Our Tution</div>
            <div className="brand-subtitle">Learning Workspace</div>
          </div>
        </div>
        <div className={`socket-status socket-status-${socketStatus}`}>
          {socketStatus === "connected"
            ? "Live"
            : socketStatus === "reconnecting" || socketStatus === "connecting"
              ? "Reconnecting..."
              : "Offline"}
        </div>
        {user?.role === "teacher" ? (
          <nav className="nav">
            <NavItem to="/" label="Overview" onNavigate={closeMobileNavOnNavigate} />
            <NavItem to="/classes" label="Classes" onNavigate={closeMobileNavOnNavigate} badgeCount={sectionUnread["/classes"] || 0} />
            <NavItem to="/students" label="Students" onNavigate={closeMobileNavOnNavigate} badgeCount={sectionUnread["/students"] || 0} />
            <NavItem to="/homework" label="Homework" onNavigate={closeMobileNavOnNavigate} badgeCount={sectionUnread["/homework"] || 0} />
            <NavItem to="/syllabus" label="Syllabus" onNavigate={closeMobileNavOnNavigate} badgeCount={sectionUnread["/syllabus"] || 0} />
            <NavItem to="/attendance" label="Attendance" onNavigate={closeMobileNavOnNavigate} badgeCount={sectionUnread["/attendance"] || 0} />
            <NavItem to="/marks" label="Marks" onNavigate={closeMobileNavOnNavigate} badgeCount={sectionUnread["/marks"] || 0} />
            <NavItem to="/fees" label="Fees" onNavigate={closeMobileNavOnNavigate} badgeCount={sectionUnread["/fees"] || 0} />
            <NavItem to="/leaderboard" label="Leaderboard" onNavigate={closeMobileNavOnNavigate} badgeCount={sectionUnread["/leaderboard"] || 0} />
            <NavItem to="/badge-requests" label="Badge Requests" onNavigate={closeMobileNavOnNavigate} badgeCount={sectionUnread["/badge-requests"] || 0} />
            <NavItem to="/holidays" label="Holidays" onNavigate={closeMobileNavOnNavigate} badgeCount={sectionUnread["/holidays"] || 0} />
            <NavItem
              to="/chat"
              label="Chat"
              onNavigate={() => {
                markChatSeen();
                closeMobileNavOnNavigate();
              }}
              badgeCount={unreadChatCount}
            />
            <NavItem
              to="/notifications"
              label="Notifications"
              onNavigate={() => {
                markNotificationsSeen();
                closeMobileNavOnNavigate();
              }}
              badgeCount={unreadNotificationCount}
            />
            <NavItem to="/profile" label="Profile" onNavigate={closeMobileNavOnNavigate} />
          </nav>
        ) : (
          <nav className="nav">
            <NavItem to="/student" label="My Dashboard" onNavigate={closeMobileNavOnNavigate} />
            <NavItem to="/student/homework" label="My Homework" onNavigate={closeMobileNavOnNavigate} badgeCount={sectionUnread["/homework"] || 0} />
            <NavItem to="/student/fees" label="My Fees" onNavigate={closeMobileNavOnNavigate} badgeCount={sectionUnread["/fees"] || 0} />
            <NavItem to="/student/quiz" label="Skill Quiz" onNavigate={closeMobileNavOnNavigate} />
            {user?.role === "student" ? (
              <NavItem to="/student/badges" label="My Badges" onNavigate={closeMobileNavOnNavigate} badgeCount={sectionUnread["/student/badges"] || 0} />
            ) : null}
            <NavItem to="/student/level-journey" label="Level Journey" onNavigate={closeMobileNavOnNavigate} />
            <NavItem to="/student/students" label="Students" onNavigate={closeMobileNavOnNavigate} badgeCount={sectionUnread["/students"] || 0} />
            <NavItem
              to="/chat"
              label="Chat"
              onNavigate={() => {
                markChatSeen();
                closeMobileNavOnNavigate();
              }}
              badgeCount={unreadChatCount}
            />
            <NavItem
              to="/notifications"
              label="Notifications"
              onNavigate={() => {
                markNotificationsSeen();
                closeMobileNavOnNavigate();
              }}
              badgeCount={unreadNotificationCount}
            />
            <NavItem to="/profile" label="Profile" onNavigate={closeMobileNavOnNavigate} />
          </nav>
        )}
        <div className="sidebar-footer">
          {user ? (
            <div className="mini-card">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  style={{ width: "56px", height: "56px", borderRadius: "16px", objectFit: "cover" }}
                />
              ) : null}
              <div className="mini-title">Signed in</div>
              <div className="mini-value">{user.name}</div>
              <div className="mini-note">{user.role}</div>
              {user.bio ? <div className="mini-note">{user.bio}</div> : null}
              <div className="mini-note" style={{ marginTop: "10px" }}>Accounts</div>
              <select
                className="select"
                style={{ marginTop: "6px" }}
                value={getActiveAccountKey() || accounts?.[0]?.accountKey || ""}
                onChange={(event) => switchAccount(event.target.value)}
              >
                {(accounts || []).map((item) => (
                  <option key={item.accountKey} value={item.accountKey}>
                    {item.user?.name || "User"} ({item.user?.role || "member"})
                  </option>
                ))}
              </select>
              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <button className="btn btn-ghost" type="button" onClick={addAnotherAccount}>
                  Add Account
                </button>
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => {
                    const activeKey = getActiveAccountKey();
                    if (!activeKey) return;
                    removeAuthAccount(activeKey);
                    const next = getAuthAccounts();
                    setAccounts(next);
                    if (next.length) {
                      switchAccount(next[0].accountKey);
                    } else {
                      clearActiveSessionOnly();
                      setUser(null);
                      navigate("/login");
                    }
                  }}
                >
                  Remove Account
                </button>
              </div>
              <button
                className="btn btn-ghost"
                style={{ marginTop: "10px" }}
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              >
                {theme === "light" ? "Dark Mode" : "Light Mode"}
              </button>
              <button className="btn btn-ghost" style={{ marginTop: "10px" }} onClick={logout}>
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </aside>
      <main className={`main${location.pathname === "/chat" ? " main-chat" : ""}`}>
        <Routes>
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/register" element={<Navigate to="/" replace />} />
          <Route path="/forgot" element={<Navigate to="/" replace />} />

          <Route
            path="/"
            element={
              user?.role === "teacher" ? (
                <Dashboard />
              ) : (
                <Navigate to="/student" replace />
              )
            }
          />
          <Route
            path="/classes"
            element={user?.role === "teacher" ? <Classes /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/students"
            element={user?.role === "teacher" ? <Students /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/students/:userId"
            element={user?.role === "teacher" ? <TeacherStudentProfile /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/homework"
            element={user?.role === "teacher" ? <Homework /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/syllabus"
            element={user?.role === "teacher" ? <Syllabus /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/attendance"
            element={user?.role === "teacher" ? <Attendance /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/marks"
            element={user?.role === "teacher" ? <Marks /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/fees"
            element={user?.role === "teacher" ? <Fees /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/leaderboard"
            element={user?.role === "teacher" ? <Leaderboard /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/badge-requests"
            element={user?.role === "teacher" ? <BadgeRequests /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/holidays"
            element={user?.role === "teacher" ? <Holidays /> : <Navigate to="/login" replace />}
          />

          <Route
            path="/student"
            element={
              user?.role === "student" ? (
                <StudentPortal />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/student/homework"
            element={
              user?.role === "student" ? (
                <StudentPortal section="homework" />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/student/fees"
            element={
              user?.role === "student" ? (
                <StudentPortal section="fees" />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/student/quiz"
            element={
              user?.role === "student" ? (
                <QuizDashboard />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/student/students"
            element={
              user?.role === "student" ? (
                <StudentDirectory />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/student/students/:userId"
            element={
              user?.role === "student" ? (
                <StudentPublicProfile />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/student/badges"
            element={
              user?.role === "student" ? (
                <Badges />
              ) : (
                <Navigate to="/student" replace />
              )
            }
          />
          <Route
            path="/student/level-journey"
            element={
              user?.role === "student" ? (
                <LevelJourneyPage />
              ) : (
                <Navigate to="/student" replace />
              )
            }
          />
          <Route path="/chat" element={<Chat />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>
    </div>
  );
}
