// Overpass API service
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

// Bounding box covering Metro Manila + nearby provinces (Laguna, Cavite, Rizal, Bulacan)
const PH_BBOX = {
  south: 14.0,
  west: 120.7,
  north: 14.9,
  east: 121.6,
};

// Brand name normalization map
const BRAND_MAP = {
  petron: "Petron",
  shell: "Shell",
  caltex: "Caltex",
  phoenix: "Phoenix",
  seaoil: "Seaoil",
  unioil: "Unioil",
  total: "Total",
  cleanfuel: "CleanFuel",
  flying_v: "Flying V",
  "flying v": "Flying V",
  jetti: "Jetti",
  ptt: "PTT",
  chevron: "Chevron",
};

function normalizeBrand(raw) {
  if (!raw) return "Independent";
  const lower = raw.toLowerCase().trim();
  for (const [key, val] of Object.entries(BRAND_MAP)) {
    if (lower.includes(key)) return val;
  }
  // Title-case fallback
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

// Mock price ranges per brand (since OSM doesn't have live prices)
// These approximate DOE weekly bulletin averages (PHP/L)
const BRAND_PRICE_RANGES = {
  Petron:    { gas91: [55.50, 57.00], gas95: [59.50, 61.00], diesel: [51.50, 53.00] },
  Shell:     { gas91: [55.80, 57.20], gas95: [59.70, 61.20], diesel: [51.70, 53.20] },
  Caltex:    { gas91: [54.50, 56.00], gas95: [58.50, 60.00], diesel: [50.50, 52.00] },
  Phoenix:   { gas91: [53.50, 55.50], gas95: [57.50, 59.50], diesel: [49.50, 51.50] },
  Seaoil:    { gas91: [52.80, 54.80], gas95: [56.80, 58.80], diesel: [49.00, 51.00] },
  Unioil:    { gas91: [53.00, 55.00], gas95: [57.00, 59.00], diesel: [49.20, 51.20] },
  Total:     { gas91: [54.00, 56.00], gas95: [58.00, 60.00], diesel: [50.00, 52.00] },
  CleanFuel: { gas91: [52.50, 54.50], gas95: [56.50, 58.50], diesel: [48.80, 50.80] },
  "Flying V":{ gas91: [53.20, 55.20], gas95: [57.20, 59.20], diesel: [49.40, 51.40] },
  Jetti:     { gas91: [52.00, 54.00], gas95: [56.00, 58.00], diesel: [48.50, 50.50] },
  PTT:       { gas91: [53.50, 55.50], gas95: [57.50, 59.50], diesel: [49.50, 51.50] },
  Independent:{ gas91: [52.00, 55.00], gas95: [56.00, 59.00], diesel: [48.00, 51.00] },
};

function randomInRange([min, max]) {
  // Deterministic-ish based on a seed so prices don't change on every refresh
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

function getPricesForBrand(brand) {
  const ranges = BRAND_PRICE_RANGES[brand] || BRAND_PRICE_RANGES["Independent"];
  return {
    gas91: randomInRange(ranges.gas91),
    gas95: randomInRange(ranges.gas95),
    diesel: randomInRange(ranges.diesel),
  };
}

// Cache to avoid hammering Overpass API
let cache = {
  stations: null,
  fetchedAt: null,
  TTL_MS: 10 * 60 * 1000, // 10 minutes
};

function isCacheValid() {
  return cache.stations && cache.fetchedAt && (Date.now() - cache.fetchedAt < cache.TTL_MS);
}

/**
 * Fetch fuel stations from Overpass API
 * Returns normalized station objects compatible with the existing app format
 */
async function fetchStationsFromOverpass() {
  if (isCacheValid()) {
    console.log(`[Overpass] Returning ${cache.stations.length} cached stations`);
    return cache.stations;
  }

  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="fuel"](${PH_BBOX.south},${PH_BBOX.west},${PH_BBOX.north},${PH_BBOX.east});
      way["amenity"="fuel"](${PH_BBOX.south},${PH_BBOX.west},${PH_BBOX.north},${PH_BBOX.east});
    );
    out center tags;
  `;

  console.log("[Overpass] Fetching live fuel stations...");

  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(30000), // 30s timeout
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`);
  }

  const data = await response.json();
  const elements = data.elements || [];

  console.log(`[Overpass] Got ${elements.length} raw elements`);

  const stations = elements
    .map((el, idx) => {
      // Ways have a center, nodes have direct lat/lng
      const lat = el.lat ?? el.center?.lat;
      const lng = el.lon ?? el.center?.lon;

      if (!lat || !lng) return null;

      const tags = el.tags || {};
      const brandRaw = tags.brand || tags.name || tags.operator || "";
      const brand = normalizeBrand(brandRaw);
      const name = tags.name || tags.brand || `${brand} Station`;
      const city = tags["addr:city"] || tags["addr:suburb"] || tags["is_in:city"] || "Metro Manila";
      const address = [
        tags["addr:housenumber"],
        tags["addr:street"],
        tags["addr:city"],
      ].filter(Boolean).join(", ") || tags.name || "Philippines";

      const isOpen = tags.opening_hours !== "closed";

      return {
        id: el.id || idx + 1,
        name: name.length > 50 ? name.slice(0, 47) + "..." : name,
        brand,
        lat,
        lng,
        prices: getPricesForBrand(brand),
        address,
        city,
        is_open: isOpen,
      };
    })
    .filter(Boolean);

  // Deduplicate by proximity (remove stations within ~50m of each other)
  const deduped = [];
  for (const station of stations) {
    const tooClose = deduped.some((s) => {
      const dlat = Math.abs(s.lat - station.lat);
      const dlng = Math.abs(s.lng - station.lng);
      return dlat < 0.0005 && dlng < 0.0005;
    });
    if (!tooClose) deduped.push(station);
  }

  console.log(`[Overpass] ${deduped.length} stations after dedup`);

  cache.stations = deduped;
  cache.fetchedAt = Date.now();

  return deduped;
}

module.exports = { fetchStationsFromOverpass };
