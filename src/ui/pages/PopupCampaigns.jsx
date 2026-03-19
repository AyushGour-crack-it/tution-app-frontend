import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";

const TEMPLATE_OPTIONS = [
  { key: "announcement", label: "Classic Announcement", mood: "Clean information card" },
  { key: "celebration", label: "Celebration Blast", mood: "Confetti-style congrats popup" },
  { key: "deadline", label: "Deadline Alert", mood: "Urgent reminder style" },
  { key: "festival", label: "Festival Greeting", mood: "Warm festive look" },
  { key: "achievement", label: "Achievement Unlock", mood: "Prestige reward style" }
];

const emptyForm = {
  title: "",
  message: "",
  template: "announcement",
  target: "all_students",
  studentId: "",
  startAt: "",
  endAt: "",
  ctaLabel: "",
  ctaUrl: "",
  imageUrl: "",
  priority: 50,
  showOncePerUser: true,
  isActive: true
};

const toLocalInputDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${hh}:${mm}`;
};

const toApiPayload = (form) => ({
  title: String(form.title || "").trim(),
  message: String(form.message || "").trim(),
  template: form.template || "announcement",
  target: form.target || "all_students",
  studentId: form.target === "single_student" ? form.studentId || "" : "",
  startAt: form.startAt ? new Date(form.startAt).toISOString() : new Date().toISOString(),
  endAt: form.endAt ? new Date(form.endAt).toISOString() : "",
  ctaLabel: String(form.ctaLabel || "").trim(),
  ctaUrl: String(form.ctaUrl || "").trim(),
  imageUrl: String(form.imageUrl || "").trim(),
  priority: Number(form.priority || 0),
  showOncePerUser: Boolean(form.showOncePerUser),
  isActive: Boolean(form.isActive)
});

export default function PopupCampaigns() {
  const [items, setItems] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(() => ({
    ...emptyForm,
    startAt: toLocalInputDateTime(new Date())
  }));
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [error, setError] = useState("");

  const selectedTemplate = useMemo(
    () => TEMPLATE_OPTIONS.find((item) => item.key === form.template) || TEMPLATE_OPTIONS[0],
    [form.template]
  );

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [campaigns, studentList] = await Promise.all([
        api.get("/popup-campaigns").then((res) => res.data || []),
        api.get("/students").then((res) => res.data || [])
      ]);
      setItems(campaigns);
      setStudents(studentList);
    } catch (loadError) {
      setError(loadError?.response?.data?.message || "Unable to load popup campaigns.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm({
      ...emptyForm,
      startAt: toLocalInputDateTime(new Date())
    });
    setEditingId("");
    setError("");
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const payload = toApiPayload(form);
      if (editingId) {
        await api.put(`/popup-campaigns/${editingId}`, payload);
      } else {
        await api.post("/popup-campaigns", payload);
      }
      resetForm();
      await load();
    } catch (submitError) {
      setError(submitError?.response?.data?.message || "Unable to save popup campaign.");
    } finally {
      setSubmitting(false);
    }
  };

  const uploadImageFile = async (event) => {
    const file = event?.target?.files?.[0];
    if (!file) return;
    const isImage = String(file.type || "").startsWith("image/");
    if (!isImage) {
      setError("Please select an image file.");
      event.target.value = "";
      return;
    }
    setUploadingImage(true);
    setError("");
    try {
      const data = new FormData();
      data.append("image", file);
      const response = await api.post("/popup-campaigns/upload-image", data, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const uploadedUrl = String(response?.data?.imageUrl || "");
      setForm((prev) => ({ ...prev, imageUrl: uploadedUrl }));
    } catch (uploadError) {
      setError(uploadError?.response?.data?.message || "Image upload failed.");
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  };

  const edit = (item) => {
    setEditingId(item._id);
    setForm({
      title: item.title || "",
      message: item.message || "",
      template: item.template || "announcement",
      target: item.target || "all_students",
      studentId: item.studentId || "",
      startAt: toLocalInputDateTime(item.startAt || new Date()),
      endAt: toLocalInputDateTime(item.endAt || ""),
      ctaLabel: item.ctaLabel || "",
      ctaUrl: item.ctaUrl || "",
      imageUrl: item.imageUrl || "",
      priority: Number(item.priority || 0),
      showOncePerUser: item.showOncePerUser !== false,
      isActive: item.isActive !== false
    });
    setError("");
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this popup campaign?")) return;
    try {
      await api.delete(`/popup-campaigns/${id}`);
      await load();
      if (editingId === id) {
        resetForm();
      }
    } catch (removeError) {
      setError(removeError?.response?.data?.message || "Unable to delete popup campaign.");
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Popup Campaigns</h1>
          <p className="page-subtitle">Create custom popup designs and schedule exact delivery timing.</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <h2 className="card-title">{editingId ? "Edit Campaign" : "Create Campaign"}</h2>
        {error ? <div className="auth-error" style={{ marginBottom: "10px" }}>{error}</div> : null}
        <form className="form" onSubmit={submit}>
          <input
            className="input"
            placeholder="Popup title"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            required
          />
          <input
            className="input"
            placeholder="Popup message"
            value={form.message}
            onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
            required
          />
          <select
            className="select"
            value={form.template}
            onChange={(event) => setForm((prev) => ({ ...prev, template: event.target.value }))}
          >
            {TEMPLATE_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="select"
            value={form.target}
            onChange={(event) => setForm((prev) => ({ ...prev, target: event.target.value }))}
          >
            <option value="all_students">All Students</option>
            <option value="single_student">Single Student</option>
          </select>
          {form.target === "single_student" ? (
            <select
              className="select"
              value={form.studentId}
              onChange={(event) => setForm((prev) => ({ ...prev, studentId: event.target.value }))}
              required
            >
              <option value="">Select Student</option>
              {students.map((student) => (
                <option key={student._id} value={student._id}>
                  {student.name}
                </option>
              ))}
            </select>
          ) : null}
          <input
            className="input"
            type="datetime-local"
            value={form.startAt}
            onChange={(event) => setForm((prev) => ({ ...prev, startAt: event.target.value }))}
            required
          />
          <input
            className="input"
            type="datetime-local"
            value={form.endAt}
            onChange={(event) => setForm((prev) => ({ ...prev, endAt: event.target.value }))}
          />
          <input
            className="input"
            placeholder="Button label (optional)"
            value={form.ctaLabel}
            onChange={(event) => setForm((prev) => ({ ...prev, ctaLabel: event.target.value }))}
          />
          <input
            className="input"
            placeholder="Button URL (https://...)"
            value={form.ctaUrl}
            onChange={(event) => setForm((prev) => ({ ...prev, ctaUrl: event.target.value }))}
          />
          <input
            className="input"
            placeholder="Image URL (https://...)"
            value={form.imageUrl}
            onChange={(event) => setForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
          />
          <div className="popup-campaign-upload-wrap">
            <input
              className="input"
              type="file"
              accept="image/*"
              onChange={uploadImageFile}
              disabled={uploadingImage}
            />
            <div className="popup-campaign-upload-note">
              {uploadingImage ? "Uploading image..." : "Or upload image directly (max 7MB)."}
            </div>
          </div>
          <input
            className="input"
            type="number"
            min="0"
            max="100"
            placeholder="Priority (0-100)"
            value={form.priority}
            onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}
          />
          <label className="popup-campaign-checkbox">
            <input
              type="checkbox"
              checked={form.showOncePerUser}
              onChange={(event) => setForm((prev) => ({ ...prev, showOncePerUser: event.target.checked }))}
            />
            Show once per student
          </label>
          <label className="popup-campaign-checkbox">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
            />
            Active
          </label>
          <div className="popup-campaign-actions">
            <button className="btn" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : editingId ? "Update Campaign" : "Create Campaign"}
            </button>
            {editingId ? (
              <button className="btn btn-ghost" type="button" onClick={resetForm}>
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <h2 className="card-title">Template Preview</h2>
        <div className="popup-campaign-template-meta">
          <strong>{selectedTemplate.label}</strong> · {selectedTemplate.mood}
        </div>
        <div className={`campaign-popup-card campaign-popup-template-${form.template}`}>
          {form.imageUrl ? (
            <img className="campaign-popup-image" src={form.imageUrl} alt="Popup visual preview" />
          ) : null}
          <div className="campaign-popup-pill">Preview</div>
          <h3 className="campaign-popup-title">{form.title || "Popup headline will appear here"}</h3>
          <p className="campaign-popup-text">{form.message || "Popup message preview..."}</p>
          {form.ctaLabel ? <button className="btn">{form.ctaLabel}</button> : null}
        </div>
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <h2 className="card-title">Scheduled Campaigns</h2>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="list">
            {items.map((item) => (
              <div className="list-item" key={item._id}>
                <div>
                  <div style={{ fontWeight: 700 }}>{item.title}</div>
                  <div style={{ color: "var(--muted)", fontSize: "12px" }}>{item.message}</div>
                  <div className="popup-campaign-line">
                    Template: {item.template} · Target: {item.target === "all_students" ? "All" : "Single student"}
                  </div>
                  <div className="popup-campaign-line">
                    Start: {item.startAt ? new Date(item.startAt).toLocaleString() : "-"}
                    {" · "}
                    End: {item.endAt ? new Date(item.endAt).toLocaleString() : "No end time"}
                  </div>
                  {item.imageUrl ? (
                    <div className="popup-campaign-line">
                      Image: <a href={item.imageUrl} target="_blank" rel="noreferrer">Preview</a>
                    </div>
                  ) : null}
                </div>
                <div style={{ display: "grid", gap: "8px", justifyItems: "end" }}>
                  <span className={`popup-campaign-status popup-campaign-status-${item.status || "scheduled"}`}>
                    {item.status || "scheduled"}
                  </span>
                  <button className="btn btn-ghost" type="button" onClick={() => edit(item)}>
                    Edit
                  </button>
                  <button className="btn btn-ghost" type="button" onClick={() => remove(item._id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {!items.length ? <div>No popup campaigns yet.</div> : null}
          </div>
        )}
      </div>
    </div>
  );
}
