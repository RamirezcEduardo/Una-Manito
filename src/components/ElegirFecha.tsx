"use client";
import { useMemo } from "react";

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MARGEN_HOY_MIN = 120; // hoy, la socia necesita al menos 2 horas para llegar

const pad = (n: number) => String(n).padStart(2, "0");
const claveDia = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const aMinutos = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const deMinutos = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const textoHora = (m: number) => { const h = Math.floor(m / 60) % 24; return `${h % 12 || 12}:${pad(m % 60)} ${h < 12 ? "a. m." : "p. m."}`; };

/** Hora mínima permitida ese día (hoy: ahora + 2 h, redondeado a 15 min). */
function minimoDelDia(dia: string, ahora: Date) {
  if (dia !== claveDia(ahora)) return 0;
  const m = ahora.getHours() * 60 + ahora.getMinutes() + MARGEN_HOY_MIN;
  return Math.ceil(m / 15) * 15;
}

/** Valida la fecha elegida; devuelve un mensaje si no sirve. */
export function errorFecha(valor: string, ahora = new Date()): string {
  if (!valor) return "Elige el día.";
  const dia = valor.slice(0, 10), hora = valor.slice(11, 16);
  if (!/^\d{2}:\d{2}$/.test(hora)) return "Escribe la hora de llegada.";
  const min = minimoDelDia(dia, ahora);
  if (aMinutos(hora) < min) return `Para hoy, la hora más temprana es ${textoHora(min)}.`;
  return "";
}

/** Día con botones y hora de llegada escrita por el cliente. */
export default function ElegirFecha({ valor, onChange }: { valor: string; onChange: (v: string) => void }) {
  const ahora = new Date();
  const dias = useMemo(() => Array.from({ length: 8 }, (_, i) => {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); return d;
  }), []);
  const diaSel = valor.slice(0, 10);
  const horaSel = valor.slice(11, 16);
  // Hoy solo aparece si todavía queda tiempo antes de medianoche.
  const visibles = dias.filter((d) => minimoDelDia(claveDia(d), ahora) < 24 * 60);
  const manana = claveDia(new Date(ahora.getTime() + 864e5));
  const error = diaSel ? errorFecha(valor, ahora) : "";

  const elegirDia = (dia: string) => {
    const min = minimoDelDia(dia, ahora);
    // Si no hay hora o ya no sirve para ese día, se sugiere una (9:00 o la más temprana posible).
    const hora = horaSel && aMinutos(horaSel) >= min ? horaSel : deMinutos(Math.max(min, 9 * 60));
    onChange(`${dia}T${hora}`);
  };

  return (
    <div className="space-y-3">
      <p className="font-semibold">Día</p>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {visibles.map((d) => {
          const k = claveDia(d);
          const etiqueta = k === claveDia(ahora) ? "Hoy" : k === manana ? "Mañana" : DIAS[d.getDay()];
          return (
            <button key={k} type="button" onClick={() => elegirDia(k)}
              className={`flex min-w-[4.5rem] shrink-0 flex-col items-center rounded-2xl border-2 px-3 py-2 ${diaSel === k ? "border-marca bg-marca text-white" : "border-gray-200 bg-white"}`}>
              <span className="text-sm font-semibold">{etiqueta}</span>
              <span className="text-2xl font-extrabold">{d.getDate()}</span>
            </button>
          );
        })}
      </div>
      {diaSel ? (
        <div>
          <label htmlFor="hora-llegada" className="etiqueta">Hora de llegada</label>
          <input id="hora-llegada" type="time" step={900} className="campo campo-hora"
            value={horaSel} onChange={(e) => onChange(`${diaSel}T${e.target.value}`)} />
          {error ? <p className="mt-1 text-sm font-semibold text-red-600">{error}</p>
            : <p className="mt-1 text-sm text-suave">Toca la hora para cambiarla.</p>}
        </div>
      ) : <p className="text-sm text-suave">Elige el día y luego escribe la hora.</p>}
    </div>
  );
}
