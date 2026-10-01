"use client";
import dynamic from "next/dynamic";
// Leaflet usa `window`, así que se carga solo en el navegador.
export const Mapa = dynamic(() => import("./Mapa"), {
  ssr: false,
  loading: () => <div className="h-[220px] animate-pulse rounded-[20px] bg-marca-claro" />,
});
