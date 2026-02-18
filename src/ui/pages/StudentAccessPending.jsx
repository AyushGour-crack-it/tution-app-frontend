import React from "react";
import { api } from "../api.js";

export default function StudentAccessPending({ user, onRefresh, onLogout }) {
  const [loading, setLoading] = React.useState(false);
  const status = user?.studentApprovalStatus || "pending";
  const isPending = status === "pending";
  const message = user?.studentReviewMessage || "";

  React.useEffect(() => {
    if (!user?.id || !isPending) return undefined;
    const intervalId = setInterval(() => {
      onRefresh?.();
    }, 20000);
    return () => clearInterval(intervalId);
  }, [user?.id, isPending, onRefresh]);

  const refreshNow = async () => {
    setLoading(true);
    try {
      await api.get("/auth/me", { showGlobalLoader: false }).then((res) => {
        onRefresh?.(res?.data?.user || null);
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="card auth-card">
        <h1 className="page-title">
          {isPending ? "Registration Request Pending" : "Registration Declined"}
        </h1>
        <p className="page-subtitle">
          {isPending
            ? "Your account is waiting for teacher approval. You will get access once approved."
            : "Your request was reviewed and declined."}
        </p>
        {message ? (
          <div className="mini-card" style={{ marginTop: "12px" }}>
            <div className="mini-title">Teacher Message</div>
            <div className="mini-value">{message}</div>
          </div>
        ) : null}
        <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
          <button className="btn" type="button" onClick={refreshNow} disabled={loading}>
            {loading ? "Checking..." : "Check Again"}
          </button>
          <button className="btn btn-ghost" type="button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
