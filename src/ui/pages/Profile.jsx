import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { resolveAvatarFrame } from "../avatarFrame.js";

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

const getLevelTierClass = (levelValue) => {
  const level = Number(levelValue) || 1;
  if (level >= 13) return "level-tier-mythic";
  if (level >= 10) return "level-tier-legend";
  if (level >= 7) return "level-tier-elite";
  if (level >= 4) return "level-tier-rising";
  return "level-tier-starter";
};

export default function Profile() {
  const [user, setUser] = useState(null);
  const [badgeStats, setBadgeStats] = useState({ level: null, earned: [] });
  const [form, setForm] = useState({ name: "", phone: "", bio: "", avatar: null });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const load = async () => {
    setError("");
    try {
      const data = await api.get("/auth/me").then((res) => res.data.user);
      setUser(data);
      setForm({
        name: data.name || "",
        phone: data.phone || "",
        bio: data.bio || "",
        avatar: null
      });
      if (data.role === "student") {
        try {
          const badgeData = await api.get("/badges/me").then((res) => res.data);
          setBadgeStats({
            level: badgeData.level || null,
            earned: badgeData.earned || []
          });
        } catch {
          setBadgeStats({ level: null, earned: [] });
        }
      } else {
        setBadgeStats({ level: null, earned: [] });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load profile. Please log in again.");
    }
  };

  useEffect(() => {
    load();
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
    try {
      const res = await api.put("/auth/me", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const updated = res.data.user;
      localStorage.setItem("auth_user", JSON.stringify(updated));
      setUser(updated);
      setForm((prev) => ({ ...prev, avatar: null }));
      setMessage("Profile updated.");
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

  if (!user) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Profile</h1>
            <p className="page-subtitle">Loading profile...</p>
          </div>
        </div>
        {error ? (
          <div className="card" style={{ marginTop: "24px" }}>
            <div className="auth-error">{error}</div>
          </div>
        ) : null}
      </div>
    );
  }

  const profileFrame = resolveAvatarFrame({
    badges: badgeStats.earned || [],
    totalXp: badgeStats.level?.totalXp || 0,
    level: badgeStats.level?.level || 1,
    rank: null
  });
  const sortedEarnedBadges = [...(badgeStats.earned || [])].sort((a, b) => {
    const xpDelta = (Number(b?.xpValue) || 0) - (Number(a?.xpValue) || 0);
    if (xpDelta !== 0) return xpDelta;
    return String(a?.title || "").localeCompare(String(b?.title || ""));
  });
  const totalBadges = sortedEarnedBadges.length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Profile</h1>
          <p className="page-subtitle">Update your picture, bio, and contact info.</p>
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
              <div className="profile-summary-level">
                <span className={`level-pill ${getLevelTierClass(badgeStats.level.level)}`}>
                  Level {badgeStats.level.level}
                </span>{" "}
                • {badgeStats.level.totalXp} XP • {totalBadges} Badges
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {user.role === "student" ? (
        <div className="card" style={{ marginTop: "24px" }}>
          <h2 className="card-title">Badge Showcase ({totalBadges})</h2>
          {sortedEarnedBadges.length ? (
            <div className="profile-showcase-grid">
              {sortedEarnedBadges.map((badge) => (
                <div
                  key={badge.key}
                  className={`profile-showcase-badge ${getXpTierClass(badge.xpValue)}`}
                >
                  {badge.imageUrl ? (
                    <img src={badge.imageUrl} alt={badge.title} className="profile-badge-art" />
                  ) : null}
                  <div className="profile-showcase-title">{badge.title}</div>
                  <div className="profile-showcase-meta">
                    {String(badge.rarity || "").toUpperCase()} • {badge.xpValue} XP
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
        <h2 className="card-title">Edit Profile</h2>
        {message ? <div className="auth-success">{message}</div> : null}
        {error ? <div className="auth-error">{error}</div> : null}
        <form className="form" onSubmit={submit}>
          <input
            className="input"
            placeholder="Full name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
          />
          <input
            className="input"
            placeholder="Phone"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
          />
          <input
            className="input"
            placeholder="Bio"
            value={form.bio}
            onChange={(event) => setForm({ ...form, bio: event.target.value })}
          />
          <input
            className="input"
            type="file"
            accept="image/*"
            onChange={(event) => setForm({ ...form, avatar: event.target.files?.[0] || null })}
          />
          <button className="btn" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
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
          <button className="btn" type="submit">
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}
