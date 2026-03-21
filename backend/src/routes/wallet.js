const express = require("express");
const router = express.Router();

// Mock wallet data for demo purposes
// In production, this would be per-user data from Supabase
const mockWalletData = {
  user: {
    name: "Juan dela Cruz",
    vehicle: "Tricycle",
    member_since: "2024-01-15",
    cooperative: "Batangas Tri-Coop Federation",
  },
  this_month: {
    fuel_spend: 6840,
    trips: 124,
    liters_consumed: 126,
    avg_price_paid: 54.29,
    cheapest_available: 53.20,
  },
  savings: {
    this_month: 1360,
    last_month: 1180,
    total_lifetime: 14520,
    co2_avoided_kg: 42,
    trees_equivalent: 2,
  },
  wallet: {
    balance: 4250,
    cooperative_pool: 185400, // ₱ pooled by all coop members
    coop_members: 312,
    next_bulk_purchase_date: "2024-02-01",
    projected_savings_next_month: 1500,
  },
  history: [
    { month: "Aug 2024", spend: 8200, savings: 800 },
    { month: "Sep 2024", spend: 7900, savings: 900 },
    { month: "Oct 2024", spend: 7600, savings: 1050 },
    { month: "Nov 2024", spend: 7200, savings: 1180 },
    { month: "Dec 2024", spend: 7050, savings: 1240 },
    { month: "Jan 2025", spend: 6840, savings: 1360 },
  ],
  badges: [
    { id: "first_save", label: "First Saver", earned: true, icon: "🏆" },
    { id: "route_optimizer", label: "Route Master", earned: true, icon: "🗺️" },
    { id: "coop_member", label: "Coop Member", earned: true, icon: "🤝" },
    { id: "ev_explorer", label: "EV Explorer", earned: false, icon: "⚡" },
    { id: "carbon_champion", label: "Carbon Champion", earned: false, icon: "🌱" },
  ],
};

// GET /api/wallet
// Returns mock wallet/savings data
router.get("/", (req, res) => {
  res.json({
    success: true,
    data: mockWalletData,
  });
});

// GET /api/wallet/leaderboard
// Returns top savers in cooperative (mock)
router.get("/leaderboard", (req, res) => {
  const leaderboard = [
    { rank: 1, name: "Maria Santos", savings: 2100, trips: 187 },
    { rank: 2, name: "Pedro Reyes", savings: 1890, trips: 162 },
    { rank: 3, name: "Juan dela Cruz", savings: 1360, trips: 124, is_you: true },
    { rank: 4, name: "Ana Gomez", savings: 1240, trips: 115 },
    { rank: 5, name: "Ricky Buenaventura", savings: 1100, trips: 98 },
  ];
  res.json({ success: true, leaderboard });
});

module.exports = router;
