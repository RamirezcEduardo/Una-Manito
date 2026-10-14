"use client";
import { useEffect, useRef } from "react";
import { prepararSonido, suscribirPush, usePermisoAvisos } from "@/lib/avisos";
import { useDatos } from "@/lib/store";

/**
 * Pide permiso de notificaciones y deja este dispositivo suscrito a avisos push
 * (llegan aunque la app esté cerrada). Si ya hay permiso, solo renueva la suscripción en silencio.
 */
export function ActivarAvisos({ texto }: { texto: string }) {
  const { sesion, guardarSuscripcion } = useDatos();
  const { permiso, pedir } = usePermisoAvisos();
  const hecho = useRef(false);
  useEffect(() => {
    if (permiso !== "granted" || !sesion || hecho.current) return;
    hecho.current = true;
    suscribirPush().then((s) => s && guardarSuscripcion(s).catch(() => {}));
  }, [permiso, sesion, guardarSuscripcion]);
  if (permiso === "default") {
    return <button onClick={() => { prepararSonido(); void pedir(); }} className="btn border-2 border-acento bg-acento-claro text-tinta">🔔 {texto}</button>;
  }
  if (permiso === "denied") {
    return <p className="rounded-xl bg-acento-claro p-3 text-sm">🔕 Las notificaciones están bloqueadas. Actívalas en los ajustes del navegador (Notificaciones → Permitir) para enterarte aunque la app esté cerrada.</p>;
  }
  return null;
}
