import { useState, useEffect } from "react";
import styles from "./Navbar.module.css";

const TABS = [
  { id: "map",    icon: "🗺️",  label: "Fuel Map",  short: "Map"    },
  { id: "route",  icon: "📍",  label: "Route",     short: "Route"  },
  { id: "wallet", icon: "💰",  label: "Wallet",    short: "Wallet" },
  { id: "chat",   icon: "🤖",  label: "AI Guide",  short: "AI"     },
];

const EXPANDED_W  = "220px";
const COLLAPSED_W = "64px";

export default function Navbar({ activeTab, onTabChange, coop, onLogout }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const existing = document.getElementById("__navbar-init-style");
    if (!existing) {
      const style = document.createElement("style");
      style.id = "__navbar-init-style";
      style.textContent = `:root { --sidebar-width: ${EXPANDED_W}; }`;
      document.head.prepend(style);
    }
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-width",
      collapsed ? COLLAPSED_W : EXPANDED_W
    );
  }, [collapsed]);

  return (
    <>
      <aside
        className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ""}`}
        aria-label="Main navigation"
      >
        <div className={styles.brand}>
          <div className={styles.logo}>⛽</div>
          {!collapsed && (
            <div className={styles.brandText}>
              <span className={styles.brandName}>Fuel<span>Bridge</span></span>
              <span className={styles.tagline}>Fuel smarter.</span>
            </div>
          )}
        </div>

        <button
          className={styles.collapseBtn}
          onClick={() => setCollapsed((p) => !p)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "›" : "‹"}
        </button>

        <nav className={styles.nav}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ""}`}
              title={collapsed ? tab.label : undefined}
            >
              <span className={styles.tabIcon}>{tab.icon}</span>
              {!collapsed && <span className={styles.tabLabel}>{tab.label}</span>}
              {activeTab === tab.id && <span className={styles.tabIndicator} />}
            </button>
          ))}
        </nav>

        <div className={styles.bottom}>
          {!collapsed ? (
            <div className={styles.badge}>
              <span className={styles.dot} />
              Live Prices
            </div>
          ) : (
            <div className={styles.dotOnly} title="Live Prices">
              <span className={styles.dot} />
            </div>
          )}

          {coop && (
            <div className={styles.coopSection}>
              {!collapsed && (
                <div className={styles.coopInfo}>
                  <span className={styles.coopLabel}>Signed in as</span>
                  <span className={styles.coopName}>{coop.name}</span>
                  <span className={styles.coopId}>{coop.id}</span>
                </div>
              )}
              <button
                className={styles.logoutBtn}
                onClick={onLogout}
                title="Sign out"
              >
                <span className={styles.logoutIcon}>↩</span>
                {!collapsed && <span>Sign out</span>}
              </button>
            </div>
          )}
        </div>
      </aside>

      <nav className={styles.mobileNav} aria-label="Mobile navigation">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`${styles.mobileTab} ${activeTab === tab.id ? styles.mobileTabActive : ""}`}
          >
            <span className={styles.mobileIcon}>{tab.icon}</span>
            <span className={styles.mobileLabel}>{tab.short}</span>
          </button>
        ))}
        {coop && (
          <button className={styles.mobileTab} onClick={onLogout}>
            <span className={styles.mobileIcon}>↩</span>
            <span className={styles.mobileLabel}>Out</span>
          </button>
        )}
      </nav>
    </>
  );
}