import React, { useEffect, useState } from "react";
import { api } from "../api.js";

const emptyForm = {
  studentId: "",
  subject: "",
  assessment: "",
  score: "",
  maxScore: "",
  grade: "",
  date: "",
  notes: ""
};

export default function Marks() {
  const [items, setItems] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [marksData, studentData] = await Promise.all([
      api.get("/marks").then((res) => res.data),
      api.get("/students").then((res) => res.data)
    ]);
    setItems(marksData);
    setStudents(studentData);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    const payload = {
      studentId: form.studentId,
      subject: form.subject.trim(),
      assessment: form.assessment.trim(),
      score: Number(form.score || 0),
      maxScore: Number(form.maxScore || 0),
      grade: form.grade.trim(),
      date: form.date || null,
      notes: form.notes.trim()
    };
    if (editingId) {
      await api.put(`/marks/${editingId}`, payload);
    } else {
      await api.post("/marks", payload);
    }
    setEditingId(null);
    setForm(emptyForm);
    load();
  };

  const edit = (row) => {
    setEditingId(row._id);
    setForm({
      studentId: row.studentId || "",
      subject: row.subject || "",
      assessment: row.assessment || "",
      score: row.score ?? "",
      maxScore: row.maxScore ?? "",
      grade: row.grade || "",
      date: row.date ? row.date.slice(0, 10) : "",
      notes: row.notes || ""
    });
  };

  const remove = async (id) => {
    await api.delete(`/marks/${id}`);
    load();
  };

  const studentLookup = Object.fromEntries(students.map((item) => [item._id, item.name]));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Marks & Grades</h1>
          <p className="page-subtitle">Track assessments and report cards.</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <h2 className="card-title">Add Mark</h2>
        <form className="form" onSubmit={submit}>
          <select
            className="select"
            value={form.studentId}
            onChange={(event) => setForm({ ...form, studentId: event.target.value })}
            required
          >
            <option value="">Select student</option>
            {students.map((student) => (
              <option key={student._id} value={student._id}>
                {student.name}
              </option>
            ))}
          </select>
          <input
            className="input"
            placeholder="Subject"
            value={form.subject}
            onChange={(event) => setForm({ ...form, subject: event.target.value })}
            required
          />
          <input
            className="input"
            placeholder="Assessment (Test/Quiz)"
            value={form.assessment}
            onChange={(event) => setForm({ ...form, assessment: event.target.value })}
            required
          />
          <input
            className="input"
            type="number"
            placeholder="Score"
            value={form.score}
            onChange={(event) => setForm({ ...form, score: event.target.value })}
            required
          />
          <input
            className="input"
            type="number"
            placeholder="Max Score"
            value={form.maxScore}
            onChange={(event) => setForm({ ...form, maxScore: event.target.value })}
            required
          />
          <input
            className="input"
            placeholder="Grade"
            value={form.grade}
            onChange={(event) => setForm({ ...form, grade: event.target.value })}
          />
          <input
            className="input"
            type="date"
            value={form.date}
            onChange={(event) => setForm({ ...form, date: event.target.value })}
          />
          <input
            className="input"
            placeholder="Notes"
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
          />
          <button className="btn" type="submit">
            {editingId ? "Update Mark" : "Save Mark"}
          </button>
          {editingId && (
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
              Cancel
            </button>
          )}
        </form>
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <h2 className="card-title">All Marks</h2>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Subject</th>
                <th>Assessment</th>
                <th>Score</th>
                <th>Grade</th>
                <th>Date</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row._id}>
                  <td>{studentLookup[row.studentId] || "-"}</td>
                  <td>{row.subject}</td>
                  <td>{row.assessment}</td>
                  <td>
                    {row.score}/{row.maxScore}
                  </td>
                  <td>{row.grade || "-"}</td>
                  <td>{row.date ? new Date(row.date).toLocaleDateString() : "-"}</td>
                  <td>
                    <button className="btn btn-ghost" onClick={() => edit(row)}>
                      Edit
                    </button>
                    <button className="btn btn-ghost" onClick={() => remove(row._id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td colSpan="7">No marks yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
