import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  FiAlertCircle,
  FiCheck,
  FiCheckCircle,
  FiCopy,
  FiCornerUpLeft,
  FiEdit2,
  FiPaperclip,
  FiSend,
  FiShare2,
  FiTrash2,
  FiUsers
} from "react-icons/fi";
import { api } from "../api.js";
import { connectSocket } from "../socket.js";

const PAGE_SIZE = 40;
const OVERSCAN = 6;
const ESTIMATED_ROW_HEIGHT = 96;

const toTimeLabel = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

const toShortTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const toUnreadLabel = (count) => {
  const value = Number(count || 0);
  if (value <= 0) return "";
  return value > 99 ? "99+" : String(value);
};

const formatDayDivider = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString([], { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
};

const isEmojiOnly = (value) => {
  const text = String(value || "").trim();
  if (!text) return false;
  if (text.length > 14) return false;
  const stripped = text.replace(/\s+/g, "");
  return /^[\p{Extended_Pictographic}\uFE0F]+$/u.test(stripped);
};

const formatInboxPreview = (item, currentUser) => {
  const base = String(item?.lastMessagePreview || "").trim();
  if (!base) return "No messages yet";
  const type = String(item?.type || "");
  if (type === "group") {
    const senderName = String(item?.lastMessageSenderName || "").trim();
    if (senderName) {
      const mine = String(item?.lastMessageSenderId || "") === String(currentUser?.id || "");
      return `${mine ? "You" : senderName}: ${base}`;
    }
  }
  return base;
};

const useAuthUser = () =>
  useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("auth_user") || "null");
    } catch {
      return null;
    }
  }, []);

const mergeIncomingMessage = (prev, incoming) => {
  if (!incoming?._id) return prev;
  const incomingId = String(incoming._id);
  const incomingClientId = String(incoming.clientMessageId || "");
  let replaced = false;
  const next = prev.map((item) => {
    const sameId = String(item?._id || "") === incomingId;
    const sameClientId = incomingClientId && String(item?.clientMessageId || "") === incomingClientId;
    if (sameId || sameClientId) {
      replaced = true;
      return incoming;
    }
    return item;
  });
  if (!replaced) {
    return [...prev, incoming];
  }
  const seen = new Set();
  return next.filter((item) => {
    const key = String(item?._id || "");
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export default function Chat() {
  const location = useLocation();
  const user = useAuthUser();
  const mobileMedia = "(max-width: 980px)";

  const [inbox, setInbox] = useState([]);
  const [inboxLoading, setInboxLoading] = useState(true);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [mobilePane, setMobilePane] = useState("inbox");
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia(mobileMedia).matches;
  });
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [beforeCursor, setBeforeCursor] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [messageError, setMessageError] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [inboxFilter, setInboxFilter] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [groupOpen, setGroupOpen] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [groupImageUrl, setGroupImageUrl] = useState("");
  const [groupImageUploading, setGroupImageUploading] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [groupSearch, setGroupSearch] = useState("");
  const [groupSearchResults, setGroupSearchResults] = useState([]);
  const [groupSearchLoading, setGroupSearchLoading] = useState(false);
  const [groupSaving, setGroupSaving] = useState(false);

  const [typingState, setTypingState] = useState({ conversationId: "", senderName: "" });
  const [reportsOpen, setReportsOpen] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [expandedTimestamps, setExpandedTimestamps] = useState({});
  const [selectedMessageId, setSelectedMessageId] = useState("");
  const [viewerImage, setViewerImage] = useState("");
  const [hiddenMessageIds, setHiddenMessageIds] = useState({});

  const chatWindowRef = useRef(null);
  const composerInputRef = useRef(null);
  const inputFileRef = useRef(null);
  const groupImageInputRef = useRef(null);
  const socketRef = useRef(null);
  const lastTypingSentAtRef = useRef(0);
  const isNearBottomRef = useRef(true);
  const messageRefs = useRef({});

  const selectedConversation = useMemo(
    () => inbox.find((item) => String(item?._id || "") === String(selectedConversationId || "")) || null,
    [inbox, selectedConversationId]
  );

  const filteredInbox = useMemo(() => {
    const query = inboxFilter.trim().toLowerCase();
    const sorted = [...inbox].sort((a, b) => new Date(b?.lastMessageAt || 0) - new Date(a?.lastMessageAt || 0));
    if (!query) return sorted;
    return sorted.filter((item) => {
      const title = String(item?.title || "").toLowerCase();
      const preview = formatInboxPreview(item, user).toLowerCase();
      return title.includes(query) || preview.includes(query);
    });
  }, [inbox, inboxFilter, user]);

  const isGroupAdmin = useMemo(() => {
    if (!selectedConversation || selectedConversation.type !== "group") return false;
    const me = (selectedConversation.members || []).find((member) => String(member.userId || "") === String(user?.id || ""));
    return me?.role === "admin";
  }, [selectedConversation, user?.id]);

  const loadInbox = async () => {
    setInboxLoading(true);
    try {
      const data = await api.get("/chat/inbox", { showGlobalLoader: false }).then((res) => res.data || []);
      setInbox(data);
      if (!selectedConversationId && data.length) {
        setSelectedConversationId(String(data[0]._id));
      } else if (selectedConversationId && !data.some((item) => String(item._id) === String(selectedConversationId))) {
        setSelectedConversationId(data[0]?._id ? String(data[0]._id) : "");
      }
    } finally {
      setInboxLoading(false);
    }
  };

  const markConversationRead = async (conversationId) => {
    if (!conversationId) return;
    try {
      await api.post(`/chat/conversations/${conversationId}/read`, null, { showGlobalLoader: false });
    } catch {
      // no-op
    }
  };

  const loadMessages = async (conversationId) => {
    if (!conversationId) return;
    setLoadingMessages(true);
    setMessageError("");
    setReplyTo(null);
    setSelectedMessageId("");
    setExpandedTimestamps({});
    try {
      const data = await api
        .get(`/chat/conversations/${conversationId}/messages?limit=${PAGE_SIZE}`, { showGlobalLoader: false })
        .then((res) => res.data || { items: [] });
      const items = Array.isArray(data.items) ? data.items : [];
      setMessages(items);
      setHasMore(Boolean(data.hasMore));
      setBeforeCursor(String(data.nextBefore || ""));
      await markConversationRead(conversationId);
      requestAnimationFrame(() => {
        const node = chatWindowRef.current;
        if (node) node.scrollTop = node.scrollHeight;
      });
    } catch (error) {
      setMessages([]);
      setHasMore(false);
      setBeforeCursor("");
      setMessageError(error?.response?.data?.message || "Failed to load conversation.");
    } finally {
      setLoadingMessages(false);
    }
  };

  const loadOlderMessages = async () => {
    if (!selectedConversationId || !beforeCursor || !hasMore || loadingOlder) return;
    const node = chatWindowRef.current;
    const prevHeight = node?.scrollHeight || 0;
    setLoadingOlder(true);
    try {
      const data = await api
        .get(
          `/chat/conversations/${selectedConversationId}/messages?limit=${PAGE_SIZE}&before=${encodeURIComponent(beforeCursor)}`,
          { showGlobalLoader: false }
        )
        .then((res) => res.data || { items: [] });
      const older = Array.isArray(data.items) ? data.items : [];
      setMessages((prev) => [...older, ...prev]);
      setHasMore(Boolean(data.hasMore));
      setBeforeCursor(String(data.nextBefore || ""));

      requestAnimationFrame(() => {
        const nextNode = chatWindowRef.current;
        if (!nextNode) return;
        const nextHeight = nextNode.scrollHeight;
        nextNode.scrollTop = Math.max(0, nextHeight - prevHeight + nextNode.scrollTop);
      });
    } finally {
      setLoadingOlder(false);
    }
  };

  const refreshLatestMessages = async (conversationId) => {
    if (!conversationId) return;
    try {
      const data = await api
        .get(`/chat/conversations/${conversationId}/messages?limit=20`, { showGlobalLoader: false })
        .then((res) => res.data || { items: [] });
      const latest = Array.isArray(data.items) ? data.items : [];
      if (!latest.length) return;
      setMessages((prev) => {
        let next = prev;
        latest.forEach((item) => {
          next = mergeIncomingMessage(next, item);
        });
        return next;
      });
    } catch {
      // best-effort sync
    }
  };

  const openConversation = async (conversationId) => {
    const nextId = String(conversationId || "");
    if (!nextId) return;
    setSelectedConversationId(nextId);
    if (isMobile) setMobilePane("thread");
    await loadMessages(nextId);
  };

  const ensureDirectConversation = async (targetUserId) => {
    if (!targetUserId) return;
    try {
      const data = await api.post("/chat/direct", { userId: targetUserId }).then((res) => res.data || {});
      const nextId = String(data.conversationId || "");
      await loadInbox();
      if (nextId) {
        await openConversation(nextId);
      }
      setSearchOpen(false);
      setUserSearch("");
      setSearchResults([]);
    } catch {
      // no-op
    }
  };

  const createGroup = async () => {
    if (!groupTitle.trim() || groupMembers.length < 1 || groupSaving || groupImageUploading) return;
    setGroupSaving(true);
    try {
      const payload = {
        title: groupTitle.trim(),
        imageUrl: groupImageUrl.trim(),
        memberIds: groupMembers.map((item) => item.userId)
      };
      const data = await api.post("/chat/groups", payload).then((res) => res.data || {});
      await loadInbox();
      if (data.conversationId) {
        await openConversation(String(data.conversationId));
      }
      setGroupOpen(false);
      setGroupTitle("");
      setGroupImageUrl("");
      setGroupImageUploading(false);
      setGroupMembers([]);
      setGroupSearch("");
      setGroupSearchResults([]);
    } finally {
      setGroupSaving(false);
    }
  };

  const uploadGroupImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setGroupImageUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const uploaded = await api.post("/chat/upload", form, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const url = String(uploaded?.data?.url || "");
      if (url) {
        setGroupImageUrl(url);
      }
    } finally {
      setGroupImageUploading(false);
      event.target.value = "";
    }
  };

  const sendTyping = () => {
    const socket = socketRef.current;
    if (!socket || !selectedConversationId) return;
    const now = Date.now();
    if (now - lastTypingSentAtRef.current < 900) return;
    lastTypingSentAtRef.current = now;
    socket.emit("chat:typing", { conversationId: selectedConversationId });
  };

  const keepComposerVisible = () => {
    requestAnimationFrame(() => {
      const node = chatWindowRef.current;
      if (node) node.scrollTop = node.scrollHeight;
      composerInputRef.current?.scrollIntoView({ block: "nearest" });
    });
    setTimeout(() => {
      const node = chatWindowRef.current;
      if (node) node.scrollTop = node.scrollHeight;
    }, 180);
  };

  const scrollToBottom = (force = false) => {
    const node = chatWindowRef.current;
    if (!node) return;
    if (!force && !isNearBottomRef.current) return;
    node.scrollTop = node.scrollHeight;
  };

  const toggleTimestamp = (messageId) => {
    const key = String(messageId || "");
    if (!key) return;
    setExpandedTimestamps((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const sendText = async () => {
    const value = text.trim();
    if (!value || !selectedConversationId || sending) return;
    setSending(true);
    setText("");
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimistic = {
      _id: tempId,
      clientMessageId: tempId,
      senderId: user?.id || "",
      senderName: user?.name || "You",
      senderRole: user?.role || "student",
      type: "text",
      content: value,
      createdAt: new Date().toISOString(),
      seenCount: 0,
      sendState: "sending",
      replyTo: replyTo?._id || null,
      _local: true
    };
    setMessages((prev) => [...prev, optimistic]);
    requestAnimationFrame(() => scrollToBottom(true));
    try {
      const created = await api
        .post("/chat/messages", {
          conversationId: selectedConversationId,
          type: "text",
          content: value,
          clientMessageId: tempId,
          replyTo: replyTo?._id || undefined
        })
        .then((res) => res.data);
      setMessages((prev) => mergeIncomingMessage(prev, created));
      setReplyTo(null);
      await loadInbox();
    } catch {
      setMessages((prev) => prev.filter((item) => item._id !== tempId));
      setText(value);
    } finally {
      setSending(false);
    }
  };

  const sendFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !selectedConversationId) return;
    try {
      const form = new FormData();
      form.append("file", file);
      const uploaded = await api.post("/chat/upload", form, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const url = uploaded?.data?.url;
      if (!url) return;
      const type = file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
          ? "video"
          : "file";
      const created = await api
        .post("/chat/messages", {
          conversationId: selectedConversationId,
          type,
          content: url,
          fileName: file.name,
          mimeType: file.type,
          replyTo: replyTo?._id || undefined
        })
        .then((res) => res.data);
      setMessages((prev) => mergeIncomingMessage(prev, created));
      setReplyTo(null);
      await loadInbox();
      requestAnimationFrame(() => scrollToBottom(true));
    } finally {
      event.target.value = "";
    }
  };

  const reportMessage = async (messageId) => {
    const reason = window.prompt("Reason for report (example: Abuse, Harassment, Spam)", "Abuse");
    if (!reason) return;
    const note = window.prompt("Extra note (optional)", "") || "";
    try {
      await api.post("/chat/reports", { messageId, reason, note });
    } catch {
      // no-op
    }
  };

  const updateGroupMeta = async () => {
    if (!selectedConversation || selectedConversation.type !== "group" || !isGroupAdmin) return;
    const nextTitle = window.prompt("Rename group", selectedConversation.title || "");
    if (nextTitle === null) return;
    const nextImage = window.prompt("Group image URL (leave blank to clear)", selectedConversation.imageUrl || "");
    try {
      await api.put(`/chat/groups/${selectedConversation._id}`, {
        title: String(nextTitle || "").trim(),
        imageUrl: String(nextImage || "").trim()
      });
      await loadInbox();
    } catch {
      // no-op
    }
  };

  const addMemberToGroup = async () => {
    if (!selectedConversation || selectedConversation.type !== "group" || !isGroupAdmin) return;
    const keyword = window.prompt("Search member name to add");
    if (!keyword) return;
    try {
      const matches = await api
        .get(`/chat/search-users?q=${encodeURIComponent(keyword.trim())}`)
        .then((res) => res.data || []);
      const existing = new Set((selectedConversation.members || []).map((item) => String(item.userId || "")));
      const candidate = matches.find((item) => !existing.has(String(item.userId || "")));
      if (!candidate) {
        window.alert("No eligible user found for this keyword.");
        return;
      }
      const ok = window.confirm(`Add ${candidate.name} to this group?`);
      if (!ok) return;
      await api.post(`/chat/groups/${selectedConversation._id}/members`, {
        memberIds: [candidate.userId]
      });
      await loadInbox();
    } catch {
      // no-op
    }
  };

  const removeMemberFromGroup = async () => {
    if (!selectedConversation || selectedConversation.type !== "group" || !isGroupAdmin) return;
    const activeMembers = (selectedConversation.members || []).filter(
      (member) => String(member.userId || "") !== String(user?.id || "")
    );
    if (!activeMembers.length) {
      window.alert("No removable members in this group.");
      return;
    }
    const hint = activeMembers.map((member) => `${member.name} (${member.userId})`).join("\\n");
    const targetId = window.prompt(`Paste member userId to remove:\\n${hint}`);
    if (!targetId) return;
    const ok = window.confirm("Remove this member from the group?");
    if (!ok) return;
    try {
      await api.delete(`/chat/groups/${selectedConversation._id}/members/${targetId.trim()}`);
      await loadInbox();
    } catch {
      // no-op
    }
  };

  const leaveGroup = async () => {
    if (!selectedConversation || selectedConversation.type !== "group") return;
    const ok = window.confirm("Leave this group?");
    if (!ok) return;
    try {
      await api.post(`/chat/groups/${selectedConversation._id}/leave`);
      setSelectedConversationId("");
      setMessages([]);
      if (isMobile) setMobilePane("inbox");
      await loadInbox();
    } catch {
      // no-op
    }
  };

  const loadReports = async () => {
    if (user?.role !== "teacher") return;
    setReportsLoading(true);
    try {
      const rows = await api.get("/chat/reports").then((res) => res.data || []);
      setReports(rows);
    } finally {
      setReportsLoading(false);
    }
  };

  const resolveReport = async (reportId, action) => {
    try {
      await api.post(`/chat/reports/${reportId}/resolve`, { action, resolutionNote: "Handled by teacher" });
      await loadReports();
    } catch {
      // no-op
    }
  };

  useEffect(() => {
    loadInbox();
  }, []);

  useEffect(() => {
    if (!selectedConversationId) return;
    loadMessages(selectedConversationId);
  }, [selectedConversationId]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return undefined;
    const root = document.documentElement;
    const updateVh = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight || 0;
      if (viewportHeight > 0) {
        root.style.setProperty("--chat-safe-vh", `${Math.round(viewportHeight)}px`);
      }
    };
    updateVh();
    window.addEventListener("resize", updateVh, { passive: true });
    window.addEventListener("orientationchange", updateVh, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", updateVh, { passive: true });
      window.visualViewport.addEventListener("scroll", updateVh, { passive: true });
    }
    return () => {
      window.removeEventListener("resize", updateVh);
      window.removeEventListener("orientationchange", updateVh);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", updateVh);
        window.visualViewport.removeEventListener("scroll", updateVh);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const media = window.matchMedia(mobileMedia);
    const sync = (event) => {
      const matches = Boolean(event?.matches);
      setIsMobile(matches);
      if (!matches) {
        setMobilePane("thread");
      } else if (!selectedConversationId) {
        setMobilePane("inbox");
      }
    };
    sync(media);
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", sync);
      return () => media.removeEventListener("change", sync);
    }
    media.addListener(sync);
    return () => media.removeListener(sync);
  }, [selectedConversationId]);

  useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const userId = String(params.get("user") || "").trim();
    if (!userId) return;
    ensureDirectConversation(userId);
  }, [location.search]);

  useEffect(() => {
    if (!searchOpen) return;
    const query = userSearch.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const rows = await api.get(`/chat/search-users?q=${encodeURIComponent(query)}`).then((res) => res.data || []);
        if (!cancelled) setSearchResults(rows);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [userSearch, searchOpen]);

  useEffect(() => {
    if (!groupOpen) return;
    const query = groupSearch.trim();
    if (!query) {
      setGroupSearchResults([]);
      return;
    }
    let cancelled = false;
    setGroupSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const rows = await api.get(`/chat/search-users?q=${encodeURIComponent(query)}`).then((res) => res.data || []);
        if (!cancelled) setGroupSearchResults(rows);
      } finally {
        if (!cancelled) setGroupSearchLoading(false);
      }
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [groupSearch, groupOpen]);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token || !user?.id) return undefined;
    const socket = connectSocket(token);
    if (!socket) return undefined;
    socketRef.current = socket;

    const onInboxUpdate = () => {
      loadInbox();
    };

    const onMessageNew = ({ conversationId, message }) => {
      const targetId = String(conversationId || "");
      if (targetId && targetId === String(selectedConversationId || "")) {
        const normalized = message && String(message.senderId || "") === String(user?.id || "") ? { ...message, delivered: true } : message;
        setMessages((prev) => mergeIncomingMessage(prev, normalized));
        markConversationRead(targetId);
        requestAnimationFrame(() => scrollToBottom(false));
      }
      loadInbox();
    };

    const onMessageUpdated = ({ conversationId, message }) => {
      if (String(conversationId || "") !== String(selectedConversationId || "")) return;
      setMessages((prev) => prev.map((item) => (String(item._id) === String(message?._id) ? message : item)));
    };

    const onTyping = (payload) => {
      if (String(payload?.senderId || "") === String(user?.id || "")) return;
      if (String(payload?.conversationId || "") !== String(selectedConversationId || "")) return;
      setTypingState({
        conversationId: String(payload?.conversationId || ""),
        senderName: String(payload?.senderName || "Someone")
      });
      setTimeout(() => {
        setTypingState((prev) =>
          prev.conversationId === String(payload?.conversationId || "") ? { conversationId: "", senderName: "" } : prev
        );
      }, 1300);
    };

    socket.on("chat:inbox-updated", onInboxUpdate);
    socket.on("chat:conversation-created", onInboxUpdate);
    socket.on("chat:conversation-updated", onInboxUpdate);
    socket.on("chat:message-new", onMessageNew);
    socket.on("chat:message-updated", onMessageUpdated);
    socket.on("chat:typing", onTyping);
    socket.on("connect", onInboxUpdate);

    return () => {
      socket.off("chat:inbox-updated", onInboxUpdate);
      socket.off("chat:conversation-created", onInboxUpdate);
      socket.off("chat:conversation-updated", onInboxUpdate);
      socket.off("chat:message-new", onMessageNew);
      socket.off("chat:message-updated", onMessageUpdated);
      socket.off("chat:typing", onTyping);
      socket.off("connect", onInboxUpdate);
      socketRef.current = null;
    };
  }, [user?.id, selectedConversationId]);

  useEffect(() => {
    const timer = setInterval(() => {
      loadInbox();
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!selectedConversationId) return undefined;
    const timer = setInterval(() => {
      refreshLatestMessages(selectedConversationId);
    }, 6000);
    return () => clearInterval(timer);
  }, [selectedConversationId]);

  const onScrollMessages = () => {
    const node = chatWindowRef.current;
    if (!node) return;
    if (node.scrollTop < 120) {
      loadOlderMessages();
    }
  };

  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(640);

  useEffect(() => {
    const node = chatWindowRef.current;
    if (!node) return;
    const handle = () => {
      setScrollTop(node.scrollTop);
      setViewportHeight(node.clientHeight || 640);
      const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
      isNearBottomRef.current = distance < 120;
      onScrollMessages();
    };
    node.addEventListener("scroll", handle, { passive: true });
    handle();
    return () => node.removeEventListener("scroll", handle);
  }, [chatWindowRef.current, beforeCursor, hasMore, loadingOlder]);

  const visibleMessages = messages.filter((msg) => !hiddenMessageIds[String(msg?._id || "")]);
  const messageMap = useMemo(() => {
    const map = new Map();
    visibleMessages.forEach((item) => map.set(String(item._id), item));
    return map;
  }, [visibleMessages]);
  const totalCount = visibleMessages.length;
  const startIndex = Math.max(0, Math.floor(scrollTop / ESTIMATED_ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(totalCount, Math.ceil((scrollTop + viewportHeight) / ESTIMATED_ROW_HEIGHT) + OVERSCAN);
  const virtualItems = visibleMessages.slice(startIndex, endIndex);
  const topSpacerHeight = startIndex * ESTIMATED_ROW_HEIGHT;
  const bottomSpacerHeight = Math.max(0, (totalCount - endIndex) * ESTIMATED_ROW_HEIGHT);

  const lastSeenMineId = useMemo(() => {
    const mineSeen = [...visibleMessages]
      .reverse()
      .find((item) => String(item.senderId || "") === String(user?.id || "") && Number(item.seenCount || 0) > 0);
    return mineSeen ? String(mineSeen._id) : "";
  }, [visibleMessages, user?.id]);

  const jumpToMessage = (messageId) => {
    const key = String(messageId || "");
    if (!key) return;
    const node = messageRefs.current[key];
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
      toggleTimestamp(key);
      return;
    }
    const index = visibleMessages.findIndex((item) => String(item._id) === key);
    if (index >= 0 && chatWindowRef.current) {
      chatWindowRef.current.scrollTop = Math.max(0, index * ESTIMATED_ROW_HEIGHT - ESTIMATED_ROW_HEIGHT * 2);
    }
  };

  const toggleReaction = async (messageId, emoji = "❤️") => {
    if (!messageId) return;
    try {
      const updated = await api.post(`/chat/messages/${messageId}/reactions`, { emoji }).then((res) => res.data);
      setMessages((prev) => prev.map((item) => (String(item._id) === String(updated._id) ? updated : item)));
    } catch {
      // no-op
    }
  };

  const deleteMessageForEveryone = async (messageId) => {
    if (!messageId) return;
    try {
      const updated = await api.delete(`/chat/messages/${messageId}`).then((res) => res.data);
      setMessages((prev) => prev.map((item) => (String(item._id) === String(updated._id) ? updated : item)));
    } catch {
      // no-op
    }
  };

  const handleMessageMenuAction = async (message, action) => {
    setSelectedMessageId("");
    if (!message) return;
    const id = String(message._id || "");
    if (action === "reply") {
      setReplyTo(message);
      composerInputRef.current?.focus();
      return;
    }
    if (action === "copy") {
      try {
        await navigator.clipboard.writeText(String(message.content || ""));
      } catch {
        // no-op
      }
      return;
    }
    if (action === "forward") {
      setText((prev) => `${prev ? `${prev}\n` : ""}${String(message.content || "")}`);
      composerInputRef.current?.focus();
      return;
    }
    if (action === "delete-for-me") {
      setHiddenMessageIds((prev) => ({ ...prev, [id]: true }));
      return;
    }
    if (action === "delete-for-everyone") {
      await deleteMessageForEveryone(id);
      return;
    }
    if (action === "report") {
      await reportMessage(id);
    }
  };

  return (
    <div className="page chat-inbox-page">
      <div className={`chat-layout card ${isMobile ? `mobile-pane-${mobilePane}` : ""}`}>
        <aside className="chat-inbox-panel">
          <div className="chat-inbox-head">
            <div className="chat-ig-head-row">
              <h2 className="card-title chat-ig-username" style={{ margin: 0 }}>
                {user?.name || "Messages"} <span className="chat-ig-username-caret">⌄</span>
              </h2>
              <div className="chat-inbox-head-actions">
                <button className="chat-ig-icon-btn" type="button" onClick={() => setSearchOpen(true)} title="New chat">
                  <FiEdit2 size={16} />
                </button>
                <button className="chat-ig-icon-btn" type="button" onClick={() => setGroupOpen(true)} title="New group">
                  <FiUsers size={17} />
                </button>
                {user?.role === "teacher" ? (
                  <button
                    className="chat-ig-action-btn"
                    type="button"
                    onClick={() => {
                      setReportsOpen(true);
                      loadReports();
                    }}
                  >
                    Reports
                  </button>
                ) : null}
              </div>
            </div>
            <input
              className="input chat-ig-search"
              placeholder="Search conversations"
              value={inboxFilter}
              onChange={(event) => setInboxFilter(event.target.value)}
            />
          </div>

          <div className="chat-inbox-list">
            {inboxLoading ? <div>Loading inbox...</div> : null}
            {!inboxLoading && !filteredInbox.length ? <div>No conversations found.</div> : null}
            {filteredInbox.map((item) => (
              <button
                key={item._id}
                type="button"
                className={`chat-inbox-item ${String(item._id) === String(selectedConversationId) ? "chat-inbox-item-active" : ""} ${Number(item.unreadCount || 0) > 0 ? "chat-inbox-item-unread" : ""}`}
                onClick={() => {
                  setSelectedConversationId(String(item._id));
                  if (isMobile) setMobilePane("thread");
                }}
              >
                <div className="chat-inbox-avatar-wrap">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} className="chat-inbox-avatar" />
                  ) : (
                    <div className="chat-inbox-avatar chat-inbox-avatar-fallback">{String(item.title || "C").slice(0, 1).toUpperCase()}</div>
                  )}
                </div>
                <div className="chat-inbox-main">
                  <div className="chat-inbox-row">
                    <strong className="chat-inbox-name">{item.title}</strong>
                    <span className="chat-inbox-time">{toShortTime(item.lastMessageAt)}</span>
                  </div>
                  <div className="chat-inbox-row">
                    <span className="chat-inbox-preview">{formatInboxPreview(item, user)}</span>
                    {Number(item.unreadCount || 0) > 0 ? <span className="chat-inbox-unread">{toUnreadLabel(item.unreadCount)}</span> : null}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="chat-thread-panel">
          {!selectedConversation ? (
            <div className="chat-thread-empty">Choose a conversation to start chatting.</div>
          ) : (
            <>
              <div className="chat-thread-head">
                <div className="chat-thread-head-main">
                  {selectedConversation.imageUrl ? (
                    <img src={selectedConversation.imageUrl} alt={selectedConversation.title} className="chat-thread-head-avatar" />
                  ) : (
                    <div className="chat-thread-head-avatar chat-inbox-avatar-fallback">
                      {String(selectedConversation.title || "C").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="chat-thread-head-title">
                    <h3 className="card-title" style={{ margin: 0 }}>{selectedConversation.title}</h3>
                    <div className="chat-thread-meta">
                    {selectedConversation.type === "group"
                      ? `${selectedConversation.members?.length || 0} members`
                      : selectedConversation?.counterpart?.isOnline
                        ? "Online"
                        : selectedConversation?.counterpart?.lastSeenAt
                          ? `Last seen ${toTimeLabel(selectedConversation.counterpart.lastSeenAt)}`
                          : "Direct chat"}
                    </div>
                  </div>
                </div>
                <div className="chat-thread-head-actions">
                  {isMobile ? (
                    <button className="btn btn-ghost" type="button" onClick={() => setMobilePane("inbox")}>Inbox</button>
                  ) : null}
                  {selectedConversation.type === "group" && isGroupAdmin ? (
                    <button className="btn btn-ghost" type="button" onClick={updateGroupMeta}>Manage</button>
                  ) : null}
                  {selectedConversation.type === "group" && isGroupAdmin ? (
                    <button className="btn btn-ghost" type="button" onClick={addMemberToGroup}>Add Member</button>
                  ) : null}
                  {selectedConversation.type === "group" && isGroupAdmin ? (
                    <button className="btn btn-ghost" type="button" onClick={removeMemberFromGroup}>Remove Member</button>
                  ) : null}
                  {selectedConversation.type === "group" ? (
                    <button className="btn btn-ghost" type="button" onClick={leaveGroup}>Leave</button>
                  ) : null}
                </div>
              </div>

              <div className="chat-thread-window" ref={chatWindowRef}>
                {loadingMessages ? <div className="chat-meta">Loading messages...</div> : null}
                {messageError ? <div className="auth-error">{messageError}</div> : null}
                {!loadingMessages && loadingOlder ? <div className="chat-meta">Loading older...</div> : null}

                <div style={{ height: `${topSpacerHeight}px` }} />
                {virtualItems.map((msg, localIndex) => {
                  const absoluteIndex = startIndex + localIndex;
                  const prevMsg = visibleMessages[absoluteIndex - 1] || null;
                  const nextMsg = visibleMessages[absoluteIndex + 1] || null;
                  const mine = String(msg.senderId || "") === String(user?.id || "");
                  const sameAsPrev =
                    prevMsg &&
                    String(prevMsg.senderId || "") === String(msg.senderId || "") &&
                    Math.abs(new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()) < 7 * 60 * 1000;
                  const sameAsNext =
                    nextMsg &&
                    String(nextMsg.senderId || "") === String(msg.senderId || "") &&
                    Math.abs(new Date(nextMsg.createdAt).getTime() - new Date(msg.createdAt).getTime()) < 7 * 60 * 1000;
                  const dayChanged =
                    !prevMsg ||
                    new Date(prevMsg.createdAt).toDateString() !== new Date(msg.createdAt).toDateString();
                  const timeGap = prevMsg
                    ? Math.abs(new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()) > 20 * 60 * 1000
                    : true;
                  const showTimestamp = Boolean(expandedTimestamps[String(msg._id)]) || dayChanged || timeGap;
                  const groupShapeClass = !sameAsPrev && !sameAsNext
                    ? "chat-bubble-single"
                    : !sameAsPrev
                      ? "chat-bubble-first"
                      : !sameAsNext
                        ? "chat-bubble-last"
                        : "chat-bubble-middle";
                  const showGroupSender = selectedConversation?.type === "group" && !mine && !sameAsPrev;
                  const showGroupAvatar = selectedConversation?.type === "group" && !mine && !sameAsNext;
                  const replySource = msg.replyTo ? messageMap.get(String(msg.replyTo)) : null;
                  const hasEmojiOnly = !msg.deletedAt && msg.type === "text" && isEmojiOnly(msg.content);
                  const reactions = Array.isArray(msg.reactions) ? msg.reactions : [];
                  const statusLabel = msg._local || msg.sendState === "sending"
                    ? "sending"
                    : Number(msg.seenCount || 0) > 0
                      ? "seen"
                      : msg.delivered
                        ? "delivered"
                        : "sent";
                  return (
                    <div
                      key={msg._id}
                      ref={(node) => {
                        if (node) messageRefs.current[String(msg._id)] = node;
                      }}
                    >
                      {dayChanged ? <div className="chat-day-divider">{formatDayDivider(msg.createdAt)}</div> : null}
                      <div
                        className={`chat-bubble-row ${mine ? "chat-bubble-row-mine" : "chat-bubble-row-other"}`}
                        onDoubleClick={() => toggleReaction(msg._id, "❤️")}
                      >
                        {showGroupAvatar ? (
                          msg.senderAvatar ? (
                            <img src={msg.senderAvatar} alt={msg.senderName || "User"} className="chat-group-msg-avatar" />
                          ) : (
                            <div className="chat-group-msg-avatar chat-inbox-avatar-fallback">
                              {String(msg.senderName || "U").slice(0, 1).toUpperCase()}
                            </div>
                          )
                        ) : (
                          <div className="chat-group-msg-avatar-placeholder" />
                        )}
                        <div
                          className={`chat-bubble ${mine ? "chat-bubble-mine" : "chat-bubble-other"} ${groupShapeClass}`}
                          onClick={() => toggleTimestamp(msg._id)}
                          onContextMenu={(event) => {
                            event.preventDefault();
                            setSelectedMessageId((prev) => (prev === String(msg._id) ? "" : String(msg._id)));
                          }}
                        >
                          {showGroupSender ? <div className="chat-bubble-sender">{msg.senderName}</div> : null}
                          {replySource ? (
                            <button
                              type="button"
                              className="chat-reply-preview-chip"
                              onClick={(event) => {
                                event.stopPropagation();
                                jumpToMessage(replySource._id);
                              }}
                            >
                              <span>{replySource.senderName || "User"}</span>
                              <span>{replySource.deletedAt ? "This message was deleted" : String(replySource.content || "[media]")}</span>
                            </button>
                          ) : null}
                          {replySource === null && msg.replyTo ? (
                            <div className="chat-reply-preview-chip">
                              <span>Reply</span>
                              <span>Original message not in this window</span>
                            </div>
                          ) : null}
                      {!msg.deletedAt && (msg.type === "image" || msg.type === "gif" || msg.type === "meme") ? (
                        <img
                          src={msg.content}
                          alt={msg.fileName || "image"}
                          className="chat-media"
                          onClick={() => {
                            setViewerImage(msg.content);
                          }}
                        />
                      ) : null}
                      {!msg.deletedAt && msg.type === "video" ? (
                        <video controls className="chat-media">
                          <source src={msg.content} type={msg.mimeType || "video/mp4"} />
                        </video>
                      ) : null}
                          {!msg.deletedAt && (msg.type === "file" || msg.type === "document") ? (
                            <a href={msg.content} target="_blank" rel="noreferrer" className="chat-file-chip" onClick={(event) => event.stopPropagation()}>
                              {msg.fileName || "Open document"}
                            </a>
                          ) : null}
                      {(!msg.deletedAt && msg.type === "text") || (!msg.deletedAt && msg.type === "announcement") ? (
                            <div className={`chat-bubble-text ${hasEmojiOnly ? "chat-bubble-emoji-only" : ""}`}>{msg.content}</div>
                      ) : null}
                      {msg.deletedAt ? <div className="chat-bubble-text" style={{ fontStyle: "italic" }}>This message was deleted.</div> : null}

                          <div className="chat-bubble-foot">
                            {showTimestamp ? <span>{toTimeLabel(msg.createdAt)}</span> : <span />}
                            {mine ? (
                              <span className="chat-send-state">
                                {statusLabel === "sending" ? "⏳" : null}
                                {statusLabel === "sent" ? <FiCheck size={13} /> : null}
                                {statusLabel === "delivered" ? <FiCheckCircle size={13} /> : null}
                                {statusLabel === "seen" && String(lastSeenMineId) !== String(msg._id) ? <FiCheckCircle size={13} /> : null}
                              </span>
                            ) : null}
                          </div>
                          {mine && String(lastSeenMineId) === String(msg._id) ? (
                            <div className="chat-last-seen">Seen</div>
                          ) : null}
                          {reactions.length ? (
                            <div className="chat-reaction-row">
                              {Object.entries(
                                reactions.reduce((acc, item) => {
                                  const key = String(item?.emoji || "");
                                  if (!key) return acc;
                                  acc[key] = (acc[key] || 0) + 1;
                                  return acc;
                                }, {})
                              ).map(([emoji, count]) => (
                                <span key={`${msg._id}-${emoji}`} className="chat-reaction-pill">{emoji} {count}</span>
                              ))}
                            </div>
                          ) : null}
                          {String(selectedMessageId) === String(msg._id) ? (
                            <div className="chat-msg-menu">
                              <button type="button" onClick={() => handleMessageMenuAction(msg, "reply")}><FiCornerUpLeft size={14} /> Reply</button>
                              <button type="button" onClick={() => handleMessageMenuAction(msg, "copy")}><FiCopy size={14} /> Copy</button>
                              <button type="button" onClick={() => handleMessageMenuAction(msg, "forward")}><FiShare2 size={14} /> Forward</button>
                              {mine ? <button type="button" onClick={() => handleMessageMenuAction(msg, "delete-for-me")}><FiTrash2 size={14} /> Delete for me</button> : null}
                              {mine ? <button type="button" onClick={() => handleMessageMenuAction(msg, "delete-for-everyone")}><FiTrash2 size={14} /> Delete for everyone</button> : null}
                              {!mine && !msg.deletedAt ? (
                                <button type="button" onClick={() => handleMessageMenuAction(msg, "report")} className="danger">
                                  <FiAlertCircle size={14} /> Report
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div style={{ height: `${bottomSpacerHeight}px` }} />
                {!loadingMessages && !messageError && !visibleMessages.length ? <div className="chat-meta">No messages yet.</div> : null}
              </div>

              {typingState.conversationId === String(selectedConversationId) ? (
                <div className="chat-typing-indicator">{typingState.senderName} is typing...</div>
              ) : null}

              {replyTo ? (
                <div className="chat-reply-banner-live">
                  <div>
                    <strong>Replying to {replyTo.senderName || "User"}</strong>
                    <div>{replyTo.deletedAt ? "This message was deleted" : String(replyTo.content || "[media]")}</div>
                  </div>
                  <button type="button" className="btn btn-ghost" onClick={() => setReplyTo(null)}>Cancel</button>
                </div>
              ) : null}

              <div className="chat-thread-compose">
                <button className="btn btn-ghost chat-compose-icon-btn" type="button" onClick={() => inputFileRef.current?.click()} title="Attach">
                  <FiPaperclip size={17} />
                </button>
                <input
                  ref={composerInputRef}
                  className="input chat-compose-input"
                  placeholder="Type a message"
                  value={text}
                  onChange={(event) => {
                    setText(event.target.value);
                    sendTyping();
                  }}
                  onFocus={keepComposerVisible}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      sendText();
                    }
                  }}
                />
                <button className="btn chat-compose-send-btn" type="button" onClick={sendText} disabled={sending || !text.trim()} title="Send">
                  <FiSend size={16} />
                </button>
                <input
                  ref={inputFileRef}
                  type="file"
                  accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                  hidden
                  onChange={sendFile}
                />
              </div>
            </>
          )}
        </section>
      </div>

      {viewerImage ? (
        <div className="chat-image-viewer" onClick={() => setViewerImage("")}>
          <img src={viewerImage} alt="Preview" className="chat-image-viewer-img" />
        </div>
      ) : null}

      {searchOpen ? (
        <div className="confirm-popup-overlay" onClick={() => setSearchOpen(false)}>
          <div className="confirm-popup-card" onClick={(event) => event.stopPropagation()} style={{ width: "min(560px, 96vw)" }}>
            <h3 className="confirm-popup-title">Start New Chat</h3>
            <input
              className="input"
              placeholder="Search users by name"
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
            />
            <div className="list" style={{ maxHeight: "52vh", overflow: "auto" }}>
              {searchLoading ? <div>Searching...</div> : null}
              {!searchLoading && !searchResults.length ? <div>No users found.</div> : null}
              {searchResults.map((item) => (
                <button key={item.userId} className="list-item" type="button" onClick={() => ensureDirectConversation(item.userId)}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{item.name}</div>
                    <div style={{ fontSize: "12px", color: "var(--muted)" }}>{item.role}</div>
                  </div>
                  <span className="pill">Message</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {groupOpen ? (
        <div className="confirm-popup-overlay" onClick={() => setGroupOpen(false)}>
          <div className="confirm-popup-card" onClick={(event) => event.stopPropagation()} style={{ width: "min(620px, 96vw)" }}>
            <h3 className="confirm-popup-title">Create Group</h3>
            <input className="input" placeholder="Group name" value={groupTitle} onChange={(event) => setGroupTitle(event.target.value)} />
            <div className="chat-group-image-row">
              <button className="btn btn-ghost" type="button" onClick={() => groupImageInputRef.current?.click()} disabled={groupImageUploading}>
                {groupImageUploading ? "Uploading image..." : groupImageUrl ? "Change Group Image" : "Upload Group Image"}
              </button>
              {groupImageUrl ? (
                <>
                  <img src={groupImageUrl} alt="Group avatar" className="chat-group-image-preview" />
                  <button className="btn btn-ghost" type="button" onClick={() => setGroupImageUrl("")}>Remove</button>
                </>
              ) : null}
            </div>
            <input
              className="input"
              placeholder="Search and add members"
              value={groupSearch}
              onChange={(event) => setGroupSearch(event.target.value)}
            />
            {!!groupMembers.length ? (
              <div className="chat-group-member-chips">
                {groupMembers.map((member) => (
                  <button
                    key={member.userId}
                    type="button"
                    className="chat-group-member-chip"
                    onClick={() =>
                      setGroupMembers((prev) => prev.filter((item) => String(item.userId) !== String(member.userId)))
                    }
                  >
                    {member.name} ×
                  </button>
                ))}
              </div>
            ) : null}
            <div className="list" style={{ maxHeight: "34vh", overflow: "auto" }}>
              {groupSearchLoading ? <div>Searching...</div> : null}
              {!groupSearchLoading && groupSearch.trim() && !groupSearchResults.length ? <div>No users found.</div> : null}
              {groupSearchResults.map((item) => {
                const added = groupMembers.some((member) => String(member.userId) === String(item.userId));
                return (
                  <button
                    key={item.userId}
                    type="button"
                    className="list-item"
                    onClick={() => {
                      if (added) {
                        setGroupMembers((prev) => prev.filter((member) => String(member.userId) !== String(item.userId)));
                      } else {
                        setGroupMembers((prev) => [...prev, item]);
                      }
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>{item.name}</div>
                      <div style={{ fontSize: "12px", color: "var(--muted)" }}>{item.role}</div>
                    </div>
                    <span className="pill">{added ? "Added" : "Add"}</span>
                  </button>
                );
              })}
            </div>
            <div className="confirm-popup-actions">
              <button className="btn btn-ghost" type="button" onClick={() => setGroupOpen(false)}>Cancel</button>
              <button
                className="btn"
                type="button"
                onClick={createGroup}
                disabled={groupSaving || groupImageUploading || !groupTitle.trim() || groupMembers.length < 1}
              >
                {groupSaving ? "Creating..." : "Create Group"}
              </button>
            </div>
            <input ref={groupImageInputRef} type="file" accept="image/*" hidden onChange={uploadGroupImage} />
          </div>
        </div>
      ) : null}

      {reportsOpen ? (
        <div className="confirm-popup-overlay" onClick={() => setReportsOpen(false)}>
          <div className="confirm-popup-card" onClick={(event) => event.stopPropagation()} style={{ width: "min(860px, 98vw)" }}>
            <h3 className="confirm-popup-title">Reported Messages</h3>
            {reportsLoading ? <div>Loading reports...</div> : null}
            {!reportsLoading && !reports.length ? <div>No open reports.</div> : null}
            <div className="list" style={{ maxHeight: "70vh", overflow: "auto" }}>
              {reports.map((report) => (
                <div key={report._id} className="list-item" style={{ flexDirection: "column", alignItems: "stretch" }}>
                  <div style={{ fontWeight: 700 }}>
                    {report.reason} • {report.conversation?.type === "group" ? (report.conversation?.title || "Group") : "Direct Chat"}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                    By {report.reporterName || "User"} at {toTimeLabel(report.createdAt)}
                  </div>
                  {report.note ? <div style={{ fontSize: "12px" }}>Note: {report.note}</div> : null}
                  <div className="chat-report-context">
                    {(report.context || []).map((item) => (
                      <div key={item._id} className="chat-report-context-line">
                        <strong>{item.senderName}:</strong> {item.deletedAt ? "[deleted]" : item.content || `[${item.type}]`}
                      </div>
                    ))}
                  </div>
                  <div className="confirm-popup-actions">
                    <button className="btn btn-ghost" type="button" onClick={() => resolveReport(report._id, "dismissed")}>
                      Dismiss
                    </button>
                    <button className="btn" type="button" onClick={() => resolveReport(report._id, "resolved")}>
                      Resolve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

