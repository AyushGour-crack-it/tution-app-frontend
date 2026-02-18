import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { connectSocket } from "../socket.js";

const emptyForm = {
  name: "",
  rollNumber: "",
  grade: "",
  dateOfBirth: "",
  schoolName: "",
  address: "",
  emergencyContact: "",
  subjects: "",
  guardianName: "",
  guardianPhone: "",
  guardianRelation: ""
};

export default function Students() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [data, requests] = await Promise.all([
      api.get("/students").then((res) => res.data),
      api.get("/auth/student-requests?status=pending").then((res) => res.data || [])
    ]);
    setItems(data);
    setPendingRequests(requests);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) return undefined;
    const socket = connectSocket(token);
    if (!socket) return undefined;
    const refresh = () => load();
    socket.on("students:updated", refresh);
    socket.on("connect", refresh);
    return () => {
      socket.off("students:updated", refresh);
      socket.off("connect", refresh);
    };
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    const payload = {
      name: form.name.trim(),
      rollNumber: form.rollNumber.trim(),
      grade: form.grade.trim(),
      dateOfBirth: form.dateOfBirth || null,
      schoolName: form.schoolName.trim(),
      address: form.address.trim(),
      emergencyContact: form.emergencyContact.trim(),
      subjects: form.subjects
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      guardian: {
        name: form.guardianName.trim(),
        phone: form.guardianPhone.trim(),
        relation: form.guardianRelation.trim()
      }
    };
    if (editingId) {
      await api.put(`/students/${editingId}`, payload);
    } else {
      await api.post("/students", payload);
    }
    setEditingId(null);
    setForm(emptyForm);
    load();
  };

  const remove = async (id) => {
    await api.delete(`/students/${id}`);
    load();
  };

  const edit = (student) => {
    setEditingId(student._id);
    setForm({
      name: student.name || "",
      rollNumber: student.rollNumber || "",
      grade: student.grade || "",
      dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().slice(0, 10) : "",
      schoolName: student.schoolName || "",
      address: student.address || "",
      emergencyContact: student.emergencyContact || "",
      subjects: (student.subjects || []).join(", "),
      guardianName: student.guardian?.name || "",
      guardianPhone: student.guardian?.phone || "",
      guardianRelation: student.guardian?.relation || ""
    });
  };

  const reviewRequest = async (userId, action) => {
    const message = prompt(
      action === "reject" ? "Why are you rejecting this request?" : "Optional approval message",
      action === "approve" ? "Approved. Welcome to the class." : ""
    ) || "";
    await api.post(`/auth/student-requests/${userId}/review`, { action, message });
    load();
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-subtitle">Maintain profiles, guardians, and academic activity logs.</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <h2 className="card-title">Pending Registration Requests</h2>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="list">
            {pendingRequests.map((req) => (
              <div className="list-item" key={req._id}>
                <div>
                  <div style={{ fontWeight: 700 }}>{req.name}</div>
                  <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                    {req.email} • {req.phone || "No phone"}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                    DOB: {req?.pendingStudentProfile?.dateOfBirth ? new Date(req.pendingStudentProfile.dateOfBirth).toLocaleDateString() : "-"}
                    {" "}• Class: {req?.pendingStudentProfile?.grade || "-"}
                    {" "}• School: {req?.pendingStudentProfile?.schoolName || "-"}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                    Guardian: {req?.pendingStudentProfile?.guardianName || "-"} ({req?.pendingStudentProfile?.guardianPhone || "-"})
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button className="btn btn-ghost" onClick={() => reviewRequest(req._id, "approve")}>
                    Approve
                  </button>
                  <button className="btn btn-ghost" onClick={() => reviewRequest(req._id, "reject")}>
                    Reject
                  </button>
                </div>
              </div>
            ))}
            {!pendingRequests.length ? <div>No pending student requests.</div> : null}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <h2 className="card-title">Add Student</h2>
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
            placeholder="Roll number"
            value={form.rollNumber}
            onChange={(event) => setForm({ ...form, rollNumber: event.target.value })}
          />
          <input
            className="input"
            placeholder="Grade"
            value={form.grade}
            onChange={(event) => setForm({ ...form, grade: event.target.value })}
          />
          <input
            className="input"
            type="date"
            placeholder="Date of birth"
            value={form.dateOfBirth}
            onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })}
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
            placeholder="Emergency contact"
            value={form.emergencyContact}
            onChange={(event) => setForm({ ...form, emergencyContact: event.target.value })}
          />
          <input
            className="input"
            placeholder="Subjects (comma separated)"
            value={form.subjects}
            onChange={(event) => setForm({ ...form, subjects: event.target.value })}
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
          <button className="btn" type="submit">
            {editingId ? "Update Student" : "Save Student"}
          </button>
          {editingId && (
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
              Cancel
            </button>
          )}
        </form>
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <h2 className="card-title">Student Directory</h2>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>ID</th>
                <th>Grade</th>
                <th>Subjects</th>
                <th>Guardian</th>
                <th>DOB</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((student) => (
                <tr key={student._id}>
                  <td>{student.name}</td>
                  <td style={{ fontSize: "12px" }}>{student._id}</td>
                  <td>{student.grade}</td>
                  <td>{student.subjects?.join(", ")}</td>
                  <td>{student.guardian?.name || "-"}</td>
                  <td>{student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : "-"}</td>
                  <td>
                    <button className="btn btn-ghost" onClick={() => edit(student)}>
                      Edit
                    </button>
                    <button className="btn btn-ghost" onClick={() => remove(student._id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td colSpan="7">No students yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
