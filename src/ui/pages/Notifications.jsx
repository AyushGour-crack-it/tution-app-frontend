import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { connectSocket } from "../socket.js";

const emptyForm = { title: "", message: "", studentId: "" };

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
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

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!user?.id || !token) return undefined;
    const socket = connectSocket(token);
    if (!socket) return undefined;

    const onNotificationNew = (notification) => {
      setItems((prev) => {
        if (!notification?._id || prev.some((item) => item._id === notification._id)) return prev;
        return [notification, ...prev].slice(0, 50);
      });
    };

    socket.on("notification:new", onNotificationNew);
    return () => socket.off("notification:new", onNotificationNew);
  }, [user?.id]);

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
    setClearing(true);
    try {
      await api.delete("/notifications/clear");
      await load();
      setShowClearConfirm(false);
    } finally {
      setClearing(false);
    }
  };

  const isRead = (item) => item.readBy?.includes(user?.id);

  return (
    <div className="page">
      {showClearConfirm ? (
        <div className="confirm-popup-overlay" onClick={() => setShowClearConfirm(false)}>
          <div className="confirm-popup-card" onClick={(event) => event.stopPropagation()}>
            <h3 className="confirm-popup-title">Are you sure?</h3>
            <p className="confirm-popup-text">Clear all notifications from your inbox?</p>
            <div className="confirm-popup-actions">
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => setShowClearConfirm(false)}
                disabled={clearing}
              >
                Cancel
              </button>
              <button className="btn" type="button" onClick={clearNotifications} disabled={clearing}>
                {clearing ? "Clearing..." : "Yes, Clear"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">Broadcasts and alerts.</p>
        </div>
        <button className="btn btn-ghost" type="button" onClick={() => setShowClearConfirm(true)}>
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
