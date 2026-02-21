import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api.js";
import { connectSocket } from "../socket.js";
import LevelJourney from "../components/LevelJourney.jsx";
import { playLevelUpAnimation } from "../levelSystem.js";

const CATEGORY_META = {
  all: { label: "All Categories", hint: "Complete badge catalog" },
  academic: { label: "Academic", hint: "Tests, marks, and performance" },
  consistency: { label: "Consistency", hint: "Attendance and streaks" },
  personality: { label: "Personality", hint: "Social and leadership traits" },
  inspired: { label: "Inspired", hint: "Pop-culture inspired titles" },
  secret: { label: "Secret", hint: "Hidden unlock conditions" },
  fun_event: { label: "Fun & Event", hint: "Festival and seasonal achievements" }
};

const CATEGORY_ORDER = ["academic", "consistency", "personality", "inspired", "fun_event", "secret"];

const getXpTierClass = (xpValue) => {
  const xp = Number(xpValue) || 0;
  if (xp >= 1000) return "xp-tier-1000";
  if (xp >= 450) return "xp-tier-450";
  if (xp >= 200) return "xp-tier-200";
  if (xp >= 150) return "xp-tier-150";
  if (xp >= 120) return "xp-tier-120";
  if (xp >= 50) return "xp-tier-50";
  if (xp >= 30) return "xp-tier-30";
  return "xp-tier-20";
};

const getBadgeVisualClass = (badge) => {
  if (badge?.category === "fun_event") return "xp-tier-event";
  return getXpTierClass(badge?.xpValue);
};

const getBadgeMetaText = (badge) => {
  const rarity = String(badge?.rarity || "").toUpperCase();
  if (badge?.category === "fun_event") return `${rarity} • EVENT`;
  return `${rarity} • ${badge?.xpValue || 0} XP`;
};

const getBadgeSpecialClass = (badge) => {
  if (badge?.key === "tanjiro_3x3") return "badge-theme-tanjiro";
  if (badge?.key === "kira_2h_7d") return "badge-theme-kira";
  if (badge?.key === "nico_robin_3sunday") return "badge-theme-robin";
  if (badge?.key === "goku_5h_sunday") return "badge-theme-goku";
  return "";
};

const isHeroImageBadge = (badge) =>
  badge?.key === "tanjiro_3x3" ||
  badge?.key === "kira_2h_7d" ||
  badge?.key === "nico_robin_3sunday" ||
  badge?.key === "goku_5h_sunday";
const isKiraBadge = (badge) => badge?.key === "kira_2h_7d";
const isRobinBadge = (badge) => badge?.key === "nico_robin_3sunday";
const isGokuBadge = (badge) => badge?.key === "goku_5h_sunday";

export default function Badges() {
  const [catalog, setCatalog] = useState([]);
  const [earned, setEarned] = useState([]);
  const [pending, setPending] = useState([]);
  const [level, setLevel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requestMessage, setRequestMessage] = useState("");
  const [selectedBadgeKey, setSelectedBadgeKey] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const previousLevelRef = useRef(0);
  const previousTotalXpRef = useRef(0);
  const previousEarnedRef = useRef([]);

  const load = async () => {
    setLoading(true);
    const [catalogData, meData, myRequests] = await Promise.all([
      api.get("/badges/catalog").then((res) => res.data || []),
      api.get("/badges/me").then((res) => res.data || {}),
      api.get("/badges/requests/mine").then((res) => res.data || [])
    ]);
    const nextEarned = meData.earned || [];
    const nextLevel = meData.level || null;
    setCatalog(catalogData);
    setEarned(nextEarned);
    setPending(myRequests.filter((item) => item.status === "pending"));
    setLevel(nextLevel);

    const oldLevel = Number(previousLevelRef.current || 0);
    const newLevel = Number(nextLevel?.level || 0);
    if (oldLevel > 0 && newLevel > oldLevel) {
      const oldXp = Number(previousTotalXpRef.current || 0);
      const newXp = Number(nextLevel?.totalXp || 0);
      const xpGained = Math.max(0, newXp - oldXp);
      const previousBadgeKeys = new Set((previousEarnedRef.current || []).map((item) => item.key));
      const newlyUnlocked = nextEarned.find((item) => !previousBadgeKeys.has(item.key));
      playLevelUpAnimation({
        oldLevel,
        newLevel,
        xpGained,
        badgeUnlocked: newlyUnlocked?.title || null
      });
    }
    previousLevelRef.current = newLevel;
    previousTotalXpRef.current = Number(nextLevel?.totalXp || 0);
    previousEarnedRef.current = nextEarned;
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
    const refresh = () => {
      load();
    };
    socket.on("badge:request-updated", refresh);
    socket.on("badge:awarded", refresh);
    socket.on("connect", refresh);
    return () => {
      socket.off("badge:request-updated", refresh);
      socket.off("badge:awarded", refresh);
      socket.off("connect", refresh);
    };
  }, []);

  useEffect(() => {
    if (!earned.length) return;
    const key = "last_mythic_badge_count";
    const currentMythicCount = earned.filter((badge) => Number(badge.xpValue) >= 1000).length;
    const previousCount = Number(localStorage.getItem(key) || 0);
    if (currentMythicCount > previousCount) {
      try {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(880, context.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, context.currentTime + 0.35);
        gain.gain.setValueAtTime(0.0001, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(context.destination);
        osc.start();
        osc.stop(context.currentTime + 0.52);
      } catch {
        // no-op if browser blocks autoplay audio context
      }
    }
    localStorage.setItem(key, String(currentMythicCount));
  }, [earned]);

  const earnedSet = useMemo(() => new Set(earned.map((item) => item.key)), [earned]);
  const pendingSet = useMemo(() => new Set(pending.map((item) => item.badgeKey)), [pending]);
  const sortedCatalog = useMemo(
    () =>
      [...catalog].sort((a, b) => {
        const xpDelta = (Number(a?.xpValue) || 0) - (Number(b?.xpValue) || 0);
        if (xpDelta !== 0) return xpDelta;
        return String(a?.title || "").localeCompare(String(b?.title || ""));
      }),
    [catalog]
  );
  const filteredCatalog = useMemo(() => {
    if (selectedCategory === "all") return sortedCatalog;
    return sortedCatalog.filter((badge) => badge.category === selectedCategory);
  }, [sortedCatalog, selectedCategory]);
  const groupedCatalog = useMemo(() => {
    const grouped = filteredCatalog.reduce((acc, badge) => {
      const categoryKey = badge.category || "other";
      if (!acc[categoryKey]) acc[categoryKey] = [];
      acc[categoryKey].push(badge);
      return acc;
    }, {});
    const orderedKeys = selectedCategory === "all" ? CATEGORY_ORDER : [selectedCategory];
    return orderedKeys
      .filter((key) => grouped[key]?.length)
      .map((key) => ({
        key,
        label: CATEGORY_META[key]?.label || key,
        hint: CATEGORY_META[key]?.hint || "",
        badges: grouped[key]
      }));
  }, [filteredCatalog, selectedCategory]);

  const requestBadge = async (badgeKey) => {
    await api.post("/badges/requests", {
      badgeKey,
      requestMessage: requestMessage.trim()
    });
    setRequestMessage("");
    setSelectedBadgeKey("");
    await load();
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Badges</h1>
          <p className="page-subtitle">Apply, unlock, and level up your profile.</p>
        </div>
      </div>

      <div className="badges-layout">
        <div className="badges-level-column">
          {level ? (
            <div className="badge-level-card-fixed">
              <LevelJourney levelData={level} />
            </div>
          ) : null}
        </div>
        <div className="badges-content-column">
          <div className="card badges-filter-bar">
            <div>
              <div className="badges-filter-title">Badge Categories</div>
              <div className="student-directory-meta">
                Filter and browse by category type.
              </div>
            </div>
            <select
              className="select badges-category-select"
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
            >
              <option value="all">{CATEGORY_META.all.label}</option>
              {CATEGORY_ORDER.map((key) => (
                <option key={key} value={key}>
                  {CATEGORY_META[key]?.label || key}
                </option>
              ))}
            </select>
          </div>

          <div className="badges-scroll-panel">
            {loading ? (
              <div className="card">Loading badges...</div>
            ) : (
              groupedCatalog.map((group) => (
                <section key={group.key} className="badge-category-section">
                  <div className="badge-category-header">
                    <div>
                      <h3 className="badge-category-title">{group.label}</h3>
                      <div className="student-directory-meta">{group.hint}</div>
                    </div>
                    <span className="pill">{group.badges.length}</span>
                  </div>

                  <div className="grid grid-3 badge-category-grid">
                    {group.badges.map((badge) => {
                      const unlocked = earnedSet.has(badge.key);
                      const isPending = pendingSet.has(badge.key);
                      const isHiddenLocked = badge.hidden && !unlocked;
                      return (
                        <div
                          key={badge.key}
                          className={[
                            "card",
                            "badge-card",
                            badge.category === "fun_event" ? "badge-card-event" : "",
                            getBadgeSpecialClass(badge),
                            getBadgeVisualClass(badge),
                            unlocked ? "badge-card-unlocked" : "",
                            isHiddenLocked ? "badge-card-hidden" : ""
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {badge.imageUrl && !isHeroImageBadge(badge) ? (
                            <img src={badge.imageUrl} alt={badge.title} className="badge-card-image" />
                          ) : null}
                          {badge.imageUrl && isHeroImageBadge(badge) ? (
                            <div
                              className={
                                isKiraBadge(badge)
                                  ? "badge-kira-bg"
                                  : isRobinBadge(badge)
                                    ? "badge-robin-bg"
                                    : isGokuBadge(badge)
                                      ? "badge-goku-bg"
                                      : "badge-tanjiro-bg"
                              }
                              style={{ backgroundImage: `url(${badge.imageUrl})` }}
                              aria-hidden="true"
                            />
                          ) : null}
                          <div className="badge-card-title">{badge.title}</div>
                          <div className="student-directory-meta">
                            {getBadgeMetaText(badge)}
                          </div>
                          <p className="badge-card-description">{badge.description}</p>
                          {unlocked ? (
                            <span className="pill">Unlocked</span>
                          ) : isPending ? (
                            <span className="pill">Pending Approval</span>
                          ) : (
                            <button
                              className="btn btn-ghost"
                              type="button"
                              onClick={() => setSelectedBadgeKey(badge.key)}
                            >
                              Apply for Badge
                            </button>
                          )}
                          {selectedBadgeKey === badge.key && !unlocked && !isPending ? (
                            <div className="badge-request-box">
                              <textarea
                                className="input"
                                rows={3}
                                placeholder="Optional message for teacher"
                                value={requestMessage}
                                onChange={(event) => setRequestMessage(event.target.value)}
                              />
                              <button className="btn" type="button" onClick={() => requestBadge(badge.key)}>
                                Submit Request
                              </button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
