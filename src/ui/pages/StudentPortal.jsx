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
  const [loading, setLoading] = useState(true);
  const [payingFeeId, setPayingFeeId] = useState("");
  const [feeError, setFeeError] = useState("");
  const [upiNotice, setUpiNotice] = useState("");
  const [paymentSuccessPopup, setPaymentSuccessPopup] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [popupSeen, setPopupSeen] = useState({ announcementId: "", holidayId: "" });
  const [announcementPopup, setAnnouncementPopup] = useState(null);
  const [holidayPopup, setHolidayPopup] = useState(null);
  const [offlineRequestDraft, setOfflineRequestDraft] = useState({
    monthInput: "",
    amount: "",
    message: ""
  });
  const [offlineRequestState, setOfflineRequestState] = useState("");
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("auth_user") || "null");
    } catch {
      return null;
    }
  }, []);

  const upiId = "ayushgour2526@oksbi";
  const upiName = "Ayush Gour";
  const phone = "8265968179";
  const razorpayMeLink = "https://razorpay.me/@ayushgour8541";

  const load = async () => {
    setLoading(true);
    const [homeworkData, feeData, announcementData, holidayData, popupState] = await Promise.all([
      api.get("/homeworks").then((res) => res.data),
      api.get(previewStudentId ? `/fees?studentId=${previewStudentId}` : "/fees").then((res) => res.data),
      api.get("/announcements").then((res) => res.data || []),
      api.get("/holidays").then((res) => res.data || []),
      api.get("/notifications/popup-state").then((res) => res.data || {}).catch(() => ({}))
    ]);
    setHomework(homeworkData);
    setFees(feeData);
    setAnnouncements((announcementData || []).slice(0, 4));
    setHolidays((holidayData || []).slice(0, 4));
    setPopupSeen({
      announcementId: String(popupState?.announcementId || ""),
      holidayId: String(popupState?.holidayId || "")
    });
    setOfflineRequestDraft((prev) => {
      if (prev.monthInput) return prev;
      const target = feeData.find((item) => {
        const paid = item.payments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;
        return Math.max(Number(item.total || 0) - paid, 0) > 0;
      }) || feeData[0];
      const monthInput = target?.dueDate
        ? new Date(target.dueDate).toISOString().slice(0, 7)
        : "";
      return { ...prev, monthInput };
    });
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
    socket.on("holidays:updated", refresh);
    socket.on("connect", refresh);
    return () => {
      socket.off("homework:updated", refresh);
      socket.off("marks:updated", refresh);
      socket.off("holidays:updated", refresh);
      socket.off("connect", refresh);
    };
  }, [section, previewStudentId]);

  const messageList = [
    "Small steps every day become big results.",
    "Focus is your superpower. Use it well.",
    "Discipline beats motivation when motivation fades.",
    "Learn one thing deeply today.",
    "You are capable of more than you feel right now."
  ];
  const dailyMessage = messageList[new Date().getDate() % messageList.length];

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

  const resolveFeeIdFromMonthInput = (monthInput) => {
    const value = String(monthInput || "").trim();
    if (!value) return "";
    const [year, month] = value.split("-").map((part) => Number(part || 0));
    if (!year || !month) return "";
    const target = fees.find((item) => {
      if (item?.dueDate) {
        const due = new Date(item.dueDate);
        return due.getFullYear() === year && due.getMonth() + 1 === month;
      }
      const text = String(item?.month || "").toLowerCase();
      const targetDate = new Date(year, month - 1, 1);
      const monthShort = targetDate.toLocaleString("en", { month: "short" }).toLowerCase();
      const monthLong = targetDate.toLocaleString("en", { month: "long" }).toLowerCase();
      return text.includes(String(year)) && (text.includes(monthShort) || text.includes(monthLong));
    });
    return target?._id || "";
  };

  const submitOfflineRequest = async () => {
    const feeId = resolveFeeIdFromMonthInput(offlineRequestDraft.monthInput);
    const amount = Number(offlineRequestDraft.amount || 0);
    if (!feeId) {
      setOfflineRequestState("No fee record found for this month. Ask teacher to create it once.");
      return;
    }
    if (!amount || amount <= 0) {
      setOfflineRequestState("Enter valid amount.");
      return;
    }
    try {
      await api.post(`/fees/${feeId}/offline-request`, {
        amount,
        message: offlineRequestDraft.message || ""
      });
      setOfflineRequestState("Offline payment request sent to teacher for approval.");
      setOfflineRequestDraft((prev) => ({ ...prev, amount: "", message: "" }));
    } catch (error) {
      setOfflineRequestState(error?.response?.data?.message || "Failed to submit offline request.");
    }
  };

  const pageTitle =
    section === "homework" ? "My Homework" : section === "fees" ? "My Fees" : "Student Portal";
  const pageSubtitle =
    section === "homework"
      ? "View assignments and due dates."
      : section === "fees"
        ? "Track dues and payment status."
        : "Your homework, fees, and updates.";

  const getAnnouncementTone = (item) => {
    const text = `${String(item?.title || "").toLowerCase()} ${String(item?.note || "").toLowerCase()}`;
    if (text.includes("urgent") || text.includes("important") || text.includes("asap")) return "urgent";
    if (text.includes("reminder") || text.includes("tomorrow") || text.includes("due")) return "reminder";
    if (text.includes("success") || text.includes("congrat")) return "success";
    return "info";
  };

  useEffect(() => {
    if (section !== "dashboard" || !announcements.length) return;
    const latest = announcements[0];
    if (!latest?._id) return;
    const seenRaw = popupSeen.announcementId || "";
    if (seenRaw === latest._id) return;
    setAnnouncementPopup({
      ...latest,
      tone: getAnnouncementTone(latest)
    });
  }, [section, announcements, popupSeen.announcementId]);

  useEffect(() => {
    if (section !== "dashboard" || !holidays.length) return;
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const withDates = holidays
      .map((item) => ({ ...item, parsedDate: item?.date ? new Date(item.date) : null }))
      .filter((item) => item.parsedDate && !Number.isNaN(item.parsedDate.getTime()));
    if (!withDates.length) return;

    const todayHoliday = withDates.find(
      (item) => item.parsedDate.toISOString().slice(0, 10) === todayKey
    );
    const upcomingHoliday = withDates
      .filter((item) => item.parsedDate >= now)
      .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime())[0];
    const target = todayHoliday || upcomingHoliday;
    if (!target?._id) return;
    const seenRaw = popupSeen.holidayId || "";
    if (seenRaw === target._id) return;
    setHolidayPopup(target);
  }, [section, holidays, popupSeen.holidayId]);

  const closeAnnouncementPopup = async () => {
    if (announcementPopup?._id) {
      setPopupSeen((prev) => ({ ...prev, announcementId: announcementPopup._id }));
      try {
        await api.post("/notifications/popup-state", { announcementId: announcementPopup._id });
      } catch {
        // no-op
      }
    }
    setAnnouncementPopup(null);
  };

  const closeHolidayPopup = async () => {
    if (holidayPopup?._id) {
      setPopupSeen((prev) => ({ ...prev, holidayId: holidayPopup._id }));
      try {
        await api.post("/notifications/popup-state", { holidayId: holidayPopup._id });
      } catch {
        // no-op
      }
    }
    setHolidayPopup(null);
  };

  return (
    <div className="page">
      {announcementPopup ? (
        <div className="announcement-popup-overlay" onClick={closeAnnouncementPopup}>
          <div
            className={`announcement-popup-card announcement-tone-${announcementPopup.tone || "info"}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="announcement-popup-head">
              <div className="announcement-popup-label">Announcement</div>
              <button className="btn btn-ghost" type="button" onClick={closeAnnouncementPopup}>
                X
              </button>
            </div>
            <h2 className="announcement-popup-title">{announcementPopup.title || "Announcement"}</h2>
            <p className="announcement-popup-text">{announcementPopup.note || "New update available."}</p>
            <div className="announcement-popup-meta">
              Posted by Teacher |{" "}
              {announcementPopup.date ? new Date(announcementPopup.date).toLocaleDateString() : "Today"}
            </div>
            <button className="btn" type="button" onClick={closeAnnouncementPopup}>
              Got It
            </button>
          </div>
        </div>
      ) : null}
      {holidayPopup ? (
        <div className="holiday-popup-overlay" onClick={closeHolidayPopup}>
          <div className="holiday-popup-card" onClick={(event) => event.stopPropagation()}>
            <div className="holiday-popup-head">
              <div className="holiday-popup-title-main">{holidayPopup.title || "Holiday"}</div>
              <div className="floating-emoji">✨</div>
            </div>
            <p className="holiday-popup-text">
              {holidayPopup.note || "Wishing you a happy holiday and quality family time."}
            </p>
            <div className="holiday-popup-date">
              {holidayPopup.date ? new Date(holidayPopup.date).toLocaleDateString() : ""}
            </div>
            <div className="holiday-popup-icons">
              <span className="floating-emoji">🎉</span>
              <span className="floating-emoji">🎊</span>
              <span className="floating-emoji">🎉</span>
            </div>
            <button className="btn" type="button" onClick={closeHolidayPopup}>
              Celebrate
            </button>
          </div>
        </div>
      ) : null}
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
            <div
              className="card"
              style={{
                marginTop: "24px",
                border: "1px solid rgba(16, 185, 129, 0.35)",
                background:
                  "linear-gradient(140deg, rgba(16, 185, 129, 0.14), rgba(45, 212, 191, 0.06) 48%, var(--card-bg) 82%)"
              }}
            >
              <h2 className="card-title">Upcoming Holidays</h2>
              <div className="list">
                {holidays.map((item) => (
                  <div className="list-item" key={item._id}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{item.title}</div>
                      {item.note ? (
                        <div style={{ color: "var(--muted)", fontSize: "12px" }}>{item.note}</div>
                      ) : null}
                    </div>
                    <span
                      className="pill"
                      style={{
                        background: "rgba(16, 185, 129, 0.18)",
                        border: "1px solid rgba(16, 185, 129, 0.35)",
                        color: "#0f5132"
                      }}
                    >
                      {item.date ? new Date(item.date).toLocaleDateString() : "-"}
                    </span>
                  </div>
                ))}
                {!holidays.length ? <div>No holidays announced yet.</div> : null}
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
              {!previewStudentId ? (
                <div className="card" style={{ marginBottom: "16px", padding: "16px" }}>
                  <h3 style={{ margin: 0, marginBottom: "10px" }}>Offline Payment Request</h3>
                  <div className="form">
                    <input
                      className="input"
                      type="month"
                      placeholder="Fee month"
                      value={offlineRequestDraft.monthInput}
                      onChange={(event) =>
                        setOfflineRequestDraft((prev) => ({ ...prev, monthInput: event.target.value }))
                      }
                    />
                    <input
                      className="input"
                      type="number"
                      placeholder="Amount paid offline"
                      value={offlineRequestDraft.amount}
                      onChange={(event) =>
                        setOfflineRequestDraft((prev) => ({ ...prev, amount: event.target.value }))
                      }
                    />
                    <input
                      className="input"
                      placeholder="Message for teacher (optional)"
                      value={offlineRequestDraft.message}
                      onChange={(event) =>
                        setOfflineRequestDraft((prev) => ({ ...prev, message: event.target.value }))
                      }
                    />
                    <button className="btn btn-ghost" type="button" onClick={submitOfflineRequest}>
                      Send Offline Request
                    </button>
                  </div>
                  {offlineRequestState ? (
                    <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "8px" }}>
                      {offlineRequestState}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <table className="table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Due Date</th>
                    <th>Total</th>
                    <th>Paid</th>
                    <th>Due</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {fees.map((row) => {
                    const paid = row.payments?.reduce((sum, item) => sum + item.amount, 0) || 0;
                    const due = Math.max(row.total - paid, 0);
                    const lastPayment = row.payments?.length ? row.payments[row.payments.length - 1] : null;
                    return (
                      <tr key={row._id}>
                        <td>{row.month}</td>
                        <td>{row.dueDate ? new Date(row.dueDate).toLocaleDateString() : "-"}</td>
                        <td>{row.total}</td>
                        <td>{paid}</td>
                        <td>{due}</td>
                        <td>
                          {lastPayment
                            ? (lastPayment.lateDays > 0
                              ? `${lastPayment.lateDays} day(s) late`
                              : "Paid on time")
                            : "Not paid yet"}
                        </td>
                        <td>
                          <div style={{ display: "grid", gap: "8px" }}>
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
                          </div>
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
