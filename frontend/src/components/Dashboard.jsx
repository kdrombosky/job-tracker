import { useCallback, useEffect, useMemo, useState } from "react";
import { listJobs, createJob, deleteJob, updateJob, downloadCsv, AuthError } from "../api.js";
import StatsCards from "./StatsCards.jsx";
import Charts from "./Charts.jsx";
import PipelineFlow from "./PipelineFlow.jsx";
import TimeInStage from "./TimeInStage.jsx";
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
  const [allJobs, setAllJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [showRejected, setShowRejected] = useState(false);

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

  // Deliberately unfiltered — feeds the industry dropdown, the stats
  // cards, and the charts, all of which should describe your whole job
  // search regardless of whatever filter is currently applied to the
  // table. Filtering the table to "Rejected" shouldn't make "Total
  // applications" or the status chart suddenly reflect only rejections.
  const loadAllJobs = useCallback(async () => {
    try {
      const all = await listJobs({});
      setAllJobs(all);
    } catch (err) {
      if (err instanceof AuthError) onLoggedOut();
      // otherwise non-critical — stats/charts/dropdown just stay stale
    }
  }, [onLoggedOut]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    loadAllJobs();
  }, [loadAllJobs]);

  const industries = useMemo(
    () => Array.from(new Set(allJobs.map((j) => j.industry).filter(Boolean))).sort(),
    [allJobs]
  );

  // Rejected apps get pulled out of the main table entirely and shown in
  // their own hideable section below instead — the main table is for
  // stuff that's still active-ish, not a graveyard of dead ends. Filtered
  // client-side rather than via the backend's status_filter param, since
  // "everything except Rejected" doesn't map onto that single-value filter.
  const mainJobs = useMemo(() => jobs.filter((j) => j.status !== "Rejected"), [jobs]);

  // Pulled from allJobs (unfiltered), not mainJobs/jobs, so the rejected
  // list is always complete regardless of whatever search/status/industry
  // filter is currently set in the main toolbar.
  const rejectedJobs = useMemo(() => allJobs.filter((j) => j.status === "Rejected"), [allJobs]);

  function handleFilterChange(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  async function handleTogglePreferred(job) {
    try {
      await updateJob(job.id, { preferred: !job.preferred });
      loadJobs();
      loadAllJobs(); // "Preferred jobs" stat card needs to reflect this too
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
      loadAllJobs();
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
      loadAllJobs();
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

      <StatsCards jobs={allJobs} />
      <Charts jobs={allJobs} />
      <div className="charts-grid">
        <PipelineFlow jobs={allJobs} />
        <TimeInStage jobs={allJobs} />
      </div>

      <Toolbar filters={filters} onChange={handleFilterChange} industries={industries} />

      <JobsTable
        jobs={mainJobs}
        loading={loading}
        error={error}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onTogglePreferred={handleTogglePreferred}
      />

      <div className="rejected-section">
        <button className="rejected-toggle" onClick={() => setShowRejected((v) => !v)}>
          <span>{showRejected ? "▾" : "▸"}</span>
          Rejected applications ({rejectedJobs.length})
        </button>
        {showRejected && (
          <JobsTable
            jobs={rejectedJobs}
            loading={false}
            error=""
            onEdit={handleEdit}
            onDelete={handleDelete}
            onTogglePreferred={handleTogglePreferred}
          />
        )}
      </div>

      {modalOpen && <JobModal job={editingJob} onSave={handleSaveJob} onClose={handleCloseModal} />}
    </div>
  );
}
