"use client";
import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet";
import { LIMA } from "@/lib/config";
import type { Pedido } from "@/lib/tipos";

const COLOR: Record<string, string> = { terminado: "#16a34a", cancelado: "#9ca3af", buscando: "#f6a01a" };

/** Cada pedido es un punto: verde terminado, naranja sin socia, gris cancelado, azul en proceso. */
export default function MapaDemanda({ pedidos }: { pedidos: Pedido[] }) {
  return (
    <MapContainer center={[LIMA.lat, LIMA.lng]} zoom={11} style={{ height: 380, width: "100%", borderRadius: 16 }} scrollWheelZoom={false}>
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {pedidos.map((p) => (
        <CircleMarker key={p.id} center={[p.ubicacion.lat, p.ubicacion.lng]} radius={7}
          pathOptions={{ color: "#fff", weight: 1.5, fillColor: COLOR[p.estado] ?? "#0b6ef0", fillOpacity: 0.8 }}>
          <Tooltip>{p.ubicacion.distrito} · {p.estado.replace("_", " ")}</Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
