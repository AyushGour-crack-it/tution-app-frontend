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
  if (badge?.key === "nico_robin_3sunday") return "badge-theme-robin";
  if (badge?.key === "goku_5h_sunday") return "badge-theme-goku";
  return "";
};
const isHeroImageBadge = (badge) =>
  badge?.key === "tanjiro_3x3" ||
  badge?.key === "kira_2h_7d" ||
  badge?.key === "nico_robin_3sunday" ||
  badge?.key === "goku_5h_sunday";

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

const formatSubjectName = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());

const getQuizMotivation = ({ totalXP, streakCount, overallLevel }) => {
  if (Number(totalXP || 0) <= 0) return "First quiz win pending. Start the learning streak.";
  if (Number(streakCount || 0) >= 7) return "On a weekly streak. Consistency is turning into mastery.";
  if (Number(overallLevel || 0) >= 5) return "High quiz momentum. Keep sharpening speed and accuracy.";
  return "Steady progress. One more quiz can move this profile up.";
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
  const quiz = student?.quiz || {};
  const quizTotalXP = Number(quiz.totalXP || 0);
  const quizOverallLevel = Number(quiz.overallLevel || 0);
  const quizStreakCount = Number(quiz.streakCount || 0);
  const subjectProgress = useMemo(() => {
    const subjectXpMap = quiz?.subjectXP && typeof quiz.subjectXP === "object" ? quiz.subjectXP : {};
    const subjectLevelMap = quiz?.subjectLevel && typeof quiz.subjectLevel === "object" ? quiz.subjectLevel : {};
    return Object.entries(subjectXpMap)
      .map(([subject, amount]) => {
        const xp = Number(amount || 0);
        const level = Number(subjectLevelMap[subject] || 0);
        const progress = Math.max(0, Math.min(100, Math.round(((xp % 150) / 150) * 100)));
        return {
          key: subject,
          subject: formatSubjectName(subject),
          xp,
          level,
          progress
        };
      })
      .sort((a, b) => b.xp - a.xp);
  }, [quiz?.subjectXP, quiz?.subjectLevel]);
  const quizMotivation = useMemo(
    () => getQuizMotivation({ totalXP: quizTotalXP, streakCount: quizStreakCount, overallLevel: quizOverallLevel }),
    [quizOverallLevel, quizStreakCount, quizTotalXP]
  );

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
              <span className={`pill student-stat-pill student-stat-pill-presence ${student?.isOnline ? "online" : "offline"}`}>
                {student?.isOnline ? "Online" : formatLastSeen(student?.lastSeenAt)}
              </span>
              <span className="pill student-stat-pill student-stat-pill-quiz-level">
                Quiz Lv <strong>{quizOverallLevel}</strong>
              </span>
              <span className="pill student-stat-pill student-stat-pill-streak">
                Streak <strong>{quizStreakCount}d</strong>
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
            <div className="student-profile-quiz-card">
              <div className="student-profile-quiz-head">
                <div>
                  <h3 className="student-profile-quiz-title">Quiz Journey</h3>
                  <p className="student-profile-quiz-motivation">{quizMotivation}</p>
                </div>
                <div className="student-profile-quiz-total">{quizTotalXP} Quiz XP</div>
              </div>

              {subjectProgress.length ? (
                <div className="student-profile-quiz-progress-list">
                  {subjectProgress.slice(0, 6).map((item) => (
                    <div key={item.key} className="student-profile-quiz-progress-item">
                      <div className="student-profile-quiz-progress-meta">
                        <span>{item.subject}</span>
                        <span>
                          Lv {item.level} • {item.xp} XP
                        </span>
                      </div>
                      <div className="student-profile-quiz-progress-track">
                        <div
                          className="student-profile-quiz-progress-fill"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="student-directory-meta">
                  No quiz progress yet. Start one quiz to appear on this leaderboard.
                </div>
              )}
            </div>
            <div className="student-profile-badges-grid">
              {sortedBadges.length ? (
                sortedBadges.map((badge) => (
                  <div
                    key={badge.key}
                    className={`profile-showcase-badge student-directory-badge-card ${
                      badge.category === "fun_event" ? "profile-showcase-badge-event" : ""
                    } ${getBadgeVisualClass(badge)} ${getBadgeSpecialClass(badge)}`}
                    style={isHeroImageBadge(badge) ? { "--badge-bg-image": `url(${badge.imageUrl})` } : undefined}
                  >
                    {badge.imageUrl && !isHeroImageBadge(badge) ? (
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
