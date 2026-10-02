"use client";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

const icono = L.divIcon({ html: '<div style="font-size:36px;line-height:1">📍</div>', className: "", iconSize: [36, 36], iconAnchor: [18, 34] });

// Mueve el mapa cuando el punto cambia desde fuera (búsqueda, "mi ubicación").
function Seguir({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (!map.getBounds().pad(-0.2).contains([lat, lng])) map.setView([lat, lng], Math.max(map.getZoom(), 16));
  }, [lat, lng, map]);
  return null;
}

function Clicks({ onPick }: { onPick?: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick?.(e.latlng.lat, e.latlng.lng) });
  return null;
}

export default function Mapa({ lat, lng, onPick, alto = 220 }: { lat: number; lng: number; onPick?: (lat: number, lng: number) => void; alto?: number }) {
  return (
    <MapContainer center={[lat, lng]} zoom={14} style={{ height: alto, width: "100%", borderRadius: 20 }} scrollWheelZoom={false}>
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={[lat, lng]} icon={icono} draggable={!!onPick}
        eventHandlers={{ dragend: (e) => { const p = (e.target as L.Marker).getLatLng(); onPick?.(p.lat, p.lng); } }} />
      <Clicks onPick={onPick} />
      <Seguir lat={lat} lng={lng} />
    </MapContainer>
  );
}
