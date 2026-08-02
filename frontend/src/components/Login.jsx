import { useState } from "react";
import { login } from "../api.js";

export default function Login({ onSuccess }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password) return;
    setError("");
    setSubmitting(true);
    try {
      await login(password);
      onSuccess();
    } catch (err) {
      setError(err.message || "Incorrect password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Job Tracker</h1>
        <p className="login-sub">Enter the password to continue.</p>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />
        {error && <div className="login-error">{error}</div>}
        <button type="submit" className="btn btn-primary" disabled={submitting || !password}>
          {submitting ? "Checking..." : "Log in"}
        </button>
      </form>
    </div>
  );
}
