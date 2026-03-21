import { useState, useEffect, useRef } from "react";
import { fetchRoute, formatPeso } from "../lib/api";
import styles from "./RouteOptimizer.module.css";

// Philippine landmark shortcuts for demo
const QUICK_LOCATIONS = [
  { label: "Laguna Techno Park", lat: 14.2683, lng: 121.1447 },
  { label: "Alabang Town Center", lat: 14.4195, lng: 121.0344 },
  { label: "SM Calamba", lat: 14.2135, lng: 121.1647 },
  { label: "EDSA-Taft (LRT)", lat: 14.5533, lng: 120.9988 },
  { label: "SM Sta. Rosa", lat: 14.3125, lng: 121.0847 },
  { label: "UP Los Baños", lat: 14.1660, lng: 121.2430 },
];

const VEHICLE_TYPES = [
  { value: "tricycle", label: "🛺 Tricycle", consumption: "4.5 L/100km" },
  { value: "jeepney", label: "🚌 Jeepney", consumption: "12 L/100km" },
  { value: "motorcycle", label: "🏍️ Motorcycle", consumption: "3.2 L/100km" },
  { value: "delivery_van", label: "🚐 Delivery Van", consumption: "10 L/100km" },
];

let L;

export default function RouteOptimizer() {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const routeLayerRef = useRef(null);
  const markerGroupRef = useRef(null);

  const [startCoords, setStartCoords] = useState({ lat: "", lng: "", label: "" });
  const [endCoords, setEndCoords] = useState({ lat: "", lng: "", label: "" });
  const [vehicleType, setVehicleType] = useState("tricycle");
  const [fuelType, setFuelType] = useState("gas91");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pickMode, setPickMode] = useState(null); // 'start' | 'end' | null

  // Init Leaflet map
  useEffect(() => {
    if (typeof window === "undefined" || leafletMap.current) return;

    async function initMap() {
      L = (await import("leaflet")).default;

      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      leafletMap.current = L.map(mapRef.current, {
        center: [14.3800, 121.0800],
        zoom: 10,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(leafletMap.current);

      markerGroupRef.current = L.layerGroup().addTo(leafletMap.current);

      // Click to pick location
      leafletMap.current.on("click", (e) => {
        if (!pickMode) return;
        const coords = { lat: e.latlng.lat.toFixed(5), lng: e.latlng.lng.toFixed(5), label: "Custom location" };
        if (pickMode === "start") setStartCoords(coords);
        else setEndCoords(coords);
        setPickMode(null);
      });
    }

    initMap();

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  // Update pick mode cursor
  useEffect(() => {
    if (!leafletMap.current) return;
    leafletMap.current.getContainer().style.cursor = pickMode ? "crosshair" : "";
  }, [pickMode]);

  // Draw route when result changes
  useEffect(() => {
    if (!leafletMap.current || !result || !L) return;

    // Clear previous route
    if (routeLayerRef.current) routeLayerRef.current.remove();
    markerGroupRef.current.clearLayers();

    const { waypoints } = result.route;
    const latlngs = waypoints.map((wp) => [wp.lat, wp.lng]);

    // Draw polyline
    routeLayerRef.current = L.polyline(latlngs, {
      color: "#F97316",
      weight: 5,
      opacity: 0.85,
      dashArray: null,
    }).addTo(leafletMap.current);

    // Start marker (green)
    const startIcon = L.divIcon({
      html: `<div style="width:16px;height:16px;background:#22C55E;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      className: "",
    });
    L.marker(latlngs[0], { icon: startIcon })
      .bindTooltip("📍 Start")
      .addTo(markerGroupRef.current);

    // End marker (red)
    const endIcon = L.divIcon({
      html: `<div style="width:16px;height:16px;background:#EF4444;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      className: "",
    });
    L.marker(latlngs[latlngs.length - 1], { icon: endIcon })
      .bindTooltip("🏁 Destination")
      .addTo(markerGroupRef.current);

    // Recommended station marker
    if (result.recommended_station) {
      const stationIcon = L.divIcon({
        html: `<div style="width:20px;height:20px;background:#F97316;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(249,115,22,0.5);display:flex;align-items:center;justify-content:center;font-size:10px">⛽</div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        className: "",
      });
      L.marker(
        [result.recommended_station.lat, result.recommended_station.lng],
        { icon: stationIcon }
      )
        .bindTooltip(
          `⛽ ${result.recommended_station.name}<br>₱${result.recommended_station.price}/L`
        )
        .addTo(markerGroupRef.current);
    }

    // Fit bounds
    leafletMap.current.fitBounds(routeLayerRef.current.getBounds(), { padding: [40, 40] });
  }, [result]);

  async function handleOptimize(e) {
    e.preventDefault();
    if (!startCoords.lat || !endCoords.lat) {
      setError("Please select both a start and destination point.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await fetchRoute({
        startLat: startCoords.lat,
        startLng: startCoords.lng,
        endLat: endCoords.lat,
        endLng: endCoords.lng,
        vehicleType,
        fuelType,
      });
      setResult(data);
    } catch (e) {
      setError("Could not calculate route. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  function useQuickLocation(location, field) {
    const coords = { lat: location.lat, lng: location.lng, label: location.label };
    if (field === "start") setStartCoords(coords);
    else setEndCoords(coords);
  }

  return (
    <div className={styles.container}>
      {/* Form panel */}
      <div className={styles.panel}>
        <h2 className={styles.panelTitle}>Route Optimizer</h2>
        <p className={styles.panelSub}>Find the most fuel-efficient path and cheapest refueling stop.</p>

        <form onSubmit={handleOptimize} className={styles.form}>
          {/* Start location */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>📍 Start Location</label>
            <div className={styles.coordRow}>
              <div
                className={`${styles.coordDisplay} ${pickMode === "start" ? styles.picking : ""}`}
                onClick={() => setPickMode(pickMode === "start" ? null : "start")}
              >
                {startCoords.label
                  ? <><span className={styles.coordLabel}>{startCoords.label}</span><span className={styles.coordValue}>{startCoords.lat}, {startCoords.lng}</span></>
                  : <span className={styles.coordPlaceholder}>{pickMode === "start" ? "🎯 Click on the map..." : "Click to pick from map"}</span>
                }
              </div>
            </div>
            <div className={styles.quickBtns}>
              {QUICK_LOCATIONS.slice(0, 3).map((loc) => (
                <button key={loc.label} type="button" className={styles.quickBtn}
                  onClick={() => useQuickLocation(loc, "start")}>
                  {loc.label}
                </button>
              ))}
            </div>
          </div>

          {/* End location */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>🏁 Destination</label>
            <div className={styles.coordRow}>
              <div
                className={`${styles.coordDisplay} ${pickMode === "end" ? styles.picking : ""}`}
                onClick={() => setPickMode(pickMode === "end" ? null : "end")}
              >
                {endCoords.label
                  ? <><span className={styles.coordLabel}>{endCoords.label}</span><span className={styles.coordValue}>{endCoords.lat}, {endCoords.lng}</span></>
                  : <span className={styles.coordPlaceholder}>{pickMode === "end" ? "🎯 Click on the map..." : "Click to pick from map"}</span>
                }
              </div>
            </div>
            <div className={styles.quickBtns}>
              {QUICK_LOCATIONS.slice(3, 6).map((loc) => (
                <button key={loc.label} type="button" className={styles.quickBtn}
                  onClick={() => useQuickLocation(loc, "end")}>
                  {loc.label}
                </button>
              ))}
            </div>
          </div>

          {/* Vehicle type */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>🚗 Vehicle Type</label>
            <div className={styles.vehicleGrid}>
              {VEHICLE_TYPES.map((v) => (
                <button key={v.value} type="button"
                  onClick={() => setVehicleType(v.value)}
                  className={`${styles.vehicleBtn} ${vehicleType === v.value ? styles.vehicleBtnActive : ""}`}>
                  <span className={styles.vehicleLabel}>{v.label}</span>
                  <span className={styles.vehicleConsumption}>{v.consumption}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Fuel type */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>⛽ Fuel Type</label>
            <div className={styles.fuelRow}>
              {[{ v: "gas91", l: "Gas 91" }, { v: "gas95", l: "Gas 95" }, { v: "diesel", l: "Diesel" }].map((ft) => (
                <button key={ft.v} type="button"
                  className={`${styles.fuelBtn} ${fuelType === ft.v ? styles.fuelBtnActive : ""}`}
                  onClick={() => setFuelType(ft.v)}>
                  {ft.l}
                </button>
              ))}
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? <><span className="spinner" /> Calculating...</> : "⚡ Optimize Route"}
          </button>
        </form>

        {/* Result summary */}
        {result && (
          <div className={styles.result + " animate-fadeIn"}>
            <div className={styles.resultTitle}>Route Summary</div>
            <div className={styles.statsGrid}>
              <div className={styles.stat}>
                <span className={styles.statValue}>{result.route.distance_km} km</span>
                <span className={styles.statLabel}>Distance</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>{result.route.estimated_minutes} min</span>
                <span className={styles.statLabel}>Est. Travel Time</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>{result.route.fuel_needed_liters}L</span>
                <span className={styles.statLabel}>Fuel Needed</span>
              </div>
              <div className={styles.stat + " " + styles.statHighlight}>
                <span className={styles.statValue}>{formatPeso(result.route.estimated_cost_php)}</span>
                <span className={styles.statLabel}>Est. Fuel Cost</span>
              </div>
            </div>

            {result.recommended_station && (
              <div className={styles.stationRec}>
                <span className={styles.stationRecIcon}>⛽</span>
                <div>
                  <div className={styles.stationRecName}>{result.recommended_station.name}</div>
                  <div className={styles.stationRecDetail}>
                    ₱{result.recommended_station.price}/L · {result.recommended_station.distance_km} km from route
                  </div>
                </div>
                <span className={styles.savingsPill}>Save {formatPeso(result.route.potential_savings_php)}</span>
              </div>
            )}

            <div className={styles.tips}>
              {result.tips.map((tip, i) => (
                <div key={i} className={styles.tip}>💡 {tip}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Map */}
      <div className={styles.mapWrapper}>
        {pickMode && (
          <div className={styles.pickBanner}>
            🎯 Click anywhere on the map to set your {pickMode === "start" ? "start" : "destination"} point
            <button className={styles.cancelPick} onClick={() => setPickMode(null)}>Cancel</button>
          </div>
        )}
        <div ref={mapRef} className={styles.map} />
      </div>
    </div>
  );
}
