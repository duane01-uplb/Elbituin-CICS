import { useState } from "react";
import styles from "./Navbar.module.css";

// Tab definitions for the main navigation
const TABS = [
  { id: "map", label: "⛽ Fuel Map", short: "Map" },
  { id: "route", label: "🗺️ Route", short: "Route" },
  { id: "wallet", label: "💰 Wallet", short: "Wallet" },
  { id: "chat", label: "🤖 AI Guide", short: "AI" },
];

export default function Navbar({ activeTab, onTabChange }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop top navbar */}
      <nav className={styles.nav}>
        <div className={styles.brand}>
          <span className={styles.logo}>⛽</span>
          <div>
            <span className={styles.brandName}>FuelBridge</span>
            <span className={styles.tagline}>Fuel smarter. Drive further.</span>
          </div>
        </div>

        <div className={styles.tabs}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ""}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={styles.badge}>
          <span className={styles.dot} />
          Live Prices
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav className={styles.mobileNav}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`${styles.mobileTab} ${activeTab === tab.id ? styles.mobileTabActive : ""}`}
          >
            <span className={styles.mobileIcon}>{tab.label.split(" ")[0]}</span>
            <span className={styles.mobileLabel}>{tab.short}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
