"use client"

import React from "react"

import {
  HouseIcon,
  Database,
  Users,
  ClockIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import { SearchCommand } from "@/components/SearchCommand"   // fuzzy command palette

export default function Navbar({ currentPage, onNavigate, onSearch }) {
  const [geojson, setGeojson] = React.useState(null)

  const isConnected = true
  const lastSyncLabel = "3 min ago"
  const bucketLabel = "metrics-prod (us-east-1)"

  const navigationLinks = [
    { id: "home", label: "Home", icon: HouseIcon },
    { id: "data", label: "Data", icon: Database },
    { id: "team", label: "Team", icon: Users },
  ]

  // 🔥 Load /public/counties.geojson dynamically
  React.useEffect(() => {
    const loadGeoJSON = async () => {
      try {
        const res = await fetch("/counties.geojson")
        const data = await res.json()
        setGeojson(data)
      } catch (err) {
        console.error("Failed to load GeoJSON:", err)
      }
    }

    loadGeoJSON()
  }, [])

  const handleSearch = (result) => {
    // result = { id, name, state, feature }
    onSearch(result)
  }

  return (
    <header className="border-b px-4 md:px-6">
      <div className="flex h-16 items-center justify-between gap-4">

        {/* LEFT SIDE */}
        <div className="flex flex-1 items-center gap-4">

          {/* Mobile menu trigger */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                className="group size-8 md:hidden"
                variant="ghost"
                size="icon"
              >
                {/* hamburger */}
              </Button>
            </PopoverTrigger>

            <PopoverContent align="start" className="w-36 p-1 md:hidden">
              <NavigationMenu className="max-w-none *:w-full">
                <NavigationMenuList className="flex-col items-start gap-0 md:gap-2">
                  {navigationLinks.map((link) => {
                    const Icon = link.icon
                    const isActive = currentPage === link.id
                    return (
                      <NavigationMenuItem key={link.id} className="w-full">
                        <NavigationMenuLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            onNavigate(link.id)
                          }}
                          active={isActive}
                          className="flex-row items-center gap-2 py-1.5"
                        >
                          <Icon size={16} className="text-muted-foreground/80" />
                          <span>{link.label}</span>
                        </NavigationMenuLink>
                      </NavigationMenuItem>
                    )
                  })}
                </NavigationMenuList>
              </NavigationMenu>
            </PopoverContent>
          </Popover>

          {/* Logo */}
          <a href="#" className="text-primary hover:text-primary/90">
            {/* logo */}
          </a>

          {/* S3 STATUS */}
          <div className="hidden md:flex items-center gap-2">
            <Badge
              variant="outline"
              className={`gap-1.5 ${isConnected ? "text-emerald-600" : "text-destructive"
                }`}
            >
              <span
                className={`size-1.5 rounded-full ${isConnected ? "bg-emerald-500" : "bg-destructive"
                  }`}
              />
              {isConnected ? "S3 Connected" : "S3 Disconnected"}
            </Badge>

            <Badge variant="outline" className="gap-1.5">
              <ClockIcon size={12} className="-ms-0.5 opacity-60" />
              Last sync: {lastSyncLabel}
            </Badge>

            <Badge variant="outline" className="gap-1.5">
              <Database size={12} className="-ms-0.5 opacity-60" />
              {bucketLabel}
            </Badge>
          </div>
        </div>

        {/* MIDDLE NAV */}
        <NavigationMenu className="max-md:hidden">
          <NavigationMenuList className="gap-2">
            {navigationLinks.map((link) => {
              const Icon = link.icon
              const isActive = currentPage === link.id
              return (
                <NavigationMenuItem key={link.id}>
                  <NavigationMenuLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      onNavigate(link.id)
                    }}
                    active={isActive}
                    className="flex-row items-center gap-2 py-1.5 font-medium"
                  >
                    <Icon size={16} className="text-muted-foreground/80" />
                    <span>{link.label}</span>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              )
            })}
          </NavigationMenuList>
        </NavigationMenu>

        {/* RIGHT SIDE: fuzzy GeoJSON search */}
        <div className="flex flex-1 items-center justify-end">
          {geojson ? (
            <SearchCommand geojson={geojson} onSearch={handleSearch} />
          ) : (
            <div className="text-sm text-muted-foreground opacity-60">
              Loading…
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
