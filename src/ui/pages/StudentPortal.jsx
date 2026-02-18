import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { connectSocket } from "../socket.js";

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
  const [upiNotice, setUpiNotice] = useState("");
  const [paymentSuccessPopup, setPaymentSuccessPopup] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [offlineRequestDrafts, setOfflineRequestDrafts] = useState({});
  const [offlineRequestState, setOfflineRequestState] = useState({});
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
  const razorpayMeLink = "https://razorpay.me/@ayushgour8541";

  const load = async () => {
    setLoading(true);
    const [homeworkData, feeData, invoiceData, receiptData, announcementData] = await Promise.all([
      api.get("/homeworks").then((res) => res.data),
      api.get(previewStudentId ? `/fees?studentId=${previewStudentId}` : "/fees").then((res) => res.data),
      api.get(previewStudentId ? `/invoices?studentId=${previewStudentId}` : "/invoices").then((res) => res.data),
      api.get(previewStudentId ? `/receipts?studentId=${previewStudentId}` : "/receipts").then((res) => res.data),
      api.get("/announcements").then((res) => res.data || [])
    ]);
    setHomework(homeworkData);
    setFees(feeData);
    setInvoices(invoiceData);
    setReceipts(receiptData);
    setAnnouncements((announcementData || []).slice(0, 4));
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
    if (section !== "fees" && section !== "dashboard") return undefined;
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
  }, [section, previewStudentId]);

  useEffect(() => {
    if (section !== "dashboard" && section !== "homework") return undefined;
    const token = localStorage.getItem("auth_token");
    if (!token) return undefined;
    const socket = connectSocket(token);
    if (!socket) return undefined;
    const refresh = () => load();
    socket.on("homework:updated", refresh);
    socket.on("marks:updated", refresh);
    socket.on("connect", refresh);
    return () => {
      socket.off("homework:updated", refresh);
      socket.off("marks:updated", refresh);
      socket.off("connect", refresh);
    };
  }, [section, previewStudentId]);

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

  const launchUpi = async (amount = "") => {
    const deepLink = upiLink(amount);
    const isMobileDevice = /android|iphone|ipad|ipod/i.test(navigator.userAgent || "");
    if (!isMobileDevice) {
      setUpiNotice("UPI app link works on phone. On desktop, scan QR or copy UPI ID.");
      return;
    }
    try {
      window.location.href = deepLink;
      setTimeout(() => {
        setUpiNotice("If app did not open, use QR or copy UPI ID.");
      }, 1200);
    } catch {
      setUpiNotice("Could not open UPI app. Use QR or copy UPI ID.");
    }
  };

  const copyUpiId = async () => {
    try {
      await navigator.clipboard.writeText(upiId);
      setUpiNotice("UPI ID copied.");
    } catch {
      setUpiNotice(`Copy manually: ${upiId}`);
    }
  };

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
          setPaymentSuccessPopup({
            amount,
            paidOn: new Date().toISOString(),
            xpAwarded: 50
          });
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

  const updateOfflineDraft = (feeId, key, value) => {
    setOfflineRequestDrafts((prev) => ({
      ...prev,
      [feeId]: {
        amount: prev?.[feeId]?.amount || "",
        message: prev?.[feeId]?.message || "",
        [key]: value
      }
    }));
  };

  const submitOfflineRequest = async (feeId) => {
    const draft = offlineRequestDrafts[feeId] || { amount: "", message: "" };
    const amount = Number(draft.amount || 0);
    if (!amount || amount <= 0) {
      setOfflineRequestState((prev) => ({ ...prev, [feeId]: "Enter valid amount." }));
      return;
    }
    try {
      await api.post(`/fees/${feeId}/offline-request`, {
        amount,
        message: draft.message || ""
      });
      setOfflineRequestState((prev) => ({
        ...prev,
        [feeId]: "Offline payment request sent to teacher for approval."
      }));
      setOfflineRequestDrafts((prev) => ({
        ...prev,
        [feeId]: { amount: "", message: "" }
      }));
    } catch (error) {
      setOfflineRequestState((prev) => ({
        ...prev,
        [feeId]: error?.response?.data?.message || "Failed to submit offline request."
      }));
    }
  };

  const pageTitle =
    section === "homework" ? "My Homework" : section === "fees" ? "My Fees" : "Student Portal";
  const pageSubtitle =
    section === "homework"
      ? "View assignments and due dates."
      : section === "fees"
        ? "Track dues, invoices, and receipts."
        : "Your homework, fees, and updates.";

  return (
    <div className="page">
      {paymentSuccessPopup ? (
        <div
          className="fee-success-popup-overlay"
          onClick={() => setPaymentSuccessPopup(null)}
        >
          <div
            className="fee-success-popup-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="fee-success-popup-pill">Payment Successful</div>
            <h2 className="fee-success-popup-title">Thank You For Paying Fees</h2>
            <p className="fee-success-popup-text">
              Your payment has been received 🙏 Thank you for being a part of our learning community.
            </p>
            <div className="fee-success-popup-amount">
              ₹{Number(paymentSuccessPopup.amount || 0).toLocaleString("en-IN")}
            </div>
            <div className="fee-success-popup-date">+{Number(paymentSuccessPopup.xpAwarded || 0)} XP earned</div>
            <div className="fee-success-popup-date">
              Paid on{" "}
              {new Date(paymentSuccessPopup.paidOn).toLocaleString()}
            </div>
            <button className="btn" type="button" onClick={() => setPaymentSuccessPopup(null)}>
              Continue
            </button>
          </div>
        </div>
      ) : null}
      <div className="page-header">
        <div>
          <h1 className="page-title">{pageTitle}</h1>
          <p className="page-subtitle">{pageSubtitle}</p>
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          {section === "dashboard" && user && (
            <div className="card" style={{ marginTop: "24px" }}>
              <h2 className="card-title">Profile</h2>
              <div className="student-portal-profile-row">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="student-portal-profile-avatar"
                  />
                ) : null}
                <div>
                  <div className="student-portal-profile-name">{user.name}</div>
                  {user.bio ? <div className="student-portal-profile-bio">{user.bio}</div> : null}
                </div>
              </div>
            </div>
          )}

          {section === "dashboard" && (
            <div className="card" style={{ marginTop: "24px", border: "1px solid rgba(255, 196, 0, 0.35)" }}>
              <h2 className="card-title">Announcements</h2>
              <div className="list">
                {announcements.map((item) => (
                  <div className="list-item" key={item._id}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{item.title}</div>
                      {item.note ? (
                        <div style={{ color: "var(--muted)", fontSize: "12px" }}>{item.note}</div>
                      ) : null}
                    </div>
                    <span className="pill">
                      {item.date ? new Date(item.date).toLocaleDateString() : "-"}
                    </span>
                  </div>
                ))}
                {!announcements.length ? <div>No announcements yet.</div> : null}
              </div>
            </div>
          )}

          {section === "dashboard" && (
            <div className="card" style={{ marginTop: "24px" }}>
              <h2 className="card-title">Daily Message</h2>
              <p style={{ margin: 0 }}>{dailyMessage}</p>
              <div style={{ marginTop: "8px", fontSize: "12px", color: "var(--muted)" }}>
                — Ayush Gour
              </div>
            </div>
          )}

          {section === "dashboard" && (
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
          )}

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
              {upiNotice ? (
                <div className="auth-success" style={{ marginBottom: "12px" }}>
                  {upiNotice}
                </div>
              ) : null}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Pay via UPI</div>
                  <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                    {upiName} • {upiId} • {phone}
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
                    <a
                      className="btn"
                      href={razorpayMeLink}
                      target="_blank"
                      rel="noreferrer"
                      style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}
                    >
                      Pay via Razorpay Link
                    </a>
                    <button className="btn" type="button" onClick={() => launchUpi("")}>
                      Open UPI App
                    </button>
                    <button className="btn btn-ghost" type="button" onClick={copyUpiId}>
                      Copy UPI ID
                    </button>
                  </div>
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
                    const draft = offlineRequestDrafts[row._id] || { amount: "", message: "" };
                    return (
                      <tr key={row._id}>
                        <td>{row.month}</td>
                        <td>{row.total}</td>
                        <td>{paid}</td>
                        <td>{due}</td>
                        <td>
                          {due > 0 ? (
                            <div style={{ display: "grid", gap: "8px" }}>
                              <button
                                className="btn btn-ghost"
                                type="button"
                                onClick={() => payFeeOnline(row._id, due)}
                                disabled={payingFeeId === row._id}
                              >
                                {payingFeeId === row._id ? "Opening..." : `Pay ₹${due}`}
                              </button>
                              {!previewStudentId ? (
                                <>
                                  <input
                                    className="input"
                                    type="number"
                                    placeholder="Offline amount"
                                    value={draft.amount}
                                    onChange={(event) => updateOfflineDraft(row._id, "amount", event.target.value)}
                                  />
                                  <input
                                    className="input"
                                    placeholder="Message for teacher (optional)"
                                    value={draft.message}
                                    onChange={(event) => updateOfflineDraft(row._id, "message", event.target.value)}
                                  />
                                  <button
                                    className="btn btn-ghost"
                                    type="button"
                                    onClick={() => submitOfflineRequest(row._id)}
                                  >
                                    Paying Offline - Send Request
                                  </button>
                                  {offlineRequestState[row._id] ? (
                                    <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                                      {offlineRequestState[row._id]}
                                    </div>
                                  ) : null}
                                </>
                              ) : null}
                            </div>
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
