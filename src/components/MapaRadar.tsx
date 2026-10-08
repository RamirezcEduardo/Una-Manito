"use client";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { gananciaSocia, LIMA, soles } from "@/lib/config";
import type { Pedido } from "@/lib/tipos";

// La socia: punto con ondas de radar alrededor.
const iconoSocia = L.divIcon({
  className: "",
  iconSize: [160, 160],
  iconAnchor: [80, 80],
  html: `<div style="position:relative;width:160px;height:160px">
    <div class="radar-onda" style="position:absolute;inset:0;border-radius:9999px;border:3px solid #4da3ff"></div>
    <div class="radar-onda" style="position:absolute;inset:0;border-radius:9999px;border:3px solid #4da3ff;animation-delay:1s"></div>
    <div class="radar-onda" style="position:absolute;inset:0;border-radius:9999px;border:3px solid #4da3ff;animation-delay:2s"></div>
    <div style="position:absolute;left:62px;top:62px;width:36px;height:36px;border-radius:9999px;background:#0b6ef0;border:5px solid #fff;box-shadow:0 0 0 6px rgba(11,110,240,.35)"></div>
  </div>`,
});

// La casa del cliente (cuando el cliente espera a su socia).
const iconoCasa = L.divIcon({
  className: "",
  iconSize: [160, 160],
  iconAnchor: [80, 80],
  html: `<div style="position:relative;width:160px;height:160px">
    <div class="radar-onda" style="position:absolute;inset:0;border-radius:9999px;border:3px solid #f6a01a"></div>
    <div class="radar-onda" style="position:absolute;inset:0;border-radius:9999px;border:3px solid #f6a01a;animation-delay:1s"></div>
    <div class="radar-onda" style="position:absolute;inset:0;border-radius:9999px;border:3px solid #f6a01a;animation-delay:2s"></div>
    <div style="position:absolute;left:52px;top:52px;width:56px;height:56px;border-radius:9999px;background:#fff;border:4px solid #f6a01a;display:flex;align-items:center;justify-content:center;font-size:28px;box-shadow:0 6px 16px rgba(0,0,0,.3)">🏠</div>
  </div>`,
});

// Cada pedido: globo naranja con lo que gana la socia.
const iconoPedido = (monto: string) => L.divIcon({
  className: "",
  iconSize: [110, 56],
  iconAnchor: [55, 56],
  html: `<div class="radar-punto" style="display:flex;flex-direction:column;align-items:center">
    <div style="background:#f6a01a;color:#0b1f44;font-weight:900;font-size:15px;padding:6px 10px;border-radius:14px;box-shadow:0 6px 16px rgba(0,0,0,.35);white-space:nowrap">🧹 ${monto}</div>
    <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:10px solid #f6a01a"></div>
  </div>`,
});

/** Encuadra el mapa para que se vean la socia y todos los pedidos. */
function Encuadre({ puntos }: { puntos: [number, number][] }) {
  const map = useMap();
  const clave = puntos.map((p) => p.join(",")).join("|");
  useEffect(() => {
    // Espera a que el contenedor tenga su tamaño final antes de encuadrar.
    const t = setTimeout(() => {
      map.invalidateSize();
      if (puntos.length > 1) map.fitBounds(L.latLngBounds(puntos), { paddingTopLeft: [60, 80], paddingBottomRight: [60, 120], maxZoom: 15 });
      else if (puntos.length === 1) map.setView(puntos[0], 14);
    }, 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, map]);
  return null;
}

/** Mapa real de Lima con la ubicación de la socia (si la comparte) y los pedidos cercanos. */
export default function MapaRadar({ pedidos = [], onElegir, alto = 340, casa }: {
  pedidos?: Pedido[]; onElegir?: (p: Pedido) => void; alto?: number;
  /** Si se pasa, el centro es la casa del cliente (no se pide la ubicación del dispositivo). */
  casa?: [number, number];
}) {
  const [yo, setYo] = useState<[number, number] | null>(null);
  useEffect(() => {
    if (casa) return;
    navigator.geolocation?.getCurrentPosition((p) => setYo([p.coords.latitude, p.coords.longitude]), () => {}, { timeout: 8000, maximumAge: 60_000 });
  }, [casa]);
  const centro: [number, number] = casa ?? yo ?? [LIMA.lat, LIMA.lng];
  const puntos: [number, number][] = [centro, ...pedidos.map((p) => [p.ubicacion.lat, p.ubicacion.lng] as [number, number])];
  return (
    <MapContainer center={centro} zoom={12} zoomControl={false} attributionControl={false} style={{ height: alto, width: "100%" }} scrollWheelZoom={false}>
      <TileLayer attribution='&copy; OpenStreetMap &copy; CARTO' url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
      <Marker position={centro} icon={casa ? iconoCasa : iconoSocia} interactive={false} />
      {pedidos.map((p) => (
        <Marker key={p.id} position={[p.ubicacion.lat, p.ubicacion.lng]} icon={iconoPedido(soles(gananciaSocia(p)))} eventHandlers={{ click: () => onElegir?.(p) }} />
      ))}
      <Encuadre puntos={puntos} />
    </MapContainer>
  );
}
