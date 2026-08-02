// Mirrors backend/app/models.py's JobStatus values exactly — these strings
// go straight into API query params and request bodies, so they have to
// match what the backend's Enum accepts (see the values_callable fix).
export const STATUS_ORDER = [
  "Applied",
  "Screening",
  "Interview",
  "Offer",
  "Accepted",
  "Rejected",
  "Withdrawn",
];

export const STATUS_COLORS = {
  Applied: { bg: "#e8f1fc", fg: "#2f7fd6" },
  Screening: { bg: "#f1e9fb", fg: "#8a55d6" },
  Interview: { bg: "#fdf3e0", fg: "#c98a12" },
  Offer: { bg: "#e0f7f0", fg: "#0f9d76" },
  Accepted: { bg: "#e5f7ef", fg: "#1c9c6b" },
  Rejected: { bg: "#fce9e9", fg: "#d64545" },
  Withdrawn: { bg: "#eef0f4", fg: "#8a8f9e" },
};

export const SORT_OPTIONS = [
  { value: "date_last_updated_desc", label: "Last updated (newest)" },
  { value: "date_last_updated_asc", label: "Last updated (oldest)" },
  { value: "date_applied_desc", label: "Date applied (newest)" },
  { value: "date_applied_asc", label: "Date applied (oldest)" },
  { value: "company_asc", label: "Company (A-Z)" },
  { value: "salary_max_desc", label: "Salary (high-low)" },
];
