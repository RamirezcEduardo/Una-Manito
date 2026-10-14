"use client";
import { useEffect, useRef, useState } from "react";
import { accion } from "@/components/ui";
import { useDatos } from "@/lib/store";

// Gestos al azar: así no sirve mostrar una foto o un video grabado antes.
const GESTOS = [
  "Gira la cabeza a la derecha y luego a la izquierda",
  "Parpadea dos veces y sonríe",
  "Mira hacia arriba y luego hacia abajo",
  "Acerca la cara a la cámara y luego aléjala",
  "Muestra tu mano con tres dedos junto a tu cara",
  "Inclina la cabeza hacia tu hombro izquierdo",
];
const SEGUNDOS = 4;

/**
 * Graba un video corto con la cámara frontal mientras la persona hace un gesto elegido al azar.
 * Si el navegador no permite grabar, ofrece abrir la cámara del celular para grabarlo.
 */
export function PruebaDeVida({ onListo }: { onListo: (video: Blob | null, gesto: string) => void }) {
  const [gesto] = useState(() => GESTOS[Math.floor(Math.random() * GESTOS.length)]);
  const [fase, setFase] = useState<"inicio" | "preparando" | "grabando" | "listo" | "sin-camara">("inicio");
  const [cuenta, setCuenta] = useState(SEGUNDOS);
  const [vista, setVista] = useState<string>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const flujo = useRef<MediaStream | null>(null);

  useEffect(() => () => flujo.current?.getTracks().forEach((t) => t.stop()), []);

  const terminar = (blob: Blob) => {
    flujo.current?.getTracks().forEach((t) => t.stop());
    setVista(URL.createObjectURL(blob));
    setFase("listo");
    onListo(blob, gesto);
  };

  const empezar = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { setFase("sin-camara"); return; }
    try {
      setFase("preparando");
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 640 } }, audio: false });
      flujo.current = s;
      if (videoRef.current) { videoRef.current.srcObject = s; await videoRef.current.play().catch(() => {}); }
      await new Promise((r) => setTimeout(r, 800));
      const tipo = ["video/mp4", "video/webm;codecs=vp9", "video/webm"].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
      const rec = new MediaRecorder(s, tipo ? { mimeType: tipo, videoBitsPerSecond: 600_000 } : undefined);
      const partes: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && partes.push(e.data);
      rec.onstop = () => terminar(new Blob(partes, { type: rec.mimeType || "video/webm" }));
      rec.start();
      setFase("grabando");
      let n = SEGUNDOS;
      setCuenta(n);
      const t = setInterval(() => { n -= 1; setCuenta(n); if (n <= 0) { clearInterval(t); rec.stop(); } }, 1000);
    } catch {
      flujo.current?.getTracks().forEach((t) => t.stop());
      setFase("sin-camara");
    }
  };

  const repetir = () => { setVista(undefined); onListo(null, gesto); setFase("inicio"); };

  return (
    <div className="space-y-3 rounded-2xl bg-marca-claro p-4">
      <p className="font-bold">🎥 Prueba de vida</p>
      <p className="rounded-xl bg-white p-3 text-center text-lg font-extrabold text-marca-oscuro">“{gesto}”</p>
      {(fase === "preparando" || fase === "grabando") && (
        <div className="relative mx-auto aspect-[3/4] w-full max-w-[260px] overflow-hidden rounded-2xl bg-black">
          <video ref={videoRef} muted playsInline className="h-full w-full -scale-x-100 object-cover" />
          <div className="pointer-events-none absolute inset-6 rounded-[50%] border-4 border-white/80" />
          {fase === "grabando" && <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-sm font-bold text-white"><span className="radar-punto h-2 w-2 rounded-full bg-white" />{cuenta}s</span>}
        </div>
      )}
      {fase === "listo" && vista && (
        <>
          <video src={vista} controls playsInline className="mx-auto aspect-[3/4] w-full max-w-[260px] rounded-2xl bg-black object-cover" />
          <p className="text-center font-semibold text-green-700">✅ Video listo</p>
          <button type="button" className="w-full font-semibold text-marca" onClick={repetir}>Grabar otra vez</button>
        </>
      )}
      {fase === "inicio" && (
        <>
          <p className="text-sm text-suave">Pon tu cara dentro del óvalo, con buena luz y sin lentes oscuros. Grabaremos {SEGUNDOS} segundos mientras haces el gesto.</p>
          <button type="button" className="btn-primario" onClick={empezar}>Empezar a grabar</button>
        </>
      )}
      {fase === "sin-camara" && (
        <label className="btn-primario block cursor-pointer text-center">
          Abrir la cámara del celular
          <input type="file" accept="video/*" capture="user" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) terminar(f); }} />
        </label>
      )}
      <p className="text-xs text-suave">🔒 Solo el equipo de Una Manito lo revisa y se borra apenas se verifica tu identidad.</p>
    </div>
  );
}

/** Estado de la verificación de la persona (y opción de grabarla si falta o fue rechazada). */
export function MiVerificacion() {
  const { sesion, verificaciones, usuarios, enviarVerificacion } = useDatos();
  const [vida, setVida] = useState<{ video: Blob; gesto: string } | null>(null);
  const v = verificaciones.find((x) => x.usuarioId === sesion?.id);
  const verificado = usuarios.find((u) => u.id === sesion?.id)?.verificado || v?.estado === "aprobada";
  if (verificado) return <p className="tarjeta bg-green-50 font-bold text-green-800">✅ Identidad verificada</p>;
  if (v?.estado === "pendiente") return <p className="tarjeta bg-acento-claro font-semibold">⏳ Estamos revisando tu prueba de vida. Te avisaremos pronto.</p>;
  return (
    <div className="tarjeta space-y-3">
      <p className="font-bold">🛡️ Verifica tu identidad</p>
      {v?.estado === "rechazada" && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">No pudimos verificarte{v.motivo ? `: ${v.motivo}` : ""}. Graba otro video, por favor.</p>}
      <PruebaDeVida onListo={(b, g) => setVida(b ? { video: b, gesto: g } : null)} />
      <button className="btn-primario" disabled={!vida} onClick={() => vida && accion(() => enviarVerificacion(vida.video, vida.gesto))}>Enviar para revisión</button>
    </div>
  );
}

/** Video privado para el equipo (URL temporal). */
export function VideoVerificacion({ ruta }: { ruta: string }) {
  const { verVideoVerificacion } = useDatos();
  const [url, setUrl] = useState<string>();
  useEffect(() => { verVideoVerificacion(ruta).then(setUrl).catch(() => {}); }, [ruta, verVideoVerificacion]);
  return url ? <video src={url} controls playsInline className="aspect-[3/4] w-full max-w-[220px] rounded-2xl bg-black object-cover" />
    : <div className="aspect-[3/4] w-full max-w-[220px] animate-pulse rounded-2xl bg-gray-200" />;
}
