import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { connectSocket } from "../socket.js";

export default function Chat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [chatUsers, setChatUsers] = useState([]);
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [typingLabel, setTypingLabel] = useState("");
  const chatWindowRef = useRef(null);
  const socketRef = useRef(null);
  const messagesRef = useRef([]);
  const skipNextAutoScrollRef = useRef(false);
  const typingResetTimeoutRef = useRef(null);
  const lastTypingEmitRef = useRef(0);
  const isFirstLoadRef = useRef(true);
  const [replyTo, setReplyTo] = useState(null);
  const [recipientUserId, setRecipientUserId] = useState("");
  const [menuMessageId, setMenuMessageId] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearingChat, setClearingChat] = useState(false);
  const [localClearAfter, setLocalClearAfter] = useState(0);
  const [showLocalClearConfirm, setShowLocalClearConfirm] = useState(false);
  const [prevSeenAt, setPrevSeenAt] = useState(0);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [beforeCursor, setBeforeCursor] = useState("");
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
  const reactions = ["👍", "❤️", "😂", "🔥", "👏", "👎", "😤", "❌", "🚫", "🙅"];
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
  const chatUserLookup = useMemo(
    () => Object.fromEntries((chatUsers || []).map((item) => [String(item._id), item])),
    [chatUsers]
  );
  const groupedReactions = (message) => {
    const groups = (Array.isArray(message?.reactions) ? message.reactions : []).reduce((acc, item) => {
      const emoji = String(item?.emoji || "").trim();
      if (!emoji) return acc;
      if (!acc[emoji]) {
        acc[emoji] = { count: 0, users: [] };
      }
      acc[emoji].count += 1;
      const actorId = String(item?.userId || "");
      const actor = actorId ? chatUserLookup[actorId] : null;
      const actorName = actor?.name || (actorId === String(user?.id || "") ? "You" : "Unknown");
      if (actorName && !acc[emoji].users.includes(actorName)) {
        acc[emoji].users.push(actorName);
      }
      return acc;
    }, {});
    return Object.entries(groups)
      .map(([emoji, meta]) => ({
        emoji,
        count: Number(meta?.count || 0),
        users: Array.isArray(meta?.users) ? meta.users : []
      }))
      .sort((a, b) => b.count - a.count || a.emoji.localeCompare(b.emoji));
  };
  const formatLastSeen = (value) => {
    if (!value) return "Last seen unavailable";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Last seen unavailable";
    return `Last seen ${date.toLocaleString([], {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    })}`;
  };

  const scrollToLatest = () => {
    const node = chatWindowRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  };

  const PAGE_SIZE = 100;

  const normalizeChatResponse = (payload) => {
    if (Array.isArray(payload)) {
      return {
        items: payload,
        hasMore: payload.length >= PAGE_SIZE,
        nextBefore: payload[0]?.createdAt || null
      };
    }
    const items = Array.isArray(payload?.items) ? payload.items : [];
    return {
      items,
      hasMore: Boolean(payload?.hasMore),
      nextBefore: payload?.nextBefore || items[0]?.createdAt || null
    };
  };

  const loadInitialMessages = async () => {
    if (isFirstLoadRef.current) {
      setLoadingMessages(true);
    }
    setLoadError("");
    try {
      const tasks = [api.get(`/chat/messages?limit=${PAGE_SIZE}`).then((res) => res.data)];
      tasks.push(api.get("/chat/users").then((res) => res.data || []));
      const [chatData, usersData] = await Promise.all(tasks);
      const normalized = normalizeChatResponse(chatData);
      setMessages(normalized.items);
      setHasMoreMessages(normalized.hasMore);
      setBeforeCursor(normalized.nextBefore || "");
      api.post("/chat/messages/read").catch(() => {});
      setChatUsers(Array.isArray(usersData) ? usersData : []);
    } catch (error) {
      setLoadError(error?.response?.data?.message || "Failed to load chat.");
      setMessages([]);
      setChatUsers([]);
      setHasMoreMessages(false);
      setBeforeCursor("");
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadInitialMessages();
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(
    () => () => {
      if (typingResetTimeoutRef.current) {
        clearTimeout(typingResetTimeoutRef.current);
      }
    },
    []
  );

  const mergeChronological = (currentItems, incomingItems) => {
    const map = new Map();
    [...currentItems, ...incomingItems].forEach((item) => {
      if (item?._id) {
        map.set(item._id, item);
      }
    });
    return [...map.values()].sort(
      (a, b) => new Date(a?.createdAt || 0).getTime() - new Date(b?.createdAt || 0).getTime()
    );
  };

  const loadOlderMessages = async () => {
    if (!beforeCursor || loadingOlderMessages || !hasMoreMessages) return;
    const container = chatWindowRef.current;
    const previousHeight = container?.scrollHeight || 0;
    skipNextAutoScrollRef.current = true;
    setLoadingOlderMessages(true);
    try {
      const payload = await api
        .get(`/chat/messages?limit=${PAGE_SIZE}&before=${encodeURIComponent(beforeCursor)}`, {
          showGlobalLoader: false
        })
        .then((res) => res.data);
      const normalized = normalizeChatResponse(payload);
      setMessages((prev) => mergeChronological(prev, normalized.items));
      setHasMoreMessages(normalized.hasMore);
      setBeforeCursor(normalized.nextBefore || "");

      if (container) {
        requestAnimationFrame(() => {
          const nextHeight = container.scrollHeight;
          container.scrollTop = Math.max(0, nextHeight - previousHeight);
        });
      }
    } finally {
      setLoadingOlderMessages(false);
    }
  };

  const syncAfterReconnect = async () => {
    const latestCreatedAt = messagesRef.current[messagesRef.current.length - 1]?.createdAt;
    const query = latestCreatedAt
      ? `/chat/messages?limit=${PAGE_SIZE}&after=${encodeURIComponent(latestCreatedAt)}`
      : `/chat/messages?limit=${PAGE_SIZE}`;

    try {
      const [chatPayload, usersData] = await Promise.all([
        api.get(query, { showGlobalLoader: false }).then((res) => res.data),
        api.get("/chat/users", { showGlobalLoader: false }).then((res) => res.data || [])
      ]);
      const normalized = normalizeChatResponse(chatPayload);
      setMessages((prev) =>
        latestCreatedAt ? mergeChronological(prev, normalized.items) : normalized.items
      );
      if (!latestCreatedAt) {
        setHasMoreMessages(normalized.hasMore);
        setBeforeCursor(normalized.nextBefore || "");
      }
      setChatUsers(Array.isArray(usersData) ? usersData : []);
      api.post("/chat/messages/read", null, { showGlobalLoader: false }).catch(() => {});
    } catch {
      // best-effort sync on reconnect
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!user?.id || !token) return undefined;
    const socket = connectSocket(token);
    if (!socket) return undefined;
    socketRef.current = socket;

    const onChatNew = (incoming) => {
      setMessages((prev) => {
        if (!incoming?._id) return prev;
        const hasServerMessage = prev.some((item) => item._id === incoming._id);
        if (hasServerMessage) return prev;
        if (incoming.clientMessageId) {
          const tempIndex = prev.findIndex((item) => item._id === incoming.clientMessageId);
          if (tempIndex >= 0) {
            const next = [...prev];
            next[tempIndex] = incoming;
            return next;
          }
        }
        return [...prev, incoming];
      });
      if (String(incoming?.senderId || "") !== String(user.id || "")) {
        api.post("/chat/messages/read", null, { showGlobalLoader: false }).catch(() => {});
      }
    };

    const onChatUpdated = (incoming) => {
      if (!incoming?._id) return;
      setMessages((prev) => prev.map((item) => (item._id === incoming._id ? incoming : item)));
    };

    const onChatDeleted = (payload) => {
      const messageId = String(payload?.messageId || "");
      if (!messageId) return;
      setMessages((prev) =>
        prev.map((item) =>
          item._id === messageId
            ? {
                ...item,
                deletedAt: payload?.deletedAt || new Date().toISOString(),
                deletedBy: payload?.deletedBy || null,
                editedAt: null,
                content: "",
                fileName: "",
                mimeType: "",
                reactions: []
              }
            : item
        )
      );
    };

    const onChatTyping = (payload) => {
      if (!payload?.senderId || String(payload.senderId) === String(user?.id || "")) return;
      const sender = String(payload?.senderName || "Someone");
      setTypingLabel(`${sender} is typing...`);
      if (typingResetTimeoutRef.current) {
        clearTimeout(typingResetTimeoutRef.current);
      }
      typingResetTimeoutRef.current = setTimeout(() => setTypingLabel(""), 1500);
    };

    const onPresenceUpdated = (payload) => {
      const targetId = String(payload?.userId || "");
      if (!targetId) return;
      setChatUsers((prev) =>
        prev.map((item) =>
          String(item._id) === targetId
            ? {
                ...item,
                isOnline: Boolean(payload?.isOnline),
                lastSeenAt: payload?.lastSeenAt || item.lastSeenAt || null
              }
            : item
        )
      );
    };

    socket.on("chat:new", onChatNew);
    socket.on("chat:updated", onChatUpdated);
    socket.on("chat:deleted", onChatDeleted);
    socket.on("chat:typing", onChatTyping);
    socket.on("presence:updated", onPresenceUpdated);
    socket.on("connect", syncAfterReconnect);
    return () => {
      socket.off("chat:new", onChatNew);
      socket.off("chat:updated", onChatUpdated);
      socket.off("chat:deleted", onChatDeleted);
      socket.off("chat:typing", onChatTyping);
      socket.off("presence:updated", onPresenceUpdated);
      socket.off("connect", syncAfterReconnect);
      socketRef.current = null;
    };
  }, [user?.id]);

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
    if (skipNextAutoScrollRef.current) {
      skipNextAutoScrollRef.current = false;
      isFirstLoadRef.current = false;
      return;
    }
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

  const emitTyping = () => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;
    const now = Date.now();
    if (now - lastTypingEmitRef.current < 800) return;
    lastTypingEmitRef.current = now;
    socket.emit("chat:typing", {
      recipientUserId: recipientUserId || null
    });
  };

  const openChatProfile = (msg) => {
    const senderId = String(msg?.senderId || "");
    if (!senderId) return;
    if (senderId === String(user?.id || "")) {
      navigate("/profile");
      return;
    }
    if (String(msg?.role || "") !== "student") return;
    if (user?.role === "teacher") {
      navigate(`/students/${senderId}`);
      return;
    }
    navigate(`/student/students/${senderId}`);
  };

  const appendOptimisticMessage = ({ type, content, fileName = "", mimeType = "" }) => {
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimistic = {
      _id: tempId,
      clientMessageId: tempId,
      senderId: user?.id || "",
      senderName: user?.name || "You",
      role: user?.role || "student",
      recipientUserId: recipientUserId || null,
      recipientName:
        recipientUserId
          ? chatUsers.find((item) => String(item._id) === String(recipientUserId))?.name || "User"
          : "",
      type,
      content,
      fileName,
      mimeType,
      replyTo: replyTo?._id || null,
      readBy: [user?.id].filter(Boolean),
      reactions: [],
      createdAt: new Date().toISOString(),
      editedAt: null,
      _localStatus: "sending"
    };
    setMessages((prev) => [...prev, optimistic]);
    return optimistic;
  };

  const sendText = async () => {
    const value = text.trim();
    if (!value || isSending) return;
    setIsSending(true);
    const optimistic = appendOptimisticMessage({ type: "text", content: value });
    setText("");
    setReplyTo(null);
    try {
      const created = await api.post("/chat/messages", {
        type: "text",
        content: value,
        clientMessageId: optimistic.clientMessageId,
        replyTo: optimistic.replyTo || null,
        recipientUserId: recipientUserId || null
      });
      const serverMessage = created?.data;
      if (serverMessage?._id) {
        setMessages((prev) =>
          prev.map((item) => (item._id === optimistic._id ? serverMessage : item))
        );
      }
    } catch {
      setMessages((prev) => prev.filter((item) => item._id !== optimistic._id));
      setText(value);
    } finally {
      setIsSending(false);
    }
  };

  const sendAnnouncement = async () => {
    const value = text.trim();
    if (!value || isSending) return;
    setIsSending(true);
    const optimistic = appendOptimisticMessage({ type: "announcement", content: value });
    setText("");
    setReplyTo(null);
    try {
      const created = await api.post("/chat/messages", {
        type: "announcement",
        content: value,
        clientMessageId: optimistic.clientMessageId,
        replyTo: optimistic.replyTo || null,
        recipientUserId: recipientUserId || null
      });
      const serverMessage = created?.data;
      if (serverMessage?._id) {
        setMessages((prev) =>
          prev.map((item) => (item._id === optimistic._id ? serverMessage : item))
        );
      }
    } catch {
      setMessages((prev) => prev.filter((item) => item._id !== optimistic._id));
      setText(value);
    } finally {
      setIsSending(false);
    }
  };

  const sendFile = async (event, type) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      const upload = await api.post("/chat/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const content = upload.data.url;
      const resolvedType =
        type || (file.type.startsWith("image/") ? "image" : "video");
      const optimistic = appendOptimisticMessage({
        type: resolvedType,
        content,
        fileName: file.name,
        mimeType: file.type
      });
      const created = await api.post("/chat/messages", {
        type: resolvedType,
        content,
        fileName: file.name,
        mimeType: file.type,
        clientMessageId: optimistic.clientMessageId,
        replyTo: replyTo?._id || null,
        recipientUserId: recipientUserId || null
      });
      const serverMessage = created?.data;
      if (serverMessage?._id) {
        setMessages((prev) =>
          prev.map((item) => (item._id === optimistic._id ? serverMessage : item))
        );
      } else {
        setMessages((prev) => prev.filter((item) => item._id !== optimistic._id));
      }
      setReplyTo(null);
    } finally {
      event.target.value = "";
    }
  };

  const editMessage = async (msg) => {
    const updated = prompt("Edit message", msg.content);
    if (!updated) return;
    const saved = await api.put(`/chat/messages/${msg._id}`, { content: updated });
    const next = saved?.data;
    if (next?._id) {
      setMessages((prev) => prev.map((item) => (item._id === next._id ? next : item)));
    }
  };

  const deleteMessage = async (id) => {
    const saved = await api.delete(`/chat/messages/${id}`);
    const next = saved?.data;
    if (next?._id) {
      setMessages((prev) => prev.map((item) => (item._id === next._id ? next : item)));
      return;
    }
    setMessages((prev) => prev.filter((item) => item._id !== id));
  };

  const reactTo = async (id, emoji) => {
    const saved = await api.post(`/chat/messages/${id}/reactions`, { emoji });
    const next = saved?.data;
    if (next?._id) {
      setMessages((prev) => prev.map((item) => (item._id === next._id ? next : item)));
    }
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
      await loadInitialMessages();
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
    if (String(msg?.senderId || "") !== String(user?.id || "")) return null;
    const readBy = Array.isArray(msg?.readBy) ? msg.readBy.map((id) => String(id)) : [];
    const seenByCount = readBy.filter((id) => id !== String(user?.id || "")).length;
    return {
      state: seenByCount > 0 ? "seen" : "sent",
      seenByCount
    };
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

  const getReplyPreview = (msg) => {
    const source = msg?.replyTo ? messageLookup[msg.replyTo] : null;
    if (!source) return { sender: "message", snippet: "Original message not available" };
    const sender = String(source?.senderName || "message");
    const content =
      source?.type === "text" || source?.type === "announcement"
        ? String(source?.content || "")
        : `[${String(source?.type || "media").toUpperCase()}]`;
    const snippet = content.length > 46 ? `${content.slice(0, 46)}...` : content;
    return { sender, snippet };
  };

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
  const selectedRecipient = useMemo(
    () => chatUsers.find((item) => String(item._id) === String(recipientUserId || "")) || null,
    [chatUsers, recipientUserId]
  );

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
            <div className="chat-audience">
              <span className="chat-audience-label">Send to</span>
              <select
                className="select chat-audience-select"
                value={recipientUserId}
                onChange={(event) => setRecipientUserId(event.target.value)}
              >
                <option value="">Everyone</option>
                {chatUsers
                  .filter((item) => String(item?._id || "") !== String(user?.id || ""))
                  .map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.isOnline ? "🟢 " : ""}{item.name} ({item.role})
                    </option>
                  ))}
              </select>
            </div>
            {selectedRecipient ? (
              <div className="chat-presence-line">
                <span className={`chat-presence-dot ${selectedRecipient.isOnline ? "online" : "offline"}`} />
                {selectedRecipient.isOnline ? "Online now" : formatLastSeen(selectedRecipient.lastSeenAt)}
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
          {!loadingMessages && hasMoreMessages ? (
            <div className="chat-meta" style={{ padding: "4px 0 10px" }}>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={loadOlderMessages}
                disabled={loadingOlderMessages}
              >
                {loadingOlderMessages ? "Loading older..." : "Load older messages"}
              </button>
            </div>
          ) : null}
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
                onClick={loadInitialMessages}
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
            const senderMeta = chatUserLookup[String(msg?.senderId || "")] || null;
            const senderAvatar = msg?.senderAvatar || senderMeta?.avatarUrl || "";
            const senderName = msg?.senderName || senderMeta?.name || "User";
            const senderIsOnline = Boolean(senderMeta?.isOnline);
            const readReceipt = getReadReceipt(msg);
            const replyPreview = getReplyPreview(msg);
            const reactionGroups = groupedReactions(msg);
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
                  <div className="chat-meta-sender">
                    <button
                      type="button"
                      onClick={() => openChatProfile(msg)}
                      style={{ background: "none", border: "0", padding: "0", cursor: "pointer" }}
                      title={msg?.role === "student" || msg?.senderId === user?.id ? "Open profile" : ""}
                      disabled={msg?.role !== "student" && msg?.senderId !== user?.id}
                    >
                      {senderAvatar ? (
                        <img
                          className={`chat-avatar chat-avatar-img ${senderIsOnline ? "chat-avatar-online" : ""}`}
                          src={senderAvatar}
                          alt={senderName}
                        />
                      ) : (
                        <div className={`chat-avatar ${senderIsOnline ? "chat-avatar-online" : ""}`} aria-hidden="true">
                          {String(senderName || "?").slice(0, 1).toUpperCase()}
                        </div>
                      )}
                    </button>
                    <div className="chat-meta">
                      <strong className={getSenderColorClass(msg)}>{senderName}</strong>
                    </div>
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
                          <button
                            className="chat-menu-item"
                            type="button"
                            onClick={() => setReply(msg)}
                            disabled={Boolean(msg?.deletedAt)}
                          >
                            Reply
                          </button>
                          <div className="chat-menu-label">React</div>
                          <div className="chat-menu-emojis">
                            {reactions.map((emoji) => (
                              <button
                                key={`${msg._id}-${emoji}`}
                                className="chat-menu-emoji-btn"
                                type="button"
                                disabled={Boolean(msg?.deletedAt)}
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
                                disabled={Boolean(msg?.deletedAt)}
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
                  <div className="chat-reply chat-reply-preview">
                    <strong>{replyPreview.sender}</strong>
                    <div className="chat-reply-snippet">{replyPreview.snippet}</div>
                  </div>
                )}
                {msg.recipientUserId && (
                  <div className="chat-meta">To: {msg.recipientName || "User"}</div>
                )}
                {msg.deletedAt ? (
                  <div className="chat-content" style={{ opacity: 0.75, fontStyle: "italic" }}>
                    This message was deleted.
                  </div>
                ) : null}
                {!msg.deletedAt && msg.type === "text" ? <div className="chat-content">{msg.content}</div> : null}
                {!msg.deletedAt && msg.type === "announcement" ? <div className="chat-content">{msg.content}</div> : null}
                {!msg.deletedAt && (msg.type === "image" || msg.type === "gif" || msg.type === "meme") ? (
                  <img className="chat-media" src={msg.content} alt={msg.fileName || msg.type} />
                ) : null}
                {!msg.deletedAt && msg.type === "video" ? (
                  <video controls className="chat-media">
                    <source src={msg.content} type={msg.mimeType || "video/mp4"} />
                  </video>
                ) : null}
                {!msg.deletedAt && msg.type === "audio" ? (
                  <audio controls className="chat-audio">
                    <source src={msg.content} type={msg.mimeType || "audio/mpeg"} />
                  </audio>
                ) : null}
                {msg.editedAt && <div className="chat-meta">(edited)</div>}
                {msg._localStatus === "sending" ? (
                  <div className="chat-meta chat-send-state">Sending...</div>
                ) : null}
                {readReceipt ? (
                  <div
                    className={`chat-meta chat-read-receipt chat-read-receipt-${readReceipt.state}`}
                    title={readReceipt.state === "seen" ? `Seen by ${readReceipt.seenByCount}` : "Sent"}
                  >
                    <span className="chat-ticks">{readReceipt.state === "seen" ? "✓✓" : "✓"}</span>
                    {readReceipt.state === "seen" ? (
                      <span className="chat-read-count">{readReceipt.seenByCount}</span>
                    ) : null}
                  </div>
                ) : null}
                {reactionGroups.length ? (
                  <div className="chat-reactions">
                    {reactionGroups.map((group) => (
                      <span
                        key={`${msg._id}-${group.emoji}`}
                        className="chat-reaction-pill"
                        title={group.users.length ? `Reacted by: ${group.users.join(", ")}` : "Reaction"}
                      >
                        {group.emoji} {group.count}
                      </span>
                    ))}
                  </div>
                ) : null}
                {reactionGroups.length ? (
                  <div className="chat-meta" style={{ marginTop: "4px" }}>
                    {reactionGroups
                      .filter((group) => group.users.length)
                      .map((group) => `${group.emoji} ${group.users.join(", ")}`)
                      .join("  •  ")}
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
          {typingLabel ? <div className="chat-typing-indicator">{typingLabel}</div> : null}
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
              onChange={(event) => {
                setText(event.target.value);
                emitTyping();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendText();
                }
              }}
            />
            <button className="chat-send-btn" type="button" onClick={sendText} aria-label="Send" disabled={isSending}>
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




