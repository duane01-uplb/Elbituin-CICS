const express = require("express");
const router = express.Router();
const { fetchStationsFromOverpass } = require("../services/overpassService");
const fallbackStations = require("../data/stations");
 
const VEHICLE_CONSUMPTION = {
  tricycle: 4.5,
  jeepney: 12.0,
  motorcycle: 3.2,
  delivery_van: 10.0,
  default: 8.0,
};
 
// OSRM public API — free, no API key, uses OpenStreetMap road network
const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";
 
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
 
function findStationAlongRoute(routeCoords, fuelType, stations) {
  // Use the midpoint of the actual route polyline
  const mid = routeCoords[Math.floor(routeCoords.length / 2)];
 
  const scored = stations
    .filter((s) => s.is_open && s.prices?.[fuelType])
    .map((s) => {
      const dist = haversineDistance(mid[1], mid[0], s.lat, s.lng);
      const price = s.prices[fuelType];
      return { ...s, dist_from_route: dist, score: dist * 0.6 + price * 0.4 };
    })
    .sort((a, b) => a.score - b.score);
 
  return scored[0] || null;
}
 
// Decode OSRM polyline (encoded polyline algorithm)
function decodePolyline(encoded) {
  const coords = [];
  let index = 0, lat = 0, lng = 0;
 
  while (index < encoded.length) {
    let shift = 0, result = 0, byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
 
    shift = 0; result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
 
    coords.push([lng / 1e5, lat / 1e5]);
  }
 
  return coords;
}
 
// POST /api/route
router.post("/", async (req, res) => {
  const {
    startLat, startLng, endLat, endLng,
    vehicleType = "default",
    fuelType = "gas91",
  } = req.body;
 
  if (!startLat || !startLng || !endLat || !endLng) {
    return res.status(400).json({
      success: false,
      message: "Missing required coordinates: startLat, startLng, endLat, endLng",
    });
  }
 
  let stations;
  try {
    stations = await fetchStationsFromOverpass();
  } catch {
    stations = fallbackStations;
  }
 
  // --- Fetch real road route from OSRM ---
  let routeCoords = null;
  let roadDistanceKm = null;
  let durationSeconds = null;
 
  try {
    const osrmUrl = `${OSRM_BASE}/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=polyline`;
    const osrmRes = await fetch(osrmUrl, {
      signal: AbortSignal.timeout(10000),
    });
 
    if (osrmRes.ok) {
      const osrmData = await osrmRes.json();
      if (osrmData.code === "Ok" && osrmData.routes?.[0]) {
        const route = osrmData.routes[0];
        roadDistanceKm = route.distance / 1000;
        durationSeconds = route.duration;
        routeCoords = decodePolyline(route.geometry);
      }
    }
  } catch (err) {
    console.warn("[OSRM] Failed to fetch road route:", err.message);
  }
 
  // Fallback to straight-line if OSRM fails
  if (!routeCoords) {
    const straightLineKm = haversineDistance(
      parseFloat(startLat), parseFloat(startLng),
      parseFloat(endLat), parseFloat(endLng)
    );
    roadDistanceKm = straightLineKm * 1.3;
    durationSeconds = (roadDistanceKm / 30) * 3600;
    routeCoords = [
      [parseFloat(startLng), parseFloat(startLat)],
      [parseFloat(endLng), parseFloat(endLat)],
    ];
  }
 
  // --- Fuel cost calculation ---
  const consumptionRate = VEHICLE_CONSUMPTION[vehicleType] || VEHICLE_CONSUMPTION.default;
  const fuelNeeded = (roadDistanceKm / 100) * consumptionRate;
 
  const openStations = stations.filter((s) => s.is_open && s.prices?.[fuelType]);
  const prices = openStations.map((s) => s.prices[fuelType]).filter(Boolean);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / (prices.length || 1);
 
  const cheapestStation = [...openStations].sort(
    (a, b) => (a.prices[fuelType] || 999) - (b.prices[fuelType] || 999)
  )[0];
 
  const cheapestPrice = cheapestStation?.prices[fuelType] || avgPrice;
  const expensivePrice = avgPrice * 1.05;
  const estimatedCost = fuelNeeded * cheapestPrice;
  const potentialSavings = fuelNeeded * expensivePrice - estimatedCost;
 
  const recommendedStation = findStationAlongRoute(routeCoords, fuelType, stations);
 
  // Convert OSRM coords [lng, lat] → waypoints {lat, lng} for frontend
  const waypoints = routeCoords.map(([lng, lat]) => ({ lat, lng }));
 
  const estimatedMinutes = Math.round(durationSeconds / 60);
 
  res.json({
    success: true,
    route: {
      distance_km: Math.round(roadDistanceKm * 10) / 10,
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
          distance_km: Math.round(recommendedStation.dist_from_route * 10) / 10,
        }
      : null,
    tips: [
      `Refuel at ${recommendedStation?.name || "the cheapest nearby station"} to save ₱${Math.round(potentialSavings)}`,
      `Maintaining 60 km/h average speed reduces fuel use by ~12%`,
      roadDistanceKm > 20
        ? "Long trip: consider topping up before departure"
        : "Short trip: half a tank is sufficient",
    ],
  });
});
 
module.exports = router;