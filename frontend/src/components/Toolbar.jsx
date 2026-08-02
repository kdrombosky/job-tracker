import { STATUS_ORDER, SORT_OPTIONS } from "../constants.js";

export default function Toolbar({ filters, onChange, industries }) {
  return (
    <div className="toolbar">
      <input
        type="text"
        placeholder="Search company or position..."
        value={filters.search}
        onChange={(e) => onChange("search", e.target.value)}
      />

      <select value={filters.status_filter} onChange={(e) => onChange("status_filter", e.target.value)}>
        <option value="">All statuses</option>
        {STATUS_ORDER.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <select value={filters.industry} onChange={(e) => onChange("industry", e.target.value)}>
        <option value="">All industries</option>
        {industries.map((i) => (
          <option key={i} value={i}>
            {i}
          </option>
        ))}
      </select>

      <label className="pref-filter">
        <input
          type="checkbox"
          checked={filters.preferred_only}
          onChange={(e) => onChange("preferred_only", e.target.checked)}
        />
        Preferred only
      </label>

      <select value={filters.sort} onChange={(e) => onChange("sort", e.target.value)}>
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            Sort: {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
