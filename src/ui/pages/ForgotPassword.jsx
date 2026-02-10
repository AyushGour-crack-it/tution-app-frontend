import React, { useState } from "react";
import { api } from "../api.js";
import { Link } from "react-router-dom";

export default function ForgotPassword() {
  const [step, setStep] = useState("request");
  const [channel, setChannel] = useState("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const requestOtp = async () => {
    setError("");
    setMessage("");
    try {
      await api.post("/auth/request-otp", { channel, email, phone });
      setStep("verify");
      setMessage("OTP sent. Check your email or phone.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP");
    }
  };

  const resetPassword = async () => {
    setError("");
    setMessage("");
    try {
      await api.post("/auth/reset-password", { channel, email, phone, code, newPassword });
      setMessage("Password updated. You can log in now.");
      setStep("done");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password");
    }
  };

  return (
    <div className="auth-shell">
      <div className="card auth-card">
        <h1 className="page-title">Reset Password</h1>
        <p className="page-subtitle">Use OTP sent to email or phone.</p>
        {message && <div className="auth-success">{message}</div>}
        {error && <div className="auth-error">{error}</div>}

        {step === "request" && (
          <>
            <select className="select" value={channel} onChange={(e) => setChannel(e.target.value)}>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
            </select>
            {channel === "email" ? (
              <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            ) : (
              <input className="input" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            )}
            <button className="btn" onClick={requestOtp} type="button">
              Send OTP
            </button>
          </>
        )}

        {step === "verify" && (
          <>
            <input className="input" placeholder="OTP Code" value={code} onChange={(e) => setCode(e.target.value)} />
            <input
              className="input"
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <button className="btn" onClick={resetPassword} type="button">
              Update Password
            </button>
          </>
        )}

        {step === "done" && (
          <div className="auth-link">
            <Link to="/login">Go to login</Link>
          </div>
        )}
      </div>
    </div>
  );
}
