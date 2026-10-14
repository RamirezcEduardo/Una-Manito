"use client";
import { useEffect, useRef, useState } from "react";
import { accion } from "@/components/ui";
import { useDatos } from "@/lib/store";
import type { FotoServicio, Pedido } from "@/lib/tipos";

/** Chat entre cliente y socia (sin compartir números). Abierto desde que se acepta hasta 2 días después de terminar. */
export function Chat({ pedido, otroNombre }: { pedido: Pedido; otroNombre: string }) {
  const { mensajes, sesion, enviarMensaje } = useDatos();
  const [texto, setTexto] = useState("");
  const [abierto, setAbierto] = useState(false);
  const fin = useRef<HTMLDivElement>(null);
  const lista = mensajes.filter((m) => m.pedidoId === pedido.id);
  const vistosRef = useRef(0);
  const nuevos = abierto ? 0 : Math.max(0, lista.filter((m) => m.autorId !== sesion?.id).length - vistosRef.current);
  useEffect(() => {
    if (abierto) { vistosRef.current = lista.filter((m) => m.autorId !== sesion?.id).length; fin.current?.scrollIntoView({ block: "nearest" }); }
  }, [abierto, lista, sesion?.id]);
  const activo = !!pedido.sociaId && (["aceptado", "en_camino", "en_curso"].includes(pedido.estado) || pedido.estado === "terminado");
  if (!activo) return null;
  const nombre = otroNombre.split(" ")[0];
  const enviar = () => { const t = texto; if (!t.trim()) return; setTexto(""); accion(() => enviarMensaje(pedido.id, t)); };
  return (
    <div className="tarjeta space-y-3">
      <button className="flex w-full items-center justify-between text-left font-bold" onClick={() => setAbierto(!abierto)}>
        <span>💬 Chat con {nombre}</span>
        <span className="flex items-center gap-2">
          {nuevos > 0 && <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">{nuevos}</span>}
          {abierto ? "▲" : "▼"}
        </span>
      </button>
      {abierto && (
        <>
          <div className="max-h-72 space-y-2 overflow-y-auto rounded-2xl bg-fondo p-3">
            {lista.length === 0 && <p className="text-center text-sm text-suave">Escríbele a {nombre}. Tu número no se comparte.</p>}
            {lista.map((m) => {
              const mio = m.autorId === sesion?.id;
              return (
                <div key={m.id} className={`flex ${mio ? "justify-end" : "justify-start"}`}>
                  <p className={`max-w-[80%] rounded-2xl px-3 py-2 ${mio ? "rounded-br-sm bg-marca text-white" : "rounded-bl-sm bg-white ring-1 ring-black/5"}`}>
                    {m.texto}
                    <span className={`block text-right text-[10px] ${mio ? "text-white/70" : "text-suave"}`}>{new Date(m.creadoEn).toLocaleTimeString("es-PE", { hour: "numeric", minute: "2-digit" })}</span>
                  </p>
                </div>
              );
            })}
            <div ref={fin} />
          </div>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); enviar(); }}>
            <input className="campo !py-2.5" maxLength={1000} placeholder="Escribe un mensaje…" value={texto} onChange={(e) => setTexto(e.target.value)} />
            <button className="shrink-0 rounded-xl bg-marca px-4 font-bold text-white" disabled={!texto.trim()} aria-label="Enviar">➤</button>
          </form>
          <div className="flex flex-wrap gap-2">
            {["¡Ya llegué! 🙋‍♀️", "Estoy en camino 🛵", "Gracias 💚", "¿Me abres, por favor?"].map((r) => (
              <button key={r} type="button" className="rounded-full bg-marca-claro px-3 py-1 text-sm font-semibold text-marca-oscuro" onClick={() => accion(() => enviarMensaje(pedido.id, r))}>{r}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Lista de tareas: la socia las marca durante el servicio; el cliente ve el avance. */
export function TareasServicio({ pedido, editable }: { pedido: Pedido; editable: boolean }) {
  const { marcarTarea } = useDatos();
  const hechas = pedido.tareasHechas ?? [];
  if (pedido.tareas.length === 0 || !["en_curso", "terminado"].includes(pedido.estado)) return null;
  const pct = Math.round((hechas.length / pedido.tareas.length) * 100);
  return (
    <div className="tarjeta space-y-3">
      <div className="flex items-center justify-between"><b>✅ Avance del servicio</b><b className="text-marca">{pct}%</b></div>
      <div className="h-3 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-green-500 transition-all duration-700" style={{ width: `${pct}%` }} /></div>
      <div className="grid grid-cols-2 gap-2">
        {pedido.tareas.map((t) => {
          const hecha = hechas.includes(t);
          return editable ? (
            <button key={t} type="button" onClick={() => accion(() => marcarTarea(pedido.id, t, !hecha))}
              className={`rounded-xl border-2 px-3 py-3 text-left font-semibold ${hecha ? "border-green-500 bg-green-50 text-green-800" : "border-gray-200 bg-white"}`}>
              {hecha ? "✅" : "⬜"} {t}
            </button>
          ) : (
            <p key={t} className={`rounded-xl px-3 py-2 ${hecha ? "bg-green-50 font-semibold text-green-800" : "bg-gray-50 text-suave"}`}>{hecha ? "✅" : "⏳"} {t}</p>
          );
        })}
      </div>
      {editable && pedido.estado === "en_curso" && <p className="text-sm text-suave">Marca cada tarea al terminarla: el cliente ve tu avance.</p>}
    </div>
  );
}

function Miniatura({ foto }: { foto: FotoServicio }) {
  const { verFotoServicio } = useDatos();
  const [url, setUrl] = useState<string>();
  useEffect(() => { verFotoServicio(foto.ruta).then(setUrl).catch(() => {}); }, [foto.ruta, verFotoServicio]);
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={`Foto ${foto.tipo}`} className="aspect-square w-full rounded-xl object-cover" />
    </a>
  ) : <div className="aspect-square w-full animate-pulse rounded-xl bg-gray-100" />;
}

/** Fotos de antes y después: la socia las sube; el cliente y el equipo las ven. */
export function FotosServicio({ pedido, editable }: { pedido: Pedido; editable: boolean }) {
  const { subirFotoServicio } = useDatos();
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const fotos = pedido.fotos ?? [];
  if (!["en_curso", "terminado"].includes(pedido.estado) || (!editable && fotos.length === 0)) return null;
  return (
    <div className="tarjeta space-y-3">
      <b>📸 Fotos del servicio</b>
      {(["antes", "despues"] as const).map((tipo) => {
        const delTipo = fotos.filter((f) => f.tipo === tipo);
        return (
          <div key={tipo} className="space-y-2">
            <p className="text-sm font-semibold text-suave">{tipo === "antes" ? "Antes" : "Después"}</p>
            <div className="grid grid-cols-3 gap-2">
              {delTipo.map((f) => <Miniatura key={f.ruta} foto={f} />)}
              {editable && fotos.length < 8 && (
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-marca/40 text-center text-sm font-semibold text-marca">
                  {subiendo === tipo ? "⏳" : <><span className="text-2xl">📷</span>Agregar</>}
                  <input type="file" accept="image/*" capture="environment" className="hidden" disabled={!!subiendo}
                    onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; setSubiendo(tipo); accion(() => subirFotoServicio(pedido.id, tipo, f)).finally(() => setSubiendo(null)); }} />
                </label>
              )}
            </div>
          </div>
        );
      })}
      {editable && <p className="text-sm text-suave">Toma 1 o 2 fotos antes de empezar y al terminar. Te protegen ante reclamos.</p>}
    </div>
  );
}
