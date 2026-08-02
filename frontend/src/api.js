const API_URL = import.meta.env.VITE_API_URL;
const TOKEN_KEY = "job_tracker_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// Thrown specifically on 401s so callers (see App.jsx) can distinguish
// "your session is gone, log in again" from any other kind of API failure.
export class AuthError extends Error {}

async function request(path, { method = "GET", body, isForm = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (body && !isForm) headers["Content-Type"] = "application/json";

  const resp = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });

  if (resp.status === 401) {
    clearToken();
    throw new AuthError("Session expired — please log in again.");
  }

  if (!resp.ok) {
    let detail = resp.statusText;
    try {
      const errBody = await resp.json();
      detail = errBody.detail || detail;
    } catch {
      // response wasn't JSON — fall back to statusText
    }
    throw new Error(detail);
  }

  if (resp.status === 204) return null;

  const contentType = resp.headers.get("content-type") || "";
  return contentType.includes("application/json") ? resp.json() : resp;
}

// Deliberately NOT going through request() here — login is the one route
// that's unauthenticated by nature, and a 401 from it means "wrong
// password," not "your session expired." Routing it through the shared
// helper would trigger the AuthError/clearToken path meant for expired
// sessions and show the wrong message on a plain bad-password attempt.
export async function login(password) {
  const resp = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

  if (!resp.ok) {
    let detail = "Incorrect password.";
    try {
      const errBody = await resp.json();
      detail = errBody.detail || detail;
    } catch {
      // response wasn't JSON — fall back to the default message
    }
    throw new Error(detail);
  }

  const data = await resp.json();
  setToken(data.access_token);
}

export function listJobs(params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  }
  const qs = query.toString();
  return request(`/api/jobs${qs ? `?${qs}` : ""}`);
}

export function createJob(data) {
  return request("/api/jobs", { method: "POST", body: data });
}

export function updateJob(id, data) {
  return request(`/api/jobs/${id}`, { method: "PUT", body: data });
}

export function deleteJob(id) {
  return request(`/api/jobs/${id}`, { method: "DELETE" });
}

export async function importCsv(file) {
  const form = new FormData();
  form.append("file", file);
  return request("/api/jobs/import", { method: "POST", body: form, isForm: true });
}

// CSV export needs the Authorization header, so it can't just be a plain
// <a href> to the endpoint — the browser wouldn't attach the token to a
// normal link navigation. Fetch it as an authenticated request instead and
// trigger the download manually via an object URL.
export async function downloadCsv() {
  const resp = await request("/api/jobs/export");
  const blob = await resp.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `jobs_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
