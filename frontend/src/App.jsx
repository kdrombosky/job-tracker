import { useState } from "react";
import { getToken, clearToken } from "./api.js";
import Login from "./components/Login.jsx";
import Dashboard from "./components/Dashboard.jsx";

export default function App() {
  // Optimistic: a token in localStorage means "probably still logged in."
  // It could technically be expired already — that gets caught the moment
  // the dashboard makes its first real API call and gets a 401 back, which
  // we'll wire up to call handleLoggedOut() once that component exists.
  const [authed, setAuthed] = useState(!!getToken());

  function handleLoggedOut() {
    clearToken();
    setAuthed(false);
  }

  if (!authed) {
    return <Login onSuccess={() => setAuthed(true)} />;
  }

  return <Dashboard onLoggedOut={handleLoggedOut} />;
}
