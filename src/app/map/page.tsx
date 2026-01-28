"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import Link from "next/link";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { StatusBadge, WarriorStatus } from "@/components/status-selector";
import { MapWarriorListPanel } from "@/components/map-warrior-list-panel";

interface ViewportBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

// Note: In production, use environment variable
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

function MapContent() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [selectedWarrior, setSelectedWarrior] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<WarriorStatus | "all">("all");
  const [mapReady, setMapReady] = useState(false);
  const [viewportBounds, setViewportBounds] = useState<ViewportBounds | null>(null);

  const warriors = useQuery(api.warriors.getPublicWarriors, {
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: 100,
  });

  // Filter warriors by current viewport
  const warriorsInView = useMemo(() => {
    if (!warriors || !viewportBounds) return [];
    return warriors.filter((warrior) => {
      const loc = warrior.account?.location;
      if (!loc?.latitude || !loc?.longitude) return false;
      return (
        loc.latitude >= viewportBounds.south &&
        loc.latitude <= viewportBounds.north &&
        loc.longitude >= viewportBounds.west &&
        loc.longitude <= viewportBounds.east
      );
    });
  }, [warriors, viewportBounds]);

  // Handle clicking a warrior in the list panel
  const handleWarriorListClick = (warrior: any) => {
    const loc = warrior.account?.location;
    if (!loc?.longitude || !loc?.latitude || !map.current) return;

    map.current.flyTo({
      center: [loc.longitude, loc.latitude],
      zoom: 12,
      duration: 1500,
    });
    setSelectedWarrior(warrior);
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    if (!mapboxgl.accessToken) {
      console.warn("Mapbox token not set. Map will not display.");
      return;
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-98.5795, 39.8283], // Center of US
      zoom: 3,
    });

    map.current.on("load", () => {
      setMapReady(true);
      // Set initial viewport bounds
      const bounds = map.current!.getBounds();
      setViewportBounds({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });
    });

    // Update viewport bounds when map is panned/zoomed
    map.current.on("moveend", () => {
      const bounds = map.current!.getBounds();
      setViewportBounds({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Add geolocation control
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: true,
        showUserHeading: true,
      }),
      "top-right"
    );

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Add markers for warriors
  useEffect(() => {
    if (!map.current || !mapReady || !warriors) return;

    // Remove existing markers
    const existingMarkers = document.querySelectorAll(".warrior-marker");
    existingMarkers.forEach((m) => m.remove());

    // Add new markers
    warriors.forEach((warrior) => {
      if (!warrior.account?.location) return;

      const { latitude, longitude } = warrior.account.location;

      // Create custom marker element
      const el = document.createElement("div");
      el.className = "warrior-marker";
      el.style.cssText = `
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: white;
        border: 3px solid ${getStatusColor(warrior.currentStatus)};
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 20px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      `;
      el.innerHTML = getStatusEmoji(warrior.currentStatus);

      el.addEventListener("click", () => {
        setSelectedWarrior(warrior);
      });

      new mapboxgl.Marker(el)
        .setLngLat([longitude, latitude])
        .addTo(map.current!);
    });
  }, [warriors, mapReady]);

  const getStatusColor = (status: WarriorStatus) => {
    const colors: Record<WarriorStatus, string> = {
      thriving: "#7cb086",
      stable: "#4a90a4",
      struggling: "#e5a85f",
      hospitalized: "#d97459",
      needsSupport: "#9b7ebd",
      feather: "#a8a8a8",
    };
    return colors[status] || "#a8a8a8";
  };

  const getStatusEmoji = (status: WarriorStatus) => {
    const emojis: Record<WarriorStatus, string> = {
      thriving: "🌟",
      stable: "💙",
      struggling: "🌧️",
      hospitalized: "🏥",
      needsSupport: "💜",
      feather: "🪶",
    };
    return emojis[status] || "❓";
  };

  const statusOptions: { value: WarriorStatus | "all"; label: string }[] = [
    { value: "all", label: "All Warriors" },
    { value: "thriving", label: "Thriving" },
    { value: "stable", label: "Stable" },
    { value: "struggling", label: "Struggling" },
    { value: "hospitalized", label: "Hospitalized" },
    { value: "needsSupport", label: "Needs Support" },
  ];

  return (
    <div className="h-[calc(100vh-56px)] relative">
      {/* Filter Bar */}
      <div className="absolute top-4 left-4 right-4 md:left-4 md:right-auto z-10 bg-white rounded-lg shadow-lg p-2 flex flex-wrap gap-2">
        {statusOptions.map((option) => (
          <Button
            key={option.value}
            size="sm"
            variant={statusFilter === option.value ? "default" : "outline"}
            onClick={() => setStatusFilter(option.value)}
          >
            {option.value !== "all" && (
              <span className="mr-1">{getStatusEmoji(option.value as WarriorStatus)}</span>
            )}
            {option.label}
          </Button>
        ))}
      </div>

      {/* Warrior List Panel */}
      <MapWarriorListPanel
        warriors={warriorsInView}
        selectedWarriorId={selectedWarrior?._id}
        onWarriorClick={handleWarriorListClick}
        className="absolute top-20 left-4 z-10 max-h-[calc(100vh-200px)]"
      />

      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* No token warning */}
      {!mapboxgl.accessToken && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <p className="text-lg font-medium mb-2">Map Configuration Needed</p>
              <p className="text-muted-foreground mb-4">
                Please set your Mapbox access token in the environment variables
                (NEXT_PUBLIC_MAPBOX_TOKEN) to enable the map feature.
              </p>
              <Link
                href="https://www.mapbox.com/"
                target="_blank"
                className="text-primary hover:underline"
              >
                Get a Mapbox token
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Warrior Preview Card */}
      {selectedWarrior && (
        <div className="absolute bottom-20 left-4 right-4 md:bottom-4 md:left-auto md:right-4 md:w-80 z-10">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={selectedWarrior.profilePhoto} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {selectedWarrior.name?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{selectedWarrior.name}</CardTitle>
                    <StatusBadge status={selectedWarrior.currentStatus} size="sm" />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedWarrior(null)}
                >
                  &times;
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {selectedWarrior.condition && (
                <p className="text-sm text-muted-foreground mb-2">
                  {selectedWarrior.condition}
                </p>
              )}
              {selectedWarrior.account?.location?.city && (
                <p className="text-sm text-muted-foreground mb-3">
                  📍 {selectedWarrior.account.location.city}
                  {selectedWarrior.account.location.state &&
                    `, ${selectedWarrior.account.location.state}`}
                </p>
              )}
              <div className="flex gap-2">
                <Link href={`/profile/${selectedWarrior.accountId}`} className="flex-1">
                  <Button variant="outline" className="w-full">
                    View Profile
                  </Button>
                </Link>
                <Link href={`/messages?to=${selectedWarrior.accountId}`} className="flex-1">
                  <Button className="w-full">Send Message</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function MapPage() {
  return (
    <>
      <AuthLoading>
        <div className="flex items-center justify-center min-h-screen">
          <p>Loading...</p>
        </div>
      </AuthLoading>
      <Unauthenticated>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Please sign in</h1>
            <Link href="/signin">
              <Button>Sign In</Button>
            </Link>
          </div>
        </div>
      </Unauthenticated>
      <Authenticated>
        <MapContent />
      </Authenticated>
    </>
  );
}
