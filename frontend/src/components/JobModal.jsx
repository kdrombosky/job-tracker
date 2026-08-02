import { useEffect, useState } from "react";
import { STATUS_ORDER } from "../constants.js";

const BLANK = {
  company: "",
  position: "",
  industry: "",
  status: "Applied",
  salary_min: "",
  salary_max: "",
  date_applied: "",
  date_last_updated: "",
  source: "",
  notes: "",
  preferred: false,
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function JobModal({ job, onSave, onClose }) {
  const isEdit = !!job;
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Re-seed the form whenever which job we're editing changes (including
  // switching from "add" to "edit" without the component unmounting).
  useEffect(() => {
    if (job) {
      setForm({
        company: job.company || "",
        position: job.position || "",
        industry: job.industry || "",
        status: job.status || "Applied",
        salary_min: job.salary_min ?? "",
        salary_max: job.salary_max ?? "",
        date_applied: job.date_applied || "",
        date_last_updated: job.date_last_updated || "",
        source: job.source || "",
        notes: job.notes || "",
        preferred: !!job.preferred,
      });
    } else {
      setForm({ ...BLANK, date_applied: todayStr(), date_last_updated: todayStr() });
    }
    setError("");
  }, [job]);

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.company.trim() || !form.position.trim()) {
      setError("Company and position are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        salary_min: form.salary_min === "" ? null : Number(form.salary_min),
        salary_max: form.salary_max === "" ? null : Number(form.salary_max),
        date_applied: form.date_applied || null,
        date_last_updated: form.date_last_updated || null,
      };
      // Sends the full form every time, even on edit — this is a
      // whole-record overwrite, not a partial patch. Matches what someone
      // editing a form actually expects: what's on screen is what gets saved.
      await onSave(payload, job?.id);
    } catch (err) {
      setError(err.message || "Couldn't save — try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="modal-overlay show"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <div className="modal-header">
          <h2>{isEdit ? "Edit application" : "Add application"}</h2>
          <button onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit} id="job-form">
            <div className="form-grid">
              <div className="field">
                <label>Company *</label>
                <input value={form.company} onChange={(e) => set("company", e.target.value)} required />
              </div>
              <div className="field">
                <label>Position *</label>
                <input value={form.position} onChange={(e) => set("position", e.target.value)} required />
              </div>

              <div className="field">
                <label>Industry</label>
                <input
                  value={form.industry}
                  onChange={(e) => set("industry", e.target.value)}
                  placeholder="e.g. Fintech"
                />
              </div>
              <div className="field">
                <label>Status</label>
                <select value={form.status} onChange={(e) => set("status", e.target.value)}>
                  {STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Salary min ($)</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={form.salary_min}
                  onChange={(e) => set("salary_min", e.target.value)}
                />
              </div>
              <div className="field">
                <label>Salary max ($)</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={form.salary_max}
                  onChange={(e) => set("salary_max", e.target.value)}
                />
              </div>

              <div className="field">
                <label>Date applied</label>
                <input
                  type="date"
                  value={form.date_applied}
                  onChange={(e) => set("date_applied", e.target.value)}
                />
              </div>
              <div className="field">
                <label>Date last updated</label>
                <input
                  type="date"
                  value={form.date_last_updated}
                  onChange={(e) => set("date_last_updated", e.target.value)}
                />
              </div>

              <div className="field full">
                <label>Applied from (source)</label>
                <input
                  value={form.source}
                  onChange={(e) => set("source", e.target.value)}
                  placeholder="e.g. LinkedIn, Referral, Company site"
                />
              </div>

              <div className="field full">
                <label>Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Contacts, interview notes, next steps..."
                />
              </div>

              <div className="field full pref-check">
                <input
                  type="checkbox"
                  id="preferred-check"
                  checked={form.preferred}
                  onChange={(e) => set("preferred", e.target.checked)}
                />
                <label htmlFor="preferred-check" style={{ margin: 0 }}>
                  This is a preferred / dream job
                </label>
              </div>
            </div>
            {error && (
              <div className="login-error" style={{ marginTop: 14 }}>
                {error}
              </div>
            )}
          </form>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" type="submit" form="job-form" disabled={saving}>
            {saving ? "Saving..." : "Save application"}
          </button>
        </div>
      </div>
    </div>
  );
}
