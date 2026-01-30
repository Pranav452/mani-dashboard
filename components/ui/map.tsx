"use client"

import { useEffect, useRef, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from "react-leaflet"
import L from "leaflet"
import { cn } from "@/lib/utils"

// Fix for default marker icons in Next.js
if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  })
}

function MapBounds({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap()
  
  useEffect(() => {
    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20] })
    }
  }, [map, bounds])
  
  return null
}

interface MapProps {
  markers?: Array<{ lat: number; lng: number; label: string; popup?: string }>
  routes?: Array<{ from: [number, number]; to: [number, number]; label?: string; shipments?: number }>
  className?: string
  height?: string
}

export function Map({ markers = [], routes = [], className, height = "400px" }: MapProps) {
  const [mounted, setMounted] = useState(false)
  const boundsRef = useRef<L.LatLngBounds | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (markers.length > 0 && typeof window !== "undefined") {
      boundsRef.current = L.latLngBounds(
        markers.map(m => [m.lat, m.lng])
      )
    }
  }, [markers])

  if (!mounted) {
    return (
      <div className={cn("flex items-center justify-center bg-slate-50 rounded-lg", className)} style={{ height }}>
        <span className="text-slate-400 text-sm">Loading map...</span>
      </div>
    )
  }

  if (markers.length === 0) {
    return (
      <div className={cn("flex items-center justify-center bg-slate-50 rounded-lg", className)} style={{ height }}>
        <span className="text-slate-400 text-sm">No location data available</span>
      </div>
    )
  }

  const center: [number, number] = markers.length > 0 
    ? [markers[0].lat, markers[0].lng]
    : [20, 0]

  return (
    <div className={cn("rounded-lg overflow-hidden border border-slate-200", className)} style={{ height, position: "relative" }}>
      <MapContainer
        center={center}
        zoom={markers.length === 1 ? 5 : 2}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%", zIndex: 0 }}
        key={markers.length}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {boundsRef.current && <MapBounds bounds={boundsRef.current} />}
        {routes.map((route, idx) => (
          <Polyline
            key={`route-${idx}`}
            positions={[route.from, route.to]}
            pathOptions={{
              color: '#3b82f6',
              weight: 2,
              opacity: 0.6,
              dashArray: '5, 10'
            }}
          >
            {route.label && (
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{route.label}</div>
                  {route.shipments && <div className="text-slate-600 mt-1">{route.shipments} shipments</div>}
                </div>
              </Popup>
            )}
          </Polyline>
        ))}
        {markers.map((marker, idx) => (
          <Marker key={idx} position={[marker.lat, marker.lng]}>
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{marker.label}</div>
                {marker.popup && <div className="text-slate-600 mt-1">{marker.popup}</div>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

