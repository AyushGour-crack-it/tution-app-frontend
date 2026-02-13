import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { resolveAvatarFrame } from "../avatarFrame.js";
import { connectSocket } from "../socket.js";

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

const getBadgeVisualClass = (badge) =>
  badge?.category === "fun_event" ? "xp-tier-event" : getXpTierClass(badge?.xpValue);

const getBadgeMetaText = (badge) => {
  const rarity = String(badge?.rarity || "").toUpperCase();
  if (badge?.category === "fun_event") return `${rarity} • EVENT`;
  return `${rarity} • ${badge?.xpValue || 0} XP`;
};
const getBadgeSpecialClass = (badge) => {
  if (badge?.key === "tanjiro_3x3") return "badge-theme-tanjiro";
  if (badge?.key === "kira_2h_7d") return "badge-theme-kira";
  return "";
};

const getLevelTierClass = (levelValue) => {
  const level = Number(levelValue) || 1;
  if (level >= 13) return "level-tier-mythic";
  if (level >= 10) return "level-tier-legend";
  if (level >= 7) return "level-tier-elite";
  if (level >= 4) return "level-tier-rising";
  return "level-tier-starter";
};

const getLevelBannerClass = (totalXp) => {
  const xp = Number(totalXp) || 0;
  if (xp >= 1000) return "xp-tier-1000";
  if (xp >= 450) return "xp-tier-450";
  if (xp >= 200) return "xp-tier-200";
  if (xp >= 150) return "xp-tier-150";
  if (xp >= 120) return "xp-tier-120";
  if (xp >= 50) return "xp-tier-50";
  if (xp >= 30) return "xp-tier-30";
  return "xp-tier-20";
};

export default function StudentPublicProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liking, setLiking] = useState(false);
  const viewer = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("auth_user") || "null");
    } catch {
      return null;
    }
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/students/directory/${userId}`).then((res) => res.data);
      setStudent(data || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [userId]);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token || !userId) return undefined;
    const socket = connectSocket(token);
    if (!socket) return undefined;
    const refresh = () => load();
    socket.on("students:updated", refresh);
    socket.on("badges:updated", refresh);
    socket.on("connect", refresh);
    return () => {
      socket.off("students:updated", refresh);
      socket.off("badges:updated", refresh);
      socket.off("connect", refresh);
    };
  }, [userId]);

  const sortedBadges = useMemo(
    () =>
      [...(student?.badges || [])].sort((a, b) => {
        const xpDelta = (Number(b?.xpValue) || 0) - (Number(a?.xpValue) || 0);
        if (xpDelta !== 0) return xpDelta;
        return String(a?.title || "").localeCompare(String(b?.title || ""));
      }),
    [student?.badges]
  );
  const frame = resolveAvatarFrame({
    badges: student?.badges || [],
    totalXp: student?.totalXp || 0,
    level: student?.level?.level || 1,
    rank: null
  });
  const canLike = viewer?.role === "student" && student?.userId && viewer?.id !== student.userId;

  const toggleLike = async () => {
    if (!canLike || liking) return;
    setLiking(true);
    try {
      await api.post(`/students/${student.userId}/like`);
      await load();
    } finally {
      setLiking(false);
    }
  };

  return (
    <div className="page student-directory-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Student Profile</h1>
          <p className="page-subtitle">Public profile view.</p>
        </div>
        <button className="btn btn-ghost" type="button" onClick={() => navigate("/student/students")}>
          Back to Students
        </button>
      </div>

      <div className="card student-profile-card student-section-fill" style={{ marginTop: "24px" }}>
        {loading ? (
          <div>Loading profile...</div>
        ) : student ? (
          <div className="student-profile-view">
            <div className={`student-profile-level-banner ${getLevelBannerClass(student.totalXp)}`}>
              <div className="student-profile-level-banner-left">
                <div className={`avatar-frame avatar-frame-lg ${frame.frameClass}`} title={frame.frameLabel}>
                  {student.avatarUrl ? (
                    <img src={student.avatarUrl} alt={student.name} className="student-profile-avatar" />
                  ) : (
                    <div className="student-profile-avatar student-directory-avatar-fallback">
                      {String(student.name || "S").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="card-title" style={{ marginBottom: "6px" }}>
                    {student.name}
                  </h2>
                  <div className="student-directory-meta student-profile-level-line">
                    <span className={`level-pill ${getLevelTierClass(student.level?.level)}`}>
                      Level {student.level?.level || 1}
                    </span>{" "}
                    • {student.totalXp || 0} XP
                  </div>
                </div>
              </div>
            </div>

            <div className="student-profile-pills">
              <span className="pill student-stat-pill student-stat-pill-roll">
                Roll No <strong>{student.rollNumber || "-"}</strong>
              </span>
              <span className="pill student-stat-pill student-stat-pill-grade">
                Grade <strong>{student.grade || "-"}</strong>
              </span>
              <span className="pill student-stat-pill student-stat-pill-badges">
                Badges <strong>{sortedBadges.length}</strong>
              </span>
              <span className="pill student-stat-pill student-stat-pill-likes">
                Likes <strong>{student.likesCount || 0}</strong>
              </span>
              {canLike ? (
                <button
                  type="button"
                  className={`btn ${student.likedByMe ? "btn-ghost" : ""}`}
                  onClick={toggleLike}
                  disabled={liking}
                >
                  {student.likedByMe ? (liking ? "Updating..." : "Unlike") : liking ? "Liking..." : "Like"}
                </button>
              ) : null}
            </div>
            <p className="student-profile-bio">{student.bio || "No bio yet."}</p>
            <div className="student-profile-badges-grid">
              {sortedBadges.length ? (
                sortedBadges.map((badge) => (
                  <div
                    key={badge.key}
                    className={`profile-showcase-badge student-directory-badge-card ${
                      badge.category === "fun_event" ? "profile-showcase-badge-event" : ""
                    } ${getBadgeVisualClass(badge)} ${getBadgeSpecialClass(badge)}`}
                  >
                    {badge.imageUrl ? (
                      <img src={badge.imageUrl} alt={badge.title} className="profile-badge-art" />
                    ) : null}
                    <div className="profile-showcase-title">{badge.title}</div>
                    <div className="profile-showcase-meta">{getBadgeMetaText(badge)}</div>
                  </div>
                ))
              ) : (
                <div className="student-directory-meta">No badges unlocked yet.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="auth-error">Student not found.</div>
        )}
      </div>
    </div>
  );
}
