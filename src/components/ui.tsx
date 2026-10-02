"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ETIQUETA_ESTADO } from "@/lib/config";
import type { Calificacion, EstadoPedido } from "@/lib/tipos";
import { useDatos } from "@/lib/store";

/** Ejecuta una acción y muestra el error en palabras simples si falla. */
export async function accion(f: () => Promise<unknown>) {
  try { await f(); } catch (e) { alert(mensajeError(e)); }
}

export function mensajeError(e: unknown) {
  const m = e instanceof Error ? e.message : "";
  if (!m || /fetch|network/i.test(m)) return "No pudimos conectarnos. Revisa tu internet e inténtalo de nuevo.";
  if (/token has expired|invalid/i.test(m)) return "El código no es correcto o ya venció. Pide uno nuevo.";
  if (/rate limit/i.test(m)) return "Pediste muchos códigos seguidos. Espera un minuto e inténtalo otra vez.";
  return m;
}

export function Cabecera({ titulo, volver }: { titulo: string; volver?: string }) {
  const { salir, sesion, sinPerfil } = useDatos();
  const router = useRouter();
  return (
    <header className="sticky top-0 z-[1000] flex items-center gap-3 bg-marca px-4 py-4 text-white shadow">
      {volver && (
        <Link href={volver} aria-label="Volver" className="text-2xl leading-none">←</Link>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/simbolo.png" alt="" className="h-8 w-8 rounded-full bg-white p-0.5" />
      <h1 className="flex-1 truncate text-xl font-extrabold">{titulo}</h1>
      {(sesion || sinPerfil) && <button onClick={async () => { await salir(); router.push("/"); }} className="rounded-full bg-white/20 px-3 py-1 text-sm font-semibold">Salir</button>}
    </header>
  );
}

export function Pantalla({ children }: { children: ReactNode }) {
  return <main className="mx-auto w-full max-w-md space-y-4 px-4 py-5 pb-24">{children}</main>;
}

export function EstadoBadge({ estado }: { estado: EstadoPedido }) {
  const e = ETIQUETA_ESTADO[estado];
  return <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold ${e.color}`}>{e.icono} {e.texto}</span>;
}

export function Estrellas({ valor, onChange, tam = "text-3xl" }: { valor: number; onChange?: (n: number) => void; tam?: string }) {
  return (
    <div className={`flex gap-1 ${tam}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!onChange} onClick={() => onChange?.(n)} aria-label={`${n} estrellas`}
          className={n <= valor ? "text-acento" : "text-gray-300"}>★</button>
      ))}
    </div>
  );
}

export function FormCalificar({ titulo, onEnviar }: { titulo: string; onEnviar: (c: Calificacion) => void }) {
  const [estrellas, setEstrellas] = useState(0);
  const [comentario, setComentario] = useState("");
  return (
    <div className="tarjeta space-y-3">
      <h3 className="text-lg font-bold">{titulo}</h3>
      <Estrellas valor={estrellas} onChange={setEstrellas} tam="text-4xl" />
      <textarea className="campo" rows={2} placeholder="Comentario (opcional)" value={comentario} onChange={(e) => setComentario(e.target.value)} />
      <button className="btn-acento" disabled={!estrellas} onClick={() => onEnviar({ estrellas, comentario })}>Enviar calificación</button>
    </div>
  );
}

export function Opcion({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`rounded-2xl border-2 px-4 py-3 text-left font-semibold transition ${activo ? "border-marca bg-marca-claro text-marca-oscuro" : "border-gray-200 bg-white"}`}>
      {children}
    </button>
  );
}
