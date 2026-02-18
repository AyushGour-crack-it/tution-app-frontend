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
    { label: "Fees Pending", value: `₹${overview.stats.feesPendingTotal}` },
    { label: "Fees Collected", value: `₹${overview.stats.feesCollectedTotal || 0}` }
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
            <div className="dashboard-stat-value">
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <h2 className="card-title">Fees Collection Overview</h2>
        <div className="grid grid-3" style={{ marginTop: "8px" }}>
          <div className="mini-card">
            <div className="mini-title">Collected This Month</div>
            <div className="mini-value">₹{overview.feesOverview?.collectedThisMonth || 0}</div>
          </div>
          <div className="mini-card">
            <div className="mini-title">Collection Rate</div>
            <div className="mini-value">{overview.feesOverview?.collectionRate || 0}%</div>
          </div>
          <div className="mini-card">
            <div className="mini-title">Students With Pending</div>
            <div className="mini-value">{overview.feesOverview?.studentsWithPending || 0}</div>
          </div>
        </div>
        <div style={{ marginTop: "16px" }}>
          <h3 className="card-title" style={{ marginBottom: "8px" }}>Recent Payments</h3>
          <div className="list">
            {(overview.feesOverview?.recentPayments || []).map((item) => (
              <div className="list-item" key={item.id}>
                <div>
                  <div className="dashboard-item-title">{item.studentName}</div>
                  <div className="dashboard-item-subtitle">
                    {item.studentPhone || "No mobile"} • {item.method} • {item.paidOn ? new Date(item.paidOn).toLocaleString() : "-"}
                  </div>
                  <div className="dashboard-item-subtitle">
                    {item.daysSincePrevious === null ? "First payment record" : `${item.daysSincePrevious} day(s) since previous payment`}
                  </div>
                </div>
                <span className="pill">₹{item.amount}</span>
              </div>
            ))}
            {!(overview.feesOverview?.recentPayments || []).length ? (
              <div>No recent fee payments yet.</div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: "24px" }}>
        <div className="card">
          <h2 className="card-title">This Week's Focus</h2>
          <div className="list">
            {overview.focus.map((item) => (
              <div className="list-item" key={`${item.subject}-${item.topic}`}>
                <div>
                  <div className="dashboard-item-title">{item.topic}</div>
                  <div className="dashboard-item-subtitle">
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
                  <div className="dashboard-item-title">{item.title}</div>
                  <div className="dashboard-item-subtitle">{item.note}</div>
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
                <div className="dashboard-item-title">{item.title}</div>
                {item.note ? (
                  <div className="dashboard-item-subtitle">{item.note}</div>
                ) : null}
              </div>
              <div className="dashboard-ann-actions">
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
