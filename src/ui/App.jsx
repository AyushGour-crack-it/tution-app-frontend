import React from "react";
import { Routes, Route, NavLink, Navigate, useNavigate, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import Classes from "./pages/Classes.jsx";
import Students from "./pages/Students.jsx";
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
import Invoices from "./pages/Invoices.jsx";
import Leaderboard from "./pages/Leaderboard.jsx";
import { api, subscribeApiActivity } from "./api.js";
import StudentDirectory from "./pages/StudentDirectory.jsx";
import StudentPublicProfile from "./pages/StudentPublicProfile.jsx";
import Badges from "./pages/Badges.jsx";
import BadgeRequests from "./pages/BadgeRequests.jsx";

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
  const [viewRole, setViewRole] = React.useState(
    () => localStorage.getItem("view_role") || "teacher"
  );
  const [previewStudentId, setPreviewStudentId] = React.useState(
    () => localStorage.getItem("preview_student_id") || ""
  );
  const [navOpen, setNavOpen] = React.useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = React.useState(0);
  const [unreadChatCount, setUnreadChatCount] = React.useState(0);
  const [routeLoading, setRouteLoading] = React.useState(false);
  const [apiLoading, setApiLoading] = React.useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = React.useState(false);
  const [badgeUnlockQueue, setBadgeUnlockQueue] = React.useState([]);
  const [feePaymentQueue, setFeePaymentQueue] = React.useState([]);
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
  const activeBadgeUnlock = badgeUnlockQueue.length ? badgeUnlockQueue[0] : null;
  const activeFeePayment = feePaymentQueue.length ? feePaymentQueue[0] : null;
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

  const logout = () => {
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_token");
    setUser(null);
    navigate("/login");
  };

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
          localStorage.setItem("auth_user", JSON.stringify(freshUser));
          setUser(freshUser);
        } else {
          localStorage.removeItem("auth_user");
          localStorage.removeItem("auth_token");
          setUser(null);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        const status = error?.response?.status;
        if (status === 401 || status === 403) {
          localStorage.removeItem("auth_user");
          localStorage.removeItem("auth_token");
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
    localStorage.setItem("view_role", viewRole);
  }, [viewRole]);

  React.useEffect(() => {
    localStorage.setItem("preview_student_id", previewStudentId);
  }, [previewStudentId]);

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
      setUser(sessionUser);
      return;
    }
    if (!sessionUser && !localStorage.getItem("auth_token") && user) {
      setUser(null);
    }
  }, [location.pathname, user]);

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
  }, [user?.id, location.pathname, notificationSeenKey, badgePopupSeenKey]);

  React.useEffect(() => {
    if (location.pathname === "/notifications") {
      markNotificationsSeen();
    }
  }, [location.pathname, markNotificationsSeen]);

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
    if (location.pathname === "/chat") {
      markChatSeen();
    }
  }, [location.pathname, markChatSeen]);

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

  return (
    <div className="app-shell">
      {routeLoading || apiLoading ? (
        <div className="global-loading-overlay">
          <div className="global-loading-spinner" />
        </div>
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
        {user?.role === "teacher" && viewRole === "teacher" ? (
          <nav className="nav">
            <NavItem to="/" label="Overview" onNavigate={closeMobileNavOnNavigate} />
            <NavItem to="/classes" label="Classes" onNavigate={closeMobileNavOnNavigate} />
            <NavItem to="/students" label="Students" onNavigate={closeMobileNavOnNavigate} />
            <NavItem to="/homework" label="Homework" onNavigate={closeMobileNavOnNavigate} />
            <NavItem to="/syllabus" label="Syllabus" onNavigate={closeMobileNavOnNavigate} />
            <NavItem to="/attendance" label="Attendance" onNavigate={closeMobileNavOnNavigate} />
            <NavItem to="/marks" label="Marks" onNavigate={closeMobileNavOnNavigate} />
            <NavItem to="/fees" label="Fees" onNavigate={closeMobileNavOnNavigate} />
            <NavItem to="/invoices" label="Invoices" onNavigate={closeMobileNavOnNavigate} />
            <NavItem to="/leaderboard" label="Leaderboard" onNavigate={closeMobileNavOnNavigate} />
            <NavItem to="/badge-requests" label="Badge Requests" onNavigate={closeMobileNavOnNavigate} />
            <NavItem to="/holidays" label="Holidays" onNavigate={closeMobileNavOnNavigate} />
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
            <NavItem to="/student/homework" label="My Homework" onNavigate={closeMobileNavOnNavigate} />
            <NavItem to="/student/fees" label="My Fees" onNavigate={closeMobileNavOnNavigate} />
            {user?.role === "student" ? (
              <NavItem to="/student/badges" label="My Badges" onNavigate={closeMobileNavOnNavigate} />
            ) : null}
            <NavItem to="/student/students" label="Students" onNavigate={closeMobileNavOnNavigate} />
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
              {user.role === "teacher" && (
                <>
                  <button
                    className="btn btn-ghost"
                    style={{ marginTop: "10px" }}
                    onClick={() =>
                      setViewRole(viewRole === "teacher" ? "student" : "teacher")
                    }
                  >
                    {viewRole === "teacher" ? "Student View" : "Teacher View"}
                  </button>
                  {viewRole === "student" && (
                    <input
                      className="input"
                      style={{ marginTop: "10px" }}
                      placeholder="Preview Student ID"
                      value={previewStudentId}
                      onChange={(event) => setPreviewStudentId(event.target.value)}
                    />
                  )}
                </>
              )}
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
              user?.role === "teacher" && viewRole === "teacher" ? (
                <Dashboard />
              ) : (
                <Navigate to="/student" replace />
              )
            }
          />
          <Route
            path="/classes"
            element={user?.role === "teacher" && viewRole === "teacher" ? <Classes /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/students"
            element={user?.role === "teacher" && viewRole === "teacher" ? <Students /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/homework"
            element={user?.role === "teacher" && viewRole === "teacher" ? <Homework /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/syllabus"
            element={user?.role === "teacher" && viewRole === "teacher" ? <Syllabus /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/attendance"
            element={user?.role === "teacher" && viewRole === "teacher" ? <Attendance /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/marks"
            element={user?.role === "teacher" && viewRole === "teacher" ? <Marks /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/fees"
            element={user?.role === "teacher" && viewRole === "teacher" ? <Fees /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/invoices"
            element={user?.role === "teacher" && viewRole === "teacher" ? <Invoices /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/leaderboard"
            element={user?.role === "teacher" && viewRole === "teacher" ? <Leaderboard /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/badge-requests"
            element={user?.role === "teacher" && viewRole === "teacher" ? <BadgeRequests /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/holidays"
            element={user?.role === "teacher" && viewRole === "teacher" ? <Holidays /> : <Navigate to="/login" replace />}
          />

          <Route
            path="/student"
            element={
              user?.role === "student" || viewRole === "student" ? (
                <StudentPortal previewStudentId={previewStudentId} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/student/homework"
            element={
              user?.role === "student" || viewRole === "student" ? (
                <StudentPortal section="homework" previewStudentId={previewStudentId} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/student/fees"
            element={
              user?.role === "student" || viewRole === "student" ? (
                <StudentPortal section="fees" previewStudentId={previewStudentId} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/student/students"
            element={
              user?.role === "student" || viewRole === "student" ? (
                <StudentDirectory />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/student/students/:userId"
            element={
              user?.role === "student" || viewRole === "student" ? (
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
          <Route path="/chat" element={<Chat />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>
    </div>
  );
}
