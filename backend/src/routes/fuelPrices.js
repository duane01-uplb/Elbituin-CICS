const express = require("express");
const router = express.Router();
const { fetchStationsFromOverpass } = require("../services/overpassService");
const fallbackStations = require("../data/stations");
 
// GET /api/fuel-prices
// Returns fuel station data with optional filtering
router.get("/", async (req, res) => {
  const { city, brand, maxPrice, fuelType = "gas95" } = req.query;
 
  let stations;
  let source = "live";
 
  try {
    stations = await fetchStationsFromOverpass();
  } catch (err) {
    console.warn("[fuelPrices] Overpass API failed, using fallback data:", err.message);
    stations = fallbackStations;
    source = "fallback";
  }
 
  let result = [...stations];
 
  // Filter by city
  if (city) {
    result = result.filter((s) =>
      s.city.toLowerCase().includes(city.toLowerCase())
    );
  }
 
  // Filter by brand
  if (brand) {
    result = result.filter((s) =>
      s.brand.toLowerCase() === brand.toLowerCase()
    );
  }
 
  // Filter by max price for a given fuel type
  if (maxPrice) {
    result = result.filter((s) => {
      const price = s.prices?.[fuelType];
      return price && price <= parseFloat(maxPrice);
    });
  }
 
  // Add price_category field for map coloring
  const allPrices = result.map((s) => s.prices?.[fuelType]).filter(Boolean);
  const minPrice = Math.min(...allPrices);
  const maxPriceVal = Math.max(...allPrices);
  const range = maxPriceVal - minPrice || 1;
 
  result = result.map((s) => {
    const price = s.prices?.[fuelType];
    const normalized = price ? (price - minPrice) / range : 0.5;
    let price_category;
    if (normalized < 0.33) price_category = "cheap";
    else if (normalized < 0.66) price_category = "medium";
    else price_category = "expensive";
 
    return { ...s, price_category, display_price: price };
  });
 
  res.json({
    success: true,
    count: result.length,
    fuel_type: fuelType,
    source,
    last_updated: new Date().toISOString(),
    stations: result,
  });
});
 
// GET /api/fuel-prices/:id
router.get("/:id", async (req, res) => {
  let stations;
  try {
    stations = await fetchStationsFromOverpass();
  } catch {
    stations = fallbackStations;
  }
 
  const station = stations.find((s) => String(s.id) === req.params.id);
  if (!station) {
    return res.status(404).json({ success: false, message: "Station not found" });
  }
  res.json({ success: true, station });
});
 
module.exports = router;
