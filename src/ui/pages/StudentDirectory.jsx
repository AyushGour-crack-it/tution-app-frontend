import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { resolveAvatarFrame } from "../avatarFrame.js";

const getLevelTierClass = (levelValue) => {
  const level = Number(levelValue) || 1;
  if (level >= 13) return "level-tier-mythic";
  if (level >= 10) return "level-tier-legend";
  if (level >= 7) return "level-tier-elite";
  if (level >= 4) return "level-tier-rising";
  return "level-tier-starter";
};

export default function StudentDirectory() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const data = await api.get("/students/directory").then((res) => res.data || []);
        if (!cancelled) setStudents(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
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

  return (
    <div className="page student-directory-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-subtitle">Find classmates and open their full profile.</p>
        </div>
      </div>

      <div className="card student-directory-list-card student-section-fill">
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
                    className={`student-directory-item ${index === 0 ? "student-directory-item-rank-1" : ""} ${
                      index === 1 ? "student-directory-item-rank-2" : ""
                    } ${index === 2 ? "student-directory-item-rank-3" : ""}`}
                    onClick={() => navigate(`/student/students/${student.userId}`)}
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
                        <span className={`level-pill ${getLevelTierClass(student.level?.level)}`}>
                          Lv {student.level?.level || 1}
                        </span>{" "}
                        • {student.totalXp || 0} XP
                      </div>
                      <div className="student-directory-meta">
                        Badges {student.badges?.length || 0} • Likes {student.likesCount || 0}
                      </div>
                      <div className="student-directory-bio-preview">{student.bio || "No bio yet."}</div>
                    </div>
                  </button>
                );
              })}
              {!filtered.length ? <div>No students found.</div> : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
