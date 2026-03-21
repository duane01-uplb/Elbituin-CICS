// FuelBridge API utility — all backend calls go through here

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * Fetches all fuel stations with optional filtering
 * @param {Object} params - { fuelType, city, brand }
 */
export async function fetchFuelPrices(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/api/fuel-prices${query ? `?${query}` : ""}`);
  if (!res.ok) throw new Error("Failed to fetch fuel prices");
  return res.json();
}

/**
 * Get route + fuel cost estimate
 * @param {Object} payload - { startLat, startLng, endLat, endLng, vehicleType }
 */
export async function fetchRoute(payload) {
  const res = await fetch(`${API_BASE}/api/route`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to calculate route");
  return res.json();
}

/**
 * Send a message to the AI assistant
 * @param {string} message - User's message
 */
export async function sendChatMessage(message) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error("Chat request failed");
  return res.json();
}

/**
 * Get wallet/savings data
 */
export async function fetchWallet() {
  const res = await fetch(`${API_BASE}/api/wallet`);
  if (!res.ok) throw new Error("Failed to fetch wallet data");
  return res.json();
}

/**
 * Get leaderboard
 */
export async function fetchLeaderboard() {
  const res = await fetch(`${API_BASE}/api/wallet/leaderboard`);
  if (!res.ok) throw new Error("Failed to fetch leaderboard");
  return res.json();
}

/**
 * Format Philippine Peso
 */
export function formatPeso(amount) {
  return `₱${Number(amount).toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Get price category color class
 */
export function getPriceClass(category) {
  const map = { cheap: "text-cheap", medium: "text-medium", expensive: "text-expensive" };
  return map[category] || "text-medium";
}

/**
 * Get marker color based on price category
 */
export function getMarkerColor(category) {
  const map = { cheap: "#22C55E", medium: "#EAB308", expensive: "#EF4444" };
  return map[category] || "#EAB308";
}
