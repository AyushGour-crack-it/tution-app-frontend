import React, { useEffect, useState } from "react";
import { api } from "../api.js";

export default function BadgeRequests() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectMessages, setRejectMessages] = useState({});
  const [status, setStatus] = useState("pending");

  const load = async () => {
    setLoading(true);
    const data = await api.get(`/badges/requests?status=${status}`).then((res) => res.data || []);
    setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [status]);

  const review = async (id, action) => {
    const teacherMessage = String(rejectMessages[id] || "");
    await api.post(`/badges/requests/${id}/review`, { action, teacherMessage });
    await load();
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Badge Requests</h1>
          <p className="page-subtitle">Approve or reject student badge requests.</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <select className="select" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        {loading ? (
          <div>Loading requests...</div>
        ) : (
          <div className="list">
            {items.map((item) => (
              <div className="list-item" key={item._id}>
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {item.student?.name || "Student"} requested {item.badge?.title || item.badgeKey}
                  </div>
                  <div className="student-directory-meta">
                    {item.badge?.rarity?.toUpperCase() || "BADGE"} • {item.badge?.xpValue || 0} XP
                  </div>
                  {item.requestMessage ? (
                    <div className="student-directory-meta">Student note: {item.requestMessage}</div>
                  ) : null}
                  {item.status === "rejected" && item.teacherMessage ? (
                    <div className="student-directory-meta">Rejected: {item.teacherMessage}</div>
                  ) : null}
                </div>
                {item.status === "pending" ? (
                  <div style={{ display: "grid", gap: "8px", minWidth: "220px" }}>
                    <input
                      className="input"
                      placeholder="Rejection reason (required if rejecting)"
                      value={rejectMessages[item._id] || ""}
                      onChange={(event) =>
                        setRejectMessages((prev) => ({ ...prev, [item._id]: event.target.value }))
                      }
                    />
                    <button className="btn" type="button" onClick={() => review(item._id, "approve")}>
                      Approve
                    </button>
                    <button className="btn btn-ghost" type="button" onClick={() => review(item._id, "reject")}>
                      Reject
                    </button>
                  </div>
                ) : (
                  <span className="pill">{item.status.toUpperCase()}</span>
                )}
              </div>
            ))}
            {!items.length ? <div>No requests in this status.</div> : null}
          </div>
        )}
      </div>
    </div>
  );
}
