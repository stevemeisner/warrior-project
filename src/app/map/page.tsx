"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
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
import Supercluster from "supercluster";

export interface ViewportBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export function isWithinBounds(
  lat: number,
  lng: number,
  bounds: ViewportBounds
): boolean {
  const latInRange = lat >= bounds.south && lat <= bounds.north;
  const lngInRange = bounds.west <= bounds.east
    ? lng >= bounds.west && lng <= bounds.east
    : lng >= bounds.west || lng <= bounds.east;
  return latInRange && lngInRange;
}

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

const STATUS_COLORS: Record<WarriorStatus, string> = {
  thriving: "#7cb086",
  stable: "#4a90a4",
  struggling: "#e5a85f",
  hospitalized: "#d97459",
  needsSupport: "#9b7ebd",
  feather: "#a8a8a8",
};

const STATUS_EMOJIS: Record<WarriorStatus, string> = {
  thriving: "\ud83c\udf1f",
  stable: "\ud83d\udc99",
  struggling: "\ud83c\udf27\ufe0f",
  hospitalized: "\ud83c\udfe5",
  needsSupport: "\ud83d\udc9c",
  feather: "\ud83e\udeb6",
};

interface WarriorPoint {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    warriorId: string;
    name: string;
    status: WarriorStatus;
    condition?: string;
    profilePhoto?: string;
    accountId: string;
    city?: string;
    state?: string;
  };
}

function MapContent() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const [selectedWarrior, setSelectedWarrior] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<WarriorStatus | "all">("all");
  const [mapReady, setMapReady] = useState(false);
  const [viewportBounds, setViewportBounds] = useState<ViewportBounds | null>(null);
  const [zoom, setZoom] = useState(3);

  const warriors = useQuery(api.warriors.getPublicWarriors, {
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: 100,
  });

  // Build GeoJSON features from warriors
  const warriorFeatures: WarriorPoint[] = useMemo(() => {
    if (!warriors) return [];
    return warriors
      .filter((w) => w.account?.location?.latitude != null && w.account?.location?.longitude != null)
      .map((w) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [w.account!.location!.longitude!, w.account!.location!.latitude!] as [number, number],
        },
        properties: {
          warriorId: w._id,
          name: w.name,
          status: w.currentStatus as WarriorStatus,
          condition: w.condition,
          profilePhoto: w.profilePhoto,
          accountId: w.accountId,
          city: w.account?.location?.city,
          state: w.account?.location?.state,
        },
      }));
  }, [warriors]);

  // Create supercluster instance
  const cluster = useMemo(() => {
    const sc = new Supercluster({
      radius: 60,
      maxZoom: 14,
    });
    sc.load(warriorFeatures);
    return sc;
  }, [warriorFeatures]);

  // Get clusters for current viewport
  const clusters = useMemo(() => {
    if (!viewportBounds || !cluster) return [];
    return cluster.getClusters(
      [viewportBounds.west, viewportBounds.south, viewportBounds.east, viewportBounds.north],
      Math.floor(zoom)
    );
  }, [cluster, viewportBounds, zoom]);

  // Filter warriors by current viewport (for the list panel)
  const warriorsInView = useMemo(() => {
    if (!warriors || !viewportBounds) return [];
    return warriors.filter((warrior) => {
      const loc = warrior.account?.location;
      if (loc?.latitude == null || loc?.longitude == null) return false;
      return isWithinBounds(loc.latitude, loc.longitude, viewportBounds);
    });
  }, [warriors, viewportBounds]);

  const handleWarriorListClick = (warrior: any) => {
    const loc = warrior.account?.location;
    if (loc?.longitude == null || loc?.latitude == null || !map.current) return;
    map.current.flyTo({
      center: [loc.longitude, loc.latitude],
      zoom: 12,
      duration: 1500,
    });
    setSelectedWarrior(warrior);
  };

  const updateViewport = useCallback(() => {
    if (!map.current) return;
    const bounds = map.current.getBounds();
    if (bounds) {
      setViewportBounds({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });
    }
    setZoom(map.current.getZoom());
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    if (!mapboxgl.accessToken) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-98.5795, 39.8283],
      zoom: 3,
    });

    map.current.on("load", () => {
      setMapReady(true);
      updateViewport();
    });

    map.current.on("moveend", updateViewport);
    map.current.on("zoomend", updateViewport);

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true,
      }),
      "top-right"
    );

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [updateViewport]);

  // Render clusters and markers (keyed cache — only add/remove changed markers)
  useEffect(() => {
    if (!map.current || !mapReady) return;

    const nextKeys = new Set<string>();

    clusters.forEach((feature) => {
      const [lng, lat] = feature.geometry.coordinates;
      const key = feature.properties.cluster
        ? `cluster-${feature.properties.cluster_id}`
        : `warrior-${(feature.properties as WarriorPoint["properties"]).warriorId}`;

      nextKeys.add(key);

      // Skip if marker already exists at this key
      if (markersRef.current.has(key)) return;

      if (feature.properties.cluster) {
        // Cluster marker
        const count = feature.properties.point_count;
        const el = document.createElement("div");
        el.className = "cluster-marker";
        const size = Math.min(60, 30 + Math.log2(count) * 8);
        el.style.cssText = `
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-weight: bold;
          font-size: ${Math.max(12, size / 3)}px;
          box-shadow: 0 3px 8px rgba(99,102,241,0.4);
          border: 3px solid rgba(255,255,255,0.8);
          transition: transform 0.2s;
        `;
        el.textContent = String(count);
        el.addEventListener("mouseenter", () => { el.style.transform = "scale(1.1)"; });
        el.addEventListener("mouseleave", () => { el.style.transform = "scale(1)"; });

        el.addEventListener("click", () => {
          if (!map.current) return;
          const expansionZoom = cluster.getClusterExpansionZoom(feature.properties.cluster_id);
          map.current.flyTo({
            center: [lng, lat],
            zoom: Math.min(expansionZoom, 16),
            duration: 800,
          });
        });

        const marker = new mapboxgl.Marker(el).setLngLat([lng, lat]).addTo(map.current!);
        markersRef.current.set(key, marker);
      } else {
        // Individual warrior marker
        const props = feature.properties as WarriorPoint["properties"];
        const el = document.createElement("div");
        el.className = "warrior-marker";
        el.style.cssText = `
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: white;
          border: 3px solid ${STATUS_COLORS[props.status] || "#a8a8a8"};
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 20px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          transition: transform 0.2s;
        `;
        el.innerHTML = `<span aria-hidden="true">${STATUS_EMOJIS[props.status] || "?"}</span>`;
        el.addEventListener("mouseenter", () => { el.style.transform = "scale(1.15)"; });
        el.addEventListener("mouseleave", () => { el.style.transform = "scale(1)"; });

        el.addEventListener("click", () => {
          const warrior = warriors?.find((w) => w._id === props.warriorId);
          if (warrior) setSelectedWarrior(warrior);
        });

        const marker = new mapboxgl.Marker(el).setLngLat([lng, lat]).addTo(map.current!);
        markersRef.current.set(key, marker);
      }
    });

    // Remove markers that are no longer in the current clusters
    for (const [key, marker] of markersRef.current) {
      if (!nextKeys.has(key)) {
        marker.remove();
        markersRef.current.delete(key);
      }
    }
  }, [clusters, mapReady, warriors, cluster]);

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
              <span className="mr-1" aria-hidden="true">{STATUS_EMOJIS[option.value as WarriorStatus]}</span>
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
      <div ref={mapContainer} className="w-full h-full" role="application" aria-label="Interactive map showing warrior locations" />

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
          <Card className="shadow-xl border-0 bg-card/95 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                    <AvatarImage src={selectedWarrior.profilePhoto} />
                    <AvatarFallback className="bg-primary/15 text-primary font-semibold">
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
                  aria-label="Close warrior details"
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
        <div className="flex items-center justify-center min-h-screen" role="status" aria-label="Loading map">
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
