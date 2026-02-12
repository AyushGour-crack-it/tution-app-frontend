import React, { useState } from "react";
import { api } from "../api.js";
import { Link, useNavigate } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    bio: "",
    avatar: null,
    password: "",
    role: "teacher",
    studentId: "",
    teacherAccessId: ""
  });
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("email", form.email);
      formData.append("phone", form.phone);
      formData.append("password", form.password);
      formData.append("role", form.role);
      formData.append("studentId", form.role === "student" ? form.studentId || "" : "");
      formData.append("teacherAccessId", form.role === "teacher" ? form.teacherAccessId || "" : "");
      formData.append("bio", form.bio);
      if (form.avatar) {
        formData.append("avatar", form.avatar);
      }
      const { data } = await api.post("/auth/register", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("auth_user", JSON.stringify(data.user));
      localStorage.setItem("welcome_popup_pending", "1");
      navigate(data.user.role === "teacher" ? "/" : "/student");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="auth-shell">
      <div className="card auth-card">
        <h1 className="page-title">Create account</h1>
        <p className="page-subtitle">Teacher and student access supported.</p>
        {error && <div className="auth-error">{error}</div>}
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
            placeholder="Email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            required
          />
          <input
            className="input"
            placeholder="Phone (for OTP recovery)"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
          />
          <input
            className="input"
            placeholder="Bio (optional)"
            value={form.bio}
            onChange={(event) => setForm({ ...form, bio: event.target.value })}
          />
          <input
            className="input"
            type="file"
            accept="image/*"
            onChange={(event) => setForm({ ...form, avatar: event.target.files?.[0] || null })}
          />
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            required
          />
          <select
            className="select"
            value={form.role}
            onChange={(event) => setForm({ ...form, role: event.target.value })}
          >
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
          </select>
          {form.role === "teacher" && (
            <input
              className="input"
              placeholder="Teacher ID"
              value={form.teacherAccessId}
              onChange={(event) => setForm({ ...form, teacherAccessId: event.target.value })}
              required
            />
          )}
          {form.role === "student" && (
            <input
              className="input"
              placeholder="Student profile ID (provided by teacher)"
              value={form.studentId}
              onChange={(event) => setForm({ ...form, studentId: event.target.value })}
              required
            />
          )}
          <button className="btn" type="submit">
            Create Account
          </button>
        </form>
        <div className="auth-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
