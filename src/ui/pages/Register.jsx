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
    joinedAt: "",
    monthlyFee: "",
    grade: "",
    schoolName: "",
    address: "",
    guardianName: "",
    guardianPhone: "",
    guardianRelation: "",
    emergencyContact: "",
    hobbies: "",
    strongSubjects: "",
    weakSubjects: "",
    goals: ""
  });
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  const finishAuth = (data) => {
    setActiveAuthSession({ token: data.token, user: data.user });
    localStorage.setItem("welcome_popup_pending", "1");
    navigate(data.user.role === "teacher" ? "/" : "/student");
  };

  const appendStudentFields = (target) => {
    target.append("dateOfBirth", form.dateOfBirth || "");
    target.append("joinedAt", form.joinedAt || "");
    target.append("monthlyFee", form.monthlyFee || "");
    target.append("grade", form.grade || "");
    target.append("schoolName", form.schoolName || "");
    target.append("address", form.address || "");
    target.append("guardianName", form.guardianName || "");
    target.append("guardianPhone", form.guardianPhone || "");
    target.append("guardianRelation", form.guardianRelation || "");
    target.append("emergencyContact", form.emergencyContact || "");
    target.append("hobbies", form.hobbies || "");
    target.append("strongSubjects", form.strongSubjects || "");
    target.append("weakSubjects", form.weakSubjects || "");
    target.append("goals", form.goals || "");
  };

  const validateStudentForm = () => {
    if (!form.dateOfBirth) return "Date of birth is required for student signup.";
    if (!form.joinedAt) return "Tuition joining date is required.";
    if (!Number(form.monthlyFee) || Number(form.monthlyFee) <= 0) return "Monthly fee must be greater than 0.";
    return "";
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (form.role === "student") {
      const validationError = validateStudentForm();
      if (validationError) {
        setError(validationError);
        return;
      }
    }
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
        appendStudentFields(formData);
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
    if (form.role === "student") {
      const validationError = validateStudentForm();
      if (validationError) {
        setError(validationError);
        return;
      }
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
        joinedAt: form.joinedAt,
        monthlyFee: form.monthlyFee,
        grade: form.grade,
        schoolName: form.schoolName,
        address: form.address,
        guardianName: form.guardianName,
        guardianPhone: form.guardianPhone,
        guardianRelation: form.guardianRelation,
        emergencyContact: form.emergencyContact,
        hobbies: form.hobbies,
        strongSubjects: form.strongSubjects,
        weakSubjects: form.weakSubjects,
        goals: form.goals
      });
      finishAuth(data);
    } catch (err) {
      setError(err.response?.data?.message || "Google signup failed");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="auth-shell auth-shell-dark">
      <div className="card auth-card">
        <h1 className="page-title">Create account</h1>
        <p className="page-subtitle">Teacher and student access supported.</p>
        {error && <div className="auth-error">{error}</div>}
        <form className="form" onSubmit={submit}>
          <Field label="Full Name">
            <input
              className="input"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
          </Field>
          <Field label="Email">
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              required
            />
          </Field>
          <Field label="Password">
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required
            />
          </Field>
          <Field label="Role">
            <select
              className="select"
              value={form.role}
              onChange={(event) => setForm({ ...form, role: event.target.value })}
            >
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
            </select>
          </Field>
          <details className="form-section">
            <summary>Contact and profile <span>Optional</span></summary>
            <div className="form-section-fields">
              <Field label="Phone (OTP recovery)">
                <input
                  className="input"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
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
              <Field label="Profile photo">
                <input
                  className="input"
                  type="file"
                  accept="image/*"
                  onChange={(event) => setForm({ ...form, avatar: event.target.files?.[0] || null })}
                />
              </Field>
            </div>
          </details>
          {form.role === "teacher" && (
            <Field label="Teacher ID">
              <input
                className="input"
                value={form.teacherAccessId}
                onChange={(event) => setForm({ ...form, teacherAccessId: event.target.value })}
                required
              />
            </Field>
          )}
          {form.role === "student" ? (
            <>
              <Field label="Date of Birth">
                <input
                  className="input"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })}
                  required
                />
              </Field>
              <Field label="Tuition Joining Date">
                <input
                  className="input"
                  type="date"
                  value={form.joinedAt}
                  onChange={(event) => setForm({ ...form, joinedAt: event.target.value })}
                  required
                />
              </Field>
              <Field label="Monthly Fee (INR)">
                <input
                  className="input"
                  type="number"
                  inputMode="decimal"
                  min="1"
                  value={form.monthlyFee}
                  onChange={(event) => setForm({ ...form, monthlyFee: event.target.value })}
                  required
                />
              </Field>
              <details className="form-section">
                <summary>School and guardian details <span>Optional</span></summary>
                <div className="form-section-fields">
                  <Field label="Class / Grade">
                    <input className="input" value={form.grade} onChange={(event) => setForm({ ...form, grade: event.target.value })} />
                  </Field>
                  <Field label="School name">
                    <input className="input" value={form.schoolName} onChange={(event) => setForm({ ...form, schoolName: event.target.value })} />
                  </Field>
                  <Field label="Address">
                    <input className="input" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
                  </Field>
                  <Field label="Guardian name">
                    <input className="input" value={form.guardianName} onChange={(event) => setForm({ ...form, guardianName: event.target.value })} />
                  </Field>
                  <Field label="Guardian phone">
                    <input className="input" type="tel" inputMode="tel" value={form.guardianPhone} onChange={(event) => setForm({ ...form, guardianPhone: event.target.value })} />
                  </Field>
                  <Field label="Guardian relation">
                    <input className="input" value={form.guardianRelation} onChange={(event) => setForm({ ...form, guardianRelation: event.target.value })} />
                  </Field>
                  <Field label="Emergency contact">
                    <input className="input" type="tel" inputMode="tel" value={form.emergencyContact} onChange={(event) => setForm({ ...form, emergencyContact: event.target.value })} />
                  </Field>
                </div>
              </details>
              <details className="form-section">
                <summary>Interests and goals <span>Optional</span></summary>
                <div className="form-section-fields">
                  <Field label="Hobbies (comma separated)">
                    <input className="input" value={form.hobbies} onChange={(event) => setForm({ ...form, hobbies: event.target.value })} />
                  </Field>
                  <Field label="Strong subjects">
                    <input className="input" value={form.strongSubjects} onChange={(event) => setForm({ ...form, strongSubjects: event.target.value })} />
                  </Field>
                  <Field label="Subjects to improve">
                    <input className="input" value={form.weakSubjects} onChange={(event) => setForm({ ...form, weakSubjects: event.target.value })} />
                  </Field>
                  <Field label="Goals">
                    <input className="input" value={form.goals} onChange={(event) => setForm({ ...form, goals: event.target.value })} />
                  </Field>
                </div>
              </details>
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
