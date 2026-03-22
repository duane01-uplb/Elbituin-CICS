import { useState } from "react";
import Head from "next/head";
import styles from "./login.module.css";

// Single cooperative credentials (hardcoded for prototype)
const COOP = {
  name:     "Elbituin Cooperative",
  id:       "Elbituin2026",
  password: "elbituin2026",
};

export default function Login({ onLogin }) {
  const [coopId,    setCoopId]    = useState("");
  const [password,  setPassword]  = useState("");
  const [error,     setError]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [showPass,  setShowPass]  = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Simulate network delay
    await new Promise((r) => setTimeout(r, 900));

    if (
      coopId.trim().toLowerCase() === COOP.id.toLowerCase() &&
      password === COOP.password
    ) {
      onLogin({ name: COOP.name, id: COOP.id });
    } else {
      setError("Invalid cooperative ID or password. Try BTC-2024 / fuelbridge2024");
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>FuelBridge — Cooperative Login</title>
      </Head>

      <div className={styles.page}>
        {/* Ambient background orbs */}
        <div className={styles.orb1} />
        <div className={styles.orb2} />
        <div className={styles.orb3} />

        {/* Grid texture overlay */}
        <div className={styles.grid} />

        <div className={styles.wrapper}>
          {/* Left — branding panel */}
          <div className={styles.brand}>
            <div className={styles.brandInner}>
              <div className={styles.logo}>
                <span className={styles.logoIcon}>⛽</span>
              </div>
              <h1 className={styles.brandName}>
                Fuel<span>Bridge</span>
              </h1>
              <p className={styles.brandTagline}>Fuel smarter. Drive further.</p>

              <div className={styles.features}>
                {[
                  { icon: "🗺️", text: "Live fuel prices across Metro Manila & Laguna" },
                  { icon: "📍", text: "Route optimization with cost estimation"         },
                  { icon: "💰", text: "Cooperative bulk purchasing savings"              },
                  { icon: "🤖", text: "AI-powered EV transition guidance"               },
                  { icon: "🌱", text: "Carbon impact tracking & credits"                },
                ].map((f, i) => (
                  <div key={i} className={styles.featureItem} style={{ animationDelay: `${0.3 + i * 0.1}s` }}>
                    <span className={styles.featureIcon}>{f.icon}</span>
                    <span className={styles.featureText}>{f.text}</span>
                  </div>
                ))}
              </div>

              <div className={styles.brandBadge}>
                🇵🇭 Built for Filipino PUV drivers
              </div>
            </div>
          </div>

          {/* Right — login card */}
          <div className={styles.formSide}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Cooperative Sign In</h2>
                <p className={styles.cardSub}>
                  Enter your cooperative credentials to access the dashboard
                </p>
              </div>

              <form className={styles.form} onSubmit={handleSubmit}>
                {/* Coop ID */}
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="coopId">
                    Cooperative ID
                  </label>
                  <div className={styles.inputWrap}>
                    <span className={styles.inputIcon}>🤝</span>
                    <input
                      id="coopId"
                      type="text"
                      className={styles.input}
                      placeholder="e.g. BTC-2024"
                      value={coopId}
                      onChange={(e) => setCoopId(e.target.value)}
                      autoComplete="username"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="password">
                    Password
                  </label>
                  <div className={styles.inputWrap}>
                    <span className={styles.inputIcon}>🔒</span>
                    <input
                      id="password"
                      type={showPass ? "text" : "password"}
                      className={styles.input}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className={styles.showPassBtn}
                      onClick={() => setShowPass((v) => !v)}
                      tabIndex={-1}
                    >
                      {showPass ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className={styles.errorBox}>
                    <span className={styles.errorIcon}>⚠️</span>
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={loading || !coopId.trim() || !password}
                >
                  {loading ? (
                    <><span className={styles.spinner} /> Verifying…</>
                  ) : (
                    <>Sign in to FuelBridge →</>
                  )}
                </button>
              </form>

              {/* Demo hint */}
              <div className={styles.demoHint}>
                <span className={styles.demoLabel}>Demo Credentials</span>
                <div className={styles.demoCreds}>
                  <span>ID: <code>Elbituin2026</code></span>
                  <span>Password: <code>elbituin2026</code></span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <p className={styles.footer}>
              FuelBridge · Elbituin2026
            </p>
          </div>
        </div>
      </div>
    </>
  );
}