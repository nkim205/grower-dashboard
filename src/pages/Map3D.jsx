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
  const [metric, setMetric] = useState("saidi");

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

  // ---- Color scale tuning ----
  // Anything at or above the cap gets the max color (red). Adjust per metric
  // to control how sensitive the color scale is. Values above the cap all
  // look the same shade of red.
  const METRIC_CAPS = {
    saidi: 0.05,
    saifi: 0.05,
  };

  // ---- layers logic stays the same as before (state vs county by zoom) ----
  const layers = useMemo(() => {
    const layers = [];

    const cap = METRIC_CAPS[metric];
    const range = cap;

    const getStateVal = (m) => (metric === "saidi" ? m?.avgSaidi : m?.avgSaifi) ?? null;
    const getCountyVal = (m) => (metric === "saidi" ? m?.saidi : m?.saifi) ?? null;

    const toColor = (v) => {
      if (v === null) return null;
      const t = Math.max(0, Math.min(1, v / range));
      const r = t < 0.5 ? Math.round(50 + 410 * t) : 255;
      const g = t < 0.5 ? Math.round(200 + 40 * t) : Math.round(220 - 400 * (t - 0.5));
      return [r, g, 0, 220];
    };

    if (statesGeojson && viewState.zoom < ZOOM_THRESHOLD) {
      layers.push(
        new GeoJsonLayer({
          id: `states-${metric}`,
          data: statesGeojson,
          pickable: true,
          stroked: true,
          filled: true,
          extruded: true,
          wireframe: true,
          lineWidthUnits: "pixels",
          getElevation: (f) => {
            const m = getStateMetric(f);
            const v = getStateVal(m);
            if (v === null) return 0;
            return Math.max(0, Math.min(1, v / range)) * 100000;
          },
          getFillColor: (f) => {
            const m = getStateMetric(f);
            const v = getStateVal(m);
            return toColor(v) ?? [200, 200, 200, 200];
          },
          getLineColor: [255, 255, 255, 180],
          getLineWidth: 1,
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
          id: `counties-${metric}`,
          data: countiesGeojson,
          pickable: true,
          stroked: true,
          filled: true,
          extruded: true,
          wireframe: true,
          lineWidthUnits: "pixels",
          getElevation: (f) => {
            const m = getCountyMetric(f);
            const v = getCountyVal(m);
            if (v === null) return 0;
            return Math.max(0, Math.min(1, v / range)) * 100000;
          },
          getFillColor: (f) => {
            const m = getCountyMetric(f);
            const v = getCountyVal(m);
            return toColor(v) ?? [220, 220, 220, 180];
          },
          getLineColor: [255, 255, 255, 150],
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
  }, [countiesGeojson, statesGeojson, metrics, stateMetrics, viewState.zoom, metric]);

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

      <div className="absolute bottom-4 left-4 z-10 flex rounded-full bg-slate-900/90 p-1 shadow-lg">
        {["saidi", "saifi"].map((m) => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-wide transition-colors ${
              metric === m
                ? "bg-white text-slate-900"
                : "text-white/60 hover:text-white"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

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
