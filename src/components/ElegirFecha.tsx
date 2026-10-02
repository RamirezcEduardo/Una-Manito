"use client";
import { useMemo } from "react";

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const HORAS = Array.from({ length: 12 }, (_, i) => 7 + i); // 7:00 a 18:00

const pad = (n: number) => String(n).padStart(2, "0");
const claveDia = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const textoHora = (h: number) => `${h > 12 ? h - 12 : h}:00 ${h < 12 ? "am" : "pm"}`;

/** Elegir día y hora con botones grandes (sin el selector nativo, que en iPhone sale vacío). */
export default function ElegirFecha({ valor, onChange }: { valor: string; onChange: (v: string) => void }) {
  const ahora = new Date();
  const dias = useMemo(() => Array.from({ length: 8 }, (_, i) => {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); return d;
  }), []);
  const [diaSel, horaSel] = valor ? [valor.slice(0, 10), Number(valor.slice(11, 13))] : ["", NaN];
  // Hoy solo se puede elegir desde dentro de 2 horas.
  const disponible = (dia: string, h: number) => dia !== claveDia(ahora) || h >= ahora.getHours() + 2;
  const diasConHoras = dias.filter((d) => HORAS.some((h) => disponible(claveDia(d), h)));

  const elegirDia = (dia: string) => {
    const h = !isNaN(horaSel) && disponible(dia, horaSel) ? horaSel : HORAS.find((x) => disponible(dia, x))!;
    onChange(`${dia}T${pad(h)}:00`);
  };

  return (
    <div className="space-y-3">
      <p className="font-semibold">Día</p>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {diasConHoras.map((d) => {
          const k = claveDia(d);
          const hoy = k === claveDia(ahora);
          const etiqueta = hoy ? "Hoy" : claveDia(new Date(ahora.getTime() + 864e5)) === k ? "Mañana" : DIAS[d.getDay()];
          return (
            <button key={k} type="button" onClick={() => elegirDia(k)}
              className={`flex min-w-[4.5rem] shrink-0 flex-col items-center rounded-2xl border-2 px-3 py-2 ${diaSel === k ? "border-marca bg-marca text-white" : "border-gray-200 bg-white"}`}>
              <span className="text-sm font-semibold">{etiqueta}</span>
              <span className="text-2xl font-extrabold">{d.getDate()}</span>
            </button>
          );
        })}
      </div>
      {diaSel && (
        <>
          <p className="font-semibold">Hora de llegada</p>
          <div className="grid grid-cols-3 gap-2">
            {HORAS.filter((h) => disponible(diaSel, h)).map((h) => (
              <button key={h} type="button" onClick={() => onChange(`${diaSel}T${pad(h)}:00`)}
                className={`rounded-xl border-2 py-3 font-semibold ${horaSel === h ? "border-marca bg-marca text-white" : "border-gray-200 bg-white"}`}>
                {textoHora(h)}
              </button>
            ))}
          </div>
        </>
      )}
      {!diaSel && <p className="text-sm text-suave">Elige el día y luego la hora.</p>}
    </div>
  );
}
