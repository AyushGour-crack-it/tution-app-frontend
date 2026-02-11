import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";

const loadRazorpaySdk = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export default function StudentPortal({ section = "dashboard", previewStudentId = "" }) {
  const [homework, setHomework] = useState([]);
  const [fees, setFees] = useState([]);
  const [marks, setMarks] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [todo, setTodo] = useState([]);
  const [todoText, setTodoText] = useState("");
  const [loading, setLoading] = useState(true);
  const [payingFeeId, setPayingFeeId] = useState("");
  const [feeError, setFeeError] = useState("");
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("auth_user") || "null");
    } catch {
      return null;
    }
  }, []);
  const effectiveStudentId = previewStudentId || user?.studentId || user?.id || "";

  const upiId = "ayushgour2526@oksbi";
  const upiName = "Ayush Gour";
  const phone = "8265968179";

  const load = async () => {
    setLoading(true);
    const [homeworkData, feeData, invoiceData, receiptData] = await Promise.all([
      api.get("/homeworks").then((res) => res.data),
      api.get(previewStudentId ? `/fees?studentId=${previewStudentId}` : "/fees").then((res) => res.data),
      api.get(previewStudentId ? `/invoices?studentId=${previewStudentId}` : "/invoices").then((res) => res.data),
      api.get(previewStudentId ? `/receipts?studentId=${previewStudentId}` : "/receipts").then((res) => res.data)
    ]);
    setHomework(homeworkData);
    setFees(feeData);
    setInvoices(invoiceData);
    setReceipts(receiptData);
    const markData = await api
      .get(previewStudentId ? `/marks?studentId=${previewStudentId}` : "/marks")
      .then((res) => res.data);
    setMarks(markData);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [previewStudentId]);

  useEffect(() => {
    if (!effectiveStudentId) return;
    const key = `todo_${effectiveStudentId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      setTodo(JSON.parse(stored));
    }
  }, [effectiveStudentId]);

  useEffect(() => {
    if (!effectiveStudentId) return;
    const key = `todo_${effectiveStudentId}`;
    localStorage.setItem(key, JSON.stringify(todo));
  }, [todo, effectiveStudentId]);

  const addTodo = () => {
    if (!todoText.trim()) return;
    setTodo((prev) => [...prev, { id: Date.now(), text: todoText.trim(), done: false }]);
    setTodoText("");
  };

  const toggleTodo = (id) => {
    setTodo((prev) => prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item)));
  };

  const removeTodo = (id) => {
    setTodo((prev) => prev.filter((item) => item.id !== id));
  };

  const messageList = [
    "Small steps every day become big results.",
    "Focus is your superpower. Use it well.",
    "Discipline beats motivation when motivation fades.",
    "Learn one thing deeply today.",
    "You are capable of more than you feel right now."
  ];
  const dailyMessage = messageList[new Date().getDate() % messageList.length];

  const getCalendarDays = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i += 1) {
      cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(day);
    }
    return { cells, today: now.getDate(), monthLabel: now.toLocaleString("default", { month: "long", year: "numeric" }) };
  };

  const calendar = getCalendarDays();

  const upiLink = (amount) => {
    const params = new URLSearchParams({
      pa: upiId,
      pn: upiName,
      am: amount ? String(amount) : "",
      cu: "INR",
      tn: "Tuition Fee"
    });
    return `upi://pay?${params.toString()}`;
  };
  const qrUrl = (amount) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
      upiLink(amount)
    )}`;

  const payFeeOnline = async (feeId, amount) => {
    if (!amount || amount <= 0) return;
    setFeeError("");
    setPayingFeeId(feeId);
    let checkoutOpened = false;
    try {
      const sdkReady = await loadRazorpaySdk();
      if (!sdkReady) {
        setFeeError("Razorpay checkout failed to load.");
        return;
      }

      const { data: order } = await api.post(`/fees/${feeId}/razorpay/order`, { amount });

      const options = {
        key: order.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID || "",
        amount: order.amount,
        currency: order.currency || "INR",
        name: "Ayush Tuition",
        description: `Fee payment ₹${amount}`,
        order_id: order.orderId,
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
          contact: user?.phone || ""
        },
        theme: {
          color: "#1f7a8c"
        },
        handler: async (response) => {
          await api.post(`/fees/${feeId}/razorpay/verify`, {
            ...response,
            amount
          });
          await load();
          setPayingFeeId("");
        },
        modal: {
          ondismiss: () => {
            setPayingFeeId("");
          }
        }
      };

      const checkout = new window.Razorpay(options);
      checkout.on("payment.failed", () => {
        setFeeError("Payment failed or was cancelled.");
        setPayingFeeId("");
      });
      checkoutOpened = true;
      checkout.open();
    } catch (error) {
      setFeeError(error.response?.data?.message || "Unable to complete payment.");
      setPayingFeeId("");
    } finally {
      if (!checkoutOpened) {
        setPayingFeeId("");
      }
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Student Portal</h1>
          <p className="page-subtitle">Your homework, fees, and updates.</p>
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          {user && (
            <div className="card" style={{ marginTop: "24px" }}>
              <h2 className="card-title">Profile</h2>
              <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    style={{ width: "72px", height: "72px", borderRadius: "18px", objectFit: "cover" }}
                  />
                ) : null}
                <div>
                  <div style={{ fontWeight: 600 }}>{user.name}</div>
                  {user.bio ? <div style={{ color: "var(--muted)" }}>{user.bio}</div> : null}
                </div>
              </div>
            </div>
          )}

          <div className="card" style={{ marginTop: "24px" }}>
            <h2 className="card-title">Daily Message</h2>
            <p style={{ margin: 0 }}>{dailyMessage}</p>
            <div style={{ marginTop: "8px", fontSize: "12px", color: "var(--muted)" }}>
              — Ayush Gour
            </div>
          </div>

          <div className="grid grid-2" style={{ marginTop: "24px" }}>
            <div className="card">
              <h2 className="card-title">{calendar.monthLabel}</h2>
              <div className="calendar">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="day header">
                    {day}
                  </div>
                ))}
                {calendar.cells.map((day, idx) => (
                  <div
                    key={`${day}-${idx}`}
                    className={`day${day === calendar.today ? " today" : ""}`}
                  >
                    {day || ""}
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h2 className="card-title">My Todo List</h2>
              <div className="form">
                <input
                  className="input"
                  placeholder="Add a task"
                  value={todoText}
                  onChange={(event) => setTodoText(event.target.value)}
                />
                <button className="btn" type="button" onClick={addTodo}>
                  Add Task
                </button>
              </div>
              <div className="todo-list" style={{ marginTop: "12px" }}>
                {todo.map((item) => (
                  <div className="todo-item" key={item.id}>
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => toggleTodo(item.id)}
                    />
                    <div style={{ textDecoration: item.done ? "line-through" : "none" }}>
                      {item.text}
                    </div>
                    <button className="btn btn-ghost" onClick={() => removeTodo(item.id)}>
                      Remove
                    </button>
                  </div>
                ))}
                {!todo.length && <div>No tasks yet.</div>}
              </div>
            </div>
          </div>

          {(section === "dashboard" || section === "homework") && (
            <div className="card" style={{ marginTop: "24px" }}>
              <h2 className="card-title">My Homework</h2>
              <div className="list">
                {homework.map((item) => (
                  <div className="list-item" key={item._id}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{item.title}</div>
                      <div style={{ fontSize: "12px", color: "#6b7b7f" }}>
                        Due {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : "-"}
                      </div>
                    </div>
                    <span className="badge">Assigned</span>
                  </div>
                ))}
                {!homework.length && <div>No homework yet.</div>}
              </div>
            </div>
          )}

          {(section === "dashboard" || section === "fees") && (
            <div className="card" style={{ marginTop: "24px" }}>
              <h2 className="card-title">My Fees</h2>
              {feeError ? (
                <div className="auth-error" style={{ marginBottom: "12px" }}>
                  {feeError}
                </div>
              ) : null}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Pay via UPI</div>
                  <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                    {upiName} • {upiId} • {phone}
                  </div>
                  <a className="btn" href={upiLink("")} style={{ display: "inline-block", marginTop: "10px" }}>
                    Pay Now
                  </a>
                </div>
                <div>
                  <img src={qrUrl("")} alt="UPI QR" />
                </div>
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Total</th>
                    <th>Paid</th>
                    <th>Due</th>
                  </tr>
                </thead>
                <tbody>
                  {fees.map((row) => {
                    const paid = row.payments?.reduce((sum, item) => sum + item.amount, 0) || 0;
                    const due = Math.max(row.total - paid, 0);
                    return (
                      <tr key={row._id}>
                        <td>{row.month}</td>
                        <td>{row.total}</td>
                        <td>{paid}</td>
                        <td>{due}</td>
                        <td>
                          {due > 0 ? (
                            <button
                              className="btn btn-ghost"
                              type="button"
                              onClick={() => payFeeOnline(row._id, due)}
                              disabled={payingFeeId === row._id}
                            >
                              {payingFeeId === row._id ? "Opening..." : `Pay ₹${due}`}
                            </button>
                          ) : (
                            <span className="badge">Paid</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {!fees.length && (
                    <tr>
                      <td colSpan="5">No fee records yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {(section === "dashboard" || section === "fees") && (
            <div className="card" style={{ marginTop: "24px" }}>
              <h2 className="card-title">My Invoices</h2>
              <table className="table">
                <thead>
                  <tr>
                    <th>Number</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Due</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv._id}>
                      <td>{inv.number}</td>
                      <td>{inv.status}</td>
                      <td>{inv.total}</td>
                      <td>{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "-"}</td>
                    </tr>
                  ))}
                  {!invoices.length && (
                    <tr>
                      <td colSpan="4">No invoices yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {(section === "dashboard" || section === "fees") && (
            <div className="card" style={{ marginTop: "24px" }}>
              <h2 className="card-title">My Receipts</h2>
              <table className="table">
                <thead>
                  <tr>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((rec) => (
                    <tr key={rec._id}>
                      <td>{rec.amount}</td>
                      <td>{rec.method}</td>
                      <td>{rec.paidOn ? new Date(rec.paidOn).toLocaleDateString() : "-"}</td>
                    </tr>
                  ))}
                  {!receipts.length && (
                    <tr>
                      <td colSpan="3">No receipts yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {(section === "dashboard") && (
            <div className="card" style={{ marginTop: "24px" }}>
              <h2 className="card-title">My Marks</h2>
              <table className="table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Assessment</th>
                    <th>Score</th>
                    <th>Grade</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {marks.map((row) => (
                    <tr key={row._id}>
                      <td>{row.subject}</td>
                      <td>{row.assessment}</td>
                      <td>
                        {row.score}/{row.maxScore}
                      </td>
                      <td>{row.grade || "-"}</td>
                      <td>{row.date ? new Date(row.date).toLocaleDateString() : "-"}</td>
                    </tr>
                  ))}
                  {!marks.length && (
                    <tr>
                      <td colSpan="5">No marks yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
