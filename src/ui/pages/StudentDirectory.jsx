import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";

const emptyProfile = {
  userId: "",
  name: "",
  avatarUrl: "",
  bio: "",
  studentProfileId: "",
  rollNumber: "",
  grade: ""
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
        setSelected(data[0] || emptyProfile);
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
    if (!q) return students;
    return students.filter((student) => {
      const name = String(student.name || "").toLowerCase();
      const profileId = String(student.studentProfileId || "").toLowerCase();
      const roll = String(student.rollNumber || "").toLowerCase();
      return name.includes(q) || profileId.includes(q) || roll.includes(q);
    });
  }, [students, search]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-subtitle">Discover classmates and view profiles.</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <input
          className="input"
          placeholder="Search by name, profile ID, or roll number"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="grid grid-2" style={{ marginTop: "24px" }}>
        <div className="card student-directory-list">
          {loading ? (
            <div>Loading students...</div>
          ) : (
            <div className="list">
              {filtered.map((student) => (
                <button
                  type="button"
                  key={student.userId}
                  className={`student-directory-item${
                    selected?.userId === student.userId ? " student-directory-item-active" : ""
                  }`}
                  onClick={() => setSelected(student)}
                >
                  {student.avatarUrl ? (
                    <img
                      src={student.avatarUrl}
                      alt={student.name}
                      className="student-directory-avatar"
                    />
                  ) : (
                    <div className="student-directory-avatar student-directory-avatar-fallback">
                      {String(student.name || "S").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: 600 }}>{student.name}</div>
                    <div className="student-directory-meta">Student</div>
                  </div>
                </button>
              ))}
              {!filtered.length && <div>No students found.</div>}
            </div>
          )}
        </div>

        <div className="card">
          {selected?.userId ? (
            <div className="student-profile-view">
              {selected.avatarUrl ? (
                <img
                  src={selected.avatarUrl}
                  alt={selected.name}
                  className="student-profile-avatar"
                />
              ) : (
                <div className="student-profile-avatar student-directory-avatar-fallback">
                  {String(selected.name || "S").slice(0, 1).toUpperCase()}
                </div>
              )}
              <h2 className="card-title" style={{ marginBottom: "6px" }}>
                {selected.name}
              </h2>
              <div className="student-directory-meta">
                Roll No: {selected.rollNumber || "-"}
              </div>
              <div className="student-directory-meta">
                Grade: {selected.grade || "-"}
              </div>
              <p style={{ marginTop: "12px", marginBottom: 0 }}>
                {selected.bio || "No bio yet."}
              </p>
            </div>
          ) : (
            <div>Select a student to view profile.</div>
          )}
        </div>
      </div>
    </div>
  );
}
