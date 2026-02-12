import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { resolveAvatarFrame } from "../avatarFrame.js";

const getXpTierClass = (xpValue) => {
  const xp = Number(xpValue) || 0;
  if (xp >= 1000) return "xp-tier-1000";
  if (xp >= 450) return "xp-tier-450";
  if (xp >= 120) return "xp-tier-120-200";
  if (xp >= 50) return "xp-tier-50";
  if (xp >= 30) return "xp-tier-30";
  return "xp-tier-20";
};

const emptyProfile = {
  userId: "",
  name: "",
  avatarUrl: "",
  bio: "",
  studentProfileId: "",
  rollNumber: "",
  grade: "",
  level: { level: 1 },
  totalXp: 0,
  badges: []
};

export default function StudentDirectory() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await api.get("/students/directory").then((res) => res.data || []);
        if (cancelled) return;
        setStudents(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q
      ? students.filter((student) => {
          const name = String(student.name || "").toLowerCase();
          const profileId = String(student.studentProfileId || "").toLowerCase();
          const roll = String(student.rollNumber || "").toLowerCase();
          return name.includes(q) || profileId.includes(q) || roll.includes(q);
        })
      : students.slice();

    return base.sort((a, b) => {
      const levelDelta = (b.level?.level || 1) - (a.level?.level || 1);
      if (levelDelta !== 0) return levelDelta;
      const xpDelta = (b.totalXp || 0) - (a.totalXp || 0);
      if (xpDelta !== 0) return xpDelta;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }, [students, search]);

  useEffect(() => {
    if (!filtered.length) {
      setSelected(emptyProfile);
      return;
    }
    const hasSelected = filtered.some((student) => student.userId === selected?.userId);
    if (!hasSelected) {
      setSelected(filtered[0]);
    }
  }, [filtered, selected?.userId]);

  const selectedRank = useMemo(() => {
    if (!selected?.userId) return null;
    const rank = filtered.findIndex((student) => student.userId === selected.userId);
    return rank >= 0 ? rank + 1 : null;
  }, [filtered, selected]);

  const selectedLevelTierClass = getXpTierClass(selected?.totalXp || 0);
  const selectedFrame = resolveAvatarFrame({
    badges: selected?.badges || [],
    totalXp: selected?.totalXp || 0,
    level: selected?.level?.level || 1,
    rank: selectedRank
  });

  return (
    <div className="page student-directory-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-subtitle">Find classmates and view profile details.</p>
        </div>
      </div>

      <div className="student-directory-shell">
        <div className="card student-directory-list-card">
          <div className="student-directory-toolbar">
            <div className="student-directory-count">{filtered.length} students</div>
            <input
              className="input student-directory-search"
              placeholder="Search by name or roll number"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="student-directory-list">
            {loading ? (
              <div>Loading students...</div>
            ) : (
              <div className="list student-directory-list-grid">
                {filtered.map((student, index) => {
                  const frame = resolveAvatarFrame({
                    badges: student.badges || [],
                    totalXp: student.totalXp || 0,
                    level: student.level?.level || 1,
                    rank: index + 1
                  });

                  return (
                    <button
                      type="button"
                      key={student.userId}
                      className={`student-directory-item${
                        selected?.userId === student.userId ? " student-directory-item-active" : ""
                      }`}
                      onClick={() => setSelected(student)}
                    >
                      <div className="student-directory-rank">#{index + 1}</div>
                      <div className={`avatar-frame avatar-frame-sm ${frame.frameClass}`} title={frame.frameLabel}>
                        {student.avatarUrl ? (
                          <img src={student.avatarUrl} alt={student.name} className="student-directory-avatar" />
                        ) : (
                          <div className="student-directory-avatar student-directory-avatar-fallback">
                            {String(student.name || "S").slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="student-directory-item-body">
                        <div className="student-directory-name">{student.name}</div>
                        <div className="student-directory-meta">
                          Lv {student.level?.level || 1} • {student.totalXp || 0} XP
                        </div>
                        <div className="student-directory-bio-preview">{student.bio || "No bio yet."}</div>
                      </div>
                    </button>
                  );
                })}
                {!filtered.length && <div>No students found.</div>}
              </div>
            )}
          </div>
        </div>

        <div className="card student-profile-card">
          {selected?.userId ? (
            <div className="student-profile-view">
              <div className={`student-profile-level-banner ${selectedLevelTierClass}`}>
                <div className="student-profile-level-banner-left">
                  <div
                    className={`avatar-frame avatar-frame-lg ${selectedFrame.frameClass}`}
                    title={selectedFrame.frameLabel}
                  >
                    {selected.avatarUrl ? (
                      <img src={selected.avatarUrl} alt={selected.name} className="student-profile-avatar" />
                    ) : (
                      <div className="student-profile-avatar student-directory-avatar-fallback">
                        {String(selected.name || "S").slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="card-title" style={{ marginBottom: "6px" }}>
                      {selected.name}
                    </h2>
                    <div className="student-directory-meta student-profile-level-line">
                      Level {selected.level?.level || 1} • {selected.totalXp || 0} XP
                    </div>
                  </div>
                </div>
                <div className="student-profile-rank-pill">Rank {selectedRank ? `#${selectedRank}` : "-"}</div>
              </div>

              <div className="student-profile-pills">
                <span className="pill">Roll: {selected.rollNumber || "-"}</span>
                <span className="pill">Grade: {selected.grade || "-"}</span>
              </div>
              <p className="student-profile-bio">{selected.bio || "No bio yet."}</p>
              <div className="student-profile-badges">
                {(selected.badges || []).slice(0, 12).map((badge) => (
                  <span key={badge.key} className={`pill profile-badge-chip ${getXpTierClass(badge.xpValue)}`}>
                    {badge.title}
                  </span>
                ))}
                {!(selected.badges || []).length ? (
                  <div className="student-directory-meta">No badges unlocked yet.</div>
                ) : null}
              </div>
            </div>
          ) : (
            <div>Select a student to view profile.</div>
          )}
        </div>
      </div>
    </div>
  );
}
