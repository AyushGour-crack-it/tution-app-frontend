import React, { useState } from "react";
import { api } from "../api.js";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/auth/login", form);
      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("auth_user", JSON.stringify(data.user));
      localStorage.setItem("welcome_popup_pending", "1");
      navigate(data.user.role === "teacher" ? "/" : "/student");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="auth-shell">
      <div className="card auth-card">
        <h1 className="page-title">Welcome back</h1>
        <p className="page-subtitle">Sign in to your Our Tution workspace.</p>
        {error && <div className="auth-error">{error}</div>}
        <form className="form" onSubmit={submit}>
          <input
            className="input"
            placeholder="Email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            required
          />
          <button className="btn" type="submit">
            Sign In
          </button>
        </form>
        <div className="auth-link">
          No account? <Link to="/register">Create one</Link>
        </div>
        <div className="auth-link">
          <Link to="/forgot">Forgot password?</Link>
        </div>
      </div>
    </div>
  );
}
