import { TERMINAL_STATUSES } from "../constants.js";

// `jobs` here must always be the FULL unfiltered list — same reasoning as
// the industries dropdown. Filtering the table to "Rejected" shouldn't
// make "Total applications" suddenly show a rejected-only count.
export default function StatsCards({ jobs }) {
  const total = jobs.length;
  const active = jobs.filter((j) => !TERMINAL_STATUSES.includes(j.status)).length;
  const interviewPlus = jobs.filter((j) => ["Interview", "Offer", "Accepted"].includes(j.status)).length;
  const offers = jobs.filter((j) => j.status === "Offer" || j.status === "Accepted").length;
  const preferred = jobs.filter((j) => j.preferred).length;

  const activeDaysSinceUpdate = jobs
    .filter((j) => !TERMINAL_STATUSES.includes(j.status) && j.days_since_update !== null)
    .map((j) => j.days_since_update);
  const avgDays =
    activeDaysSinceUpdate.length > 0
      ? Math.round(activeDaysSinceUpdate.reduce((sum, d) => sum + d, 0) / activeDaysSinceUpdate.length)
      : null;

  const cards = [
    { label: "Total applications", value: total, sub: `${active} active` },
    { label: "Active", value: active, sub: total ? `${Math.round((active / total) * 100)}% of total` : "—" },
    {
      label: "Interview rate",
      value: total ? `${Math.round((interviewPlus / total) * 100)}%` : "—",
      sub: `${interviewPlus} reached interview+`,
    },
    { label: "Offers", value: offers, sub: "incl. accepted" },
    { label: "Preferred jobs", value: preferred, sub: "starred" },
    { label: "Avg. days since update", value: avgDays === null ? "—" : avgDays, sub: "across active apps" },
  ];

  return (
    <div className="stats-grid">
      {cards.map((c) => (
        <div className="stat-card" key={c.label}>
          <div className="label">{c.label}</div>
          <div className="value">{c.value}</div>
          <div className="sub">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}
