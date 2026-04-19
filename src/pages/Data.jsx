import { useEffect, useMemo, useState } from "react"
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const BASE = import.meta.env.BASE_URL

const STATE_OPTIONS = [
  { label: "Alabama", value: "AL" },
  { label: "Florida", value: "FL" },
  { label: "Georgia", value: "GA" },
]

const TIMEFRAME_OPTIONS = [
  { label: "1 week", value: "7" },
  { label: "1 month", value: "30" },
  { label: "3 months", value: "90" },
  { label: "6 months", value: "180" },
  { label: "1 year", value: "365" },
  { label: "All", value: "all" },
]

const METRIC_OPTIONS = ["SAIDI", "SAIFI"]

const HISTORICAL_FILES_BY_STATE = {
  AL: [
    "/historical/AL/2025_08.csv",
    "/historical/AL/2025_09.csv",
    "/historical/AL/2025_10.csv",
    "/historical/AL/2025_11.csv",
    "/historical/AL/2025_12.csv",
    "/historical/AL/2026_01.csv",
    "/historical/AL/2026_02.csv",
    "/historical/AL/2026_03.csv",
  ],
  FL: [
    "/historical/FL/2025_08.csv",
    "/historical/FL/2025_09.csv",
    "/historical/FL/2025_10.csv",
    "/historical/FL/2025_11.csv",
    "/historical/FL/2025_12.csv",
    "/historical/FL/2026_01.csv",
    "/historical/FL/2026_02.csv",
    "/historical/FL/2026_03.csv",
  ],
  GA: [
    "/historical/GA/2025_08.csv",
    "/historical/GA/2025_09.csv",
    "/historical/GA/2025_10.csv",
    "/historical/GA/2025_11.csv",
    "/historical/GA/2025_12.csv",
    "/historical/GA/2026_01.csv",
    "/historical/GA/2026_02.csv",
    "/historical/GA/2026_03.csv",
  ],
}

function parseMetricValue(rawValue) {
  if (!rawValue) return 0
  if (rawValue.startsWith("<")) return Number(rawValue.slice(1)) || 0
  return Number(rawValue) || 0
}

function parseCsvRows(csvText) {
  const lines = csvText.split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return []

  const headers = lines[0].split(",")
  const headerIndex = headers.reduce((acc, header, index) => {
    acc[header.trim()] = index
    return acc
  }, {})

  return lines
    .slice(1)
    .map((line) => {
      const cells = line.split(",")
      const dateText = cells[headerIndex.Date]?.trim()
      const county = cells[headerIndex.County]?.trim()
      const stateName = cells[headerIndex.State]?.trim()

      if (!dateText || !county || !stateName) return null

      return {
        county,
        state: stateName,
        date: dateText,
        timestamp: new Date(dateText).getTime(),
        SAIDI: parseMetricValue(cells[headerIndex.SAIDI]?.trim()),
        SAIFI: parseMetricValue(cells[headerIndex.SAIFI]?.trim()),
      }
    })
    .filter(Boolean)
}

async function fetchStateRows(stateCode) {
  const candidates = HISTORICAL_FILES_BY_STATE[stateCode] || []

  const responses = await Promise.all(
    candidates.map(async (path) => {
      try {
        const response = await fetch(`${BASE}${path.replace(/^\//, "")}`)
        if (!response.ok) return null
        const text = await response.text()
        return parseCsvRows(text)
      } catch {
        return null
      }
    }),
  )

  const deduped = new Map()
  for (const rows of responses) {
    if (!rows?.length) continue
    rows.forEach((row) => {
      deduped.set(`${row.county}|${row.date}`, row)
    })
  }

  return Array.from(deduped.values()).sort((a, b) => a.timestamp - b.timestamp)
}

function formatDate(dateValue) {
  return new Date(dateValue).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}

function Data() {
  const [stateCode, setStateCode] = useState("")
  const [county, setCounty] = useState("")
  const [timeframe, setTimeframe] = useState("30")
  const [metric, setMetric] = useState("SAIDI")
  const [stateRows, setStateRows] = useState({})
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setErrorMessage("")

      try {
        const results = await Promise.all(
          STATE_OPTIONS.map(async (state) => {
            const rows = await fetchStateRows(state.value)
            return [state.value, rows]
          }),
        )

        const nextRows = Object.fromEntries(results)
        const hasAnyData = Object.values(nextRows).some((rows) => rows.length > 0)

        if (!hasAnyData) {
          setErrorMessage("Historical files were not found. Check public/historical paths.")
        }

        setStateRows(nextRows)
      } catch {
        setErrorMessage("Failed to load historical data files.")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const counties = useMemo(() => {
    if (!stateCode || !stateRows[stateCode]) return []
    return [...new Set(stateRows[stateCode].map((row) => row.county))].sort((a, b) =>
      a.localeCompare(b),
    )
  }, [stateCode, stateRows])

  useEffect(() => {
    if (county && !counties.includes(county)) {
      setCounty("")
    }
  }, [county, counties])

  const chartRows = useMemo(() => {
    if (!stateCode || !county) return []

    const rowsForCounty = (stateRows[stateCode] || []).filter(
      (row) => row.county === county,
    )

    if (!rowsForCounty.length) return []
    if (timeframe === "all") return rowsForCounty

    const days = Number(timeframe)
    const latestTimestamp = rowsForCounty[rowsForCounty.length - 1].timestamp
    const cutoff = latestTimestamp - days * 24 * 60 * 60 * 1000

    return rowsForCounty.filter((row) => row.timestamp >= cutoff)
  }, [county, stateCode, stateRows, timeframe])

  return (
    <main className="flex h-full min-h-0 flex-col gap-6 p-6">
      <div className="flex flex-wrap items-end gap-3">
        <Select
          value={stateCode}
          onValueChange={setStateCode}
          items={STATE_OPTIONS}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Select state" />
          </SelectTrigger>
          <SelectPopup>
            {STATE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>

        <Select
          value={county}
          onValueChange={setCounty}
          items={counties.map((item) => ({ label: item, value: item }))}
          disabled={!stateCode}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Select county" />
          </SelectTrigger>
          <SelectPopup>
            {counties.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>

        <Select
          value={timeframe}
          onValueChange={setTimeframe}
          items={TIMEFRAME_OPTIONS}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            {TIMEFRAME_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>

        <div className="ml-auto inline-flex rounded-md border border-border p-1">
          {METRIC_OPTIONS.map((metricOption) => (
            <Button
              key={metricOption}
              variant={metric === metricOption ? "default" : "ghost"}
              size="sm"
              onClick={() => setMetric(metricOption)}
            >
              {metricOption}
            </Button>
          ))}
        </div>
      </div>

      <section className="min-h-0 flex-1 rounded-lg border border-border bg-background p-4">
        {loading && (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Loading historical data...
          </div>
        )}

        {!loading && errorMessage && (
          <div className="flex h-full items-center justify-center text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        {!loading && !errorMessage && (!stateCode || !county) && (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Select a state and county to view metrics over time.
          </div>
        )}

        {!loading && !errorMessage && stateCode && county && !chartRows.length && (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No data available for this selection and timeframe.
          </div>
        )}

        {!loading && !errorMessage && chartRows.length > 0 && (
          <div className="h-full min-h-[350px]">
            <div className="mb-2 text-sm font-medium">
              {county}, {stateCode} - {metric}
            </div>
            <ResponsiveContainer width="100%" height="92%">
              <LineChart data={chartRows}>
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => [Number(value).toFixed(4), metric]}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Line
                  type="linear"
                  dataKey={metric}
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </main>
  )
}

export default Data
