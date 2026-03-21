const express = require("express");
const router = express.Router();
const stations = require("../data/stations");

// GET /api/fuel-prices
// Returns all fuel station data with optional filtering
router.get("/", (req, res) => {
  const { city, brand, maxPrice, fuelType = "gas95" } = req.query;

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
      const price = s.prices[fuelType];
      return price && price <= parseFloat(maxPrice);
    });
  }

  // Add a price_category field for map coloring
  // Find min/max for the requested fuel type
  const allPrices = result
    .map((s) => s.prices[fuelType])
    .filter(Boolean);
  const minPrice = Math.min(...allPrices);
  const maxPriceVal = Math.max(...allPrices);
  const range = maxPriceVal - minPrice || 1;

  result = result.map((s) => {
    const price = s.prices[fuelType];
    const normalized = price ? (price - minPrice) / range : 0.5;
    let priceCategory;
    if (normalized < 0.33) priceCategory = "cheap";
    else if (normalized < 0.66) priceCategory = "medium";
    else priceCategory = "expensive";

    return { ...s, price_category: priceCategory, display_price: price };
  });

  res.json({
    success: true,
    count: result.length,
    fuel_type: fuelType,
    last_updated: new Date().toISOString(),
    stations: result,
  });
});

// GET /api/fuel-prices/:id
// Returns a single station by ID
router.get("/:id", (req, res) => {
  const station = stations.find((s) => s.id === parseInt(req.params.id));
  if (!station) {
    return res.status(404).json({ success: false, message: "Station not found" });
  }
  res.json({ success: true, station });
});

module.exports = router;
