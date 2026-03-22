import { useEffect, useState } from "react";
import { fetchWallet, fetchLeaderboard, formatPeso } from "../lib/api";
import styles from "./FuelWallet.module.css";

export default function FuelWallet() {
  const [wallet, setWallet] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [walletRes, lbRes] = await Promise.all([fetchWallet(), fetchLeaderboard()]);
        setWallet(walletRes.data);
        setLeaderboard(lbRes.leaderboard);
      } catch {
        setWallet(MOCK_WALLET);
        setLeaderboard(MOCK_LEADERBOARD);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className={styles.loading}>
        <span className="spinner" />
        <span>Loading wallet...</span>
      </div>
    );
  }

  const { user, this_month, savings, wallet: w, history, badges } = wallet;
  const savingsPercent = Math.round((savings.this_month / this_month.fuel_spend) * 100);
  const maxSpend = Math.max(...history.map((h) => h.spend));

  return (
    <div className={styles.container}>
      {/* Left column */}
      <div className={styles.left}>
        {/* User header */}
        <div className={styles.profileCard}>
          <div className={styles.avatar}>
            {user.name.charAt(0)}
          </div>
          <div>
            <div className={styles.userName}>{user.name}</div>
            <div className={styles.userMeta}>{user.vehicle} · {user.cooperative}</div>
            <div className={styles.memberSince}>Member since {user.member_since}</div>
          </div>
          <div className={styles.coopBadge}>🤝 Co-op</div>
        </div>

        {/* Wallet balance */}
        <div className={styles.walletCard}>
          <div className={styles.walletLabel}>💰 FuelBridge Wallet Balance</div>
          <div className={styles.walletBalance}>{formatPeso(w.balance)}</div>
          <div className={styles.walletSub}>
            Pooled with {w.coop_members} co-op members
          </div>
          <div className={styles.coopPool}>
            <div className={styles.coopPoolLabel}>Cooperative Pool</div>
            <div className={styles.coopPoolValue}>{formatPeso(w.cooperative_pool)}</div>
          </div>
          <div className={styles.nextPurchase}>
            📅 Next bulk fuel purchase: <strong>{w.next_bulk_purchase_date}</strong>
          </div>
        </div>

        {/* This month stats */}
        <div className={styles.sectionTitle}>This Month</div>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>⛽</span>
            <span className={styles.statValue}>{formatPeso(this_month.fuel_spend)}</span>
            <span className={styles.statLabel}>Fuel Spent</span>
          </div>
          <div className={`${styles.statCard} ${styles.statSavings}`}>
            <span className={styles.statIcon}>✅</span>
            <span className={styles.statValue}>{formatPeso(savings.this_month)}</span>
            <span className={styles.statLabel}>Saved vs. avg price</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>🛣️</span>
            <span className={styles.statValue}>{this_month.trips}</span>
            <span className={styles.statLabel}>Trips</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>🌱</span>
            <span className={styles.statValue}>{savings.co2_avoided_kg} kg</span>
            <span className={styles.statLabel}>CO₂ Avoided</span>
          </div>
        </div>

        {/* Savings progress */}
        <div className={styles.savingsSection}>
          <div className={styles.savingsHeader}>
            <span className={styles.sectionTitle}>Monthly Savings Rate</span>
            <span className={styles.savingsPercent}>{savingsPercent}%</span>
          </div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${Math.min(savingsPercent, 100)}%` }}
            />
          </div>
          <div className={styles.savingsNote}>
            Lifetime savings: <strong>{formatPeso(savings.total_lifetime)}</strong>
            <span className={styles.treesNote}>🌳 ≈ {savings.trees_equivalent} trees planted equivalent</span>
          </div>
        </div>

        {/* Badges */}
        <div className={styles.sectionTitle}>Achievements</div>
        <div className={styles.badgesGrid}>
          {badges.map((badge) => (
            <div key={badge.id} className={`${styles.badge} ${!badge.earned ? styles.badgeLocked : ""}`}>
              <span className={styles.badgeIcon}>{badge.icon}</span>
              <span className={styles.badgeLabel}>{badge.label}</span>
              {!badge.earned && <span className={styles.lockIcon}>🔒</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Right column */}
      <div className={styles.right}>
        {/* Spending history chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>6-Month Spending History</div>
          <div className={styles.chartLegend}>
            <span className={styles.legendSpend}>Fuel Spend</span>
            <span className={styles.legendSavings}>Savings</span>
          </div>
          <div className={styles.chart}>
            {history.map((item) => (
              <div key={item.month} className={styles.chartCol}>
                <div className={styles.barGroup}>
                  <div
                    className={styles.barSpend}
                    style={{ height: `${(item.spend / maxSpend) * 120}px` }}
                    title={`Spend: ${formatPeso(item.spend)}`}
                  />
                  <div
                    className={styles.barSavings}
                    style={{ height: `${(item.savings / maxSpend) * 120}px` }}
                    title={`Saved: ${formatPeso(item.savings)}`}
                  />
                </div>
                <div className={styles.chartLabel}>{item.month.split(" ")[0]}</div>
                <div className={styles.chartValue}>{formatPeso(item.savings)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Price comparison */}
        <div className={styles.priceCompCard}>
          <div className={styles.chartTitle}>Price Performance</div>
          <div className={styles.priceCompGrid}>
            <div className={styles.priceCompItem}>
              <span className={styles.priceCompLabel}>Avg price you paid</span>
              <span className={styles.priceCompValue}>₱{this_month.avg_price_paid}/L</span>
            </div>
            <div className={styles.priceCompItem + " " + styles.priceCompBest}>
              <span className={styles.priceCompLabel}>Cheapest available</span>
              <span className={styles.priceCompValue}>₱{this_month.cheapest_available}/L</span>
            </div>
          </div>
          <div className={styles.priceCompNote}>
            You saved <strong>₱{(this_month.avg_price_paid - this_month.cheapest_available).toFixed(2)}/L</strong> vs best available.
            Enroll in bulk purchasing to save more!
          </div>
        </div>

        {/* Leaderboard */}
        <div className={styles.leaderboardCard}>
          <div className={styles.chartTitle}>🏆 Co-op Savings Leaderboard</div>
          <div className={styles.leaderboard}>
            {leaderboard.map((entry) => (
              <div key={entry.rank} className={`${styles.leaderRow} ${entry.is_you ? styles.leaderRowYou : ""}`}>
                <span className={styles.leaderRank}>
                  {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`}
                </span>
                <span className={styles.leaderName}>
                  {entry.name} {entry.is_you && <span className={styles.youTag}>You</span>}
                </span>
                <span className={styles.leaderTrips}>{entry.trips} trips</span>
                <span className={styles.leaderSavings}>{formatPeso(entry.savings)}</span>
              </div>
            ))}
          </div>
          <div className={styles.leaderNote}>
            Projected next month: <strong>{formatPeso(w.projected_savings_next_month)}</strong> savings
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Mock data ────────────────────────────────────────────────
const MOCK_WALLET = {
  user: {
    name:         "Elbituin2026",
    vehicle:      "Tricycle",
    member_since: "2001-01-01",
    cooperative:  "Elbituin Cooperative",
  },
  this_month: {
    fuel_spend:        6840,
    trips:             124,
    liters_consumed:   126,
    avg_price_paid:    54.29,
    cheapest_available: 53.20,
  },
  savings: {
    this_month:       1360,
    last_month:       1180,
    total_lifetime:   14520,
    co2_avoided_kg:   42,
    trees_equivalent: 2,
  },
  wallet: {
    balance:                    4250,
    cooperative_pool:           185400,
    coop_members:               312,
    next_bulk_purchase_date:    "2026-04-01",
    projected_savings_next_month: 1500,
  },
  history: [
    { month: "Oct 2025", spend: 8200, savings: 800  },
    { month: "Nov 2025", spend: 7900, savings: 900  },
    { month: "Dec 2025", spend: 7600, savings: 1050 },
    { month: "Jan 2026", spend: 7200, savings: 1180 },
    { month: "Feb 2026", spend: 7050, savings: 1240 },
    { month: "Mar 2026", spend: 6840, savings: 1360 },
  ],
  badges: [
    { id: "first_save",      label: "First Saver",     earned: true,  icon: "🏆" },
    { id: "route_optimizer", label: "Route Master",    earned: true,  icon: "🗺️" },
    { id: "coop_member",     label: "Coop Member",     earned: true,  icon: "🤝" },
    { id: "ev_explorer",     label: "EV Explorer",     earned: false, icon: "⚡" },
    { id: "carbon_champion", label: "Carbon Champion", earned: false, icon: "🌱" },
  ],
};

const MOCK_LEADERBOARD = [
  { rank: 1, name: "Maria Santos",       savings: 2100, trips: 187 },
  { rank: 2, name: "Pedro Reyes",        savings: 1890, trips: 162 },
  { rank: 3, name: "Elbituin2026",       savings: 1360, trips: 124, is_you: true },
  { rank: 4, name: "Ana Gomez",          savings: 1240, trips: 115 },
  { rank: 5, name: "Ricky Buenaventura", savings: 1100, trips:  98 },
];