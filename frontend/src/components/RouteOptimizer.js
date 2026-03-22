import { useState, useEffect, useRef } from "react";
import { fetchRoute, formatPeso } from "../lib/api";
import styles from "./RouteOptimizer.module.css";

const QUICK_LOCATIONS = [
  { label: "Laguna Techno Park", lat: 14.2683, lng: 121.1447 },
  { label: "Alabang Town Center", lat: 14.4195, lng: 121.0344 },
  { label: "SM Calamba",          lat: 14.2135, lng: 121.1647 },
  { label: "EDSA-Taft (LRT)",     lat: 14.5533, lng: 120.9988 },
  { label: "SM Sta. Rosa",        lat: 14.3125, lng: 121.0847 },
  { label: "UP Los Baños",        lat: 14.1660, lng: 121.2430 },
];

const VEHICLE_TYPES = [
  { value: "tricycle",     label: "🛺 Tricycle",     consumption: "4.5 L/100km" },
  { value: "jeepney",      label: "🚌 Jeepney",      consumption: "12 L/100km"  },
  { value: "motorcycle",   label: "🏍️ Motorcycle",   consumption: "3.2 L/100km" },
  { value: "delivery_van", label: "🚐 Delivery Van", consumption: "10 L/100km"  },
];

const MAP_STYLE          = "https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json";
const MAP_STYLE_FALLBACK = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const MAP_CENTER         = [121.0603, 14.3800];
const MAP_ZOOM           = 10;

function drawPin(fillColor, strokeColor, size = 2) {
  const W = 40 * size, H = 58 * size;
  const cx = W / 2, r = 14 * size, cy = r + 3 * size, tipY = H - size;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  ctx.shadowColor = "rgba(0,0,0,0.65)";
  ctx.shadowBlur = 7 * size;
  ctx.shadowOffsetX = size; ctx.shadowOffsetY = 4 * size;

  const sw = 5.5 * size;
  ctx.beginPath();
  ctx.moveTo(cx - sw, cy + r * 0.65);
  ctx.lineTo(cx, tipY);
  ctx.lineTo(cx + sw, cy + r * 0.65);
  ctx.arc(cx, cy, r, Math.PI * 0.74, Math.PI * 0.26, true);
  ctx.closePath();
  const sg = ctx.createLinearGradient(cx, cy, cx, tipY);
  sg.addColorStop(0, fillColor); sg.addColorStop(1, strokeColor);
  ctx.fillStyle = sg; ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  const rg = ctx.createRadialGradient(cx - r*0.32, cy - r*0.32, r*0.04, cx, cy, r);
  rg.addColorStop(0, lighten(fillColor, 0.5));
  rg.addColorStop(0.4, fillColor);
  rg.addColorStop(1, strokeColor);
  ctx.fillStyle = rg; ctx.fill();
  ctx.strokeStyle = strokeColor; ctx.lineWidth = 1.5 * size; ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx - r*0.30, cy - r*0.30, r*0.22, r*0.14, -Math.PI/4, 0, Math.PI*2);
  ctx.fillStyle = "rgba(255,255,255,0.50)"; ctx.fill();

  ctx.beginPath(); ctx.arc(cx, cy, r*0.26, 0, Math.PI*2);
  ctx.fillStyle = "rgba(255,255,255,0.80)"; ctx.fill();

  return { data: ctx.getImageData(0, 0, W, H), width: W, height: H };
}

function lighten(hex, amt) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, (n >> 16) + Math.round(255 * amt));
  const g = Math.min(255, ((n >> 8) & 0xff) + Math.round(255 * amt));
  const b = Math.min(255, (n & 0xff) + Math.round(255 * amt));
  return `rgb(${r},${g},${b})`;
}

const PIN_COLORS = {
  start:   { fill: "#22C55E", stroke: "#15803d" },
  end:     { fill: "#FF4757", stroke: "#c40013" },
  station: { fill: "#F97316", stroke: "#c2570e" },
};

export default function RouteOptimizer() {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const mlRef        = useRef(null);
  const pickModeRef  = useRef(null);

  const [startCoords, setStartCoords] = useState({ lat: "", lng: "", label: "" });
  const [endCoords,   setEndCoords]   = useState({ lat: "", lng: "", label: "" });
  const [vehicleType, setVehicleType] = useState("tricycle");
  const [fuelType,    setFuelType]    = useState("gas91");
  const [result,      setResult]      = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [pickMode,    setPickMode]    = useState(null);
  const [mapReady,    setMapReady]    = useState(false);

  function updatePickMode(val) {
    pickModeRef.current = val;
    setPickMode(val);
  }

  function registerPins(map) {
    const isMobile = window.innerWidth < 768;
    const sz = isMobile ? 1.5 : 2;
    Object.entries(PIN_COLORS).forEach(([name, c]) => {
      if (!map.hasImage(`route-pin-${name}`)) {
        const img = drawPin(c.fill, c.stroke, sz);
        map.addImage(`route-pin-${name}`, { width: img.width, height: img.height, data: img.data.data });
      }
    });
  }

  useEffect(() => {
    if (typeof window === "undefined" || mapRef.current) return;
    let cancelled = false;

    async function initMap() {
      let ml;
      try {
        const mod = await import("maplibre-gl");
        ml = mod.default ?? mod;
      } catch { return; }
      if (cancelled || !containerRef.current) return;
      mlRef.current = ml;

      const isMobile = window.innerWidth < 768;
      const map = new ml.Map({
        container:    containerRef.current,
        style:        MAP_STYLE,
        center:       MAP_CENTER,
        zoom:         MAP_ZOOM,
        pitch:        isMobile ? 0 : 40,
        bearing:      -8,
        antialias:    !isMobile,
        fadeDuration: 120,
      });
      mapRef.current = map;

      map.on("error", (e) => {
        const msg = String(e?.error?.message ?? "");
        if (!map._loaded && (msg.includes("style")||msg.includes("404")||msg.includes("Failed"))) {
          try { map.setStyle(MAP_STYLE_FALLBACK); } catch {}
        }
      });

      map.on("style.load", () => {
        if (cancelled) return;
        registerPins(map);

        if (!map.getSource("route-line")) {
          map.addSource("route-line", {
            type: "geojson",
            data: { type: "Feature", geometry: { type: "LineString", coordinates: [] } },
          });
          map.addLayer({ id: "route-glow", type: "line", source: "route-line",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": "#F97316", "line-width": 10, "line-opacity": 0.25, "line-blur": 4 },
          });
          map.addLayer({ id: "route-solid", type: "line", source: "route-line",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": "#F97316", "line-width": 4, "line-opacity": 0.9 },
          });
        }

        if (!map.getSource("route-markers")) {
          map.addSource("route-markers", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
          map.addLayer({
            id: "route-marker-pins", type: "symbol", source: "route-markers",
            layout: {
              "icon-image":            ["get", "icon"],
              "icon-size":             isMobile ? 0.45 : 0.55,
              "icon-anchor":           "bottom",
              "icon-allow-overlap":    true,
              "icon-ignore-placement": true,
              "text-field":            ["get", "label"],
              "text-font":             ["Open Sans Bold", "Arial Unicode MS Bold"],
              "text-size":             12,
              "text-anchor":           "top",
              "text-offset":           [0, 0.3],
              "text-allow-overlap":    true,
              "text-optional":         true,
            },
            paint: {
              "text-color":      "#EDF0F7",
              "text-halo-color": "rgba(8,11,16,0.9)",
              "text-halo-width": 2,
            },
          });
        }
        setMapReady(true);
      });

      map.on("click", (e) => {
        if (!pickModeRef.current) return;
        const coords = {
          lat: e.lngLat.lat.toFixed(5),
          lng: e.lngLat.lng.toFixed(5),
          label: "Custom location",
        };
        if (pickModeRef.current === "start") setStartCoords(coords);
        else setEndCoords(coords);
        updatePickMode(null);
      });

      map.addControl(new ml.NavigationControl({ showCompass: !isMobile, visualizePitch: true }), "top-right");
      if (!isMobile) map.addControl(new ml.ScaleControl({ maxWidth: 80, unit: "metric" }), "bottom-right");
    }

    initMap();
    return () => {
      cancelled = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.getCanvas().style.cursor = pickMode ? "crosshair" : "";
  }, [pickMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !result) return;

    const coords = result.route.waypoints.map((wp) => [wp.lng, wp.lat]);
    const lineSrc = map.getSource("route-line");
    if (lineSrc) lineSrc.setData({ type: "Feature", geometry: { type: "LineString", coordinates: coords } });

    const features = [
      { type: "Feature", geometry: { type: "Point", coordinates: coords[0] },
        properties: { icon: "route-pin-start", label: "Start" } },
      { type: "Feature", geometry: { type: "Point", coordinates: coords[coords.length - 1] },
        properties: { icon: "route-pin-end", label: "End" } },
    ];
    if (result.recommended_station) {
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [result.recommended_station.lng, result.recommended_station.lat] },
        properties: { icon: "route-pin-station", label: `⛽ ₱${result.recommended_station.price}/L` },
      });
    }
    const markerSrc = map.getSource("route-markers");
    if (markerSrc) markerSrc.setData({ type: "FeatureCollection", features });

    if (coords.length > 1) {
      const lngs = coords.map((c) => c[0]);
      const lats  = coords.map((c) => c[1]);
      map.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: 60, duration: 800, pitch: 40 }
      );
    }
  }, [result, mapReady]);

  async function handleOptimize(e) {
    e.preventDefault();
    if (!startCoords.lat || !endCoords.lat) {
      setError("Please select both a start and destination point.");
      return;
    }
    setLoading(true); setError(null); setResult(null);
    try {
      const data = await fetchRoute({
        startLat: startCoords.lat, startLng: startCoords.lng,
        endLat:   endCoords.lat,   endLng:   endCoords.lng,
        vehicleType, fuelType,
      });
      setResult(data);
    } catch {
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

  const bd = result?.route?.fuel_breakdown;

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <h2 className={styles.panelTitle}>Route Optimizer</h2>
        <p className={styles.panelSub}>Find the most fuel-efficient path and cheapest refueling stop.</p>

        <form onSubmit={handleOptimize} className={styles.form}>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>📍 Start Location</label>
            <div className={`${styles.coordDisplay} ${pickMode === "start" ? styles.picking : ""}`}
              onClick={() => updatePickMode(pickMode === "start" ? null : "start")}>
              {startCoords.label
                ? <><span className={styles.coordLabel}>{startCoords.label}</span>
                    <span className={styles.coordValue}>{startCoords.lat}, {startCoords.lng}</span></>
                : <span className={styles.coordPlaceholder}>
                    {pickMode === "start" ? "🎯 Click on the map..." : "Click to pick from map"}
                  </span>}
            </div>
            <div className={styles.quickBtns}>
              {QUICK_LOCATIONS.slice(0, 3).map((loc) => (
                <button key={loc.label} type="button" className={styles.quickBtn}
                  onClick={() => useQuickLocation(loc, "start")}>{loc.label}</button>
              ))}
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>🏁 Destination</label>
            <div className={`${styles.coordDisplay} ${pickMode === "end" ? styles.picking : ""}`}
              onClick={() => updatePickMode(pickMode === "end" ? null : "end")}>
              {endCoords.label
                ? <><span className={styles.coordLabel}>{endCoords.label}</span>
                    <span className={styles.coordValue}>{endCoords.lat}, {endCoords.lng}</span></>
                : <span className={styles.coordPlaceholder}>
                    {pickMode === "end" ? "🎯 Click on the map..." : "Click to pick from map"}
                  </span>}
            </div>
            <div className={styles.quickBtns}>
              {QUICK_LOCATIONS.slice(3, 6).map((loc) => (
                <button key={loc.label} type="button" className={styles.quickBtn}
                  onClick={() => useQuickLocation(loc, "end")}>{loc.label}</button>
              ))}
            </div>
          </div>

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

          <div className={styles.fieldGroup}>
            <label className={styles.label}>⛽ Fuel Type</label>
            <div className={styles.fuelRow}>
              {[{ v: "gas91", l: "Gas 91" }, { v: "gas95", l: "Gas 95" }, { v: "diesel", l: "Diesel" }].map((ft) => (
                <button key={ft.v} type="button"
                  className={`${styles.fuelBtn} ${fuelType === ft.v ? styles.fuelBtnActive : ""}`}
                  onClick={() => setFuelType(ft.v)}>{ft.l}</button>
              ))}
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? <><span className="spinner" /> Calculating...</> : "⚡ Optimize Route"}
          </button>
        </form>

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
                <span className={styles.statValue}>{result.route.fuel_needed_liters} L</span>
                <span className={styles.statLabel}>Fuel Needed</span>
              </div>
              <div className={`${styles.stat} ${styles.statHighlight}`}>
                <span className={styles.statValue}>{formatPeso(result.route.estimated_cost_php)}</span>
                <span className={styles.statLabel}>Est. Fuel Cost</span>
              </div>
            </div>

            {/* ── Calculation breakdown ── */}
            {bd && (
              <div className={styles.breakdown}>
                <div className={styles.breakdownTitle}>How this was calculated</div>
                <div className={styles.breakdownStep}>
                  <span className={styles.breakdownNum}>1</span>
                  <div className={styles.breakdownText}>
                    <span className={styles.breakdownMuted}>L/100km ÷ 100 = L/km</span>
                    <span className={styles.breakdownEq}>
                      {bd.consumption_rate_l_per_100km} ÷ 100 = <strong>{bd.liters_per_km} L/km</strong>
                    </span>
                  </div>
                </div>
                <div className={styles.breakdownStep}>
                  <span className={styles.breakdownNum}>2</span>
                  <div className={styles.breakdownText}>
                    <span className={styles.breakdownMuted}>L/km × distance = liters needed</span>
                    <span className={styles.breakdownEq}>
                      {bd.liters_per_km} × {bd.distance_km} km = <strong>{bd.fuel_needed_liters} L</strong>
                    </span>
                  </div>
                </div>
                <div className={styles.breakdownStep}>
                  <span className={styles.breakdownNum}>3</span>
                  <div className={styles.breakdownText}>
                    <span className={styles.breakdownMuted}>liters × ₱/L = estimated cost</span>
                    <span className={styles.breakdownEq}>
                      {bd.fuel_needed_liters} L × ₱{bd.price_per_liter} = <strong className={styles.breakdownFinal}>{formatPeso(bd.estimated_cost_php)}</strong>
                    </span>
                  </div>
                </div>
              </div>
            )}

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

      {/* ── Map ── */}
      <div className={styles.mapWrapper}>
        {pickMode && (
          <div className={styles.pickBanner}>
            🎯 Click anywhere on the map to set your {pickMode === "start" ? "start" : "destination"} point
            <button className={styles.cancelPick} onClick={() => updatePickMode(null)}>Cancel</button>
          </div>
        )}
        {!mapReady && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 500,
            background: "rgba(8,11,16,0.88)",
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 12, color: "rgba(255,255,255,0.5)",
            fontSize: "0.86rem", fontFamily: "var(--font-body)",
          }}>
            <span className="spinner" /> Initialising 3D map…
          </div>
        )}
        <div ref={containerRef} className={styles.map} />
        <div className={styles.legend}>
          <div className={styles.legendTitle}>Route Markers</div>
          {[
            { color: "#22C55E", label: "Start"        },
            { color: "#FF4757", label: "End"          },
            { color: "#F97316", label: "Best Station" },
          ].map((item) => (
            <div key={item.label} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: item.color }} />
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}