// Map3D.jsx
import { useMemo, useEffect, useState, useRef } from "react";
import DeckGL from "@deck.gl/react";
import { GeoJsonLayer } from "@deck.gl/layers";
import { Map } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

const BASE = import.meta.env.BASE_URL;

const COUNTIES_GEOJSON_URL = `${BASE}counties.geojson`;
const STATES_GEOJSON_URL = `${BASE}us-states.json`;
const READY_STATES = ["AL", "FL", "GA", "IL", "LA", "MS", "NC", "SC"];

const STATE_CSV_URLS = [];

for (const state of READY_STATES) {
  STATE_CSV_URLS.push(`${BASE}states/${state}/${state}_DATA.csv`);
}

const ZOOM_THRESHOLD = 6;

const INITIAL_VIEW_STATE = {
  longitude: -79.0,
  latitude: 35.5,
  zoom: 5,
  pitch: 45,
  bearing: 0,
};

function normalizeFips(raw) {
  if (raw == null) return null;
  const num = parseFloat(raw);
  if (!isNaN(num)) {
    return String(Math.floor(num)).padStart(5, "0");
  }
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;
  return digits.padStart(5, "0");
}

// crude center-of-geometry finder
function getFeatureCenter(feature) {
  const geom = feature.geometry;
  if (!geom || !geom.coordinates) return null;

  const coords = [];
  const collect = (c) => {
    if (!c) return;
    if (typeof c[0] === "number") {
      coords.push(c);
    } else {
      c.forEach(collect);
    }
  };
  collect(geom.coordinates);

  if (!coords.length) return null;

  let sumX = 0;
  let sumY = 0;
  coords.forEach(([x, y]) => {
    sumX += x;
    sumY += y;
  });

  return {
    longitude: sumX / coords.length,
    latitude: sumY / coords.length,
  };
}

export default function Map3D({ searchTerm }) {
  const [countiesGeojson, setCountiesGeojson] = useState(null);
  const [statesGeojson, setStatesGeojson] = useState(null);
  const [metrics, setMetrics] = useState({});
  const [hoverInfo, setHoverInfo] = useState(null);

  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);

  const containerRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    fetch(COUNTIES_GEOJSON_URL)
      .then((r) => r.json())
      .then(setCountiesGeojson)
      .catch((err) => console.error("Failed to load counties GeoJSON", err));
  }, []);

  useEffect(() => {
    fetch(STATES_GEOJSON_URL)
      .then((r) => r.json())
      .then(setStatesGeojson)
      .catch((err) => console.error("Failed to load states GeoJSON", err));
  }, []);

  useEffect(() => {
    // Function to load and parse a single CSV
    const loadCSV = async (url) => {
      const response = await fetch(url);
      const text = await response.text();
      let processedText = text.replace(/\r/g, "");
      if (processedText.charCodeAt(0) === 0xfeff)
        processedText = processedText.slice(1);

      const lines = processedText.trim().split("\n");
      const [headerLine, ...rows] = lines;
      const headers = headerLine.split(",").map((h) => h.trim());

      const byFips = {};
      for (const row of rows) {
        if (!row.trim()) continue;

        const cols = row.split(",");
        const rowObj = {};
        headers.forEach((h, i) => {
          rowObj[h] = cols[i]?.trim();
        });

        const rawFips = rowObj.FIPS || rowObj.fips;
        const fipsKey = normalizeFips(rawFips);
        if (!fipsKey) continue;

        const hasSaifi = headers.includes("SAIFI");
        byFips[fipsKey] = {
          county: rowObj.County,
          saidi: Number(rowObj.SAIDI || 0),
          saifi: hasSaifi ? Number(rowObj.SAIFI ?? 0) : null,
          fips: fipsKey,
          state: rowObj.State,
        };
      }

      return byFips;
    };

    // Load all CSVs and merge
    const loadAllCSVs = async () => {
      const allMetrics = {};

      for (const url of STATE_CSV_URLS) {
        try {
          const metrics = await loadCSV(url);
          Object.assign(allMetrics, metrics);
        } catch (err) {
          console.error(`Failed to load ${url}`, err);
        }
      }

      setMetrics(allMetrics);
    };

    loadAllCSVs();
  }, []);

  const getCountyMetric = (feature) => {
    const props = feature.properties || {};
    const rawFips =
      props.FIPS ||
      props.fips ||
      props.GEOID ||
      props.geoid ||
      props.GEOID20 ||
      (props.STATEFP && props.COUNTYFP
        ? `${props.STATEFP}${props.COUNTYFP}`
        : null);

    const fipsKey = normalizeFips(rawFips);
    if (!fipsKey) return null;

    return metrics[fipsKey] || null;
  };

  const stateMetrics = useMemo(() => {
    const byState = {};
    Object.values(metrics).forEach((m) => {
      const st = m.state || "Unknown";
      if (!byState[st])
        byState[st] = {
          state: st,
          saidiTotal: 0,
          saidiCount: 0,
          saifiTotal: 0,
          saifiCount: 0,
        };
      if (Number.isFinite(m.saidi)) {
        byState[st].saidiTotal += m.saidi;
        byState[st].saidiCount += 1;
      }
      if (m.saifi !== null && Number.isFinite(m.saifi)) {
        byState[st].saifiTotal += m.saifi;
        byState[st].saifiCount += 1;
      }
    });

    const result = {};
    Object.keys(byState).forEach((st) => {
      const agg = byState[st];
      const avgSaidi = agg.saidiCount > 0 ? agg.saidiTotal / agg.saidiCount : 0;
      const avgSaifi =
        agg.saifiCount > 0 ? agg.saifiTotal / agg.saifiCount : null;
      result[st] = { state: st, avgSaidi, avgSaifi };
    });

    return result;
  }, [metrics]);

  const getStateMetric = (feature) => {
    const props = feature.properties || {};
    const stateName =
      props.STATE_NAME || props.STATE || props.NAME || props.Name || props.name;

    if (!stateName) return null;
    return stateMetrics[stateName] || null;
  };

  // 🔍 search effect: fly to county or state
  useEffect(() => {
    const q = (searchTerm || "").trim().toLowerCase();
    if (!q) return;
    if (!countiesGeojson && !statesGeojson) return;

    let match = null;

    // County matcher
    const countyMatches = (f) => {
      const props = f.properties || {};
      const countyName =
        props.NAME ||
        props.Name ||
        props.name ||
        props.COUNTY ||
        props.County ||
        "";
      const stateName = props.STATE_NAME || props.STATE || props.STUSPS || "";
      const full = `${countyName} ${stateName}`.toLowerCase();

      return countyName.toLowerCase().includes(q) || full.includes(q);
    };

    // State matcher
    const stateMatches = (f) => {
      const props = f.properties || {};
      const stateName =
        props.STATE_NAME ||
        props.STATE ||
        props.NAME ||
        props.Name ||
        props.name ||
        "";
      return stateName.toLowerCase().includes(q);
    };

    // 1) Try county first
    if (!match && countiesGeojson) {
      match = countiesGeojson.features.find(countyMatches);
    }

    // 2) Try state
    if (!match && statesGeojson) {
      match = statesGeojson.features.find(stateMatches);
    }

    if (!match) {
      console.warn("No match for:", q);
      return;
    }

    const center = getFeatureCenter(match);
    if (!center) return;

    // Fly camera using functional state updater
    setViewState((vs) => ({
      ...vs,
      longitude: center.longitude,
      latitude: center.latitude,
      zoom: Math.max(vs.zoom, ZOOM_THRESHOLD + 1),
      transitionDuration: 800,
    }));
  }, [searchTerm, countiesGeojson, statesGeojson]);

  // ---- layers logic stays the same as before (state vs county by zoom) ----
  const layers = useMemo(() => {
    const layers = [];

    let minSAIDI = Infinity;
    let maxSAIDI = -Infinity;
    Object.values(metrics).forEach((m) => {
      const v = m.saidi;
      if (Number.isFinite(v)) {
        if (v < minSAIDI) minSAIDI = v;
        if (v > maxSAIDI) maxSAIDI = v;
      }
    });
    if (!Number.isFinite(minSAIDI) || !Number.isFinite(maxSAIDI)) {
      minSAIDI = 0;
      maxSAIDI = 1;
    }
    const range = maxSAIDI - minSAIDI || 1;

    if (statesGeojson && viewState.zoom < ZOOM_THRESHOLD) {
      layers.push(
        new GeoJsonLayer({
          id: "states-saidi",
          data: statesGeojson,
          pickable: true,
          stroked: true,
          filled: true,
          extruded: true,
          wireframe: false,
          getElevation: (f) => {
            const m = getStateMetric(f);
            if (!m) return 0;
            const t = Math.max(0, Math.min(1, (m.avgSaidi - minSAIDI) / range));
            return t * 100000;
          },
          getFillColor: (f) => {
            const m = getStateMetric(f);
            if (!m) return [200, 200, 200, 200];
            const v = m.avgSaidi;
            const tRaw = Math.max(0, Math.min(1, (v - minSAIDI) / range));
            const t = Math.sqrt(tRaw);
            const r = Math.round(50 + 205 * t);
            const g = Math.round(200 - 175 * t);
            const b = Math.round(50 * (1 - t));
            return [r, g, b, 220];
          },
          getLineColor: [40, 40, 40, 255],
          getLineWidth: 1.5,
          onHover: (info) => {
            const { object, x, y } = info;
            if (!object) {
              setHoverInfo(null);
              return;
            }
            const m = getStateMetric(object);
            const props = object.properties || {};
            const name =
              props.STATE_NAME ||
              props.STATE ||
              props.NAME ||
              props.Name ||
              props.name;
            setHoverInfo({
              x,
              y,
              mode: "state",
              label: name || "Unknown state",
              saidi: m?.avgSaidi ?? null,
              saifi: m?.avgSaifi ?? null,
            });
          },
        }),
      );
    }

    if (countiesGeojson && viewState.zoom >= ZOOM_THRESHOLD) {
      layers.push(
        new GeoJsonLayer({
          id: "counties-saidi",
          data: countiesGeojson,
          pickable: true,
          stroked: true,
          filled: true,
          extruded: true,
          wireframe: false,
          getElevation: (f) => {
            const m = getCountyMetric(f);
            if (!m) return 0;
            const t = Math.max(0, Math.min(1, (m.saidi - minSAIDI) / range));
            return t * 100000;
          },
          getFillColor: (f) => {
            const m = getCountyMetric(f);
            if (!m) return [220, 220, 220, 180];
            const v = m.saidi;
            const tRaw = Math.max(0, Math.min(1, (v - minSAIDI) / range));
            const t = Math.sqrt(tRaw);
            const r = Math.round(50 + 205 * t);
            const g = Math.round(200 - 175 * t);
            const b = Math.round(50 * (1 - t));
            return [r, g, b, 220];
          },
          getLineColor: [30, 30, 30, 255],
          getLineWidth: 1,
          onHover: (info) => {
            const { object, x, y } = info;
            if (!object) {
              setHoverInfo(null);
              return;
            }
            const m = getCountyMetric(object);
            const props = object.properties || {};
            const name =
              props.NAME ||
              props.Name ||
              props.name ||
              props.COUNTY ||
              props.County;
            setHoverInfo({
              x,
              y,
              mode: "county",
              label: name || "Unknown county",
              saidi: m?.saidi ?? null,
              saifi: m?.saifi ?? null,
              fips: m?.fips ?? null,
            });
          },
        }),
      );
    }

    return layers;
  }, [countiesGeojson, statesGeojson, metrics, stateMetrics, viewState.zoom]);

  const { width, height } = size;
  const ready = width > 0 && height > 0;

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {ready && (
        <DeckGL
          initialViewState={INITIAL_VIEW_STATE}
          controller={true}
          viewState={viewState}
          onViewStateChange={({ viewState: vs }) => setViewState(vs)}
          layers={layers}
          width={width}
          height={height}
        >
          <Map mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json" />
        </DeckGL>
      )}

      {hoverInfo && (
        <div
          className="pointer-events-none absolute z-10 rounded-md bg-slate-900/90 px-3 py-2 text-xs text-white shadow-lg"
          style={{
            left: hoverInfo.x + 8,
            top: hoverInfo.y + 8,
          }}
        >
          <div className="font-semibold">{hoverInfo.label}</div>
          {hoverInfo.mode === "county" && hoverInfo.fips && (
            <div>FIPS: {hoverInfo.fips}</div>
          )}
          {hoverInfo.saidi != null && (
            <div>
              SAIDI: {hoverInfo.saidi.toFixed(4)}
              {hoverInfo.mode === "state" && " (avg)"}
            </div>
          )}
          {hoverInfo.saifi != null && (
            <div>
              SAIFI: {hoverInfo.saifi.toFixed(4)}
              {hoverInfo.mode === "state" && " (avg)"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
