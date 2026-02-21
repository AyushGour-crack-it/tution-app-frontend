import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { connectSocket } from "../socket.js";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

export default function Fees() {
  const [items, setItems] = useState([]);
  const [students, setStudents] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [offlineRequests, setOfflineRequests] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [feeData, studentData, transactionData, offlineData] = await Promise.all([
      api.get("/fees").then((res) => res.data || []),
      api.get("/students").then((res) => res.data || []),
      api.get("/fees/transactions").then((res) => res.data || []),
      api.get("/fees/offline-requests?status=pending").then((res) => res.data || [])
    ]);
    setItems(feeData);
    setStudents(studentData);
    setTransactions(transactionData);
    setOfflineRequests(offlineData);
    setSelectedStudentId((prev) => {
      if (prev && studentData.some((item) => item._id === prev)) return prev;
      const firstPending = studentData.find((student) => {
        const studentFees = feeData.filter((fee) => String(fee.studentId) === String(student._id));
        const pendingAmount = studentFees.reduce((sum, fee) => {
          const paid = fee.payments?.reduce((acc, payment) => acc + Number(payment.amount || 0), 0) || 0;
          return sum + Math.max(Number(fee.total || 0) - paid, 0);
        }, 0);
        return pendingAmount > 0;
      });
      return firstPending?._id || studentData[0]?._id || "";
    });
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
    const onFeeUpdated = () => load();
    socket.on("fee:updated", onFeeUpdated);
    socket.on("connect", load);
    return () => {
      socket.off("fee:updated", onFeeUpdated);
      socket.off("connect", load);
    };
  }, []);

  const reviewOfflineRequest = async (requestId, action) => {
    const teacherNote = prompt(
      action === "reject" ? "Why rejecting this request?" : "Optional note",
      ""
    ) || "";
    const method = action === "approve"
      ? (prompt("Payment method for this offline receipt (Cash/UPI/Bank)", "Cash") || "Cash")
      : "";

    await api.post(`/fees/offline-requests/${requestId}/review`, {
      action,
      teacherNote,
      method
    });
    load();
  };

  const studentCards = useMemo(() => {
    return students
      .map((student) => {
        const feeRows = items.filter((fee) => String(fee.studentId) === String(student._id));
        const studentTransactions = transactions.filter(
          (tx) => String(tx.studentId || "") === String(student._id)
        );
        const total = feeRows.reduce((sum, fee) => sum + Number(fee.total || 0), 0);
        const paid = feeRows.reduce(
          (sum, fee) => sum + (fee.payments?.reduce((acc, payment) => acc + Number(payment.amount || 0), 0) || 0),
          0
        );
        const due = Math.max(total - paid, 0);
        return {
          student,
          feeRows,
          studentTransactions,
          total,
          paid,
          due
        };
      })
      .sort((a, b) => {
        const dueDelta = Number(b.due || 0) - Number(a.due || 0);
        if (dueDelta !== 0) return dueDelta;
        return String(a.student?.name || "").localeCompare(String(b.student?.name || ""));
      });
  }, [students, items, transactions]);

  const activeStudentData = studentCards.find((card) => String(card.student._id) === String(selectedStudentId)) || null;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Fees</h1>
          <p className="page-subtitle">
            Monthly fees are auto-generated from each student&apos;s joining date and monthly fee.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <h2 className="card-title">Offline Payment Requests</h2>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="list">
            {offlineRequests.map((item) => (
              <div className="list-item" key={item._id}>
                <div>
                  <div style={{ fontWeight: 700 }}>
                    {item?.studentId?.name || "Student"} • {money(item.amount)}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                    {item?.studentId?.phone || item?.studentId?.guardian?.phone || "No phone"} •
                    {" "}Month: {item?.feeId?.month || "-"}
                  </div>
                  {item?.message ? (
                    <div style={{ fontSize: "12px", color: "var(--muted)" }}>{item.message}</div>
                  ) : null}
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button className="btn btn-ghost" onClick={() => reviewOfflineRequest(item._id, "approve")}>
                    Approve
                  </button>
                  <button className="btn btn-ghost" onClick={() => reviewOfflineRequest(item._id, "reject")}>
                    Reject
                  </button>
                </div>
              </div>
            ))}
            {!offlineRequests.length ? <div>No pending offline requests.</div> : null}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <h2 className="card-title">Students Fee Cards</h2>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="student-fee-card-grid">
            {studentCards.map((card) => {
              const selected = String(card.student._id) === String(selectedStudentId);
              return (
                <button
                  key={card.student._id}
                  type="button"
                  className={`student-fee-card${selected ? " student-fee-card-active" : ""}`}
                  onClick={() => setSelectedStudentId(card.student._id)}
                >
                  <div className="student-fee-card-title">{card.student.name || "Student"}</div>
                  <div className="student-fee-card-row">
                    <span>Total</span>
                    <strong>{money(card.total)}</strong>
                  </div>
                  <div className="student-fee-card-row">
                    <span>Paid</span>
                    <strong>{money(card.paid)}</strong>
                  </div>
                  <div className="student-fee-card-row">
                    <span>Due</span>
                    <strong>{money(card.due)}</strong>
                  </div>
                  <div className="student-fee-card-foot">
                    {card.studentTransactions.length} payment transaction(s)
                  </div>
                </button>
              );
            })}
            {!studentCards.length ? <div>No students found.</div> : null}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <h2 className="card-title">Selected Student History</h2>
        {!activeStudentData ? (
          <div>{loading ? "Loading..." : "Select a student card to view details."}</div>
        ) : (
          <>
            <div className="list" style={{ marginBottom: "14px" }}>
              <div className="list-item">
                <div>
                  <div style={{ fontWeight: 700 }}>{activeStudentData.student.name}</div>
                  <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                    {activeStudentData.student.phone || activeStudentData.student.guardian?.phone || "-"}
                  </div>
                </div>
                <div className="pill">Due: {money(activeStudentData.due)}</div>
              </div>
            </div>

            <h3 style={{ marginBottom: "8px" }}>Fee Records</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Due Date</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {activeStudentData.feeRows.map((row) => {
                  const paid = row.payments?.reduce((sum, payment) => sum + Number(payment.amount || 0), 0) || 0;
                  const due = Math.max(Number(row.total || 0) - paid, 0);
                  return (
                    <tr key={row._id}>
                      <td>{row.month}</td>
                      <td>{row.dueDate ? new Date(row.dueDate).toLocaleDateString() : "-"}</td>
                      <td>{money(row.total)}</td>
                      <td>{money(paid)}</td>
                      <td>{money(due)}</td>
                    </tr>
                  );
                })}
                {!activeStudentData.feeRows.length ? (
                  <tr>
                    <td colSpan="5">No fee records yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>

            <h3 style={{ margin: "18px 0 8px" }}>Transaction History</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Amount</th>
                  <th>Mode</th>
                  <th>Transaction ID</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>XP</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {activeStudentData.studentTransactions.map((row) => (
                  <tr key={row.receiptId}>
                    <td>{money(row.amount)}</td>
                    <td>{row.paymentMode || row.method}</td>
                    <td>{row.transactionId || "-"}</td>
                    <td>{row.dueDate ? new Date(row.dueDate).toLocaleDateString() : "-"}</td>
                    <td>{row.timingLabel || "on time"}</td>
                    <td>+{Number(row.xpAwarded || 0)}</td>
                    <td>{row.paidOn ? new Date(row.paidOn).toLocaleString() : "-"}</td>
                  </tr>
                ))}
                {!activeStudentData.studentTransactions.length ? (
                  <tr>
                    <td colSpan="7">No transactions yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
