import React, { useEffect, useState } from "react";
import { api } from "../api.js";

const emptyForm = { name: "", grade: "", subjects: "", schedule: "", notes: "" };

export default function Classes() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await api.get("/classes").then((res) => res.data);
    setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    const payload = {
      name: form.name.trim(),
      grade: form.grade.trim(),
      subjects: form.subjects
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      schedule: form.schedule.trim(),
      notes: form.notes.trim()
    };
    if (editingId) {
      await api.put(`/classes/${editingId}`, payload);
    } else {
      await api.post("/classes", payload);
    }
    setEditingId(null);
    setForm(emptyForm);
    load();
  };

  const remove = async (id) => {
    await api.delete(`/classes/${id}`);
    load();
  };

  const edit = (item) => {
    setEditingId(item._id);
    setForm({
      name: item.name || "",
      grade: item.grade || "",
      subjects: (item.subjects || []).join(", "),
      schedule: item.schedule || "",
      notes: item.notes || ""
    });
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Classes</h1>
          <p className="page-subtitle">Create class groups and schedules.</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <h2 className="card-title">Add Class</h2>
        <form className="form" onSubmit={submit}>
          <input
            className="input"
            placeholder="Class name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
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
            placeholder="Subjects (comma separated)"
            value={form.subjects}
            onChange={(event) => setForm({ ...form, subjects: event.target.value })}
          />
          <input
            className="input"
            placeholder="Schedule"
            value={form.schedule}
            onChange={(event) => setForm({ ...form, schedule: event.target.value })}
          />
          <input
            className="input"
            placeholder="Notes"
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
          />
          <button className="btn" type="submit">
            {editingId ? "Update Class" : "Save Class"}
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
        <h2 className="card-title">All Classes</h2>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Grade</th>
                <th>Subjects</th>
                <th>Schedule</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id}>
                  <td>{item.name}</td>
                  <td>{item.grade}</td>
                  <td>{item.subjects?.join(", ")}</td>
                  <td>{item.schedule}</td>
                  <td>
                    <button className="btn btn-ghost" onClick={() => edit(item)}>
                      Edit
                    </button>
                    <button className="btn btn-ghost" onClick={() => remove(item._id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td colSpan="5">No classes yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
