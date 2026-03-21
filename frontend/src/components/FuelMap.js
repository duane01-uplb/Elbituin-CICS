import { useEffect, useRef, useState, useCallback } from "react";
import { fetchFuelPrices, formatPeso, getMarkerColor } from "../lib/api";
import styles from "./FuelMap.module.css";

const FUEL_TYPES = [
  { value: "gas91", label: "Gas 91" },
  { value: "gas95", label: "Gas 95" },
  { value: "diesel", label: "Diesel" },
];

const PRICE_COLORS = {
  cheap:     { fill: "#00E5A0", glow: "rgba(0,229,160,0.6)",   hex: "#00E5A0" },
  medium:    { fill: "#FFD166", glow: "rgba(255,209,102,0.6)", hex: "#FFD166" },
  expensive: { fill: "#FF4757", glow: "rgba(255,71,87,0.6)",   hex: "#FF4757" },
};

// Custom dark fuel-themed MapLibre style (OpenFreeMap or CARTO dark)
const MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

// Metro Manila + Laguna center
const MAP_CENTER = [121.0603, 14.4292];
const MAP_ZOOM   = 10;
const MAP_PITCH  = 52;   // 3D tilt
const MAP_BEARING = -12; // slight rotation for drama

export default function FuelMap({ onStationSelect }) {
  const mapContainerRef = useRef(null);
  const mapRef          = useRef(null);
  const markersRef      = useRef([]);
  const popupRef        = useRef(null);
  const mlRef           = useRef(null); // maplibregl module

  const [stations,         setStations]         = useState([]);
  const [loading,          setLoading]           = useState(true);
  const [error,            setError]             = useState(null);
  const [fuelType,         setFuelType]          = useState("gas95");
  const [filter,           setFilter]            = useState("all");
  const [selectedStation,  setSelectedStation]   = useState(null);
  const [mapReady,         setMapReady]          = useState(false);

  /* ── Load station data ─────────────────────────────────────── */
  useEffect(() => {
    loadStations();
  }, [fuelType]);

  async function loadStations() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFuelPrices({ fuelType });
      setStations(data.stations || []);
    } catch {
      setError("Could not load fuel prices — using demo data.");
      setStations(getMockStations());
    } finally {
      setLoading(false);
    }
  }

  /* ── Init MapLibre GL ──────────────────────────────────────── */
  useEffect(() => {
    if (typeof window === "undefined" || mapRef.current) return;

    let cancelled = false;

    async function initMap() {
      // Dynamically import maplibre-gl
      let ml;
      try {
        ml = await import("maplibre-gl");
        // maplibre-gl exports default or named
        if (ml.default) ml = ml.default;
      } catch {
        setError("MapLibre GL failed to load — make sure maplibre-gl is installed.");
        setLoading(false);
        return;
      }

      if (cancelled || !mapContainerRef.current) return;
      mlRef.current = ml;

      const map = new ml.Map({
        container:  mapContainerRef.current,
        style:      MAP_STYLE,
        center:     MAP_CENTER,
        zoom:       MAP_ZOOM,
        pitch:      MAP_PITCH,
        bearing:    MAP_BEARING,
        antialias:  true,
        // Smooth scrolling
        scrollZoom: { around: "cursor" },
      });

      mapRef.current = map;

      map.on("load", () => {
        if (cancelled) return;

        /* ── 3D Building Extrusions ─────────────────────── */
        // Only add if the style has building data
        const layers = map.getStyle().layers;
        const labelLayer = layers.find(
          (l) => l.type === "symbol" && l.layout?.["text-field"]
        );

        if (map.getSource("composite") || map.getSource("openmaptiles")) {
          const buildingSource = map.getSource("composite") ? "composite" : "openmaptiles";
          map.addLayer(
            {
              id:     "3d-buildings",
              source: buildingSource,
              "source-layer": "building",
              filter: ["==", "extrude", "true"],
              type:   "fill-extrusion",
              minzoom: 12,
              paint: {
                "fill-extrusion-color":   "#1a1f2e",
                "fill-extrusion-height":  ["interpolate", ["linear"], ["zoom"], 12, 0, 14, ["get", "height"]],
                "fill-extrusion-base":    ["interpolate", ["linear"], ["zoom"], 12, 0, 14, ["get", "min_height"]],
                "fill-extrusion-opacity": 0.75,
              },
            },
            labelLayer?.id
          );
        }

        /* ── Atmospheric fog ────────────────────────────── */
        if (map.setFog) {
          map.setFog({
            color:            "rgba(10, 14, 22, 0.9)",
            "high-color":     "rgba(20, 28, 44, 0.8)",
            "horizon-blend":  0.06,
            "space-color":    "#050709",
            "star-intensity": 0.0,
          });
        }

        setMapReady(true);
      });

      map.addControl(
        new ml.NavigationControl({ showCompass: true, visualizePitch: true }),
        "top-right"
      );

      map.addControl(
        new ml.ScaleControl({ maxWidth: 100, unit: "metric" }),
        "bottom-right"
      );
    }

    initMap();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  /* ── Render custom 3D spike markers ───────────────────────── */
  const renderMarkers = useCallback(() => {
    const map = mapRef.current;
    const ml  = mlRef.current;
    if (!map || !ml || !mapReady) return;

    // Clear previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }

    const filtered = filter === "all"
      ? stations
      : stations.filter((s) => s.price_category === filter);

    filtered.forEach((station) => {
      const cat    = station.price_category || "medium";
      const colors = PRICE_COLORS[cat] || PRICE_COLORS.medium;
      const price  = station.display_price || station.prices?.[fuelType] || "—";

      // Build a rich custom marker element
      const el = document.createElement("div");
      el.className   = "fb-marker";
      el.style.cssText = `
        position: relative;
        cursor: pointer;
        width: 56px;
        transform-origin: bottom center;
        animation: markerRise 0.55s cubic-bezier(0.34,1.3,0.64,1) both;
        animation-delay: ${Math.random() * 0.3}s;
        filter: drop-shadow(0 6px 12px ${colors.glow});
        transition: filter 0.2s, transform 0.2s;
      `;

      el.innerHTML = `
        <style>
          @keyframes markerRise {
            from { transform: scaleY(0) translateY(20px); opacity:0; }
            to   { transform: scaleY(1) translateY(0);    opacity:1; }
          }
          @keyframes markerFloat {
            0%,100% { transform: translateY(0px); }
            50%      { transform: translateY(-4px); }
          }
          .fb-marker:hover { transform: scale(1.15) !important; filter: drop-shadow(0 10px 20px ${colors.glow}) !important; z-index:999 !important; }
          .fb-marker-pin {
            display: flex; flex-direction: column; align-items: center;
          }
          .fb-marker-label {
            background: rgba(8,11,16,0.92);
            backdrop-filter: blur(12px);
            border: 1px solid ${colors.fill}55;
            border-radius: 10px;
            padding: 5px 8px 4px;
            text-align: center;
            min-width: 54px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.5), 0 0 0 1px ${colors.fill}22;
          }
          .fb-marker-price {
            font-family: 'JetBrains Mono', 'Courier New', monospace;
            font-size: 11px; font-weight: 700;
            color: ${colors.fill};
            line-height: 1;
            letter-spacing: -0.03em;
          }
          .fb-marker-name {
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 8.5px; font-weight: 600;
            color: rgba(255,255,255,0.55);
            white-space: nowrap; overflow: hidden;
            text-overflow: ellipsis; max-width: 52px;
            margin-top: 2px; line-height: 1;
          }
          .fb-marker-spike {
            width: 2px;
            height: 22px;
            background: linear-gradient(to bottom, ${colors.fill}, transparent);
            border-radius: 1px;
          }
          .fb-marker-dot {
            width: 10px; height: 10px;
            border-radius: 50%;
            background: ${colors.fill};
            box-shadow: 0 0 12px ${colors.glow}, 0 0 4px ${colors.fill};
            border: 2px solid rgba(255,255,255,0.9);
            animation: markerFloat 2.8s ease-in-out infinite;
            animation-delay: ${Math.random() * 2}s;
          }
        </style>
        <div class="fb-marker-pin">
          <div class="fb-marker-label">
            <div class="fb-marker-price">₱${price}</div>
            <div class="fb-marker-name">${station.brand}</div>
          </div>
          <div class="fb-marker-spike"></div>
          <div class="fb-marker-dot"></div>
        </div>
      `;

      // Click → show popup + detail panel
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        setSelectedStation(station);
        if (onStationSelect) onStationSelect(station);

        // Fly to station with cinematic tilt
        map.flyTo({
          center:   [station.lng, station.lat],
          zoom:     14,
          pitch:    60,
          bearing:  Math.random() * 30 - 15,
          duration: 1200,
          essential: true,
        });

        // Rich popup
        if (popupRef.current) popupRef.current.remove();
        popupRef.current = new ml.Popup({
          offset:    [0, -70],
          className: "fb-popup",
          closeButton: false,
          maxWidth:  "220px",
        })
          .setLngLat([station.lng, station.lat])
          .setHTML(`
            <style>
              .fb-popup .maplibregl-popup-content {
                background: rgba(10,14,22,0.95) !important;
                backdrop-filter: blur(24px) !important;
                border: 1px solid rgba(255,255,255,0.12) !important;
                border-radius: 14px !important;
                padding: 14px 16px !important;
                box-shadow: 0 12px 40px rgba(0,0,0,0.6) !important;
                font-family: 'Plus Jakarta Sans', sans-serif !important;
              }
              .fb-popup .maplibregl-popup-tip { display:none !important; }
            </style>
            <div style="margin-bottom:2px; font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:.1em; color:${colors.fill}">
              ${station.brand}
            </div>
            <div style="font-size:14px; font-weight:800; color:#EDF0F7; margin-bottom:2px; letter-spacing:-0.02em; line-height:1.2">
              ${station.name.replace(station.brand + " - ", "")}
            </div>
            <div style="font-size:10px; color:rgba(255,255,255,0.38); margin-bottom:12px">
              ${station.city || ""} · ${station.is_open ? "Open" : "Closed"}
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px">
              ${["gas91","gas95","diesel"].map((t) => {
                const p = station.prices?.[t];
                const active = t === fuelType;
                return `
                  <div style="text-align:center; padding:7px 4px; border-radius:8px;
                    background:${active ? colors.fill + "18" : "rgba(255,255,255,0.04)"};
                    border:1px solid ${active ? colors.fill + "44" : "rgba(255,255,255,0.07)"}">
                    <div style="font-size:8px; color:rgba(255,255,255,0.38); font-weight:700; text-transform:uppercase; letter-spacing:.06em; margin-bottom:3px">
                      ${t === "gas91" ? "91" : t === "gas95" ? "95" : "DSL"}
                    </div>
                    <div style="font-family:'JetBrains Mono',monospace; font-size:12px; font-weight:700; color:${active ? colors.fill : "#EDF0F7"}">
                      ₱${p || "—"}
                    </div>
                  </div>`;
              }).join("")}
            </div>
          `)
          .addTo(map);
      });

      const marker = new ml.Marker({ element: el, anchor: "bottom" })
        .setLngLat([station.lng, station.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [stations, filter, fuelType, mapReady, onStationSelect]);

  // Re-render markers whenever data or filters change
  useEffect(() => {
    renderMarkers();
  }, [renderMarkers]);

  /* ── Close detail panel → reset map view ──────────────────── */
  function closeDetail() {
    setSelectedStation(null);
    if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }
    if (mapRef.current) {
      mapRef.current.flyTo({
        center:   MAP_CENTER,
        zoom:     MAP_ZOOM,
        pitch:    MAP_PITCH,
        bearing:  MAP_BEARING,
        duration: 1000,
      });
    }
  }

  /* ── Derived stats ─────────────────────────────────────────── */
  const cheapestStation = stations
    .filter((s) => s.is_open)
    .sort((a, b) => (a.display_price || 99) - (b.display_price || 99))[0];

  const filteredCount = filter === "all"
    ? stations.length
    : stations.filter((s) => s.price_category === filter).length;

  /* ── Render ────────────────────────────────────────────────── */
  return (
    <div className={styles.container}>

      {/* Controls Bar */}
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
            {[
              { id: "all",       label: "All" },
              { id: "cheap",     label: "🟢 Cheap" },
              { id: "medium",    label: "🟡 Mid" },
              { id: "expensive", label: "🔴 Pricey" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`${styles.filterBtn} ${filter === f.id ? styles.filterBtnActive : ""}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.controlsRight}>
          {cheapestStation && (
            <div className={styles.cheapestBadge}>
              <span className={styles.cheapestLabel}>🏆 Cheapest</span>
              <span className={styles.cheapestName}>
                {cheapestStation.city || cheapestStation.name}
              </span>
              <span className={styles.cheapestPrice}>
                {formatPeso(cheapestStation.display_price)}/L
              </span>
            </div>
          )}
          <span className={styles.count}>{filteredCount} stations</span>
          {loading && <span className="spinner" />}
        </div>
      </div>

      {/* 3D Map */}
      <div className={styles.mapWrapper}>
        <div ref={mapContainerRef} className={styles.map} />

        {/* Legend */}
        <div className={styles.legend}>
          <div className={styles.legendTitle}>Price Level</div>
          {[
            { color: "#00E5A0", label: "Cheap" },
            { color: "#FFD166", label: "Average" },
            { color: "#FF4757", label: "Expensive" },
          ].map((item) => (
            <div key={item.label} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: item.color, color: item.color }} />
              {item.label}
            </div>
          ))}
        </div>

        {error && <div className={styles.errorBanner}>⚠ {error}</div>}

        {/* Loading overlay */}
        {loading && !mapReady && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 500,
            background: "rgba(8,11,16,0.75)",
            backdropFilter: "blur(12px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 12, color: "rgba(255,255,255,0.6)", fontSize: "0.88rem",
            fontFamily: "var(--font-body)",
          }}>
            <span className="spinner" /> Loading fuel stations…
          </div>
        )}
      </div>

      {/* Station detail panel */}
      {selectedStation && (
        <div className={`${styles.detailPanel} animate-fadeIn`}>
          <button className={styles.closeBtn} onClick={closeDetail}>✕</button>

          <div
            className={styles.detailBrand}
            style={{ color: PRICE_COLORS[selectedStation.price_category]?.fill || "var(--amber)" }}
          >
            {selectedStation.brand}
          </div>
          <div className={styles.detailName}>{selectedStation.name}</div>
          <div className={styles.detailAddress}>{selectedStation.address}</div>

          <div className={styles.priceGrid}>
            {Object.entries(selectedStation.prices || {}).map(([type, price]) => (
              <div
                key={type}
                className={`${styles.priceCard} ${type === fuelType ? styles.priceCardActive : ""}`}
              >
                <span className={styles.priceType}>
                  {type === "gas91" ? "Gas 91" : type === "gas95" ? "Gas 95" : "Diesel"}
                </span>
                <span className={`${styles.priceValue} ${type === fuelType ? styles.priceCardActive : ""}`}>
                  ₱{price}
                </span>
                <span className={styles.priceUnit}>/L</span>
              </div>
            ))}
          </div>

          <div className={styles.detailMeta}>
            <span className={`badge ${
              selectedStation.price_category === "cheap"     ? "badge-cheap"     :
              selectedStation.price_category === "expensive" ? "badge-expensive" : "badge-medium"
            }`}>
              {selectedStation.price_category === "cheap"     ? "✓ Best Price"    :
               selectedStation.price_category === "expensive" ? "↑ Higher Price"  : "≈ Average"}
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

/* ── Fallback mock data ─────────────────────────────────────── */
function getMockStations() {
  return [
    { id:1,  name:"Petron - EDSA Magallanes", brand:"Petron", lat:14.5547, lng:121.0244, city:"Makati",     prices:{gas91:56.20,gas95:60.15,diesel:52.10}, display_price:60.15, price_category:"expensive", is_open:true,  address:"EDSA cor. Magallanes Ave" },
    { id:2,  name:"Shell - Alabang",          brand:"Shell",  lat:14.4195, lng:121.0438, city:"Muntinlupa", prices:{gas91:55.80,gas95:59.75,diesel:51.90}, display_price:59.75, price_category:"medium",    is_open:true,  address:"Alabang-Zapote Rd" },
    { id:3,  name:"Caltex - Laguna Blvd",    brand:"Caltex", lat:14.2717, lng:121.4115, city:"Calamba",    prices:{gas91:54.50,gas95:58.30,diesel:50.75}, display_price:58.30, price_category:"medium",    is_open:true,  address:"National Hwy, Calamba" },
    { id:4,  name:"Phoenix - Sta. Rosa",     brand:"Phoenix",lat:14.2872, lng:121.0862, city:"Sta. Rosa",  prices:{gas91:53.90,gas95:57.80,diesel:50.20}, display_price:57.80, price_category:"cheap",     is_open:true,  address:"Sta. Rosa-Tagaytay Rd" },
    { id:5,  name:"Seaoil - Los Baños",      brand:"Seaoil", lat:14.1665, lng:121.2419, city:"Los Baños",  prices:{gas91:53.20,gas95:56.95,diesel:49.60}, display_price:56.95, price_category:"cheap",     is_open:true,  address:"National Hwy, Los Baños" },
    { id:6,  name:"Petron - Quezon Ave",     brand:"Petron", lat:14.6372, lng:121.0014, city:"QC",         prices:{gas91:56.50,gas95:60.45,diesel:52.30}, display_price:60.45, price_category:"expensive", is_open:true,  address:"Quezon Ave, QC" },
    { id:7,  name:"Shell - C5 Road",         brand:"Shell",  lat:14.5764, lng:121.0734, city:"Taguig",     prices:{gas91:56.10,gas95:60.00,diesel:52.00}, display_price:60.00, price_category:"expensive", is_open:true,  address:"C5 Road, Taguig" },
    { id:8,  name:"Unioil - Biñan",          brand:"Unioil", lat:14.3404, lng:121.0797, city:"Biñan",      prices:{gas91:53.50,gas95:57.20,diesel:49.90}, display_price:57.20, price_category:"cheap",     is_open:true,  address:"National Hwy, Biñan" },
    { id:9,  name:"Phoenix - Pasig",         brand:"Phoenix",lat:14.5764, lng:121.0851, city:"Pasig",      prices:{gas91:55.00,gas95:58.90,diesel:51.10}, display_price:58.90, price_category:"medium",    is_open:true,  address:"Ortigas Ave, Pasig" },
    { id:10, name:"Petron - Bacoor",         brand:"Petron", lat:14.4590, lng:120.9610, city:"Bacoor",     prices:{gas91:55.40,gas95:59.30,diesel:51.50}, display_price:59.30, price_category:"medium",    is_open:true,  address:"Aguinaldo Hwy, Bacoor" },
  ];
}