"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ETIQUETA_ESTADO, nivelSocia } from "@/lib/config";
import type { Calificacion, EstadoPedido } from "@/lib/tipos";
import { useDatos } from "@/lib/store";

/**
 * Ejecuta una acción y muestra el error en palabras simples si falla.
 * Ignora toques repetidos mientras la acción anterior sigue en curso (evita pedidos o pagos duplicados).
 */
let accionEnCurso = false;
export async function accion(f: () => Promise<unknown>) {
  if (accionEnCurso) return;
  bloquearBotones(true);
  try { await f(); } catch (e) { alert(mensajeError(e)); } finally { bloquearBotones(false); }
}

/**
 * Mientras una acción está en curso, todos los botones de la pantalla quedan inactivos (se ven atenuados).
 * Al terminar se espera un momento antes de liberarlos, para que un toque doble no repita la acción.
 */
let liberar: ReturnType<typeof setTimeout> | undefined;
export function bloquearBotones(activo: boolean) {
  clearTimeout(liberar);
  if (activo) {
    accionEnCurso = true;
    document.body.dataset.ocupado = "1";
  } else {
    liberar = setTimeout(() => { accionEnCurso = false; delete document.body.dataset.ocupado; }, 800);
  }
}
export const hayAccionEnCurso = () => accionEnCurso;

export function mensajeError(e: unknown) {
  const m = e instanceof Error ? e.message : "";
  if (!m || /fetch|network/i.test(m)) return "No pudimos conectarnos. Revisa tu internet e inténtalo de nuevo.";
  if (/invalid login credentials/i.test(m)) return "Correo o contraseña incorrectos.";
  if (/email not confirmed/i.test(m)) return "Aún no confirmas tu correo. Revisa tu bandeja (y Spam) y toca el enlace que te enviamos.";
  if (/password should be at least|weak password/i.test(m)) return "La contraseña debe tener al menos 6 caracteres.";
  if (/user already registered/i.test(m)) return "Ese correo ya tiene cuenta. Entra con tu contraseña.";
  if (/token has expired|invalid/i.test(m)) return "El código no es correcto o ya venció. Pide uno nuevo.";
  if (/email rate limit|over_email_send/i.test(m)) return "Se alcanzó el límite de correos por hora. Inténtalo en un rato o escríbenos por WhatsApp.";
  if (/rate limit/i.test(m)) return "Demasiados intentos seguidos. Espera un minuto e inténtalo otra vez.";
  return m;
}

/** Botones grandes de WhatsApp y llamada. El celular es peruano de 9 dígitos. */
export function Contactar({ telefono, mensaje }: { telefono: string; mensaje: string }) {
  if (!telefono) return null;
  return (
    <div className="grid grid-cols-2 gap-2">
      <a href={`https://wa.me/51${telefono}?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-3 py-3 font-bold text-white">
        <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>
        WhatsApp
      </a>
      <a href={`tel:${telefono}`} className="flex items-center justify-center gap-2 rounded-2xl bg-marca-claro px-3 py-3 font-bold text-marca-oscuro">
        📞 Llamar
      </a>
    </div>
  );
}

const COLORES_AVATAR = ["#0B6EF0", "#F6A01A", "#0A9F7A", "#8B5CF6", "#E5487A"];

/** Foto de perfil; si no hay foto, círculo con las iniciales. */
export function Avatar({ foto, nombre, tam = 80 }: { foto?: string; nombre: string; tam?: number }) {
  const iniciales = nombre.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
  const color = COLORES_AVATAR[[...nombre].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORES_AVATAR.length];
  const estilo = { width: tam, height: tam };
  if (foto) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={foto} alt={nombre} style={estilo} className="shrink-0 rounded-full object-cover ring-4 ring-marca-claro" />;
  }
  return (
    <span aria-label={nombre} style={{ ...estilo, background: color, fontSize: tam * 0.38 }}
      className="flex shrink-0 items-center justify-center rounded-full font-extrabold text-white ring-4 ring-marca-claro">
      {iniciales}
    </span>
  );
}

export function NivelBadge({ socia }: { socia: { calificacion: number; serviciosHechos: number } }) {
  const { actual } = nivelSocia(socia);
  return <span className="inline-flex items-center gap-1 rounded-full bg-acento-claro px-2.5 py-0.5 text-sm font-bold text-amber-900">{actual.icono} {actual.nombre}</span>;
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
      <img src="/icono.svg" alt="" className="h-9 w-9 rounded-[10px] ring-2 ring-white/70" />
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
  const [enviado, setEnviado] = useState(false);
  const [comentario, setComentario] = useState("");
  return (
    <div className="tarjeta space-y-3">
      <h3 className="text-lg font-bold">{titulo}</h3>
      <Estrellas valor={estrellas} onChange={setEstrellas} tam="text-4xl" />
      <textarea className="campo" rows={2} placeholder="Comentario (opcional)" value={comentario} onChange={(e) => setComentario(e.target.value)} />
      <button className="btn-acento" disabled={!estrellas || enviado} onClick={() => { if (enviado) return; setEnviado(true); onEnviar({ estrellas, comentario }); }}>{enviado ? "Enviando…" : "Enviar calificación"}</button>
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
