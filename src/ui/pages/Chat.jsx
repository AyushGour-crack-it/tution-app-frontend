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
  const emojis = ["😀", "😃", "🤩", "🔥", "✨", "✅", "📚", "🧠", "💡", "🎯", "👏", "🚀"];
  const reactions = ["👍", "❤️", "😂", "🔥", "👏"];
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
    scrollToLatest();
    isFirstLoadRef.current = false;
  }, [messages]);

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

  const visibleMessages = useMemo(() => {
    if (!localClearAfter) return messages;
    return messages.filter((msg) => {
      const createdAt = msg?.createdAt ? new Date(msg.createdAt).getTime() : 0;
      return createdAt > localClearAfter;
    });
  }, [messages, localClearAfter]);

  return (
    <div className="page">
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
      <div className="page-header">
        <div>
          <h1 className="page-title">Chat</h1>
          <p className="page-subtitle">Message your classroom community.</p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {localClearAfter ? (
            <button className="btn btn-ghost" type="button" onClick={resetLocalClear}>
              Show Older Messages
            </button>
          ) : null}
          {user?.role === "teacher" ? (
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => setShowLocalClearConfirm(true)}
            >
              Clear On This Device
            </button>
          ) : null}
          <button className="btn btn-ghost" type="button" onClick={() => setShowClearConfirm(true)}>
            {user?.role === "teacher" ? "Clear Chat For Everyone" : "Clear My Chat"}
          </button>
        </div>
      </div>

      <div className="card chat-card" style={{ marginTop: "24px" }}>
        {user?.role === "teacher" && (
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
        )}
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
          {visibleMessages.map((msg) => (
            <div
              className={[
                "chat-message",
                msg.type === "announcement" ? "chat-announcement" : "",
                msg.senderId === user?.id ? "chat-message-mine" : ""
              ]
                .filter(Boolean)
                .join(" ")}
              key={msg._id}
            >
              <div className="chat-meta-row">
                <div className="chat-meta">
                  <strong>{msg.senderName}</strong>
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
              {msg.editedAt && <div className="chat-meta">(edited)</div>}
              <div className="chat-reactions">
                {reactions.map((emoji) => (
                  <button key={emoji} className="emoji-btn" type="button" onClick={() => reactTo(msg._id, emoji)}>
                    {emoji}
                  </button>
                ))}
                {msg.reactions?.length ? (
                  <div className="chat-reaction-count">
                    {msg.reactions.map((r) => r.emoji).join(" ")} ({msg.reactions.length})
                  </div>
                ) : null}
              </div>
            </div>
          ))}
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
          <div className="chat-input-row">
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
            <button className="btn" type="button" onClick={sendText}>
              Send
            </button>
            {user?.role === "teacher" && (
              <button className="btn btn-ghost" type="button" onClick={sendAnnouncement}>
                Announcement
              </button>
            )}
          </div>
          <div className="chat-tool-row">
            <label className="btn btn-ghost">
              Image
              <input type="file" accept="image/*" hidden onChange={(e) => sendFile(e, "image")} />
            </label>
            <label className="btn btn-ghost">
              Video
              <input type="file" accept="video/*" hidden onChange={(e) => sendFile(e, "video")} />
            </label>
          </div>
        </div>
        <div className="chat-emoji">
          {emojis.map((emoji) => (
            <button
              className="emoji-btn"
              type="button"
              key={emoji}
              onClick={() => setText((prev) => `${prev}${emoji}`)}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}




