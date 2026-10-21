"use client";
// Rubro activo (Hogar o Belleza). Cambia los colores de toda la app y el logo: Belleza se ve en rosado.
// No se guarda: al abrir la app o volver al inicio, siempre se ve con los colores de la marca.
import { useEffect, useState } from "react";
import type { Rubro } from "./tipos";

const EVENTO = "una-manito-rubro";
const leer = (): Rubro => (document.documentElement.dataset.rubro === "belleza" ? "belleza" : "hogar");

export function fijarRubro(r: Rubro) {
  document.documentElement.dataset.rubro = r;
  window.dispatchEvent(new Event(EVENTO));
}

/** Rubro actual. Si se pasa `forzar` (p. ej. el de la pantalla o el pedido abierto), la app cambia a ese rubro. */
export function useRubro(forzar?: Rubro) {
  const [rubro, setRubro] = useState<Rubro>("hogar");
  useEffect(() => {
    if (forzar) fijarRubro(forzar);
    const actualizar = () => setRubro(leer());
    actualizar();
    window.addEventListener(EVENTO, actualizar);
    return () => window.removeEventListener(EVENTO, actualizar);
  }, [forzar]);
  return rubro;
}

export const LOGO: Record<Rubro, string> = { hogar: "/icono.svg", belleza: "/icono-belleza.svg" };
