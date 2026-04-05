import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { resolveAvatarFrame } from "../avatarFrame.js";
import { setActiveAuthSession } from "../authAccounts.js";
import { setupPushForSession, teardownPushForSession } from "../pushNotifications.js";
import { appToast } from "../toast.js";
import { FiBell, FiEdit2, FiSave, FiShield, FiHome, FiDollarSign, FiBook, FiAward, FiSettings, FiLogOut, FiChevronRight, FiSearch, FiUsers, FiCalendar, FiFileText, FiTrendingUp, FiVolume2 } from "react-icons/fi";

const Field = ({ label, children }) => (
  <label className="field">
    <span className="field-label">{label}</span>
    {children}
  </label>
);

const listToInput = (value) => (Array.isArray(value) ? value.join(", ") : "");
const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : "");

const buildFormState = ({ user, student }) => ({
  name: user?.name || "",
  phone: user?.phone || "",
  bio: user?.bio || "",
  avatar: null,
  dateOfBirth: toDateInput(student?.dateOfBirth),
  joinedAt: toDateInput(student?.joinedAt),
  monthlyFee: student?.monthlyFee ? String(student.monthlyFee) : "",
  grade: student?.grade || "",
  schoolName: student?.schoolName || "",
  address: student?.address || "",
  guardianName: student?.guardian?.name || "",
  guardianPhone: student?.guardian?.phone || "",
  guardianRelation: student?.guardian?.relation || "",
  emergencyContact: student?.emergencyContact || "",
  hobbies: listToInput(student?.hobbies),
  strongSubjects: listToInput(student?.strongSubjects),
  weakSubjects: listToInput(student?.weakSubjects),
  goals: student?.goals || ""
});

const getXpTierClass = (xpValue) => {
  const xp = Number(xpValue) || 0;
  if (xp >= 1000) return "xp-tier-1000";
  if (xp >= 450) return "xp-tier-450";
  if (xp >= 200) return "xp-tier-200";
  if (xp >= 150) return "xp-tier-150";
  if (xp >= 120) return "xp-tier-120";
  if (xp >= 50) return "xp-tier-50";
  if (xp >= 30) return "xp-tier-30";
  return "xp-tier-20";
};

const getBadgeVisualClass = (badge) => {
  if (badge?.category === "fun_event") return "xp-tier-event";
  return getXpTierClass(badge?.xpValue);
};

const getBadgeMetaText = (badge) => {
  const rarity = String(badge?.rarity || "").toUpperCase();
  if (badge?.category === "fun_event") return `${rarity} • EVENT`;
  return `${rarity} • ${badge?.xpValue || 0} XP`;
};
const getBadgeSpecialClass = (badge) => {
  if (badge?.key === "tanjiro_3x3") return "badge-theme-tanjiro";
  if (badge?.key === "kira_2h_7d") return "badge-theme-kira";
  if (badge?.key === "nico_robin_3sunday") return "badge-theme-robin";
  if (badge?.key === "goku_5h_sunday") return "badge-theme-goku";
  return "";
};
const isHeroImageBadge = (badge) =>
  badge?.key === "tanjiro_3x3" ||
  badge?.key === "kira_2h_7d" ||
  badge?.key === "nico_robin_3sunday" ||
  badge?.key === "goku_5h_sunday";

const getLevelTierClass = (levelValue) => {
  const level = Number(levelValue) || 1;
  if (level >= 13) return "level-tier-mythic";
  if (level >= 10) return "level-tier-legend";
  if (level >= 7) return "level-tier-elite";
  if (level >= 4) return "level-tier-rising";
  return "level-tier-starter";
};

const MobileProfileSection = ({ icon: Icon, title, subtitle, onClick, badge }) => (
  <div className="mobile-profile-section" onClick={onClick}>
    <div className="mobile-profile-section-left">
      <div className="mobile-profile-section-icon">
        <Icon size={20} />
      </div>
      <div className="mobile-profile-section-content">
        <div className="mobile-profile-section-title">{title}</div>
        {subtitle && <div className="mobile-profile-section-subtitle">{subtitle}</div>}
      </div>
    </div>
    <div className="mobile-profile-section-right">
      {badge && <span className="mobile-profile-section-badge">{badge}</span>}
      <FiChevronRight size={16} />
    </div>
  </div>
);

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [badgeStats, setBadgeStats] = useState({ level: null, earned: [] });
  const [quizStats, setQuizStats] = useState(null);
  const [form, setForm] = useState(buildFormState({ user: null, student: null }));
  const [saving, setSaving] = useState(false);
  const [editingInfo, setEditingInfo] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [enablingPush, setEnablingPush] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
 const quizSubjectProgress = useMemo(() => {
  try {
    const source = quizStats?.subjectXP && typeof quizStats.subjectXP === "object"
      ? quizStats.subjectXP
      : {};

    return Object.entries(source)
      .map(([subject, rawXp]) => {
        const xp = Number(rawXp || 0);
        const level = Number(quizStats?.subjectLevel?.[subject] || 0);
        const progress = Math.max(0, Math.min(100, Math.round(((xp % 150) / 150) * 100)));
        return {
          key: subject,
          subject: String(subject || "").replace(/\b\w/g, (ch) => ch.toUpperCase()),
          xp,
          level,
          progress
        };
      })
      .filter(item => item.subject && item.subject.trim())
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 6);
  } catch (e) {
    console.error("quizSubjectProgress error:", e);
    return [];
  }
}, [quizStats]);

  const notificationPermission = "default";

  const load = async () => {
    setError("");
    try {
      const data = await api.get("/auth/me").then((res) => res.data.user);
      if (!data || !data.email) {
        throw new Error("Invalid user data received");
      }
      let student = null;
      if (data.role === "student") {
        student = await api.get("/students/me").then((res) => res.data).catch(() => null);
      }
      setUser(data);
      setStudentProfile(student);
      setForm(buildFormState({ user: data, student }));

      if (data.role === "student") {
        try {
          const [badgeData, quizData] = await Promise.all([
            api.get("/badges/me").then((res) => res.data),
            api.get("/quiz/stats").then((res) => res.data || null)
          ]);
          setBadgeStats({
            level: badgeData?.level || null,
            earned: Array.isArray(badgeData?.earned) ? badgeData.earned : []
          });
          setQuizStats(quizData || null);
        } catch (badgeErr) {
          console.warn("Failed to load badge/quiz data:", badgeErr);
          setBadgeStats({ level: null, earned: [] });
          setQuizStats(null);
        }
      } else {
        setBadgeStats({ level: null, earned: [] });
        setQuizStats(null);
      }
    } catch (err) {
      console.error("Profile load error:", err);
      try {
        const cached = JSON.parse(localStorage.getItem("auth_user") || "null");
        if (cached && cached.email && cached.name) {
          setUser(cached);
          setStudentProfile(null);
          setForm(buildFormState({ user: cached, student: null }));
          setBadgeStats({ level: null, earned: [] });
          setQuizStats(null);
        } else {
          throw new Error("No valid cached user data");
        }
      } catch (cacheErr) {
        console.error("Cache load error:", cacheErr);
        setError(err.response?.data?.message || err.message || "Failed to load profile. Please log in again.");
      }
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Initialize pushEnabled from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("push_enabled");
    setPushEnabled(stored === "true");
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    const formData = new FormData();
    formData.append("name", form.name);
    formData.append("phone", form.phone);
    formData.append("bio", form.bio);
    if (form.avatar) {
      formData.append("avatar", form.avatar);
    }

    if (user?.role === "student") {
      formData.append("dateOfBirth", form.dateOfBirth || "");
      formData.append("joinedAt", form.joinedAt || "");
      formData.append("monthlyFee", form.monthlyFee || "");
      formData.append("grade", form.grade || "");
      formData.append("schoolName", form.schoolName || "");
      formData.append("address", form.address || "");
      formData.append("guardianName", form.guardianName || "");
      formData.append("guardianPhone", form.guardianPhone || "");
      formData.append("guardianRelation", form.guardianRelation || "");
      formData.append("emergencyContact", form.emergencyContact || "");
      formData.append("hobbies", form.hobbies || "");
      formData.append("strongSubjects", form.strongSubjects || "");
      formData.append("weakSubjects", form.weakSubjects || "");
      formData.append("goals", form.goals || "");
    }

    try {
      const res = await api.put("/auth/me", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const updated = res.data.user;
      const token = localStorage.getItem("auth_token");
      if (token) {
        setActiveAuthSession({ token, user: updated });
      } else {
        localStorage.setItem("auth_user", JSON.stringify(updated));
      }
      setUser(updated);

      let student = studentProfile;
      if (updated.role === "student") {
        student = await api.get("/students/me").then((response) => response.data).catch(() => null);
      }
      setStudentProfile(student);
      setForm(buildFormState({ user: updated, student }));
      setMessage("Your information has been updated.");
      setEditingInfo(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setPasswordMessage("");
    setPasswordError("");
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }
    try {
      await api.put("/auth/me/password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordMessage("Password updated.");
    } catch (err) {
      setPasswordError(err.response?.data?.message || "Failed to update password");
    }
  };

  const enableNotifications = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      appToast.warning("This browser does not support notifications.");
      return;
    }
    setEnablingPush(true);
    try {
      const result = await setupPushForSession();
      if (result?.enabled) {
        setPushEnabled(true);
        localStorage.setItem("push_enabled", "true");
        appToast.success("Notifications enabled for this account.");
        return;
      }
      if (result?.reason === "permission_denied") {
        appToast.warning("Notifications are blocked in browser settings. Please allow this site and retry.");
        return;
      }
      appToast.info("Could not enable notifications yet. Please try again.");
    } catch {
      appToast.error("Failed to enable notifications.");
    } finally {
      setEnablingPush(false);
    }
  };

  const disableNotifications = async () => {
    setEnablingPush(true);
    try {
      const result = await teardownPushForSession();
      if (result?.success) {
        setPushEnabled(false);
        localStorage.setItem("push_enabled", "false");
        appToast.success("Notifications disabled.");
      } else {
        const reason = result?.reason || "unknown";
        const errorText = result?.error ? String(result.error) : "Unknown error";
        appToast.error(`Failed to disable notifications (${reason}): ${errorText}`);
      }
    } catch (err) {
      appToast.error(`Failed to disable notifications: ${String(err)}`);
    } finally {
      setEnablingPush(false);
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore logout errors
    }
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    localStorage.removeItem("push_enabled");
    window.location.href = "/login";
  };

  if (!user) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Profile</h1>
            <p className="page-subtitle">
              {error ? "Unable to load profile" : "Loading profile..."}
            </p>
          </div>
        </div>
        {error ? (
          <div className="card" style={{ marginTop: "24px" }}>
            <div className="auth-error">{error}</div>
            <div style={{ marginTop: "16px" }}>
              <button
                className="btn"
                onClick={() => {
                  localStorage.removeItem("auth_token");
                  localStorage.removeItem("auth_user");
                  window.location.href = "/login";
                }}
              >
                Go to Login
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  // Ensure user has required properties
  if (!user.email || !user.name) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Profile</h1>
            <p className="page-subtitle">Invalid user data</p>
          </div>
        </div>
        <div className="card" style={{ marginTop: "24px" }}>
          <div className="auth-error">User data is corrupted. Please log in again.</div>
          <div style={{ marginTop: "16px" }}>
            <button
              className="btn"
              onClick={() => {
                localStorage.removeItem("auth_token");
                localStorage.removeItem("auth_user");
                window.location.href = "/login";
              }}
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

 const profileFrame = useMemo(() => {
  try {
    return resolveAvatarFrame({
      badges: Array.isArray(badgeStats?.earned) ? badgeStats.earned : [],
      totalXp: Number(badgeStats?.level?.totalXp) || 0,
      level: Number(badgeStats?.level?.level) || 1,
      rank: null
    });
  } catch (e) {
    console.error("profileFrame error:", e);
    return { frameClass: "", frameLabel: "" };
  }
}, [badgeStats]);

 const sortedEarnedBadges = useMemo(() => {
  try {
    return Array.isArray(badgeStats?.earned)
      ? [...badgeStats.earned].sort((a, b) => {
          const xpDelta = (Number(b?.xpValue) || 0) - (Number(a?.xpValue) || 0);
          if (xpDelta !== 0) return xpDelta;
          return String(a?.title || "").localeCompare(String(b?.title || ""));
        })
      : [];
  } catch (e) {
    console.error("badge sort error:", e);
    return [];
  }
}, [badgeStats]);
  const totalBadges = sortedEarnedBadges.length;

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Initialize mobile state
    const checkMobile = () => {
      if (typeof window !== "undefined") {
        setIsMobile(window.innerWidth <= 1024);
      }
    };

    checkMobile();

    let timeoutId;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkMobile, 100); // Debounce resize events
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  if (isMobile) {
    if (showSettings) {
      return (
        <div className="mobile-profile-page">
          <div className="mobile-profile-header">
            <button 
              className="mobile-profile-back-btn"
              onClick={() => setShowSettings(false)}
            >
              ← Back
            </button>
            <h1 className="mobile-profile-title">Settings</h1>
          </div>

          <div className="mobile-profile-content">
            {/* Include the profile editing form here */}
            <div className="card" style={{ marginTop: "16px" }}>
              <div className="page-header">
                <h2 className="card-title" style={{ margin: 0 }}>Edit Your Info</h2>
              </div>
              {message ? <div className="auth-success">{message}</div> : null}
              {error ? <div className="auth-error">{error}</div> : null}
              <form className="form" onSubmit={submit}>
                <Field label="Full Name">
                  <input
                    className="input"
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    required
                  />
                </Field>
                <Field label="Phone">
                  <input
                    className="input"
                    value={form.phone}
                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  />
                </Field>
                <Field label="Bio">
                  <input
                    className="input"
                    value={form.bio}
                    onChange={(event) => setForm({ ...form, bio: event.target.value })}
                  />
                </Field>
                <Field label="Profile Picture">
                  <input
                    className="input"
                    type="file"
                    accept="image/*"
                    onChange={(event) => setForm({ ...form, avatar: event.target.files?.[0] || null })}
                  />
                </Field>

                {user.role === "student" ? (
                  <>
                    <Field label="Date of Birth">
                      <input
                        className="input"
                        type="date"
                        value={form.dateOfBirth}
                        onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })}
                      />
                    </Field>
                    <Field label="Tuition Joining Date">
                      <input
                        className="input"
                        type="date"
                        value={form.joinedAt}
                        onChange={(event) => setForm({ ...form, joinedAt: event.target.value })}
                      />
                    </Field>
                    <Field label="Monthly Fee (INR)">
                      <input
                        className="input"
                        type="number"
                        min="0"
                        value={form.monthlyFee}
                        onChange={(event) => setForm({ ...form, monthlyFee: event.target.value })}
                      />
                    </Field>
                    <Field label="Class / Grade">
                      <input
                        className="input"
                        value={form.grade}
                        onChange={(event) => setForm({ ...form, grade: event.target.value })}
                      />
                    </Field>
                    <Field label="School Name">
                      <input
                        className="input"
                        value={form.schoolName}
                        onChange={(event) => setForm({ ...form, schoolName: event.target.value })}
                      />
                    </Field>
                    <Field label="Address">
                      <input
                        className="input"
                        value={form.address}
                        onChange={(event) => setForm({ ...form, address: event.target.value })}
                      />
                    </Field>
                    <Field label="Guardian Name">
                      <input
                        className="input"
                        value={form.guardianName}
                        onChange={(event) => setForm({ ...form, guardianName: event.target.value })}
                      />
                    </Field>
                    <Field label="Guardian Phone">
                      <input
                        className="input"
                        value={form.guardianPhone}
                        onChange={(event) => setForm({ ...form, guardianPhone: event.target.value })}
                      />
                    </Field>
                    <Field label="Guardian Relation">
                      <input
                        className="input"
                        value={form.guardianRelation}
                        onChange={(event) => setForm({ ...form, guardianRelation: event.target.value })}
                      />
                    </Field>
                    <Field label="Emergency Contact">
                      <input
                        className="input"
                        value={form.emergencyContact}
                        onChange={(event) => setForm({ ...form, emergencyContact: event.target.value })}
                      />
                    </Field>
                    <Field label="Hobbies (comma separated)">
                      <input
                        className="input"
                        value={form.hobbies}
                        onChange={(event) => setForm({ ...form, hobbies: event.target.value })}
                      />
                    </Field>
                    <Field label="Strong Subjects (comma separated)">
                      <input
                        className="input"
                        value={form.strongSubjects}
                        onChange={(event) => setForm({ ...form, strongSubjects: event.target.value })}
                      />
                    </Field>
                    <Field label="Weak Subjects (comma separated)">
                      <input
                        className="input"
                        value={form.weakSubjects}
                        onChange={(event) => setForm({ ...form, weakSubjects: event.target.value })}
                      />
                    </Field>
                    <Field label="Goals">
                      <input
                        className="input"
                        value={form.goals}
                        onChange={(event) => setForm({ ...form, goals: event.target.value })}
                      />
                    </Field>
                  </>
                ) : null}

                <button className="btn btn-icon" type="submit" disabled={saving}>
                  <FiSave size={16} />
                  <span>{saving ? "Saving..." : "Save All Changes"}</span>
                </button>
              </form>
            </div>

            <div className="card" style={{ marginTop: "16px" }}>
              <h2 className="card-title">Change Password</h2>
              {passwordMessage ? <div className="auth-success">{passwordMessage}</div> : null}
              {passwordError ? <div className="auth-error">{passwordError}</div> : null}
              <form className="form" onSubmit={changePassword}>
                <input
                  className="input"
                  type="password"
                  placeholder="Current password"
                  value={passwordForm.currentPassword}
                  onChange={(event) =>
                    setPasswordForm({ ...passwordForm, currentPassword: event.target.value })
                  }
                  required
                />
                <input
                  className="input"
                  type="password"
                  placeholder="New password"
                  value={passwordForm.newPassword}
                  onChange={(event) =>
                    setPasswordForm({ ...passwordForm, newPassword: event.target.value })
                  }
                  required
                />
                <input
                  className="input"
                  type="password"
                  placeholder="Confirm new password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) =>
                    setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })
                  }
                  required
                />
                <button className="btn btn-icon" type="submit">
                  <FiShield size={16} />
                  <span>Update Password</span>
                </button>
              </form>
            </div>

            <div className="card" style={{ marginTop: "16px" }}>
              <h2 className="card-title">Notifications</h2>
              <div className="list">
                <div className="list-item">
                  <div>Push Notifications</div>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={pushEnabled ? disableNotifications : enableNotifications}
                  >
                    <span>{enablingPush ? (pushEnabled ? "Disabling..." : "Enabling...") : (pushEnabled ? "Disable Notifications" : "Enable Notifications")}</span>
                  </button>
                </div>
                <div className="list-item">
                  <div>Theme</div>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => {
                      const newTheme = localStorage.getItem("ui_theme") === "light" ? "dark" : "light";
                      localStorage.setItem("ui_theme", newTheme);
                      document.documentElement.setAttribute("data-theme", newTheme);
                      appToast.success(`Switched to ${newTheme} theme`);
                    }}
                  >
                    <span>{localStorage.getItem("ui_theme") === "light" ? "Dark Mode" : "Light Mode"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="mobile-profile-page">
        <div className="mobile-profile-header">
          <div className="mobile-profile-avatar-section">
            <div className={`avatar-frame avatar-frame-profile ${profileFrame.frameClass}`} title={profileFrame.frameLabel}>
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="mobile-profile-avatar-img"
                />
              ) : (
                <div className="mobile-profile-avatar-fallback">
                  {String(user.name || "U").slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div className="mobile-profile-user-info">
              <div className="mobile-profile-name">{user.name}</div>
              <div className="mobile-profile-email">{user.email}</div>
              {badgeStats.level && (
                <div className="mobile-profile-level">
                  <span className={`level-pill ${getLevelTierClass(badgeStats.level.level)}`}>
                    Lv {badgeStats.level.level}
                  </span>
                  <span className="mobile-profile-xp">{badgeStats.level.totalXp} XP</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mobile-profile-sections">
          {user.role === "student" && (
            <>
              <MobileProfileSection
                icon={FiHome}
                title="Homework"
                subtitle="View and manage assignments"
                onClick={() => navigate("/student/homework")}
              />
              <MobileProfileSection
                icon={FiDollarSign}
                title="Fees"
                subtitle="Payment history and details"
                onClick={() => navigate("/student/fees")}
              />
              <MobileProfileSection
                icon={FiBook}
                title="Quiz"
                subtitle="Practice and skill building"
                onClick={() => navigate("/student/quiz")}
              />
              <MobileProfileSection
                icon={FiAward}
                title="Badges"
                subtitle={`${totalBadges} badges earned`}
                onClick={() => navigate("/student/badges")}
                badge={totalBadges > 0 ? totalBadges : null}
              />
              <MobileProfileSection
                icon={FiSearch}
                title="Students"
                subtitle="Connect with classmates"
                onClick={() => navigate("/student/students")}
              />
              <MobileProfileSection
                icon={FiBell}
                title="Notifications"
                subtitle="View all notifications"
                onClick={() => navigate("/notifications")}
              />
            </>
          )}

          {user.role === "teacher" && (
            <>
              <MobileProfileSection
                icon={FiHome}
                title="Dashboard"
                subtitle="Overview and analytics"
                onClick={() => navigate("/")}
              />
              <MobileProfileSection
                icon={FiSearch}
                title="Students"
                subtitle="Manage student records"
                onClick={() => navigate("/students")}
              />
              <MobileProfileSection
                icon={FiBook}
                title="Classes"
                subtitle="Manage class schedules"
                onClick={() => navigate("/classes")}
              />
              <MobileProfileSection
                icon={FiBook}
                title="Homework"
                subtitle="Assignments and tasks"
                onClick={() => navigate("/homework")}
              />
              <MobileProfileSection
                icon={FiBook}
                title="Syllabus"
                subtitle="Curriculum management"
                onClick={() => navigate("/syllabus")}
              />
              <MobileProfileSection
                icon={FiCalendar}
                title="Attendance"
                subtitle="Track student attendance"
                onClick={() => navigate("/attendance")}
              />
              <MobileProfileSection
                icon={FiFileText}
                title="Marks"
                subtitle="Grade management"
                onClick={() => navigate("/marks")}
              />
              <MobileProfileSection
                icon={FiDollarSign}
                title="Fees"
                subtitle="Payment management"
                onClick={() => navigate("/fees")}
              />
              <MobileProfileSection
                icon={FiTrendingUp}
                title="Leaderboard"
                subtitle="Student rankings"
                onClick={() => navigate("/leaderboard")}
              />
              <MobileProfileSection
                icon={FiAward}
                title="Badge Requests"
                subtitle="Review badge applications"
                onClick={() => navigate("/badge-requests")}
              />
              <MobileProfileSection
                icon={FiCalendar}
                title="Holidays"
                subtitle="Holiday management"
                onClick={() => navigate("/holidays")}
              />
              <MobileProfileSection
                icon={FiVolume2}
                title="Popup Campaigns"
                subtitle="Manage promotional content"
                onClick={() => navigate("/popup-campaigns")}
              />
              <MobileProfileSection
                icon={FiBell}
                title="Notifications"
                subtitle="View all notifications"
                onClick={() => navigate("/notifications")}
              />
            </>
          )}

          <MobileProfileSection
            icon={FiSettings}
            title="Settings"
            subtitle="Profile, notifications, password"
            onClick={() => setShowSettings(true)}
          />

          <MobileProfileSection
            icon={FiUsers}
            title="Add Account"
            subtitle="Sign in with another account"
            onClick={() => {
              if (window.confirm("This will sign you out and allow you to add another account. Continue?")) {
                // Clear current session
                localStorage.removeItem("auth_token");
                localStorage.removeItem("auth_user");
                localStorage.removeItem("push_enabled");
                window.location.href = "/login";
              }
            }}
          />

          <MobileProfileSection
            icon={FiLogOut}
            title="Logout"
            subtitle="Sign out of your account"
            onClick={() => {
              if (window.confirm("Are you sure you want to logout?")) {
                logout();
              }
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Profile</h1>
          <p className="page-subtitle">Manage all your info from one place.</p>
        </div>
      </div>

      <div className="card profile-summary-card" style={{ marginTop: "24px" }}>
        <div className="profile-summary-row">
          <div className={`avatar-frame avatar-frame-profile ${profileFrame.frameClass}`} title={profileFrame.frameLabel}>
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="profile-summary-avatar-img"
              />
            ) : (
              <div
                className="student-directory-avatar student-directory-avatar-fallback"
                style={{ width: "84px", height: "84px", borderRadius: "16px" }}
              >
                {String(user.name || "U").slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="profile-summary-meta">
            <div className="profile-summary-name">{user.name}</div>
            <div className="profile-summary-email">{user.email}</div>
            {badgeStats.level ? (
              <button
                className="profile-summary-level profile-summary-level-btn"
                type="button"
                onClick={() => navigate("/student/level-journey")}
              >
                <span className={`level-pill ${getLevelTierClass(badgeStats.level.level)}`}>
                  Level {badgeStats.level.level}
                </span>{" "}
                • {badgeStats.level.totalXp} XP • {totalBadges} Badges
                {" "}• Click for journey
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <h2 className="card-title">Notifications</h2>
        <div className="list">
          <div className="list-item">
            <div>
              <div style={{ fontWeight: 700 }}>Browser Push Permission</div>
              <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                {notificationPermission === "granted"
                  ? "Allowed"
                  : notificationPermission === "denied"
                    ? "Blocked"
                    : notificationPermission === "unsupported"
                      ? "Not supported on this browser"
                      : "Not granted"}
              </div>
            </div>
            <button className="btn btn-ghost btn-icon" type="button" onClick={pushEnabled ? disableNotifications : enableNotifications} disabled={enablingPush}>
              <FiBell size={16} />
              <span>{enablingPush ? (pushEnabled ? "Disabling..." : "Enabling...") : (pushEnabled ? "Disable Notifications" : "Enable Notifications")}</span>
            </button>
          </div>
        </div>
      </div>

      {user.role === "student" ? (
        <div className="card" style={{ marginTop: "24px" }}>
          <h2 className="card-title">Student Info Snapshot</h2>
          <div className="list">
            <div className="list-item"><div>Class / Grade</div><div>{studentProfile?.grade || "-"}</div></div>
            <div className="list-item"><div>Tuition Joined</div><div>{studentProfile?.joinedAt ? new Date(studentProfile.joinedAt).toLocaleDateString() : "-"}</div></div>
            <div className="list-item"><div>Monthly Fee</div><div>{studentProfile?.monthlyFee ? `₹${Number(studentProfile.monthlyFee).toLocaleString("en-IN")}` : "-"}</div></div>
            <div className="list-item"><div>Strong Subjects</div><div>{Array.isArray(studentProfile?.strongSubjects) && studentProfile.strongSubjects.length ? studentProfile.strongSubjects.join(", ") : "-"}</div></div>
            <div className="list-item"><div>Weak Subjects</div><div>{Array.isArray(studentProfile?.weakSubjects) && studentProfile.weakSubjects.length ? studentProfile.weakSubjects.join(", ") : "-"}</div></div>
            <div className="list-item"><div>Goals</div><div>{studentProfile?.goals || "-"}</div></div>
          </div>
        </div>
      ) : null}

      {user.role === "student" ? (
        <div className="card student-profile-quiz-card" style={{ marginTop: "24px" }}>
          <div className="student-profile-quiz-head">
            <div>
              <h2 className="student-profile-quiz-title">Quiz Level Snapshot</h2>
              <p className="student-profile-quiz-motivation">
                Your level is now visible directly on student cards.
              </p>
            </div>
            <div className="student-profile-quiz-total">
              Lv {Number(quizStats?.overallLevel || 0)} • {Number(quizStats?.totalXP || 0)} XP
            </div>
          </div>
          <div className="student-profile-pills">
            <span className="pill student-stat-pill student-stat-pill-quiz-level">
              Quiz Level <strong>{Number(quizStats?.overallLevel || 0)}</strong>
            </span>
            <span className="pill student-stat-pill student-stat-pill-streak">
              Streak <strong>{Number(quizStats?.streakCount || 0)}d</strong>
            </span>
          </div>
          {quizSubjectProgress.length ? (
            <div className="student-profile-quiz-progress-list">
              {quizSubjectProgress.map((item) => (
                <div key={item.key} className="student-profile-quiz-progress-item">
                  <div className="student-profile-quiz-progress-meta">
                    <span>{item.subject}</span>
                    <span>
                      Lv {item.level} • {item.xp} XP
                    </span>
                  </div>
                  <div className="student-profile-quiz-progress-track">
                    <div className="student-profile-quiz-progress-fill" style={{ width: `${item.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="student-directory-meta">No quiz progress yet.</div>
          )}
        </div>
      ) : null}

      {user.role === "student" ? (
        <div className="card" style={{ marginTop: "24px" }}>
          <h2 className="card-title">Badge Showcase ({totalBadges})</h2>
          {sortedEarnedBadges.length ? (
            <div className="profile-showcase-grid">
              {sortedEarnedBadges.map((badge) => (
                <div
                  key={badge.key}
                  className={`profile-showcase-badge ${
                    badge.category === "fun_event" ? "profile-showcase-badge-event" : ""
                  } ${getBadgeVisualClass(badge)} ${getBadgeSpecialClass(badge)}`}
                  style={isHeroImageBadge(badge) ? { "--badge-bg-image": `url(${badge.imageUrl})` } : undefined}
                >
                  {badge.imageUrl && !isHeroImageBadge(badge) ? (
                    <img src={badge.imageUrl} alt={badge.title} className="profile-badge-art" />
                  ) : null}
                  <div className="profile-showcase-title">{badge.title}</div>
                  <div className="profile-showcase-meta">
                    {getBadgeMetaText(badge)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="student-directory-meta">No badges unlocked yet.</div>
          )}
        </div>
      ) : null}

      <div className="card" style={{ marginTop: "24px" }}>
        <div className="page-header">
          <h2 className="card-title" style={{ margin: 0 }}>Edit Your Info</h2>
          <button
            className="btn btn-ghost btn-icon"
            type="button"
            onClick={() => {
              setEditingInfo((prev) => !prev);
              setForm(buildFormState({ user, student: studentProfile }));
            }}
          >
            <FiEdit2 size={16} />
            <span>{editingInfo ? "Close" : "Edit Your Info"}</span>
          </button>
        </div>
        {message ? <div className="auth-success">{message}</div> : null}
        {error ? <div className="auth-error">{error}</div> : null}
        {editingInfo ? (
          <form className="form" onSubmit={submit}>
            <Field label="Full Name">
              <input
                className="input"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </Field>
            <Field label="Phone">
              <input
                className="input"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
              />
            </Field>
            <Field label="Bio">
              <input
                className="input"
                value={form.bio}
                onChange={(event) => setForm({ ...form, bio: event.target.value })}
              />
            </Field>
            <Field label="Profile Picture">
              <input
                className="input"
                type="file"
                accept="image/*"
                onChange={(event) => setForm({ ...form, avatar: event.target.files?.[0] || null })}
              />
            </Field>

            {user.role === "student" ? (
              <>
                <Field label="Date of Birth">
                  <input
                    className="input"
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })}
                  />
                </Field>
                <Field label="Tuition Joining Date">
                  <input
                    className="input"
                    type="date"
                    value={form.joinedAt}
                    onChange={(event) => setForm({ ...form, joinedAt: event.target.value })}
                  />
                </Field>
                <Field label="Monthly Fee (INR)">
                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={form.monthlyFee}
                    onChange={(event) => setForm({ ...form, monthlyFee: event.target.value })}
                  />
                </Field>
                <Field label="Class / Grade">
                  <input
                    className="input"
                    value={form.grade}
                    onChange={(event) => setForm({ ...form, grade: event.target.value })}
                  />
                </Field>
                <Field label="School Name">
                  <input
                    className="input"
                    value={form.schoolName}
                    onChange={(event) => setForm({ ...form, schoolName: event.target.value })}
                  />
                </Field>
                <Field label="Address">
                  <input
                    className="input"
                    value={form.address}
                    onChange={(event) => setForm({ ...form, address: event.target.value })}
                  />
                </Field>
                <Field label="Guardian Name">
                  <input
                    className="input"
                    value={form.guardianName}
                    onChange={(event) => setForm({ ...form, guardianName: event.target.value })}
                  />
                </Field>
                <Field label="Guardian Phone">
                  <input
                    className="input"
                    value={form.guardianPhone}
                    onChange={(event) => setForm({ ...form, guardianPhone: event.target.value })}
                  />
                </Field>
                <Field label="Guardian Relation">
                  <input
                    className="input"
                    value={form.guardianRelation}
                    onChange={(event) => setForm({ ...form, guardianRelation: event.target.value })}
                  />
                </Field>
                <Field label="Emergency Contact">
                  <input
                    className="input"
                    value={form.emergencyContact}
                    onChange={(event) => setForm({ ...form, emergencyContact: event.target.value })}
                  />
                </Field>
                <Field label="Hobbies (comma separated)">
                  <input
                    className="input"
                    value={form.hobbies}
                    onChange={(event) => setForm({ ...form, hobbies: event.target.value })}
                  />
                </Field>
                <Field label="Strong Subjects (comma separated)">
                  <input
                    className="input"
                    value={form.strongSubjects}
                    onChange={(event) => setForm({ ...form, strongSubjects: event.target.value })}
                  />
                </Field>
                <Field label="Weak Subjects (comma separated)">
                  <input
                    className="input"
                    value={form.weakSubjects}
                    onChange={(event) => setForm({ ...form, weakSubjects: event.target.value })}
                  />
                </Field>
                <Field label="Goals">
                  <input
                    className="input"
                    value={form.goals}
                    onChange={(event) => setForm({ ...form, goals: event.target.value })}
                  />
                </Field>
              </>
            ) : null}

            <button className="btn btn-icon" type="submit" disabled={saving}>
              <FiSave size={16} />
              <span>{saving ? "Saving..." : "Save All Changes"}</span>
            </button>
          </form>
        ) : (
          <div className="student-directory-meta">
            Click <strong>Edit Your Info</strong> to update profile picture, name, bio, and all student details.
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <h2 className="card-title">Change Password</h2>
        {passwordMessage ? <div className="auth-success">{passwordMessage}</div> : null}
        {passwordError ? <div className="auth-error">{passwordError}</div> : null}
        <form className="form" onSubmit={changePassword}>
          <input
            className="input"
            type="password"
            placeholder="Current password"
            value={passwordForm.currentPassword}
            onChange={(event) =>
              setPasswordForm({ ...passwordForm, currentPassword: event.target.value })
            }
            required
          />
          <input
            className="input"
            type="password"
            placeholder="New password"
            value={passwordForm.newPassword}
            onChange={(event) =>
              setPasswordForm({ ...passwordForm, newPassword: event.target.value })
            }
            required
          />
          <input
            className="input"
            type="password"
            placeholder="Confirm new password"
            value={passwordForm.confirmPassword}
            onChange={(event) =>
              setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })
            }
            required
          />
          <button className="btn btn-icon" type="submit">
            <FiShield size={16} />
            <span>Update Password</span>
          </button>
        </form>
      </div>
    </div>
  );
}
