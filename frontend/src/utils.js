export function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(`${d}T00:00:00`);
  if (isNaN(dt)) return "—";
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function fmtMoney(n) {
  if (n === null || n === undefined || n === "") return null;
  const num = Number(n);
  if (isNaN(num)) return null;
  return `$${num.toLocaleString()}`;
}

export function fmtSalary(job) {
  const lo = fmtMoney(job.salary_min);
  const hi = fmtMoney(job.salary_max);
  if (lo && hi) return lo === hi ? lo : `${lo} – ${hi}`;
  if (lo) return `${lo}+`;
  if (hi) return `up to ${hi}`;
  return "—";
}

// days_since_update / total_days are computed server-side (see
// JobOut.days_since_update / .total_days in schemas.py) specifically so
// this kind of logic lives in exactly one place — this is just display
// formatting for whatever number the API already sent, not a
// reimplementation of the date math.
export function fmtDays(n) {
  if (n === null || n === undefined) return "—";
  if (n <= 0) return "today";
  if (n === 1) return "1 day";
  return `${n} days`;
}
