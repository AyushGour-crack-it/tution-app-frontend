import React, { useState } from "react";
import { api } from "../api.js";
import { Link, useNavigate } from "react-router-dom";
import GoogleAuthButton from "../components/GoogleAuthButton.jsx";
import { setActiveAuthSession } from "../authAccounts.js";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  const finishAuth = async (data) => {
    setActiveAuthSession({ token: data.token, user: data.user });
    localStorage.setItem("welcome_popup_pending", "1");
    navigate(data.user.role === "teacher" ? "/" : "/student");
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/auth/login", form);
      await finishAuth(data);
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  const signInWithGoogle = async (credential) => {
    setError("");
    setGoogleLoading(true);
    try {
      const { data } = await api.post("/auth/google", { credential, mode: "login" });
      await finishAuth(data);
    } catch (err) {
      setError(err.response?.data?.message || "Google sign-in failed");
    } finally {
      setGoogleLoading(false);
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
        <div className="auth-separator">or</div>
        <GoogleAuthButton
          text="signin_with"
          onCredential={signInWithGoogle}
          onError={setError}
          disabled={googleLoading}
        />
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
