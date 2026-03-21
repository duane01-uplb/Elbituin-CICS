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

  // Set CSS variable immediately on mount — before any paint
  useEffect(() => {
    document.documentElement.style.setProperty("--sidebar-width", EXPANDED_W);
  }, []);

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    document.documentElement.style.setProperty(
      "--sidebar-width", next ? COLLAPSED_W : EXPANDED_W
    );
  }

  return (
    <>
      {/* ── Desktop Left Sidebar ── */}
      <aside className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ""}`}>

        {/* Brand */}
        <div className={styles.brand}>
          <div className={styles.logo}>⛽</div>
          {!collapsed && (
            <div className={styles.brandText}>
              <span className={styles.brandName}>Fuel<span>Bridge</span></span>
              <span className={styles.tagline}>Fuel smarter.</span>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          className={styles.collapseBtn}
          onClick={toggleCollapse}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "›" : "‹"}
        </button>

        {/* Nav items */}
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

        {/* Bottom live badge */}
        <div className={styles.bottom}>
          {!collapsed ? (
            <div className={styles.badge}>
              <span className={styles.dot} />
              Live Prices
            </div>
          ) : (
            <div className={styles.dotOnly}>
              <span className={styles.dot} />
            </div>
          )}
        </div>
      </aside>

      {/* ── Mobile Bottom Nav ── */}
      <nav className={styles.mobileNav}>
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
      </nav>
    </>
  );
}