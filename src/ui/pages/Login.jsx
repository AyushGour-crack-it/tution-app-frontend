import React, { useState } from "react";
import { api } from "../api.js";
import { Link, useNavigate } from "react-router-dom";
import GoogleAuthButton from "../components/GoogleAuthButton.jsx";
import { setActiveAuthSession } from "../authAccounts.js";

const Field = ({ label, children }) => (
  <label className="field">
    <span className="field-label">{label}</span>
    {children}
  </label>
);

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const finishAuth = async (data) => {
    setActiveAuthSession({ token: data.token, user: data.user });
    localStorage.setItem("welcome_popup_pending", "1");
    navigate(data.user.role === "teacher" ? "/" : "/student");
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoginLoading(true);

    try {
      const { data } = await api.post("/auth/login", form);
      setRetryCount(0); // Reset retry count on success
      await finishAuth(data);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "Login failed";
      setError(errorMessage);

      // If it's a network error and we haven't retried too many times, suggest retry
      if ((!err.response || err.code === 'NETWORK_ERROR') && retryCount < 2) {
        setRetryCount(prev => prev + 1);
        setError(`${errorMessage}. Please try again (${retryCount + 1}/3 attempts).`);
      }
    } finally {
      setLoginLoading(false);
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
    <div className="auth-shell-premium">
      <div className="auth-card-premium">
        <div className="auth-logo-premium">
          <img src="/icons/pwa-192.png" alt="Our Tuition" />
          <h1 className="auth-title-premium">Our Tuition</h1>
          <p className="auth-subtitle-premium">Welcome back to your premium learning workspace</p>
        </div>

        {error && <div className="auth-error-premium">{error}</div>}

        <form className="auth-form-premium" onSubmit={submit}>
          <div className="auth-field-premium">
            <label className="auth-field-label-premium">Email Address</label>
            <input
              className="auth-input-premium"
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="Enter your email address"
              required
            />
          </div>

          <div className="auth-field-premium">
            <label className="auth-field-label-premium">Password</label>
            <input
              className="auth-input-premium"
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder="Enter your password"
              required
            />
          </div>

          <button className="auth-button-premium" type="submit" disabled={loginLoading}>
            {loginLoading ? "Signing In..." : "Sign In to Your Account"}
          </button>
        </form>

        <div className="auth-separator-premium">
          <span>or continue with</span>
        </div>

        <div className="auth-google-premium">
          <GoogleAuthButton
            text="signin_with"
            onCredential={signInWithGoogle}
            onError={setError}
            disabled={googleLoading}
          />
        </div>

        <div className="auth-links-premium">
          <div className="auth-link-premium">
            Don't have an account? <Link to="/register">Create one</Link>
          </div>
          <div className="auth-link-premium">
            <Link to="/forgot">Forgot password?</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
