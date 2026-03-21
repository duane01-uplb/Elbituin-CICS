const express = require("express");
const router = express.Router();
const stations = require("../data/stations");

// Average fuel consumption rates (liters per 100km)
const VEHICLE_CONSUMPTION = {
  tricycle: 4.5,
  jeepney: 12.0,
  motorcycle: 3.2,
  delivery_van: 10.0,
  default: 8.0,
};

// Average fuel price (Gas 91) for cost estimation
function getAverageFuelPrice() {
  const prices = stations.map((s) => s.prices.gas91).filter(Boolean);
  return prices.reduce((a, b) => a + b, 0) / prices.length;
}

// Simple Haversine distance formula (km between two lat/lng points)
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Find the nearest/cheapest station along a route
function findStationAlongRoute(startLat, startLng, endLat, endLng, fuelType = "gas91") {
  // Midpoint of route
  const midLat = (startLat + endLat) / 2;
  const midLng = (startLng + endLng) / 2;

  // Score stations by combination of proximity and price
  const scored = stations
    .filter((s) => s.is_open)
    .map((s) => {
      const dist = haversineDistance(midLat, midLng, s.lat, s.lng);
      const price = s.prices[fuelType] || 999;
      // Weighted score: 60% proximity, 40% price (normalized)
      return { ...s, dist_from_route: dist, score: dist * 0.6 + price * 0.4 };
    })
    .sort((a, b) => a.score - b.score);

  return scored[0] || null;
}

// POST /api/route
// Body: { startLat, startLng, endLat, endLng, vehicleType, fuelType }
router.post("/", (req, res) => {
  const {
    startLat,
    startLng,
    endLat,
    endLng,
    vehicleType = "default",
    fuelType = "gas91",
    tankCapacity = 5, // liters
  } = req.body;

  // Validate inputs
  if (!startLat || !startLng || !endLat || !endLng) {
    return res.status(400).json({
      success: false,
      message: "Missing required coordinates: startLat, startLng, endLat, endLng",
    });
  }

  // Calculate straight-line distance (km)
  // In production, use OSRM API for real road distance
  const straightLineKm = haversineDistance(
    parseFloat(startLat),
    parseFloat(startLng),
    parseFloat(endLat),
    parseFloat(endLng)
  );

  // Apply road factor (roads are ~1.3x longer than straight line on average)
  const estimatedRoadKm = straightLineKm * 1.3;

  // Fuel consumption
  const consumptionRate =
    VEHICLE_CONSUMPTION[vehicleType] || VEHICLE_CONSUMPTION.default;
  const fuelNeeded = (estimatedRoadKm / 100) * consumptionRate;

  // Average price from cheapest open station
  const cheapestStation = stations
    .filter((s) => s.is_open)
    .sort((a, b) => (a.prices[fuelType] || 999) - (b.prices[fuelType] || 999))[0];

  const avgPrice = getAverageFuelPrice();
  const cheapestPrice = cheapestStation ? cheapestStation.prices[fuelType] : avgPrice;
  const expensivePrice = avgPrice * 1.05; // worst case

  const estimatedCost = fuelNeeded * cheapestPrice;
  const worstCaseCost = fuelNeeded * expensivePrice;
  const potentialSavings = worstCaseCost - estimatedCost;

  // Recommended station along route
  const recommendedStation = findStationAlongRoute(
    parseFloat(startLat),
    parseFloat(startLng),
    parseFloat(endLat),
    parseFloat(endLng),
    fuelType
  );

  // Mock waypoints (straight line with 2 intermediate points for demo)
  const waypoints = [
    { lat: parseFloat(startLat), lng: parseFloat(startLng), label: "Start" },
    {
      lat: (parseFloat(startLat) * 2 + parseFloat(endLat)) / 3,
      lng: (parseFloat(startLng) * 2 + parseFloat(endLng)) / 3,
      label: "Waypoint 1",
    },
    {
      lat: (parseFloat(startLat) + parseFloat(endLat) * 2) / 3,
      lng: (parseFloat(startLng) + parseFloat(endLng) * 2) / 3,
      label: "Waypoint 2",
    },
    { lat: parseFloat(endLat), lng: parseFloat(endLng), label: "Destination" },
  ];

  // Estimated travel time (avg 30 km/h in urban PH traffic)
  const estimatedMinutes = Math.round((estimatedRoadKm / 30) * 60);

  res.json({
    success: true,
    route: {
      distance_km: Math.round(estimatedRoadKm * 10) / 10,
      estimated_minutes: estimatedMinutes,
      fuel_needed_liters: Math.round(fuelNeeded * 10) / 10,
      estimated_cost_php: Math.round(estimatedCost),
      potential_savings_php: Math.round(potentialSavings),
      waypoints,
      vehicle_type: vehicleType,
      fuel_type: fuelType,
    },
    recommended_station: recommendedStation
      ? {
          id: recommendedStation.id,
          name: recommendedStation.name,
          lat: recommendedStation.lat,
          lng: recommendedStation.lng,
          price: recommendedStation.prices[fuelType],
          distance_km:
            Math.round(recommendedStation.dist_from_route * 10) / 10,
        }
      : null,
    tips: [
      `Refuel at ${recommendedStation?.name || "the cheapest nearby station"} to save ₱${Math.round(potentialSavings)}`,
      `Maintaining 60 km/h average speed reduces fuel use by ~12%`,
      estimatedRoadKm > 20
        ? "Long trip: consider topping up before departure"
        : "Short trip: half a tank is sufficient",
    ],
  });
});

module.exports = router;
