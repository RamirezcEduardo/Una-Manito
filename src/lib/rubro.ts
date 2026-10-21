"use client";
// Rubro activo (Hogar o Belleza). Cambia los colores de toda la app y el logo: Belleza se ve en rosado.
import { useEffect, useState } from "react";
import type { Rubro } from "./tipos";

const CLAVE = "una-manito-rubro";
const EVENTO = "una-manito-rubro";

const leer = (): Rubro => {
  try { return localStorage.getItem(CLAVE) === "belleza" ? "belleza" : "hogar"; } catch { return "hogar"; }
};

export function fijarRubro(r: Rubro) {
  try { localStorage.setItem(CLAVE, r); } catch {}
  document.documentElement.dataset.rubro = r;
  window.dispatchEvent(new Event(EVENTO));
}

/** Rubro actual. Si se pasa `forzar` (p. ej. el rubro de un pedido abierto), la app cambia a ese rubro. */
export function useRubro(forzar?: Rubro) {
  const [rubro, setRubro] = useState<Rubro>("hogar");
  useEffect(() => {
    if (forzar) fijarRubro(forzar);
    const actualizar = () => { const r = leer(); setRubro(r); document.documentElement.dataset.rubro = r; };
    actualizar();
    window.addEventListener(EVENTO, actualizar);
    return () => window.removeEventListener(EVENTO, actualizar);
  }, [forzar]);
  return rubro;
}

export const LOGO: Record<Rubro, string> = { hogar: "/icono.svg", belleza: "/icono-belleza.svg" };
