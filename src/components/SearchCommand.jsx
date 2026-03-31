"use client"

import * as React from "react"
import { SearchIcon } from "lucide-react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

const STORAGE_KEY = "recent-geo-searches-v1"

// FIPS → state abbrev fallback (for datasets that only have STATEFP)
const STATE_FIPS_TO_ABBR = {
  "01": "AL",
  "02": "AK",
  "04": "AZ",
  "05": "AR",
  "06": "CA",
  "08": "CO",
  "09": "CT",
  "10": "DE",
  "11": "DC",
  "12": "FL",
  "13": "GA",
  "15": "HI",
  "16": "ID",
  "17": "IL",
  "18": "IN",
  "19": "IA",
  "20": "KS",
  "21": "KY",
  "22": "LA",
  "23": "ME",
  "24": "MD",
  "25": "MA",
  "26": "MI",
  "27": "MN",
  "28": "MS",
  "29": "MO",
  "30": "MT",
  "31": "NE",
  "32": "NV",
  "33": "NH",
  "34": "NJ",
  "35": "NM",
  "36": "NY",
  "37": "NC",
  "38": "ND",
  "39": "OH",
  "40": "OK",
  "41": "OR",
  "42": "PA",
  "44": "RI",
  "45": "SC",
  "46": "SD",
  "47": "TN",
  "48": "TX",
  "49": "UT",
  "50": "VT",
  "51": "VA",
  "53": "WA",
  "54": "WV",
  "55": "WI",
  "56": "WY",
}

// ---- helpers to pull data from a feature ----
function getId(feature, fallbackIndex) {
  return (
    feature?.properties?.GEOID ||
    feature?.properties?.id ||
    String(fallbackIndex)
  )
}

function getName(feature) {
  return (
    feature?.properties?.NAME ||
    feature?.properties?.name ||
    ""
  )
}

function getState(feature) {
  const props = feature?.properties || {}

  return (
    props.STATE ||                     // e.g. "GA"
    props.STATE_NAME ||                // e.g. "Georgia"
    props.state ||
    props.STUSPS ||                    // USPS abbrev in some datasets
    STATE_FIPS_TO_ABBR[props.STATEFP] || // e.g. "13" -> "GA"
    ""
  )
}

function getCountyFips(feature) {
  const props = feature?.properties || {}
  return (
    props.GEOID ||
    props.geoid ||
    props.FIPS ||
    props.fips ||
    (props.STATEFP && props.COUNTYFP ? `${props.STATEFP}${props.COUNTYFP}` : "")
  )
}

// simple fuzzy subsequence score
function fuzzyScore(text, query) {
  if (!text || !query) return -1
  text = text.toLowerCase()
  query = query.toLowerCase()

  let ti = 0
  let qi = 0
  let score = 0
  let consecutive = 0

  while (ti < text.length && qi < query.length) {
    if (text[ti] === query[qi]) {
      score += 1 + consecutive
      consecutive += 1
      qi += 1
    } else {
      consecutive = 0
    }
    ti += 1
  }

  if (qi !== query.length) return -1

  if (text.startsWith(query)) score += 3
  if (text === query) score += 5

  return score
}

function scoreFeature(feature, query) {
  const name = getName(feature)
  const state = getState(feature)
  const combined = `${name} ${state}`

  const s1 = fuzzyScore(name, query)
  const s2 = fuzzyScore(state, query)
  const s3 = fuzzyScore(combined, query)

  return Math.max(s1, s2, s3)
}

export function SearchCommand({ onSearch, geojson }) {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState("")
  const [recent, setRecent] = React.useState([])

  const features = geojson?.features || []

  // load recent (just id/name/state, not full feature)
  React.useEffect(() => {
    try {
      const stored =
        typeof window !== "undefined"
          ? window.localStorage.getItem(STORAGE_KEY)
          : null

      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setRecent(parsed.slice(0, 3))
        }
      }
    } catch (_) { }
  }, [])

  // ⌘K / Ctrl+K shortcut
  React.useEffect(() => {
    const down = (e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const persistRecent = (next) => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      }
    } catch (_) { }
  }

  const addToRecent = (item) => {
    setRecent((prev) => {
      const withoutDup = prev.filter((r) => r.id !== item.id)
      const next = [item, ...withoutDup].slice(0, 3)
      persistRecent(next)
      return next
    })
  }

  const handleSelectFeature = (feature) => {
    if (!feature) return

    const id = getId(feature)
    const name = getName(feature)
    const state = getState(feature)

    const countyFips = getCountyFips(feature)
    const searchTerm = countyFips ? `fips:${countyFips}` : `${name} ${state}`.trim()

    if (onSearch) {
      onSearch(searchTerm)   // 👈 send string, not object
    }

    addToRecent({ id, name, state })

    setOpen(false)
    setValue("")
  }

  const handleEnter = (results) => {
    const query = value.trim()
    if (!query) return

    if (results.length > 0) {
      handleSelectFeature(results[0].feature)
    }
  }

  const trimmed = value.trim()

  // fuzzy match over geojson features
  const scored =
    trimmed.length === 0
      ? []
      : features
        .map((feature, idx) => ({
          feature,
          id: getId(feature, idx),
          name: getName(feature),
          state: getState(feature),
          score: scoreFeature(feature, trimmed),
        }))
        .filter((x) => x.score >= 0)
        .sort((a, b) => b.score - a.score)

  const showRecent = trimmed.length === 0 && recent.length > 0

  return (
    <>
      {/* trigger button */}
      <button
        className="inline-flex h-9 w-fit items-center gap-3 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        onClick={() => setOpen(true)}
      >
        <SearchIcon size={16} className="text-muted-foreground/80" />
        <span className="text-muted-foreground/70">Search</span>

        <kbd className="ms-8 inline-flex h-5 items-center rounded border bg-background px-1 text-[0.625rem] font-medium text-muted-foreground/70">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search county or state..."
          value={value}
          onValueChange={setValue}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              handleEnter(scored)
            }
          }}
        />

        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {/* recent (id/name/state) */}
          {showRecent && (
            <CommandGroup heading="Recent">
              {recent.slice(0, 3).map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.name} ${item.state}`}
                  onSelect={() => {
                    const feature = features.find(
                      (f, idx) => getId(f, idx) === item.id
                    )
                    if (feature) {
                      handleSelectFeature(feature)
                    }
                  }}
                >
                  <SearchIcon
                    size={14}
                    className="opacity-60 mr-2"
                    aria-hidden="true"
                  />
                  <span>{item.name}</span>
                  {item.state && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {item.state}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* fuzzy results */}
          {scored.length > 0 && (
            <CommandGroup heading="Results">
              {scored.slice(0, 10).map(({ id, name, state, feature }) => (
                <CommandItem
                  key={id}
                  value={`${name} ${state}`}
                  onSelect={() => handleSelectFeature(feature)}
                >
                  <SearchIcon
                    size={14}
                    className="opacity-60 mr-2"
                    aria-hidden="true"
                  />
                  <span>{name}</span>
                  {state && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {state}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
