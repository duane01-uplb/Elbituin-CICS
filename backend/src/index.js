require("dotenv").config();
const express = require("express");
const cors = require("cors");

const fuelPricesRouter = require("./routes/fuelPrices");
const routeRouter = require("./routes/route");
const chatRouter = require("./routes/chat");
const walletRouter = require("./routes/wallet");

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/fuel-prices", fuelPricesRouter);
app.use("/api/route", routeRouter);
app.use("/api/chat", chatRouter);
app.use("/api/wallet", walletRouter);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "FuelBridge API",
    version: "1.0.0-prototype",
    timestamp: new Date().toISOString(),
  });
});

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.path} not found` });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 FuelBridge API running on http://localhost:${PORT}`);
  console.log(`📡 Endpoints:`);
  console.log(`   GET  /api/fuel-prices`);
  console.log(`   POST /api/route`);
  console.log(`   POST /api/chat`);
  console.log(`   GET  /api/wallet\n`);
});

module.exports = app;
