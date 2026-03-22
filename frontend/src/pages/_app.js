import { useState, useEffect } from "react";
import "../styles/globals.css";
import "maplibre-gl/dist/maplibre-gl.css";
import Login from "./login";

const SESSION_KEY = "fb_coop_session";

export default function App({ Component, pageProps }) {
  const [coop,    setCoop]    = useState(null);
  const [checked, setChecked] = useState(false);

  // Restore session from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) setCoop(JSON.parse(saved));
    } catch {}
    setChecked(true);
  }, []);

  function handleLogin(coopData) {
    setCoop(coopData);
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(coopData)); } catch {}
  }

  function handleLogout() {
    setCoop(null);
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  }

  // Don't render anything until we've checked sessionStorage
  // (prevents flash of login page on refresh when already logged in)
  if (!checked) return null;

  // Not authenticated — show login
  if (!coop) return <Login onLogin={handleLogin} />;

  // Authenticated — render app, pass coop info + logout down as props
  return (
    <Component
      {...pageProps}
      coop={coop}
      onLogout={handleLogout}
    />
  );
}