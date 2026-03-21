import { useState } from "react";
import dynamic from "next/dynamic";
import Head from "next/head";
import Navbar from "../components/Navbar";
import styles from "./index.module.css";

// Dynamic imports to prevent SSR issues with Leaflet
const FuelMap = dynamic(() => import("../components/FuelMap"), { ssr: false });
const RouteOptimizer = dynamic(() => import("../components/RouteOptimizer"), { ssr: false });
const FuelWallet = dynamic(() => import("../components/FuelWallet"), { ssr: false });
const AIChat = dynamic(() => import("../components/AIChat"), { ssr: false });

export default function Home() {
  const [activeTab, setActiveTab] = useState("map");

  return (
    <>
      <Head>
        <title>FuelBridge — Fuel Smarter. Drive Further.</title>
        <meta name="description" content="AI-powered fuel cost reduction for Filipino tricycle and jeepney drivers" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>

      <div className={styles.layout}>
        <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

        <main className={styles.main}>
          {/* Hero banner (visible only on map tab) */}
          {activeTab === "map" && (
            <div className={styles.heroBanner}>
              <div className={styles.heroContent}>
                <div className={styles.heroLeft}>
                  <span className={styles.heroPill}>🇵🇭 Built for Filipino Drivers</span>
                  <h1 className={styles.heroTitle}>
                    Find the <span className={styles.heroAccent}>cheapest fuel</span> near you
                  </h1>
                  <p className={styles.heroSub}>
                    Real-time fuel prices · Route optimization · Cooperative savings
                  </p>
                </div>
                <div className={styles.heroStats}>
                  <div className={styles.heroStat}>
                    <span className={styles.heroStatValue}>₱1,360</span>
                    <span className={styles.heroStatLabel}>Avg monthly savings</span>
                  </div>
                  <div className={styles.heroStat}>
                    <span className={styles.heroStatValue}>12</span>
                    <span className={styles.heroStatLabel}>Active stations</span>
                  </div>
                  <div className={styles.heroStat}>
                    <span className={styles.heroStatValue}>15%</span>
                    <span className={styles.heroStatLabel}>Fuel reduction</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className={styles.tabContent}>
            {activeTab === "map" && <FuelMap />}
            {activeTab === "route" && <RouteOptimizer />}
            {activeTab === "wallet" && <FuelWallet />}
            {activeTab === "chat" && <AIChat />}
          </div>
        </main>

        {/* Footer */}
        <footer className={styles.footer}>
          <span>FuelBridge v1.0 Prototype · Hackathon Build · Data: DOE Philippines (mock)</span>
          <span>Made with ❤️ for Filipino drivers</span>
        </footer>
      </div>
    </>
  );
}
