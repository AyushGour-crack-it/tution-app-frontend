import React, { useEffect, useState } from "react";
import { api } from "../api.js";

const emptyForm = { studentId: "", classId: "", date: "", status: "present", note: "" };

export default function Attendance() {
  const [items, setItems] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [attendanceData, studentData, classData] = await Promise.all([
      api.get("/attendance").then((res) => res.data),
      api.get("/students").then((res) => res.data),
      api.get("/classes").then((res) => res.data)
    ]);
    setItems(attendanceData);
    setStudents(studentData);
    setClasses(classData);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    const payload = {
      studentId: form.studentId,
      classId: form.classId,
      date: form.date,
      status: form.status,
      note: form.note
    };
    if (editingId) {
      await api.put(`/attendance/${editingId}`, payload);
    } else {
      await api.post("/attendance", payload);
    }
    setEditingId(null);
    setForm(emptyForm);
    load();
  };

  const remove = async (id) => {
    await api.delete(`/attendance/${id}`);
    load();
  };

  const edit = (row) => {
    setEditingId(row._id);
    setForm({
      studentId: row.studentId || "",
      classId: row.classId || "",
      date: row.date ? row.date.slice(0, 10) : "",
      status: row.status || "present",
      note: row.note || ""
    });
  };

  const studentLookup = Object.fromEntries(students.map((item) => [item._id, item.name]));
  const classLookup = Object.fromEntries(classes.map((item) => [item._id, item.name]));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="page-subtitle">Take daily attendance and review history.</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <h2 className="card-title">Mark Attendance</h2>
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
          <select
            className="select"
            value={form.classId}
            onChange={(event) => setForm({ ...form, classId: event.target.value })}
          >
            <option value="">Select class</option>
            {classes.map((item) => (
              <option key={item._id} value={item._id}>
                {item.name}
              </option>
            ))}
          </select>
          <input
            className="input"
            type="date"
            value={form.date}
            onChange={(event) => setForm({ ...form, date: event.target.value })}
            required
          />
          <select
            className="select"
            value={form.status}
            onChange={(event) => setForm({ ...form, status: event.target.value })}
          >
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
          </select>
          <input
            className="input"
            placeholder="Note"
            value={form.note}
            onChange={(event) => setForm({ ...form, note: event.target.value })}
          />
          <button className="btn" type="submit">
            {editingId ? "Update Attendance" : "Save Attendance"}
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
        <h2 className="card-title">Attendance Log</h2>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Class</th>
                <th>Date</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row._id}>
                  <td>{studentLookup[row.studentId] || "-"}</td>
                  <td>{classLookup[row.classId] || "-"}</td>
                  <td>{row.date ? new Date(row.date).toLocaleDateString() : "-"}</td>
                  <td>
                    <span className="badge">{row.status}</span>
                  </td>
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
                  <td colSpan="5">No attendance yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
