import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api.js";

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [students, setStudents] = useState([]);
  const [text, setText] = useState("");
  const chatWindowRef = useRef(null);
  const isFirstLoadRef = useRef(true);
  const [replyTo, setReplyTo] = useState(null);
  const [recipientStudentId, setRecipientStudentId] = useState("");
  const [menuMessageId, setMenuMessageId] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearingChat, setClearingChat] = useState(false);
  const [localClearAfter, setLocalClearAfter] = useState(0);
  const [showLocalClearConfirm, setShowLocalClearConfirm] = useState(false);
  const [prevSeenAt, setPrevSeenAt] = useState(0);
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("auth_user") || "null");
    } catch {
      return null;
    }
  }, []);
  const localClearStorageKey = useMemo(
    () => (user?.id ? `chat_local_clear_after_${user.id}` : "chat_local_clear_after_guest"),
    [user?.id]
  );
  const chatPrevSeenKey = useMemo(
    () => (user?.id ? `chat_prev_seen_${user.id}` : "chat_prev_seen_guest"),
    [user?.id]
  );
  const emojis = ["😀", "😃", "🤩", "🔥", "✨", "✅", "📚", "🧠", "💡", "🎯", "👏", "🚀"];
const reactions = ["👍", "❤️", "😂", "🔥", "👏"];
  const senderNameColorClasses = [
    "chat-sender-color-1",
    "chat-sender-color-2",
    "chat-sender-color-3",
    "chat-sender-color-4",
    "chat-sender-color-5",
    "chat-sender-color-6",
    "chat-sender-color-7",
    "chat-sender-color-8"
  ];
  const messageLookup = useMemo(
    () => Object.fromEntries(messages.map((msg) => [msg._id, msg])),
    [messages]
  );

  const scrollToLatest = () => {
    const node = chatWindowRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  };

  const load = async () => {
    if (isFirstLoadRef.current) {
      setLoadingMessages(true);
    }
    setLoadError("");
    try {
      const tasks = [api.get("/chat/messages").then((res) => res.data)];
      if (user?.role === "teacher") {
        tasks.push(api.get("/students").then((res) => res.data));
      }
      const [chatData, studentData] = await Promise.all(tasks);
      setMessages(chatData);
      api.post("/chat/messages/read").catch(() => {});
      if (studentData) {
        setStudents(studentData);
      }
    } catch (error) {
      setLoadError(error?.response?.data?.message || "Failed to load chat.");
      setMessages([]);
      if (user?.role === "teacher") {
        setStudents([]);
      }
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const saved = Number(localStorage.getItem(localClearStorageKey) || 0);
    setLocalClearAfter(Number.isFinite(saved) ? saved : 0);
  }, [localClearStorageKey]);

  useEffect(() => {
    const raw = localStorage.getItem(chatPrevSeenKey);
    const parsed = raw ? new Date(raw).getTime() : 0;
    setPrevSeenAt(Number.isFinite(parsed) ? parsed : 0);
  }, [chatPrevSeenKey]);

  useEffect(() => {
    scrollToLatest();
    isFirstLoadRef.current = false;
  }, [messages]);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  useEffect(() => {
    const closeMenuOnOutsideClick = (event) => {
      const clickedInsideMenu = event.target.closest(".chat-menu-wrap");
      if (!clickedInsideMenu) {
        setMenuMessageId("");
      }
    };
    document.addEventListener("click", closeMenuOnOutsideClick);
    return () => document.removeEventListener("click", closeMenuOnOutsideClick);
  }, []);

  const sendText = async () => {
    if (!text.trim()) return;
    await api.post("/chat/messages", {
      type: "text",
      content: text.trim(),
      replyTo: replyTo?._id || null,
      recipientStudentId: user?.role === "teacher" ? recipientStudentId || null : null
    });
    setText("");
    setReplyTo(null);
    load();
  };

  const sendAnnouncement = async () => {
    if (!text.trim()) return;
    await api.post("/chat/messages", {
      type: "announcement",
      content: text.trim(),
      replyTo: replyTo?._id || null,
      recipientStudentId: user?.role === "teacher" ? recipientStudentId || null : null
    });
    setText("");
    setReplyTo(null);
    load();
  };

  const sendFile = async (event, type) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    const upload = await api.post("/chat/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    const content = upload.data.url;
    const resolvedType =
      type || (file.type.startsWith("image/") ? "image" : "video");
    await api.post("/chat/messages", {
      type: resolvedType,
      content,
      fileName: file.name,
      mimeType: file.type,
      replyTo: replyTo?._id || null,
      recipientStudentId: user?.role === "teacher" ? recipientStudentId || null : null
    });
    event.target.value = "";
    setReplyTo(null);
    load();
  };

  const editMessage = async (msg) => {
    const updated = prompt("Edit message", msg.content);
    if (!updated) return;
    await api.put(`/chat/messages/${msg._id}`, { content: updated });
    load();
  };

  const deleteMessage = async (id) => {
    await api.delete(`/chat/messages/${id}`);
    load();
  };

  const reactTo = async (id, emoji) => {
    await api.post(`/chat/messages/${id}/reactions`, { emoji });
    load();
  };

  const setReply = (msg) => {
    setReplyTo(msg);
    setMenuMessageId("");
  };

  const clearChat = async () => {
    setClearingChat(true);
    try {
      await api.delete("/chat/messages/clear");
      setReplyTo(null);
      await load();
      setShowClearConfirm(false);
    } finally {
      setClearingChat(false);
    }
  };

  const clearChatOnThisDevice = () => {
    const cutoff = Date.now();
    localStorage.setItem(localClearStorageKey, String(cutoff));
    setLocalClearAfter(cutoff);
    setShowLocalClearConfirm(false);
    setReplyTo(null);
    setMenuMessageId("");
  };

  const resetLocalClear = () => {
    localStorage.removeItem(localClearStorageKey);
    setLocalClearAfter(0);
  };

  const formatTime = (value) => {
    if (!value) return "";
    return new Date(value).toLocaleString([], {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getReadReceipt = (msg) => {
    if (String(msg?.senderId || "") !== String(user?.id || "")) return "";
    const readBy = Array.isArray(msg?.readBy) ? msg.readBy.map((id) => String(id)) : [];
    const seenByCount = readBy.filter((id) => id !== String(user?.id || "")).length;
    if (seenByCount <= 0) return "Sent";
    return seenByCount === 1 ? "Seen by 1" : `Seen by ${seenByCount}`;
  };

  const getSenderColorClass = (msg) => {
    if (msg?.senderId === user?.id) return "chat-sender-color-me";
    const seed = String(msg?.senderId || msg?.senderName || "");
    let hash = 0;
    for (let index = 0; index < seed.length; index += 1) {
      hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
    }
    return senderNameColorClasses[hash % senderNameColorClasses.length];
  };

  const visibleMessages = useMemo(() => {
    if (!localClearAfter) return messages;
    return messages.filter((msg) => {
      const createdAt = msg?.createdAt ? new Date(msg.createdAt).getTime() : 0;
      return createdAt > localClearAfter;
    });
  }, [messages, localClearAfter]);

  const chatRenderItems = useMemo(() => {
    const items = [];
    let dayKey = "";
    let insertedUnread = false;

    for (const msg of visibleMessages) {
      const ts = msg?.createdAt ? new Date(msg.createdAt) : null;
      const msgDayKey = ts ? `${ts.getFullYear()}-${ts.getMonth()}-${ts.getDate()}` : "unknown";
      if (msgDayKey !== dayKey) {
        dayKey = msgDayKey;
        items.push({
          type: "date",
          key: `date-${msgDayKey}`,
          label: ts
            ? ts.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" })
            : "Earlier"
        });
      }

      const createdAtMs = ts ? ts.getTime() : 0;
      if (
        !insertedUnread &&
        prevSeenAt &&
        createdAtMs > prevSeenAt &&
        String(msg?.senderId || "") !== String(user?.id || "")
      ) {
        insertedUnread = true;
        items.push({
          type: "unread",
          key: `unread-${msg._id || createdAtMs}`
        });
      }

      items.push({ type: "message", key: msg._id, message: msg });
    }

    return items;
  }, [visibleMessages, prevSeenAt, user?.id]);

  return (
    <div className="page chat-page">
      {showClearConfirm ? (
        <div className="confirm-popup-overlay" onClick={() => setShowClearConfirm(false)}>
          <div className="confirm-popup-card" onClick={(event) => event.stopPropagation()}>
            <h3 className="confirm-popup-title">Are you sure?</h3>
            <p className="confirm-popup-text">
              {user?.role === "teacher"
                ? "Clear entire chat for everyone?"
                : "Clear your sent chat messages?"}
            </p>
            <div className="confirm-popup-actions">
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => setShowClearConfirm(false)}
                disabled={clearingChat}
              >
                Cancel
              </button>
              <button className="btn" type="button" onClick={clearChat} disabled={clearingChat}>
                {clearingChat ? "Clearing..." : "Yes, Clear"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {showLocalClearConfirm ? (
        <div className="confirm-popup-overlay" onClick={() => setShowLocalClearConfirm(false)}>
          <div className="confirm-popup-card" onClick={(event) => event.stopPropagation()}>
            <h3 className="confirm-popup-title">Are you sure?</h3>
            <p className="confirm-popup-text">
              Clear chat only on this device? Other users will still see all messages.
            </p>
            <div className="confirm-popup-actions">
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => setShowLocalClearConfirm(false)}
              >
                Cancel
              </button>
              <button className="btn" type="button" onClick={clearChatOnThisDevice}>
                Yes, Clear Here
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="card chat-card">
        <div className="chat-toolbar">
          <div className="chat-toolbar-left">
            {user?.role === "teacher" ? (
              <div className="chat-audience">
                <span className="chat-audience-label">Send to</span>
                <select
                  className="select chat-audience-select"
                  value={recipientStudentId}
                  onChange={(event) => setRecipientStudentId(event.target.value)}
                >
                  <option value="">All Students</option>
                  {students.map((student) => (
                    <option key={student._id} value={student._id}>
                      {student.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
          <div className="chat-toolbar-actions">
            {localClearAfter ? (
              <button className="btn btn-ghost" type="button" onClick={resetLocalClear}>
                Show Older
              </button>
            ) : null}
            {user?.role === "teacher" ? (
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => setShowLocalClearConfirm(true)}
              >
                Clear Here
              </button>
            ) : null}
            <button className="btn btn-ghost" type="button" onClick={() => setShowClearConfirm(true)}>
              {user?.role === "teacher" ? "Clear All" : "Clear My Chat"}
            </button>
          </div>
        </div>
        <div className="chat-window" ref={chatWindowRef}>
          {loadingMessages ? (
            <div className="chat-meta" style={{ padding: "12px 0" }}>
              Loading latest messages...
            </div>
          ) : null}
          {!loadingMessages && loadError ? (
            <div className="auth-error" style={{ marginBottom: "8px" }}>
              {loadError}
              <button
                className="btn btn-ghost"
                type="button"
                onClick={load}
                style={{ marginLeft: "8px" }}
              >
                Retry
              </button>
            </div>
          ) : null}
          {chatRenderItems.map((item) => {
            if (item.type === "date") {
              return (
                <div key={item.key} className="chat-divider">
                  <span>{item.label}</span>
                </div>
              );
            }
            if (item.type === "unread") {
              return (
                <div key={item.key} className="chat-divider chat-divider-unread">
                  <span>New messages</span>
                </div>
              );
            }

            const msg = item.message;
            return (
              <div
                className={[
                  "chat-message",
                  ["image", "video", "audio", "gif", "meme"].includes(msg.type)
                    ? "chat-message-media"
                    : "",
                  msg.type === "announcement" ? "chat-announcement" : "",
                  msg.role === "teacher" ? "chat-message-teacher" : "",
                  msg.senderId === user?.id ? "chat-message-mine" : ""
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={item.key}
              >
              <div className="chat-meta-row">
                <div className="chat-meta">
                  <strong className={getSenderColorClass(msg)}>{msg.senderName}</strong>
                </div>
                <div className="chat-meta-actions">
                  <div className="chat-meta">{formatTime(msg.createdAt)}</div>
                  <div className="chat-menu-wrap">
                    <button
                      className="chat-menu-trigger"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setMenuMessageId((prev) => (prev === msg._id ? "" : msg._id));
                      }}
                    >
                      •••
                    </button>
                    {menuMessageId === msg._id && (
                      <div className="chat-menu">
                        <button className="chat-menu-item" type="button" onClick={() => setReply(msg)}>
                          Reply
                        </button>
                        <div className="chat-menu-emojis">
                          {reactions.map((emoji) => (
                            <button
                              key={`${msg._id}-${emoji}`}
                              className="chat-menu-emoji-btn"
                              type="button"
                              onClick={() => {
                                reactTo(msg._id, emoji);
                                setMenuMessageId("");
                              }}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                        {msg.senderId === user?.id &&
                          (msg.type === "text" || msg.type === "announcement") && (
                            <button
                              className="chat-menu-item"
                              type="button"
                              onClick={() => {
                                editMessage(msg);
                                setMenuMessageId("");
                              }}
                            >
                              Edit
                            </button>
                          )}
                        {msg.senderId === user?.id && (
                          <button
                            className="chat-menu-item danger"
                            type="button"
                            onClick={() => {
                              deleteMessage(msg._id);
                              setMenuMessageId("");
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {msg.replyTo && (
                <div className="chat-reply">
                  Replying to {messageLookup[msg.replyTo]?.senderName || "message"}
                </div>
              )}
              {msg.recipientStudentId && (
                <div className="chat-meta">To: {msg.recipientName || "Student"}</div>
              )}
              {msg.type === "text" && <div className="chat-content">{msg.content}</div>}
              {msg.type === "announcement" && <div className="chat-content">{msg.content}</div>}
              {(msg.type === "image" || msg.type === "gif" || msg.type === "meme") && (
                <img className="chat-media" src={msg.content} alt={msg.fileName || msg.type} />
              )}
              {msg.type === "video" && (
                <video controls className="chat-media">
                  <source src={msg.content} type={msg.mimeType || "video/mp4"} />
                </video>
              )}
              {msg.type === "audio" && (
                <audio controls className="chat-audio">
                  <source src={msg.content} type={msg.mimeType || "audio/mpeg"} />
                </audio>
              )}
              {msg.editedAt && <div className="chat-meta">(edited)</div>}
              {getReadReceipt(msg) ? (
                <div className="chat-meta chat-read-receipt">{getReadReceipt(msg)}</div>
              ) : null}
              {msg.reactions?.length ? (
                <div className="chat-reaction-count">
                  {msg.reactions.map((r) => r.emoji).join(" ")} ({msg.reactions.length})
                </div>
              ) : null}
              </div>
            );
          })}
          {!loadingMessages && !loadError && !visibleMessages.length ? (
            <div className="chat-meta" style={{ padding: "12px 0" }}>
              No messages to show.
            </div>
          ) : null}
        </div>
        <div className="chat-composer">
          {replyTo && (
            <div className="chat-reply-banner">
              Replying to <strong>{replyTo.senderName}</strong>
              <button className="btn btn-ghost" onClick={() => setReplyTo(null)} type="button">
                Cancel
              </button>
            </div>
          )}
          <div className="chat-input-row chat-input-pill">
            <button
              className="chat-icon-btn"
              type="button"
              title="Send image"
              aria-label="Send image"
              onClick={() => imageInputRef.current?.click()}
            >
              <svg className="chat-icon-svg" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 2v9l4-4 3 3 4-4 5 5V6H5zm2 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
              </svg>
            </button>
            <button
              className="chat-icon-btn"
              type="button"
              title="Send video"
              aria-label="Send video"
              onClick={() => videoInputRef.current?.click()}
            >
              <svg className="chat-icon-svg" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 6a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v2l5-3v14l-5-3v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z" />
              </svg>
            </button>
            <input
              className="input chat-input-field"
              placeholder="Type a message"
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendText();
                }
              }}
            />
            <button className="chat-send-btn" type="button" onClick={sendText} aria-label="Send">
              <svg className="chat-icon-svg" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2 12 21 3l-5 18-4-7-10-2z" />
              </svg>
            </button>
            {user?.role === "teacher" && (
              <button className="chat-icon-btn" type="button" onClick={sendAnnouncement} title="Announcement" aria-label="Announcement">
                <svg className="chat-icon-svg" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 10v4h4l6 4V6l-6 4H3zm12-2h2v8h-2V8zm3.5-2.5 1.5-1.5A9.9 9.9 0 0 1 23 12a9.9 9.9 0 0 1-3 7.1l-1.5-1.5A7.9 7.9 0 0 0 21 12a7.9 7.9 0 0 0-2.5-5.5z" />
                </svg>
              </button>
            )}
          </div>
          <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={(e) => sendFile(e, "image")} />
          <input ref={videoInputRef} type="file" accept="video/*" hidden onChange={(e) => sendFile(e, "video")} />
        </div>
      </div>
    </div>
  );
}




