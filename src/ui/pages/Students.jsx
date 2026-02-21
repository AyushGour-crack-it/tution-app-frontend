import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { connectSocket } from "../socket.js";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

export default function Students() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [directory, requests] = await Promise.all([
      api.get("/students/directory").then((res) => res.data || []),
      api.get("/auth/student-requests?status=pending").then((res) => res.data || [])
    ]);
    setItems(directory);
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

  const reviewRequest = async (userId, action) => {
    const message = prompt(
      action === "reject" ? "Why are you rejecting this request?" : "Optional approval message",
      action === "approve" ? "Approved. Welcome to the class." : ""
    ) || "";
    await api.post(`/auth/student-requests/${userId}/review`, { action, message });
    load();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((student) => {
      const text = [
        student.name,
        student.email,
        student.phone,
        student.rollNumber,
        student.grade,
        student.schoolName
      ]
        .map((item) => String(item || "").toLowerCase())
        .join(" ");
      return text.includes(q);
    });
  }, [items, search]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-subtitle">Student cards with full biodata on open.</p>
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
                    Joined: {req?.pendingStudentProfile?.joinedAt ? new Date(req.pendingStudentProfile.joinedAt).toLocaleDateString() : "-"}
                    {" "}• Monthly Fee: {req?.pendingStudentProfile?.monthlyFee ? money(req.pendingStudentProfile.monthlyFee) : "-"}
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
        <div className="page-header">
          <h2 className="card-title" style={{ margin: 0 }}>Student Cards</h2>
          <input
            className="input"
            style={{ maxWidth: "320px" }}
            placeholder="Search students"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="student-fee-card-grid">
            {filtered.map((student) => (
              <button
                key={student.userId}
                type="button"
                className="student-fee-card"
                onClick={() => navigate(`/students/${student.userId}`)}
              >
                <div className="student-fee-card-title">{student.name || "Student"}</div>
                <div className="student-fee-card-row">
                  <span>Class</span>
                  <strong>{student.grade || "-"}</strong>
                </div>
                <div className="student-fee-card-row">
                  <span>Monthly Fee</span>
                  <strong>{student.monthlyFee ? money(student.monthlyFee) : "-"}</strong>
                </div>
                <div className="student-fee-card-row">
                  <span>Guardian</span>
                  <strong>{student.guardian?.name || "-"}</strong>
                </div>
                <div className="student-fee-card-foot">
                  {student.email || "-"} • {student.phone || "-"}
                </div>
              </button>
            ))}
            {!filtered.length ? <div>No students found.</div> : null}
          </div>
        )}
      </div>
    </div>
  );
}
