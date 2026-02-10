import React, { useEffect, useState } from "react";
import { api } from "../api.js";

const emptyForm = { title: "", classId: "", dueDate: "", description: "" };

export default function Homework() {
  const [items, setItems] = useState([]);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [homeworkData, classData] = await Promise.all([
      api.get("/homeworks").then((res) => res.data),
      api.get("/classes").then((res) => res.data)
    ]);
    setItems(homeworkData);
    setClasses(classData);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    const payload = {
      title: form.title.trim(),
      classId: form.classId || null,
      dueDate: form.dueDate,
      description: form.description.trim()
    };
    if (editingId) {
      await api.put(`/homeworks/${editingId}`, payload);
    } else {
      await api.post("/homeworks", payload);
    }
    setEditingId(null);
    setForm(emptyForm);
    load();
  };

  const remove = async (id) => {
    await api.delete(`/homeworks/${id}`);
    load();
  };

  const edit = (item) => {
    setEditingId(item._id);
    setForm({
      title: item.title || "",
      classId: item.classId || "",
      dueDate: item.dueDate ? item.dueDate.slice(0, 10) : "",
      description: item.description || ""
    });
  };

  const classLookup = Object.fromEntries(classes.map((item) => [item._id, item.name]));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Homework</h1>
          <p className="page-subtitle">Create assignments and track submissions.</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <h2 className="card-title">Create Homework</h2>
        <form className="form" onSubmit={submit}>
          <input
            className="input"
            placeholder="Title"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            required
          />
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
            value={form.dueDate}
            onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
            required
          />
          <input
            className="input"
            placeholder="Description"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
          <button className="btn" type="submit">
            {editingId ? "Update Homework" : "Save Homework"}
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
        <h2 className="card-title">Current Assignments</h2>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="list">
            {items.map((item) => (
              <div className="list-item" key={item._id}>
                <div>
                  <div style={{ fontWeight: 600 }}>{item.title}</div>
                  <div style={{ fontSize: "12px", color: "#6b7b7f" }}>
                    {classLookup[item.classId] || "General"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="badge">Due</div>
                  <div style={{ fontSize: "12px", color: "#6b7b7f", marginTop: "6px" }}>
                    {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : "-"}
                  </div>
                  <button className="btn btn-ghost" onClick={() => remove(item._id)}>
                    Delete
                  </button>
                  <button className="btn btn-ghost" onClick={() => edit(item)}>
                    Edit
                  </button>
                </div>
              </div>
            ))}
            {!items.length && <div>No homework yet.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
