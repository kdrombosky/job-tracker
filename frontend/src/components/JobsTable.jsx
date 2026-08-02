import { STATUS_COLORS } from "../constants.js";
import { fmtDate, fmtSalary, fmtDays } from "../utils.js";

export default function JobsTable({ jobs, loading, error, onEdit, onDelete, onTogglePreferred }) {
  if (loading) {
    return <div className="table-card"><div className="empty-state">Loading…</div></div>;
  }

  if (error) {
    return <div className="table-card"><div className="empty-state">{error}</div></div>;
  }

  if (jobs.length === 0) {
    return (
      <div className="table-card">
        <div className="empty-state">
          <div className="empty-big">No jobs found</div>
          <div>Try adjusting your filters, or add your first application.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="table-card">
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Company / Position</th>
            <th>Industry</th>
            <th>Salary range</th>
            <th>Status</th>
            <th>Applied</th>
            <th>Last updated</th>
            <th>Since update</th>
            <th>Total time</th>
            <th>Source</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => {
            const colors = STATUS_COLORS[job.status] || STATUS_COLORS.Applied;
            return (
              <tr key={job.id}>
                <td>
                  <span
                    className={`star ${job.preferred ? "on" : ""}`}
                    title="Preferred job"
                    onClick={() => onTogglePreferred(job)}
                  >
                    {job.preferred ? "★" : "☆"}
                  </span>
                </td>
                <td className="company-cell">
                  <div className="name">{job.company}</div>
                  <div className="pos">{job.position}</div>
                </td>
                <td>{job.industry || "—"}</td>
                <td>{fmtSalary(job)}</td>
                <td>
                  <span className="badge" style={{ background: colors.bg, color: colors.fg }}>
                    {job.status}
                  </span>
                </td>
                <td>{fmtDate(job.date_applied)}</td>
                <td>{fmtDate(job.date_last_updated)}</td>
                <td className={job.is_stale ? "stale" : "muted"}>{fmtDays(job.days_since_update)}</td>
                <td className="muted">{fmtDays(job.total_days)}</td>
                <td className="muted">{job.source || "—"}</td>
                <td>
                  <div className="row-actions">
                    <button className="icon-btn" title="Edit" onClick={() => onEdit(job)}>
                      ✎
                    </button>
                    <button className="icon-btn" title="Delete" onClick={() => onDelete(job)}>
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
