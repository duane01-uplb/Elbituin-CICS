import { useEffect, useState, useRef } from "react";
import { fetchFuelPrices, formatPeso, getMarkerColor } from "../lib/api";
import styles from "./FuelMap.module.css";

// Leaflet must be dynamically imported (no SSR)
let L;

const FUEL_TYPES = [
  { value: "gas91", label: "Gas 91" },
  { value: "gas95", label: "Gas 95" },
  { value: "diesel", label: "Diesel" },
];

const BRAND_COLORS = {
  Petron: "#E63946",
  Shell: "#FFBE0B",
  Caltex: "#06D6A0",
  Phoenix: "#FF6B6B",
  Unioil: "#4CC9F0",
  Seaoil: "#7209B7",
};

export default function FuelMap({ onStationSelect }) {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markersRef = useRef([]);

  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fuelType, setFuelType] = useState("gas95");
  const [selectedStation, setSelectedStation] = useState(null);
  const [filter, setFilter] = useState("all"); // all | cheap | medium | expensive

  // Load fuel prices from backend
  useEffect(() => {
    loadStations();
  }, [fuelType]);

  async function loadStations() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFuelPrices({ fuelType });
      setStations(data.stations || []);
    } catch (e) {
      setError("Could not load fuel prices. Is the backend running?");
      // Fallback: use embedded mock data so map still renders
      setStations(getMockStations());
    } finally {
      setLoading(false);
    }
  }

  // Initialize Leaflet map
  useEffect(() => {
    if (typeof window === "undefined" || leafletMap.current) return;

    async function initMap() {
      L = (await import("leaflet")).default;

      // Fix default marker icons (common Next.js issue)
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      leafletMap.current = L.map(mapRef.current, {
        center: [14.4292, 121.0603],
        zoom: 10,
        zoomControl: true,
      });

      // OpenStreetMap tiles (free, no API key)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(leafletMap.current);
    }

    initMap();

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  // Update markers when stations or filter changes
  useEffect(() => {
    if (!leafletMap.current || !L || stations.length === 0) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const filtered =
      filter === "all"
        ? stations
        : stations.filter((s) => s.price_category === filter);

    filtered.forEach((station) => {
      const color = getMarkerColor(station.price_category);
      const price = station.display_price || station.prices?.[fuelType];

      // Custom circle marker
      const marker = L.circleMarker([station.lat, station.lng], {
        radius: 14,
        fillColor: color,
        color: "#fff",
        weight: 2.5,
        opacity: 1,
        fillOpacity: 0.9,
      });

      // Tooltip on hover
      marker.bindTooltip(
        `<div style="font-family:'DM Sans',sans-serif;padding:6px 8px;min-width:160px">
          <div style="font-weight:700;font-size:0.875rem;margin-bottom:2px">${station.name}</div>
          <div style="color:${color};font-weight:800;font-size:1rem">₱${price}/L</div>
          <div style="color:#64748B;font-size:0.75rem">${station.city} · ${station.brand}</div>
          ${!station.is_open ? '<div style="color:#ef4444;font-size:0.7rem;margin-top:2px">⚠ Closed</div>' : ""}
        </div>`,
        { permanent: false, direction: "top", offset: [0, -10] }
      );

      // Click to show details
      marker.on("click", () => {
        setSelectedStation(station);
        if (onStationSelect) onStationSelect(station);
      });

      marker.addTo(leafletMap.current);
      markersRef.current.push(marker);
    });
  }, [stations, filter, fuelType]);

  const filteredCount =
    filter === "all"
      ? stations.length
      : stations.filter((s) => s.price_category === filter).length;

  const cheapestStation = stations
    .filter((s) => s.is_open)
    .sort((a, b) => (a.display_price || 0) - (b.display_price || 0))[0];

  return (
    <div className={styles.container}>
      {/* Controls bar */}
      <div className={styles.controls}>
        <div className={styles.controlsLeft}>
          <div className={styles.fuelSelector}>
            {FUEL_TYPES.map((ft) => (
              <button
                key={ft.value}
                onClick={() => setFuelType(ft.value)}
                className={`${styles.fuelBtn} ${fuelType === ft.value ? styles.fuelBtnActive : ""}`}
              >
                {ft.label}
              </button>
            ))}
          </div>

          <div className={styles.filterBtns}>
            {["all", "cheap", "medium", "expensive"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`${styles.filterBtn} ${filter === f ? styles.filterBtnActive : ""} ${
                  f !== "all" ? styles[`filter_${f}`] : ""
                }`}
              >
                {f === "all" ? "All" : f === "cheap" ? "🟢 Cheap" : f === "medium" ? "🟡 Mid" : "🔴 Pricey"}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.controlsRight}>
          {cheapestStation && (
            <div className={styles.cheapestBadge}>
              <span className={styles.cheapestLabel}>Cheapest:</span>
              <span className={styles.cheapestName}>{cheapestStation.name.split(" - ")[1] || cheapestStation.city}</span>
              <span className={styles.cheapestPrice}>
                {formatPeso(cheapestStation.display_price)}/L
              </span>
            </div>
          )}
          <span className={styles.count}>{filteredCount} stations</span>
          {loading && <span className="spinner" />}
        </div>
      </div>

      {/* Map container */}
      <div className={styles.mapWrapper}>
        <div ref={mapRef} className={styles.map} />

        {/* Legend */}
        <div className={styles.legend}>
          <div className={styles.legendTitle}>Price Level</div>
          {[
            { color: "#22C55E", label: "Cheap" },
            { color: "#EAB308", label: "Average" },
            { color: "#EF4444", label: "Expensive" },
          ].map((item) => (
            <div key={item.label} className={styles.legendItem}>
              <span
                className={styles.legendDot}
                style={{ background: item.color }}
              />
              {item.label}
            </div>
          ))}
        </div>

        {/* Error banner */}
        {error && (
          <div className={styles.errorBanner}>
            ⚠ {error}
          </div>
        )}
      </div>

      {/* Station detail panel */}
      {selectedStation && (
        <div className={styles.detailPanel + " animate-fadeIn"}>
          <button
            className={styles.closeBtn}
            onClick={() => setSelectedStation(null)}
          >
            ✕
          </button>
          <div className={styles.detailBrand}
            style={{ color: BRAND_COLORS[selectedStation.brand] || "var(--fuel-orange)" }}>
            {selectedStation.brand}
          </div>
          <div className={styles.detailName}>{selectedStation.name}</div>
          <div className={styles.detailAddress}>{selectedStation.address}</div>

          <div className={styles.priceGrid}>
            {Object.entries(selectedStation.prices).map(([type, price]) => (
              <div
                key={type}
                className={`${styles.priceCard} ${type === fuelType ? styles.priceCardActive : ""}`}
              >
                <span className={styles.priceType}>
                  {type === "gas91" ? "Gas 91" : type === "gas95" ? "Gas 95" : "Diesel"}
                </span>
                <span className={styles.priceValue}>₱{price}</span>
                <span className={styles.priceUnit}>/L</span>
              </div>
            ))}
          </div>

          <div className={styles.detailMeta}>
            <span
              className={`badge ${
                selectedStation.price_category === "cheap"
                  ? "badge-cheap"
                  : selectedStation.price_category === "expensive"
                  ? "badge-expensive"
                  : "badge-medium"
              }`}
            >
              {selectedStation.price_category === "cheap"
                ? "✓ Best Price"
                : selectedStation.price_category === "expensive"
                ? "↑ Higher Price"
                : "≈ Average Price"}
            </span>
            <span className={`badge ${selectedStation.is_open ? "badge-cheap" : "badge-expensive"}`}>
              {selectedStation.is_open ? "● Open Now" : "● Closed"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Fallback mock data if backend is unreachable
function getMockStations() {
  return [
    { id: 1, name: "Petron - EDSA Magallanes", brand: "Petron", lat: 14.5547, lng: 121.0244, city: "Makati", prices: { gas91: 56.20, gas95: 60.15, diesel: 52.10 }, display_price: 60.15, price_category: "expensive", is_open: true, address: "EDSA cor. Magallanes Ave" },
    { id: 2, name: "Shell - Alabang", brand: "Shell", lat: 14.4195, lng: 121.0438, city: "Muntinlupa", prices: { gas91: 55.80, gas95: 59.75, diesel: 51.90 }, display_price: 59.75, price_category: "medium", is_open: true, address: "Alabang-Zapote Rd" },
    { id: 3, name: "Caltex - Laguna Blvd", brand: "Caltex", lat: 14.2717, lng: 121.4115, city: "Calamba", prices: { gas91: 54.50, gas95: 58.30, diesel: 50.75 }, display_price: 58.30, price_category: "medium", is_open: true, address: "National Hwy, Calamba" },
    { id: 4, name: "Phoenix - Sta. Rosa", brand: "Phoenix", lat: 14.2872, lng: 121.0862, city: "Sta. Rosa", prices: { gas91: 53.90, gas95: 57.80, diesel: 50.20 }, display_price: 57.80, price_category: "cheap", is_open: true, address: "Sta. Rosa-Tagaytay Rd" },
    { id: 5, name: "Seaoil - Los Baños", brand: "Seaoil", lat: 14.1665, lng: 121.2419, city: "Los Baños", prices: { gas91: 53.20, gas95: 56.95, diesel: 49.60 }, display_price: 56.95, price_category: "cheap", is_open: true, address: "National Hwy, Los Baños" },
  ];
}
