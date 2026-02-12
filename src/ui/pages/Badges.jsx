import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";

const CATEGORY_META = {
  all: { label: "All Categories", hint: "Complete badge catalog" },
  academic: { label: "Academic", hint: "Tests, marks, and performance" },
  consistency: { label: "Consistency", hint: "Attendance and streaks" },
  personality: { label: "Personality", hint: "Social and leadership traits" },
  inspired: { label: "Inspired", hint: "Pop-culture inspired titles" },
  secret: { label: "Secret", hint: "Hidden unlock conditions" }
};

const CATEGORY_ORDER = ["academic", "consistency", "personality", "inspired", "secret"];

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

const getLevelTierClass = (levelValue) => {
  const level = Number(levelValue) || 1;
  if (level >= 13) return "level-tier-mythic";
  if (level >= 10) return "level-tier-legend";
  if (level >= 7) return "level-tier-elite";
  if (level >= 4) return "level-tier-rising";
  return "level-tier-starter";
};

export default function Badges() {
  const [catalog, setCatalog] = useState([]);
  const [earned, setEarned] = useState([]);
  const [pending, setPending] = useState([]);
  const [level, setLevel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requestMessage, setRequestMessage] = useState("");
  const [selectedBadgeKey, setSelectedBadgeKey] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const load = async () => {
    setLoading(true);
    const [catalogData, meData, myRequests] = await Promise.all([
      api.get("/badges/catalog").then((res) => res.data || []),
      api.get("/badges/me").then((res) => res.data || {}),
      api.get("/badges/requests/mine").then((res) => res.data || [])
    ]);
    setCatalog(catalogData);
    setEarned(meData.earned || []);
    setPending(myRequests.filter((item) => item.status === "pending"));
    setLevel(meData.level || null);
    setLoading(false);
  };

  useEffect(() => {
    load();
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
            <div className="card badge-level-card badge-level-card-fixed">
              <div className="badge-level-top">
                <div className={`badge-level-ring ${getLevelTierClass(level.level)}`}>Lv {level.level}</div>
                <div>
                  <div style={{ fontWeight: 700 }}>Profile Level {level.level}</div>
                  <div className="student-directory-meta">
                    {level.totalXp} XP total • Max Level {level.maxLevel}
                  </div>
                </div>
              </div>
              <div className="badge-progress">
                <div
                  className="badge-progress-fill"
                  style={{ width: `${Math.max(0, Math.min(100, level.progressPercent || 0))}%` }}
                />
              </div>
              <div className="student-directory-meta">
                Progress: {level.currentLevelXp}/{level.nextLevelXp} XP
              </div>
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
                            getXpTierClass(badge.xpValue),
                            unlocked ? "badge-card-unlocked" : "",
                            isHiddenLocked ? "badge-card-hidden" : ""
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <div className="badge-card-title">{badge.title}</div>
                          <div className="student-directory-meta">
                            {String(badge.rarity || "").toUpperCase()} • {badge.xpValue} XP
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
