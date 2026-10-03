"use client";
// Avisos de pedidos nuevos para la socia mientras tiene la app abierta:
// sonido, vibración y notificación del sistema (si dio permiso).
import { useEffect, useRef, useState } from "react";

let audio: AudioContext | null = null;

/** Los navegadores solo dejan sonar después de un toque: llamar en un clic. */
export function prepararSonido() {
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume();
  } catch {}
}

function sonar() {
  if (!audio) return;
  const t = audio.currentTime;
  // Dos tonos cortos tipo "ding-dong".
  [[880, 0], [660, 0.22]].forEach(([f, d]) => {
    const o = audio!.createOscillator(), g = audio!.createGain();
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t + d);
    g.gain.exponentialRampToValueAtTime(0.4, t + d + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.35);
    o.connect(g).connect(audio!.destination);
    o.start(t + d); o.stop(t + d + 0.4);
  });
}

async function notificar(titulo: string, cuerpo: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    // En Android las notificaciones deben salir desde el service worker.
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(titulo, { body: cuerpo, icon: "/icono-192.png", badge: "/icono-192.png", tag: "pedido-nuevo", data: { url: "/socia" } });
    else new Notification(titulo, { body: cuerpo, icon: "/icono-192.png" });
  } catch {}
}

export type PermisoAvisos = "no-soportado" | "default" | "granted" | "denied";

export function usePermisoAvisos() {
  const [permiso, setPermiso] = useState<PermisoAvisos>("default");
  useEffect(() => {
    setPermiso(typeof Notification === "undefined" ? "no-soportado" : Notification.permission);
  }, []);
  const pedir = async () => {
    prepararSonido();
    if (typeof Notification === "undefined") return;
    setPermiso(await Notification.requestPermission());
  };
  return { permiso, pedir };
}

/** Avisa cuando aparecen pedidos que antes no estaban en la lista. */
export function useAvisoPedidosNuevos(pedidos: { id: string; texto: string }[], activo: boolean) {
  const vistos = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!activo) { vistos.current = null; return; }
    const ids = new Set(pedidos.map((p) => p.id));
    // La primera vez solo se recuerda lo que ya había (no se avisa).
    if (vistos.current) {
      const nuevos = pedidos.filter((p) => !vistos.current!.has(p.id));
      if (nuevos.length) {
        sonar();
        navigator.vibrate?.([300, 120, 300]);
        void notificar(nuevos.length === 1 ? "¡Nuevo pedido cerca de ti!" : `¡${nuevos.length} pedidos nuevos cerca de ti!`, nuevos[0].texto);
      }
    }
    vistos.current = ids;
  }, [pedidos, activo]);
}
