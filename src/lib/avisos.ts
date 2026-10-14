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

/** Melodía alegre (cuando una socia acepta el pedido del cliente). */
export function sonarCelebracion() {
  if (!audio) return;
  const t = audio.currentTime;
  [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.38]].forEach(([f, d]) => {
    const o = audio!.createOscillator(), g = audio!.createGain();
    o.type = "triangle";
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t + d);
    g.gain.exponentialRampToValueAtTime(0.35, t + d + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.45);
    o.connect(g).connect(audio!.destination);
    o.start(t + d); o.stop(t + d + 0.5);
  });
}

export function sonar() {
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

// Clave pública VAPID (no es secreta): identifica a Una Manito ante el servicio de notificaciones del navegador.
const CLAVE_PUSH = "BODyJAWPki_e3q8I9eNPdyfrjyAd4pWvFLEWt3M8wTU6piv07d3fdW7zFawjNscB8rQ6gPElrqXI6x9_lr3IGhw";
const aBytes = (b64: string) => {
  const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

/** Suscribe este dispositivo a notificaciones push y devuelve los datos para guardarlos en el servidor. */
export async function suscribirPush(): Promise<{ endpoint: string; p256dh: string; auth: string } | null> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || Notification.permission !== "granted") return null;
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aBytes(CLAVE_PUSH) }));
    const j = sub.toJSON();
    return j.endpoint && j.keys ? { endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth } : null;
  } catch { return null; }
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
