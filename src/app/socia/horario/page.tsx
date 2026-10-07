"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Cabecera, Pantalla, accion } from "@/components/ui";
import { DIAS_SEMANA } from "@/lib/config";
import { useDatos } from "@/lib/store";
import type { Horario } from "@/lib/tipos";

const HORAS = Array.from({ length: 17 }, (_, i) => i + 6); // 6:00 a 22:00
const hora = (h: number) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? "a. m." : "p. m."}`;

export default function MiHorario() {
  const { sesion, socias, setHorario, listo } = useDatos();
  const router = useRouter();
  const yo = socias.find((s) => s.id === sesion?.id);
  const [h, setH] = useState<Horario>({});
  // Se carga una sola vez: las recargas en tiempo real no deben borrar lo que la socia está editando.
  const cargado = useRef(false);
  useEffect(() => { if (yo && !cargado.current) { cargado.current = true; setH(yo.horario ?? {}); } }, [yo]);
  if (!listo) return null;
  if (!yo) return (<><Cabecera titulo="Mi horario" volver="/socia" /><Pantalla><p>No encontramos tu cuenta.</p></Pantalla></>);

  const libre = Object.keys(h).length === 0;
  const cambiar = (dia: keyof Horario, rango: [number, number] | undefined) => {
    const nuevo = { ...h };
    if (rango) nuevo[dia] = rango; else delete nuevo[dia];
    setH(nuevo);
  };

  return (
    <>
      <Cabecera titulo="Mi horario" volver="/socia" />
      <Pantalla>
        <p className="text-suave">Marca los días y horas en que puedes trabajar. Solo te mostraremos pedidos dentro de tu horario.</p>
        {libre && <p className="rounded-xl bg-marca-claro p-3 text-sm font-semibold">Ahora ves pedidos de todos los días y a cualquier hora.</p>}
        {DIAS_SEMANA.map((d) => {
          const r = h[d.id];
          return (
            <div key={d.id} className="tarjeta space-y-2">
              <label className="flex items-center gap-3 text-lg font-bold">
                <input type="checkbox" className="h-6 w-6 accent-[var(--color-marca)]" checked={!!r} onChange={(e) => cambiar(d.id, e.target.checked ? [8, 18] : undefined)} />
                {d.largo}
              </label>
              {r && (
                <div className="grid grid-cols-2 gap-2">
                  <select className="campo" value={r[0]} onChange={(e) => cambiar(d.id, [+e.target.value, Math.max(+e.target.value + 1, r[1])])} aria-label={`${d.largo} desde`}>
                    {HORAS.slice(0, -1).map((x) => <option key={x} value={x}>Desde {hora(x)}</option>)}
                  </select>
                  <select className="campo" value={r[1]} onChange={(e) => cambiar(d.id, [r[0], +e.target.value])} aria-label={`${d.largo} hasta`}>
                    {HORAS.filter((x) => x > r[0]).map((x) => <option key={x} value={x}>Hasta {hora(x)}</option>)}
                  </select>
                </div>
              )}
            </div>
          );
        })}
        <button className="btn-primario" onClick={() => accion(async () => { await setHorario(h); router.push("/socia"); })}>Guardar horario</button>
        {!libre && <button className="w-full py-2 font-semibold text-marca" onClick={() => setH({})}>Quitar horario (trabajo cualquier día)</button>}
      </Pantalla>
    </>
  );
}
