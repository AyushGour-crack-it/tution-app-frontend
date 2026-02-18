import React, { useState } from "react";
import { api } from "../api.js";
import { Link, useNavigate } from "react-router-dom";
import GoogleAuthButton from "../components/GoogleAuthButton.jsx";

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
    teacherAccessId: "",
    dateOfBirth: "",
    grade: "",
    schoolName: "",
    address: "",
    guardianName: "",
    guardianPhone: "",
    guardianRelation: "",
    emergencyContact: ""
  });
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  const finishAuth = (data) => {
    localStorage.setItem("auth_token", data.token);
    localStorage.setItem("auth_user", JSON.stringify(data.user));
    localStorage.setItem("welcome_popup_pending", "1");
    navigate(data.user.role === "teacher" ? "/" : "/student");
  };

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
      formData.append("teacherAccessId", form.role === "teacher" ? form.teacherAccessId || "" : "");
      formData.append("bio", form.bio);
      if (form.role === "student") {
        formData.append("dateOfBirth", form.dateOfBirth || "");
        formData.append("grade", form.grade || "");
        formData.append("schoolName", form.schoolName || "");
        formData.append("address", form.address || "");
        formData.append("guardianName", form.guardianName || "");
        formData.append("guardianPhone", form.guardianPhone || "");
        formData.append("guardianRelation", form.guardianRelation || "");
        formData.append("emergencyContact", form.emergencyContact || "");
      }
      if (form.avatar) {
        formData.append("avatar", form.avatar);
      }
      const { data } = await api.post("/auth/register", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      finishAuth(data);
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    }
  };

  const registerWithGoogle = async (credential) => {
    setError("");
    if (form.role === "teacher" && !form.teacherAccessId.trim()) {
      setError("Teacher ID is required for teacher signup.");
      return;
    }
    if (form.role === "student" && !form.dateOfBirth) {
      setError("Date of birth is required for student signup.");
      return;
    }
    setGoogleLoading(true);
    try {
      const { data } = await api.post("/auth/google", {
        credential,
        mode: "register",
        role: form.role,
        teacherAccessId: form.role === "teacher" ? form.teacherAccessId : "",
        name: form.name,
        phone: form.phone,
        bio: form.bio,
        dateOfBirth: form.dateOfBirth,
        grade: form.grade,
        schoolName: form.schoolName,
        address: form.address,
        guardianName: form.guardianName,
        guardianPhone: form.guardianPhone,
        guardianRelation: form.guardianRelation,
        emergencyContact: form.emergencyContact
      });
      finishAuth(data);
    } catch (err) {
      setError(err.response?.data?.message || "Google signup failed");
    } finally {
      setGoogleLoading(false);
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
          {form.role === "student" ? (
            <>
              <input
                className="input"
                type="date"
                placeholder="Date of birth"
                value={form.dateOfBirth}
                onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })}
                required
              />
              <input
                className="input"
                placeholder="Class / Grade"
                value={form.grade}
                onChange={(event) => setForm({ ...form, grade: event.target.value })}
              />
              <input
                className="input"
                placeholder="School name"
                value={form.schoolName}
                onChange={(event) => setForm({ ...form, schoolName: event.target.value })}
              />
              <input
                className="input"
                placeholder="Address"
                value={form.address}
                onChange={(event) => setForm({ ...form, address: event.target.value })}
              />
              <input
                className="input"
                placeholder="Guardian name"
                value={form.guardianName}
                onChange={(event) => setForm({ ...form, guardianName: event.target.value })}
              />
              <input
                className="input"
                placeholder="Guardian phone"
                value={form.guardianPhone}
                onChange={(event) => setForm({ ...form, guardianPhone: event.target.value })}
              />
              <input
                className="input"
                placeholder="Guardian relation"
                value={form.guardianRelation}
                onChange={(event) => setForm({ ...form, guardianRelation: event.target.value })}
              />
              <input
                className="input"
                placeholder="Emergency contact"
                value={form.emergencyContact}
                onChange={(event) => setForm({ ...form, emergencyContact: event.target.value })}
              />
            </>
          ) : null}
          <button className="btn" type="submit">
            Create Account
          </button>
        </form>
        <div className="auth-separator">or</div>
        <GoogleAuthButton
          text="signup_with"
          onCredential={registerWithGoogle}
          onError={setError}
          disabled={googleLoading}
        />
        <div className="auth-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
