import React, { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Profile() {
  const [user, setUser] = useState(null);
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

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Profile</h1>
          <p className="page-subtitle">Update your picture, bio, and contact info.</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              style={{ width: "84px", height: "84px", borderRadius: "20px", objectFit: "cover" }}
            />
          ) : null}
          <div>
            <div style={{ fontWeight: 600 }}>{user.name}</div>
            <div style={{ color: "var(--muted)" }}>{user.email}</div>
          </div>
        </div>
      </div>

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
