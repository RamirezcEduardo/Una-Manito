"use client";
import Link from "next/link";
import { useState } from "react";
import { useDatos } from "@/lib/store";
import type { Pedido } from "@/lib/tipos";

const enlaceWhatsApp = (numero: string, mensaje: string) => `https://wa.me/51${numero}?text=${encodeURIComponent(mensaje)}`;

/** Botón flotante para escribir a Una Manito. Solo aparece si el equipo puso el número en Ajustes. */
export function BotonWhatsApp({ mensaje = "Hola Una Manito, necesito ayuda." }: { mensaje?: string }) {
  const { config } = useDatos();
  if (!config.whatsappSoporte) return null;
  return (
    <a href={enlaceWhatsApp(config.whatsappSoporte, mensaje)} target="_blank" rel="noopener noreferrer" aria-label="Escríbenos por WhatsApp"
      className="fixed bottom-20 right-4 z-[960] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl">
      <svg aria-hidden viewBox="0 0 24 24" className="h-8 w-8 fill-current"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z" /></svg>
    </a>
  );
}

/** Botón de emergencia durante el servicio: números de Perú y aviso a Una Manito. */
export function BotonEmergencia({ pedido, quien }: { pedido: Pedido; quien: "cliente" | "socia" }) {
  const { config } = useDatos();
  const [abierto, setAbierto] = useState(false);
  if (!["aceptado", "en_camino", "en_curso"].includes(pedido.estado)) return null;
  const aviso = `🆘 EMERGENCIA (${quien}) en el pedido ${pedido.id.slice(0, 8)} · ${pedido.ubicacion.direccion}, ${pedido.ubicacion.distrito}. Necesito ayuda.`;
  const numeros = [
    { tel: "105", texto: "Policía", icono: "🚓" },
    { tel: "106", texto: "Ambulancia (SAMU)", icono: "🚑" },
    { tel: "116", texto: "Bomberos", icono: "🚒" },
    { tel: "100", texto: "Línea 100 (violencia)", icono: "🛡️" },
  ];
  return (
    <>
      <button className="btn border-2 border-red-500 bg-white text-red-600" onClick={() => setAbierto(true)}>🆘 Emergencia</button>
      {abierto && (
        <div className="fixed inset-0 z-[2000] flex items-end bg-black/50" onClick={() => setAbierto(false)}>
          <div className="mx-auto w-full max-w-md space-y-3 rounded-t-3xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-extrabold text-red-600">🆘 ¿Qué pasa?</h3>
            <p className="text-sm text-suave">Si estás en peligro, llama primero. Luego avísanos para ayudarte.</p>
            <div className="grid grid-cols-2 gap-2">
              {numeros.map((n) => (
                <a key={n.tel} href={`tel:${n.tel}`} className="rounded-2xl bg-red-50 p-3 text-center font-bold text-red-700">
                  <span className="block text-2xl">{n.icono}</span>{n.texto}<span className="block text-lg">{n.tel}</span>
                </a>
              ))}
            </div>
            {config.whatsappSoporte && (
              <a href={enlaceWhatsApp(config.whatsappSoporte, aviso)} target="_blank" rel="noopener noreferrer" className="btn block bg-[#25D366] text-center text-white">
                Avisar a Una Manito por WhatsApp
              </a>
            )}
            <button className="w-full py-2 font-semibold text-marca" onClick={() => setAbierto(false)}>Cerrar</button>
          </div>
        </div>
      )}
    </>
  );
}

/** Descarga un evento de calendario (.ics) con recordatorios 1 día y 2 horas antes. */
export function AgregarCalendario({ pedido, titulo }: { pedido: Pedido; titulo: string }) {
  if (pedido.fecha === "asap" || ["terminado", "cancelado"].includes(pedido.estado) || new Date(pedido.fecha) < new Date()) return null;
  const descargar = () => {
    const inicio = new Date(pedido.fecha);
    const fin = new Date(inicio.getTime() + pedido.horas * 36e5);
    const f = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const texto = (s: string) => s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Una Manito//ES", "BEGIN:VEVENT",
      `UID:${pedido.id}@unamanito`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(inicio)}`, `DTEND:${f(fin)}`,
      `SUMMARY:${texto(titulo)}`, `LOCATION:${texto(`${pedido.ubicacion.direccion}, ${pedido.ubicacion.distrito}`)}`,
      `DESCRIPTION:${texto(`Pedido de Una Manito · ${pedido.horas} horas`)}`,
      "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", `DESCRIPTION:${texto(titulo)} mañana`, "END:VALARM",
      "BEGIN:VALARM", "TRIGGER:-PT2H", "ACTION:DISPLAY", `DESCRIPTION:${texto(titulo)} en 2 horas`, "END:VALARM",
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url; a.download = "una-manito.ics"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <button className="btn-borde" onClick={descargar}>📅 Agregar a mi calendario (con recordatorio)</button>;
}

/** Enlace al Libro de Reclamaciones (obligatorio y visible). */
export function EnlaceReclamaciones({ className = "" }: { className?: string }) {
  return (
    <Link href="/reclamaciones" className={`inline-flex items-center gap-1 underline ${className}`}>
      📕 Libro de Reclamaciones
    </Link>
  );
}
