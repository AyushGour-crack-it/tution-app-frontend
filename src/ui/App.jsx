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
import { api } from "./api.js";

const NavItem = ({ to, label, onNavigate }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `nav-link${isActive ? " nav-link-active" : ""}`
    }
    onClick={(event) => {
      onNavigate?.(event);
    }}
  >
    {label}
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
  const closeMobileNavOnNavigate = React.useCallback(() => {
    if (window.matchMedia("(max-width: 1024px)").matches) {
      setNavOpen(false);
    }
  }, []);

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
    const sessionUser = getSession();
    if (sessionUser && !user) {
      setUser(sessionUser);
      return;
    }
    if (!sessionUser && !localStorage.getItem("auth_token") && user) {
      setUser(null);
    }
  }, [location.pathname, user]);

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
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot" element={<ForgotPassword />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-shell">
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
            <NavItem to="/holidays" label="Holidays" onNavigate={closeMobileNavOnNavigate} />
            <NavItem to="/chat" label="Chat" onNavigate={closeMobileNavOnNavigate} />
            <NavItem to="/notifications" label="Notifications" onNavigate={closeMobileNavOnNavigate} />
            <NavItem to="/profile" label="Profile" onNavigate={closeMobileNavOnNavigate} />
          </nav>
        ) : (
          <nav className="nav">
            <NavItem to="/student" label="My Dashboard" onNavigate={closeMobileNavOnNavigate} />
            <NavItem to="/student/homework" label="My Homework" onNavigate={closeMobileNavOnNavigate} />
            <NavItem to="/student/fees" label="My Fees" onNavigate={closeMobileNavOnNavigate} />
            <NavItem to="/chat" label="Chat" onNavigate={closeMobileNavOnNavigate} />
            <NavItem to="/notifications" label="Notifications" onNavigate={closeMobileNavOnNavigate} />
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
      <main className="main">
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
          <Route path="/chat" element={<Chat />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>
    </div>
  );
}
