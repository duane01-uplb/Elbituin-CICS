const express = require("express");
const router = express.Router();
const { fetchStationsFromOverpass } = require("../services/overpassService");
const fallbackStations = require("../data/stations");

// ── Fuel consumption rates in L/100km (realistic PH values) ────────────────
const VEHICLE_CONSUMPTION = {
  tricycle:     4.5,   // small 2-stroke/4-stroke engine
  jeepney:      12.0,  // diesel jeepney
  motorcycle:   3.2,   // standard motorcycle
  delivery_van: 10.0,  // light delivery van
  default:      8.0,
};

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
  const mid = routeCoords[Math.floor(routeCoords.length / 2)];
  const scored = stations
    .filter((s) => s.is_open && s.prices?.[fuelType])
    .map((s) => {
      const dist  = haversineDistance(mid[1], mid[0], s.lat, s.lng);
      const price = s.prices[fuelType];
      return { ...s, dist_from_route: dist, score: dist * 0.6 + price * 0.4 };
    })
    .sort((a, b) => a.score - b.score);
  return scored[0] || null;
}

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

// ── POST /api/route ─────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const {
    startLat, startLng, endLat, endLng,
    vehicleType = "default",
    fuelType    = "gas91",
  } = req.body;

  if (!startLat || !startLng || !endLat || !endLng) {
    return res.status(400).json({
      success: false,
      message: "Missing required coordinates: startLat, startLng, endLat, endLng",
    });
  }

  // ── Fetch stations ──────────────────────────────────────────────────────
  let stations;
  try {
    stations = await fetchStationsFromOverpass();
  } catch {
    stations = fallbackStations;
  }

  // ── Fetch real road route from OSRM ────────────────────────────────────
  let routeCoords    = null;
  let roadDistanceKm = null;
  let durationSeconds = null;

  try {
    const osrmUrl = `${OSRM_BASE}/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=polyline`;
    const osrmRes = await fetch(osrmUrl, { signal: AbortSignal.timeout(10000) });

    if (osrmRes.ok) {
      const osrmData = await osrmRes.json();
      if (osrmData.code === "Ok" && osrmData.routes?.[0]) {
        const route    = osrmData.routes[0];
        roadDistanceKm  = route.distance / 1000;          // metres → km
        durationSeconds = route.duration;
        routeCoords     = decodePolyline(route.geometry);
      }
    }
  } catch (err) {
    console.warn("[OSRM] Failed to fetch road route:", err.message);
  }

  // Straight-line fallback (×1.3 road-factor)
  if (!routeCoords) {
    const straightLineKm = haversineDistance(
      parseFloat(startLat), parseFloat(startLng),
      parseFloat(endLat),   parseFloat(endLng)
    );
    roadDistanceKm  = straightLineKm * 1.3;
    durationSeconds = (roadDistanceKm / 30) * 3600;
    routeCoords = [
      [parseFloat(startLng), parseFloat(startLat)],
      [parseFloat(endLng),   parseFloat(endLat)],
    ];
  }

  // ── Fuel calculation using the correct formula ──────────────────────────
  //
  //   consumption_rate  = L per 100 km  (e.g. 4.5 for tricycle)
  //   liters_per_km     = consumption_rate / 100
  //   fuel_needed       = liters_per_km × distance_km
  //                     = (consumption_rate / 100) × distance_km
  //
  const consumptionRate = VEHICLE_CONSUMPTION[vehicleType] ?? VEHICLE_CONSUMPTION.default;
  const litersPerKm     = consumptionRate / 100;
  const fuelNeeded      = litersPerKm * roadDistanceKm;   // exact liters for this trip

  // Best available price along route
  const openStations = stations.filter((s) => s.is_open && s.prices?.[fuelType]);
  const recommendedStation = findStationAlongRoute(routeCoords, fuelType, stations);

  const cheapestPrice = recommendedStation?.prices[fuelType]
    ?? Math.min(...openStations.map((s) => s.prices[fuelType]).filter(Boolean));

  // Average market price (for savings comparison)
  const prices    = openStations.map((s) => s.prices[fuelType]).filter(Boolean);
  const avgPrice  = prices.length
    ? prices.reduce((a, b) => a + b, 0) / prices.length
    : cheapestPrice * 1.05;

  // Core cost using cheapest available station
  const estimatedCost    = fuelNeeded * cheapestPrice;   // ₱
  const costAtAvgPrice   = fuelNeeded * avgPrice;
  const potentialSavings = Math.max(0, costAtAvgPrice - estimatedCost);

  const waypoints        = routeCoords.map(([lng, lat]) => ({ lat, lng }));
  const estimatedMinutes = Math.round(durationSeconds / 60);

  // ── Breakdown object (sent to frontend for display) ─────────────────────
  const fuelBreakdown = {
    consumption_rate_l_per_100km: consumptionRate,
    liters_per_km:                Math.round(litersPerKm * 10000) / 10000,  // 4 dp
    distance_km:                  Math.round(roadDistanceKm * 10) / 10,
    fuel_needed_liters:           Math.round(fuelNeeded * 100) / 100,       // 2 dp
    price_per_liter:              cheapestPrice,
    estimated_cost_php:           Math.round(estimatedCost * 100) / 100,
  };

  res.json({
    success: true,
    route: {
      distance_km:          Math.round(roadDistanceKm * 10) / 10,
      estimated_minutes:    estimatedMinutes,
      fuel_needed_liters:   Math.round(fuelNeeded * 100) / 100,
      estimated_cost_php:   Math.round(estimatedCost),
      potential_savings_php: Math.round(potentialSavings),
      waypoints,
      vehicle_type:         vehicleType,
      fuel_type:            fuelType,
      fuel_breakdown:       fuelBreakdown,
    },
    recommended_station: recommendedStation
      ? {
          id:          recommendedStation.id,
          name:        recommendedStation.name,
          lat:         recommendedStation.lat,
          lng:         recommendedStation.lng,
          price:       recommendedStation.prices[fuelType],
          distance_km: Math.round(recommendedStation.dist_from_route * 10) / 10,
        }
      : null,
    tips: [
      `Refuel at ${recommendedStation?.name || "the cheapest nearby station"} — saves ₱${Math.round(potentialSavings)} vs avg market price`,
      `Formula used: (${consumptionRate} L/100km ÷ 100) × ${Math.round(roadDistanceKm * 10) / 10} km = ${Math.round(fuelNeeded * 100) / 100} L needed`,
      roadDistanceKm > 20
        ? "Long trip: consider topping up before departure"
        : "Short trip: half a tank is sufficient",
      "Maintaining 60 km/h average speed reduces fuel use by ~12%",
    ],
  });
});

module.exports = router;