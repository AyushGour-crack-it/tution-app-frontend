import React, { useEffect, useState } from "react";
import { api } from "../api.js";

const emptyForm = { classId: "", subject: "", topic: "", targetDate: "", status: "planned" };

export default function Syllabus() {
  const [items, setItems] = useState([]);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [syllabusData, classData] = await Promise.all([
      api.get("/syllabus").then((res) => res.data),
      api.get("/classes").then((res) => res.data)
    ]);
    setItems(syllabusData);
    setClasses(classData);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    const payload = {
      classId: form.classId || null,
      subject: form.subject.trim(),
      topic: form.topic.trim(),
      targetDate: form.targetDate || null,
      status: form.status
    };
    if (editingId) {
      await api.put(`/syllabus/${editingId}`, payload);
    } else {
      await api.post("/syllabus", payload);
    }
    setEditingId(null);
    setForm(emptyForm);
    load();
  };

  const remove = async (id) => {
    await api.delete(`/syllabus/${id}`);
    load();
  };

  const edit = (item) => {
    setEditingId(item._id);
    setForm({
      classId: item.classId || "",
      subject: item.subject || "",
      topic: item.topic || "",
      targetDate: item.targetDate ? item.targetDate.slice(0, 10) : "",
      status: item.status || "planned"
    });
  };

  const classLookup = Object.fromEntries(classes.map((item) => [item._id, item.name]));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Syllabus</h1>
          <p className="page-subtitle">Track syllabus coverage and upcoming topics.</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <h2 className="card-title">Add Topic</h2>
        <form className="form" onSubmit={submit}>
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
            placeholder="Subject"
            value={form.subject}
            onChange={(event) => setForm({ ...form, subject: event.target.value })}
            required
          />
          <input
            className="input"
            placeholder="Topic"
            value={form.topic}
            onChange={(event) => setForm({ ...form, topic: event.target.value })}
            required
          />
          <input
            className="input"
            type="date"
            value={form.targetDate}
            onChange={(event) => setForm({ ...form, targetDate: event.target.value })}
          />
          <select
            className="select"
            value={form.status}
            onChange={(event) => setForm({ ...form, status: event.target.value })}
          >
            <option value="planned">Planned</option>
            <option value="in-progress">In progress</option>
            <option value="done">Done</option>
          </select>
          <button className="btn" type="submit">
            {editingId ? "Update Topic" : "Save Topic"}
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
        <h2 className="card-title">Coverage Plan</h2>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Class</th>
                <th>Subject</th>
                <th>Topic</th>
                <th>Target</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((topic) => (
                <tr key={topic._id}>
                  <td>{classLookup[topic.classId] || "General"}</td>
                  <td>{topic.subject}</td>
                  <td>{topic.topic}</td>
                  <td>{topic.targetDate ? new Date(topic.targetDate).toLocaleDateString() : "-"}</td>
                  <td>
                    <span className="badge">{topic.status}</span>
                  </td>
                  <td>
                    <button className="btn btn-ghost" onClick={() => edit(topic)}>
                      Edit
                    </button>
                    <button className="btn btn-ghost" onClick={() => remove(topic._id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td colSpan="6">No topics yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
