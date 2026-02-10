import React, { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get("/overview").then((res) => res.data);
      setOverview(data);
      setAnnouncements(data.announcements || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addAnnouncement = async () => {
    const title = prompt("Announcement title");
    if (!title) return;
    const note = prompt("Announcement note (optional)") || "";
    await api.post("/announcements", { title, note });
    load();
  };

  const updateAnnouncement = async (item) => {
    const title = prompt("Edit title", item.title);
    if (!title) return;
    const note = prompt("Edit note (optional)", item.note || "") || "";
    await api.post("/announcements", { title, note });
    await api.delete(`/announcements/${item._id}`);
    load();
  };

  const removeAnnouncement = async (id) => {
    await api.delete(`/announcements/${id}`);
    load();
  };

  if (loading || !overview) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Overview</h1>
            <p className="page-subtitle">Loading your dashboard...</p>
          </div>
        </div>
        {error ? (
          <div className="card" style={{ marginTop: "24px" }}>
            <div className="auth-error">{error}</div>
            <button className="btn" style={{ marginTop: "12px" }} onClick={load}>
              Retry
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  const stats = [
    { label: "Active Students", value: overview.stats.students },
    { label: "Homework Due", value: overview.stats.homeworkDue },
    { label: "Fees Pending", value: `₹${overview.stats.feesPendingTotal}` }
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Overview</h1>
          <p className="page-subtitle">Your weekly classroom snapshot.</p>
        </div>
        <button className="btn" onClick={addAnnouncement}>
          Add Announcement
        </button>
      </div>

      <div className="grid grid-3" style={{ marginTop: "24px" }}>
        {stats.map((item) => (
          <div className="card" key={item.label}>
            <div className="tag">{item.label}</div>
            <div style={{ fontSize: "28px", marginTop: "12px", fontWeight: 600 }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-2" style={{ marginTop: "24px" }}>
        <div className="card">
          <h2 className="card-title">This Week's Focus</h2>
          <div className="list">
            {overview.focus.map((item) => (
              <div className="list-item" key={`${item.subject}-${item.topic}`}>
                <div>
                  <div style={{ fontWeight: 600 }}>{item.topic}</div>
                  <div style={{ fontSize: "12px", color: "#6b7b7f" }}>
                    Target: {item.targetDate ? new Date(item.targetDate).toLocaleDateString() : "-"}
                  </div>
                </div>
                <span className="pill">{item.subject}</span>
              </div>
            ))}
            {!overview.focus.length && <div>No syllabus items due this week.</div>}
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">Upcoming</h2>
          <div className="list">
            {overview.upcoming.map((item) => (
              <div className="list-item" key={`${item.title}-${item.date}`}>
                <div>
                  <div style={{ fontWeight: 600 }}>{item.title}</div>
                  <div style={{ fontSize: "12px", color: "#6b7b7f" }}>{item.note}</div>
                </div>
                <span className="badge">
                  {item.date ? new Date(item.date).toLocaleDateString() : "-"}
                </span>
              </div>
            ))}
            {!overview.upcoming.length && <div>No upcoming items.</div>}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <h2 className="card-title">Announcements</h2>
        <div className="list">
          {announcements.map((item) => (
            <div className="list-item" key={item._id}>
              <div>
                <div style={{ fontWeight: 600 }}>{item.title}</div>
                {item.note ? (
                  <div style={{ fontSize: "12px", color: "#6b7b7f" }}>{item.note}</div>
                ) : null}
              </div>
              <div style={{ textAlign: "right" }}>
                <span className="badge">
                  {item.date ? new Date(item.date).toLocaleDateString() : "-"}
                </span>
                <button className="btn btn-ghost" onClick={() => updateAnnouncement(item)}>
                  Edit
                </button>
                <button className="btn btn-ghost" onClick={() => removeAnnouncement(item._id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
          {!announcements.length && <div>No announcements yet.</div>}
        </div>
      </div>
    </div>
  );
}
