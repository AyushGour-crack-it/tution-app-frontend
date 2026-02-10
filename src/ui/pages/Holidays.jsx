import React, { useEffect, useState } from "react";
import { api } from "../api.js";

const emptyForm = { title: "", date: "", note: "" };

export default function Holidays() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await api.get("/holidays").then((res) => res.data);
    setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    const payload = { title: form.title.trim(), date: form.date, note: form.note.trim() };
    if (editingId) {
      await api.put(`/holidays/${editingId}`, payload);
    } else {
      await api.post("/holidays", payload);
    }
    setEditingId(null);
    setForm(emptyForm);
    load();
  };

  const remove = async (id) => {
    await api.delete(`/holidays/${id}`);
    load();
  };

  const edit = (holiday) => {
    setEditingId(holiday._id);
    setForm({
      title: holiday.title || "",
      date: holiday.date ? holiday.date.slice(0, 10) : "",
      note: holiday.note || ""
    });
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Holidays</h1>
          <p className="page-subtitle">Plan time off and notify students.</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <h2 className="card-title">Add Holiday</h2>
        <form className="form" onSubmit={submit}>
          <input
            className="input"
            placeholder="Holiday title"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            required
          />
          <input
            className="input"
            type="date"
            value={form.date}
            onChange={(event) => setForm({ ...form, date: event.target.value })}
            required
          />
          <input
            className="input"
            placeholder="Note"
            value={form.note}
            onChange={(event) => setForm({ ...form, note: event.target.value })}
          />
          <button className="btn" type="submit">
            {editingId ? "Update Holiday" : "Save Holiday"}
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
        <h2 className="card-title">Upcoming Holidays</h2>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="list">
            {items.map((holiday) => (
              <div className="list-item" key={holiday._id}>
                <div>
                  <div style={{ fontWeight: 600 }}>{holiday.title}</div>
                  <div style={{ fontSize: "12px", color: "#6b7b7f" }}>{holiday.note}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span className="badge">
                    {holiday.date ? new Date(holiday.date).toLocaleDateString() : "-"}
                  </span>
                  <button className="btn btn-ghost" onClick={() => edit(holiday)}>
                    Edit
                  </button>
                  <button className="btn btn-ghost" onClick={() => remove(holiday._id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {!items.length && <div>No holidays yet.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
