import { useState, useEffect } from "react";
import styles from "./Navbar.module.css";

const TABS = [
  { id: "map",    icon: "🗺️",  label: "Fuel Map",  short: "Map"    },
  { id: "route",  icon: "📍",  label: "Route",     short: "Route"  },
  { id: "wallet", icon: "💰",  label: "Wallet",    short: "Wallet" },
  { id: "chat",   icon: "🤖",  label: "AI Guide",  short: "AI"     },
];

const EXPANDED_W = "220px";
const COLLAPSED_W = "64px";

export default function Navbar({ activeTab, onTabChange }) {
  const [collapsed, setCollapsed] = useState(false);

  // Set CSS variable on mount AND keep it in sync
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-width",
      collapsed ? COLLAPSED_W : EXPANDED_W
    );
  }, [collapsed]);

  // Set initial value synchronously via a style tag to prevent flash
  useEffect(() => {
    // Only run on mount
    const existing = document.getElementById("__navbar-init-style");
    if (!existing) {
      const style = document.createElement("style");
      style.id = "__navbar-init-style";
      style.textContent = `:root { --sidebar-width: ${EXPANDED_W}; }`;
      document.head.prepend(style);
    }
  }, []);

  function toggleCollapse() {
    setCollapsed((prev) => !prev);
  }

  return (
    <>
      {/* ── Desktop Left Sidebar ── */}
      <aside
        className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ""}`}
        aria-label="Main navigation"
      >
        {/* Brand */}
        <div className={styles.brand}>
          <div className={styles.logo}>⛽</div>
          {!collapsed && (
            <div className={styles.brandText}>
              <span className={styles.brandName}>
                Fuel<span>Bridge</span>
              </span>
              <span className={styles.tagline}>Fuel smarter.</span>
            </div>
          )}
        </div>

        {/* Collapse toggle — now inside sidebar, no negative positioning */}
        <button
          className={styles.collapseBtn}
          onClick={toggleCollapse}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "›" : "‹"}
        </button>

        {/* Nav items */}
        <nav className={styles.nav} role="navigation">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ""}`}
              title={collapsed ? tab.label : undefined}
              aria-current={activeTab === tab.id ? "page" : undefined}
            >
              <span className={styles.tabIcon} aria-hidden="true">
                {tab.icon}
              </span>
              {!collapsed && (
                <span className={styles.tabLabel}>{tab.label}</span>
              )}
              {activeTab === tab.id && (
                <span className={styles.tabIndicator} aria-hidden="true" />
              )}
            </button>
          ))}
        </nav>

        {/* Bottom live badge */}
        <div className={styles.bottom}>
          {!collapsed ? (
            <div className={styles.badge}>
              <span className={styles.dot} aria-hidden="true" />
              Live Prices
            </div>
          ) : (
            <div className={styles.dotOnly} title="Live Prices">
              <span className={styles.dot} aria-hidden="true" />
            </div>
          )}
        </div>
      </aside>

      {/* ── Mobile Bottom Nav ── */}
      <nav className={styles.mobileNav} aria-label="Mobile navigation">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`${styles.mobileTab} ${
              activeTab === tab.id ? styles.mobileTabActive : ""
            }`}
            aria-current={activeTab === tab.id ? "page" : undefined}
          >
            <span className={styles.mobileIcon} aria-hidden="true">
              {tab.icon}
            </span>
            <span className={styles.mobileLabel}>{tab.short}</span>
          </button>
        ))}
      </nav>
    </>
  );
}