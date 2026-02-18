import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { connectSocket } from "../socket.js";

const emptyForm = { studentId: "", month: "", total: "", payment: "" };

export default function Fees() {
  const [items, setItems] = useState([]);
  const [students, setStudents] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [offlineRequests, setOfflineRequests] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [feeData, studentData, transactionData, offlineData] = await Promise.all([
      api.get("/fees").then((res) => res.data),
      api.get("/students").then((res) => res.data),
      api.get("/fees/transactions").then((res) => res.data || []),
      api.get("/fees/offline-requests?status=pending").then((res) => res.data || [])
    ]);
    setItems(feeData);
    setStudents(studentData);
    setTransactions(transactionData);
    setOfflineRequests(offlineData);
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
    const onFeeUpdated = () => {
      load();
    };
    socket.on("fee:updated", onFeeUpdated);
    socket.on("connect", load);
    return () => {
      socket.off("fee:updated", onFeeUpdated);
      socket.off("connect", load);
    };
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    const payload = {
      studentId: form.studentId,
      month: form.month,
      total: Number(form.total || 0),
      payments: form.payment ? [{ amount: Number(form.payment) }] : []
    };
    if (editingId) {
      await api.put(`/fees/${editingId}`, payload);
    } else {
      await api.post("/fees", payload);
    }
    setEditingId(null);
    setForm(emptyForm);
    load();
  };

  const remove = async (id) => {
    await api.delete(`/fees/${id}`);
    load();
  };

  const edit = (row) => {
    setEditingId(row._id);
    setForm({
      studentId: row.studentId || "",
      month: row.month || "",
      total: row.total || "",
      payment: ""
    });
  };

  const addPayment = async (id) => {
    const amount = Number(prompt("Payment amount"));
    if (!amount) return;
    const method = prompt("Payment method (UPI/Cash)", "UPI") || "UPI";
    const reference = prompt("Reference/UTR (optional)", "") || "";
    await api.post(`/fees/${id}/payments`, { amount, method, reference });
    load();
  };

  const studentLookup = Object.fromEntries(students.map((item) => [item._id, item.name]));

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

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Fees</h1>
          <p className="page-subtitle">Track payments, dues, and monthly collection.</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <h2 className="card-title">Create Fee Record</h2>
        <form className="form" onSubmit={submit}>
          <select
            className="select"
            value={form.studentId}
            onChange={(event) => setForm({ ...form, studentId: event.target.value })}
            required
          >
            <option value="">Select student</option>
            {students.map((student) => (
              <option key={student._id} value={student._id}>
                {student.name}
              </option>
            ))}
          </select>
          <input
            className="input"
            placeholder="Month (e.g. Feb 2026)"
            value={form.month}
            onChange={(event) => setForm({ ...form, month: event.target.value })}
            required
          />
          <input
            className="input"
            type="number"
            placeholder="Total fee"
            value={form.total}
            onChange={(event) => setForm({ ...form, total: event.target.value })}
            required
          />
          <input
            className="input"
            type="number"
            placeholder="Initial payment"
            value={form.payment}
            onChange={(event) => setForm({ ...form, payment: event.target.value })}
          />
          <button className="btn" type="submit">
            {editingId ? "Update Fee" : "Save Fee"}
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
        <h2 className="card-title">Offline Payment Requests</h2>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="list">
            {offlineRequests.map((item) => (
              <div className="list-item" key={item._id}>
                <div>
                  <div style={{ fontWeight: 700 }}>
                    {item?.studentId?.name || "Student"} • ₹{Number(item.amount || 0)}
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
        <h2 className="card-title">Payment Transactions</h2>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Mobile</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Time</th>
                <th>Days Since Prev</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((row) => (
                <tr key={row.receiptId}>
                  <td>{row.studentName}</td>
                  <td>{row.studentPhone || "-"}</td>
                  <td>₹{Number(row.amount || 0).toLocaleString("en-IN")}</td>
                  <td>{row.method}</td>
                  <td>{row.paidOn ? new Date(row.paidOn).toLocaleString() : "-"}</td>
                  <td>{row.daysSincePrevious === null ? "-" : `${row.daysSincePrevious} day(s)`}</td>
                </tr>
              ))}
              {!transactions.length ? (
                <tr>
                  <td colSpan="6">No transactions yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <h2 className="card-title">All Fees</h2>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Month</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Due</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const paid = row.payments?.reduce((sum, item) => sum + item.amount, 0) || 0;
                const due = Math.max(row.total - paid, 0);
                return (
                  <tr key={row._id}>
                    <td>{studentLookup[row.studentId] || "-"}</td>
                    <td>{row.month}</td>
                    <td>{row.total}</td>
                    <td>{paid}</td>
                    <td>{due}</td>
                    <td>
                      <button className="btn btn-ghost" onClick={() => edit(row)}>
                        Edit
                      </button>
                      <button className="btn btn-ghost" onClick={() => addPayment(row._id)}>
                        Add Payment
                      </button>
                      <button className="btn btn-ghost" onClick={() => remove(row._id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!items.length && (
                <tr>
                  <td colSpan="6">No fee records yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
