import React, { useEffect, useState } from "react";
import { api } from "../api.js";

const emptyForm = { title: "", message: "", studentId: "" };

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("auth_user") || "null");
    } catch {
      return null;
    }
  })();

  const load = async () => {
    setLoading(true);
    const data = await api.get("/notifications").then((res) => res.data);
    setItems(data);
    if (user?.role === "teacher") {
      const studentData = await api.get("/students").then((res) => res.data);
      setStudents(studentData);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    await api.post("/notifications", {
      title: form.title.trim(),
      message: form.message.trim(),
      studentId: form.studentId || null
    });
    setForm(emptyForm);
    load();
  };

  const markRead = async (id) => {
    await api.post(`/notifications/${id}/read`);
    load();
  };

  const clearNotifications = async () => {
    if (!window.confirm("Clear notifications from your inbox?")) return;
    await api.delete("/notifications/clear");
    load();
  };

  const isRead = (item) => item.readBy?.includes(user?.id);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">Broadcasts and alerts.</p>
        </div>
        <button className="btn btn-ghost" type="button" onClick={clearNotifications}>
          Clear Notifications
        </button>
      </div>

      {user?.role === "teacher" && (
        <div className="card" style={{ marginTop: "24px" }}>
          <h2 className="card-title">Send Notification</h2>
          <form className="form" onSubmit={submit}>
            <input
              className="input"
              placeholder="Title"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              required
            />
            <input
              className="input"
              placeholder="Message"
              value={form.message}
              onChange={(event) => setForm({ ...form, message: event.target.value })}
              required
            />
            <select
              className="select"
              value={form.studentId}
              onChange={(event) => setForm({ ...form, studentId: event.target.value })}
            >
              <option value="">All Students</option>
              {students.map((student) => (
                <option key={student._id} value={student._id}>
                  {student.name}
                </option>
              ))}
            </select>
            <button className="btn" type="submit">
              Send
            </button>
          </form>
        </div>
      )}

      <div className="card" style={{ marginTop: "24px" }}>
        <h2 className="card-title">Inbox</h2>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="list">
            {items.map((item) => (
              <div className="list-item" key={item._id}>
                <div>
                  <div style={{ fontWeight: 600 }}>{item.title}</div>
                  <div style={{ fontSize: "12px", color: "var(--muted)" }}>{item.message}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span className="badge">
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "-"}
                  </span>
                  <button className="btn btn-ghost" onClick={() => markRead(item._id)}>
                    {isRead(item) ? "Read" : "Mark Read"}
                  </button>
                </div>
              </div>
            ))}
            {!items.length && <div>No notifications yet.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
