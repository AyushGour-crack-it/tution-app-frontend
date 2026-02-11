import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api.js";

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [students, setStudents] = useState([]);
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const bottomRef = useRef(null);
  const [replyTo, setReplyTo] = useState(null);
  const [recipientStudentId, setRecipientStudentId] = useState("");
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("auth_user") || "null");
    } catch {
      return null;
    }
  }, []);
  const emojis = ["😀", "😃", "🤩", "🔥", "✨", "✅", "📚", "🧠", "💡", "🎯", "👏", "🚀"];
  const reactions = ["👍", "❤️", "😂", "🔥", "👏"];
  const messageLookup = useMemo(
    () => Object.fromEntries(messages.map((msg) => [msg._id, msg])),
    [messages]
  );

  const load = async () => {
    const tasks = [api.get("/chat/messages").then((res) => res.data)];
    if (user?.role === "teacher") {
      tasks.push(api.get("/students").then((res) => res.data));
    }
    const [chatData, studentData] = await Promise.all(tasks);
    setMessages(chatData);
    if (studentData) {
      setStudents(studentData);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      type ||
      (file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
          ? "video"
          : "audio");
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

  const sendUrl = async (type) => {
    const url = prompt(`Paste ${type.toUpperCase()} URL`);
    if (!url) return;
    await api.post("/chat/messages", {
      type,
      content: url,
      recipientStudentId: user?.role === "teacher" ? recipientStudentId || null : null
    });
    load();
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    const chunks = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("file", blob, "voice-message.webm");
      const upload = await api.post("/chat/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const content = upload.data.url;
      await api.post("/chat/messages", {
        type: "audio",
        content,
        fileName: "voice-message.webm",
        mimeType: "audio/webm",
        replyTo: replyTo?._id || null,
        recipientStudentId: user?.role === "teacher" ? recipientStudentId || null : null
      });
      setReplyTo(null);
      stream.getTracks().forEach((track) => track.stop());
      load();
    };
    recorder.start();
    setMediaRecorder(recorder);
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
    setRecording(false);
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

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Chat</h1>
          <p className="page-subtitle">Message your classroom community.</p>
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
        <div className="chat-window">
          {messages.map((msg) => (
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
                  <strong>{msg.senderName}</strong> · {msg.role}
                </div>
                <div className="chat-meta">{formatTime(msg.createdAt)}</div>
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
                  <source src={msg.content} type={msg.mimeType || "audio/webm"} />
                </audio>
              )}
              {msg.editedAt && <div className="chat-meta">(edited)</div>}
              <div className="chat-actions">
                <button className="btn btn-ghost" type="button" onClick={() => setReply(msg)}>
                  Reply
                </button>
                {msg.senderId === user?.id && (msg.type === "text" || msg.type === "announcement") && (
                  <button className="btn btn-ghost" type="button" onClick={() => editMessage(msg)}>
                    Edit
                  </button>
                )}
                {msg.senderId === user?.id && (
                  <button className="btn btn-ghost" type="button" onClick={() => deleteMessage(msg._id)}>
                    Delete
                  </button>
                )}
              </div>
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
          <div ref={bottomRef} />
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
            <button className="btn btn-ghost" type="button" onClick={recording ? stopRecording : startRecording}>
              {recording ? "Stop Voice" : "Voice"}
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => sendUrl("gif")}>
              GIF URL
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => sendUrl("meme")}>
              Meme URL
            </button>
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
