import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";

export default function Badges() {
  const [catalog, setCatalog] = useState([]);
  const [earned, setEarned] = useState([]);
  const [pending, setPending] = useState([]);
  const [level, setLevel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requestMessage, setRequestMessage] = useState("");
  const [selectedBadgeKey, setSelectedBadgeKey] = useState("");

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

  const earnedSet = useMemo(() => new Set(earned.map((item) => item.key)), [earned]);
  const pendingSet = useMemo(() => new Set(pending.map((item) => item.badgeKey)), [pending]);

  const requestBadge = async (badgeKey) => {
    await api.post("/badges/requests", {
      badgeKey,
      requestMessage: requestMessage.trim()
    });
    setRequestMessage("");
    setSelectedBadgeKey("");
    await load();
  };

  const rarityClass = (rarity) => `rarity-${String(rarity || "").toLowerCase()}`;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Badges</h1>
          <p className="page-subtitle">Apply, unlock, and level up your profile.</p>
        </div>
      </div>

      {level ? (
        <div className="card badge-level-card" style={{ marginTop: "24px" }}>
          <div className="badge-level-top">
            <div className="badge-level-ring">Lv {level.level}</div>
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

      <div className="grid grid-3" style={{ marginTop: "24px" }}>
        {loading ? (
          <div className="card">Loading badges...</div>
        ) : (
          catalog.map((badge) => {
            const unlocked = earnedSet.has(badge.key);
            const isPending = pendingSet.has(badge.key);
            const isHiddenLocked = badge.hidden && !unlocked;
            return (
              <div
                key={badge.key}
                className={[
                  "card",
                  "badge-card",
                  rarityClass(badge.rarity),
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
          })
        )}
      </div>
    </div>
  );
}
