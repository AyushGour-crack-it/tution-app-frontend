import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api.js";

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const bottomRef = useRef(null);
  const [replyTo, setReplyTo] = useState(null);
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("auth_user") || "null");
    } catch {
      return null;
    }
  }, []);
  const emojis = ["😀", "😃", "🤩", "🔥", "✨", "✅", "📚", "🧠", "💡", "🎯", "👏", "🚀"];

  const load = async () => {
    const data = await api.get("/chat/messages").then((res) => res.data);
    setMessages(data);
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
      replyTo: replyTo?._id || null
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
      replyTo: replyTo?._id || null
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
      replyTo: replyTo?._id || null
    });
    event.target.value = "";
    setReplyTo(null);
    load();
  };

  const sendUrl = async (type) => {
    const url = prompt(`Paste ${type.toUpperCase()} URL`);
    if (!url) return;
    await api.post("/chat/messages", { type, content: url });
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
        replyTo: replyTo?._id || null
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

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Chat</h1>
          <p className="page-subtitle">Message your classroom community.</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <div className="chat-window">
          {messages.map((msg) => (
            <div
              className={`chat-message${msg.type === "announcement" ? " chat-announcement" : ""}`}
              key={msg._id}
            >
              <div className="chat-meta">
                <strong>{msg.senderName}</strong> · {msg.role}
              </div>
              {msg.replyTo && (
                <div className="chat-reply">
                  Replying to {messages.find((m) => m._id === msg.replyTo)?.senderName || "message"}
                </div>
              )}
              {msg.type === "text" && <div>{msg.content}</div>}
              {msg.type === "announcement" && <div>{msg.content}</div>}
              {(msg.type === "image" || msg.type === "gif" || msg.type === "meme") && (
                <img src={msg.content} alt={msg.fileName || msg.type} style={{ maxWidth: "240px" }} />
              )}
              {msg.type === "video" && (
                <video controls style={{ maxWidth: "240px" }}>
                  <source src={msg.content} type={msg.mimeType || "video/mp4"} />
                </video>
              )}
              {msg.type === "audio" && (
                <audio controls>
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
                {["👍", "❤️", "😂", "🔥", "👏"].map((emoji) => (
                  <button key={emoji} className="emoji-btn" type="button" onClick={() => reactTo(msg._id, emoji)}>
                    {emoji}
                  </button>
                ))}
                {msg.reactions?.length ? (
                  <div className="chat-reaction-count">
                    {msg.reactions.map((r) => r.emoji).join(" ")}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="chat-input">
          {replyTo && (
            <div className="chat-reply-banner">
              Replying to {replyTo.senderName}
              <button className="btn btn-ghost" onClick={() => setReplyTo(null)} type="button">
                Cancel
              </button>
            </div>
          )}
          <input
            className="input"
            placeholder="Type a message"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <button className="btn" type="button" onClick={sendText}>
            Send
          </button>
          {user?.role === "teacher" && (
            <button className="btn btn-ghost" type="button" onClick={sendAnnouncement}>
              Announcement
            </button>
          )}
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
