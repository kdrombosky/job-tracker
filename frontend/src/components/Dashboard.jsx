import { useCallback, useEffect, useState } from "react";
import { listJobs, createJob, deleteJob, updateJob, downloadCsv, AuthError } from "../api.js";
import Toolbar from "./Toolbar.jsx";
import JobsTable from "./JobsTable.jsx";
import JobModal from "./JobModal.jsx";

const DEFAULT_FILTERS = {
  search: "",
  status_filter: "",
  industry: "",
  preferred_only: false,
  sort: "date_last_updated_desc",
};

export default function Dashboard({ onLoggedOut }) {
  const [jobs, setJobs] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listJobs(filters);
      setJobs(data);
    } catch (err) {
      if (err instanceof AuthError) return onLoggedOut();
      setError(err.message || "Couldn't load jobs.");
    } finally {
      setLoading(false);
    }
  }, [filters, onLoggedOut]);

  // Deliberately unfiltered — see explanation in chat: this feeds the
  // industry dropdown, which should always list every industry you've
  // ever used, independent of whatever status/search filter is active.
  const loadIndustries = useCallback(async () => {
    try {
      const all = await listJobs({});
      setIndustries(Array.from(new Set(all.map((j) => j.industry).filter(Boolean))).sort());
    } catch (err) {
      if (err instanceof AuthError) onLoggedOut();
      // otherwise non-critical — leave the dropdown as it was
    }
  }, [onLoggedOut]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    loadIndustries();
  }, [loadIndustries]);

  function handleFilterChange(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  async function handleTogglePreferred(job) {
    try {
      await updateJob(job.id, { preferred: !job.preferred });
      loadJobs();
    } catch (err) {
      if (err instanceof AuthError) return onLoggedOut();
      setError(err.message);
    }
  }

  async function handleDelete(job) {
    if (!window.confirm(`Delete application to ${job.company}?`)) return;
    try {
      await deleteJob(job.id);
      loadJobs();
      loadIndustries();
    } catch (err) {
      if (err instanceof AuthError) return onLoggedOut();
      setError(err.message);
    }
  }

  function handleEdit(job) {
    setEditingJob(job); // null => "add" mode, a job object => "edit" mode
    setModalOpen(true);
  }

  function handleCloseModal() {
    setModalOpen(false);
    setEditingJob(null);
  }

  async function handleSaveJob(payload, id) {
    try {
      if (id) {
        await updateJob(id, payload);
      } else {
        await createJob(payload);
      }
      handleCloseModal();
      loadJobs();
      loadIndustries();
    } catch (err) {
      if (err instanceof AuthError) {
        onLoggedOut();
        return;
      }
      // Re-thrown so JobModal's own try/catch shows the error inline
      // and keeps the modal open, instead of losing the user's input.
      throw err;
    }
  }

  return (
    <div className="wrap">
      <header className="top">
        <div>
          <h1>Job Tracker</h1>
          <p>Everything about your search, in one place.</p>
        </div>
        <div className="actions-row">
          <button className="btn btn-ghost" onClick={() => downloadCsv()}>
            Export CSV
          </button>
          <button className="btn btn-primary" onClick={() => handleEdit(null)}>
            + Add application
          </button>
        </div>
      </header>

      <Toolbar filters={filters} onChange={handleFilterChange} industries={industries} />

      <JobsTable
        jobs={jobs}
        loading={loading}
        error={error}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onTogglePreferred={handleTogglePreferred}
      />

      {modalOpen && <JobModal job={editingJob} onSave={handleSaveJob} onClose={handleCloseModal} />}
    </div>
  );
}
