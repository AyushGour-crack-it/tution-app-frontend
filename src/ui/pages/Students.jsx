import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { connectSocket } from "../socket.js";

const emptyForm = {
  name: "",
  rollNumber: "",
  grade: "",
  subjects: "",
  guardianName: "",
  guardianPhone: ""
};

export default function Students() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await api.get("/students").then((res) => res.data);
    setItems(data);
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
    const refresh = () => load();
    socket.on("students:updated", refresh);
    socket.on("connect", refresh);
    return () => {
      socket.off("students:updated", refresh);
      socket.off("connect", refresh);
    };
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    const payload = {
      name: form.name.trim(),
      rollNumber: form.rollNumber.trim(),
      grade: form.grade.trim(),
      subjects: form.subjects
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      guardian: {
        name: form.guardianName.trim(),
        phone: form.guardianPhone.trim()
      }
    };
    if (editingId) {
      await api.put(`/students/${editingId}`, payload);
    } else {
      await api.post("/students", payload);
    }
    setEditingId(null);
    setForm(emptyForm);
    load();
  };

  const remove = async (id) => {
    await api.delete(`/students/${id}`);
    load();
  };

  const edit = (student) => {
    setEditingId(student._id);
    setForm({
      name: student.name || "",
      rollNumber: student.rollNumber || "",
      grade: student.grade || "",
      subjects: (student.subjects || []).join(", "),
      guardianName: student.guardian?.name || "",
      guardianPhone: student.guardian?.phone || ""
    });
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-subtitle">Maintain profiles, guardians, and academic activity logs.</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <h2 className="card-title">Add Student</h2>
        <form className="form" onSubmit={submit}>
          <input
            className="input"
            placeholder="Full name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
          />
          <input
            className="input"
            placeholder="Roll number"
            value={form.rollNumber}
            onChange={(event) => setForm({ ...form, rollNumber: event.target.value })}
          />
          <input
            className="input"
            placeholder="Grade"
            value={form.grade}
            onChange={(event) => setForm({ ...form, grade: event.target.value })}
          />
          <input
            className="input"
            placeholder="Subjects (comma separated)"
            value={form.subjects}
            onChange={(event) => setForm({ ...form, subjects: event.target.value })}
          />
          <input
            className="input"
            placeholder="Guardian name"
            value={form.guardianName}
            onChange={(event) => setForm({ ...form, guardianName: event.target.value })}
          />
          <input
            className="input"
            placeholder="Guardian phone"
            value={form.guardianPhone}
            onChange={(event) => setForm({ ...form, guardianPhone: event.target.value })}
          />
          <button className="btn" type="submit">
            {editingId ? "Update Student" : "Save Student"}
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
        <h2 className="card-title">Student Directory</h2>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>ID</th>
                <th>Grade</th>
                <th>Subjects</th>
                <th>Guardian</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((student) => (
                <tr key={student._id}>
                  <td>{student.name}</td>
                  <td style={{ fontSize: "12px" }}>{student._id}</td>
                  <td>{student.grade}</td>
                  <td>{student.subjects?.join(", ")}</td>
                  <td>{student.guardian?.name || "-"}</td>
                  <td>
                    <button className="btn btn-ghost" onClick={() => edit(student)}>
                      Edit
                    </button>
                    <button className="btn btn-ghost" onClick={() => remove(student._id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td colSpan="5">No students yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
