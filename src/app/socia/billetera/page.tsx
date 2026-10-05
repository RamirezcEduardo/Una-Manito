"use client";
import Link from "next/link";
import { useState } from "react";
import { Cabecera, Pantalla } from "@/components/ui";
import { formatoFecha, gananciaSocia, pagoCliente, parteUnaManito, soles } from "@/lib/config";
import { useDatos } from "@/lib/store";

const PERIODOS = [
  { id: "semana", texto: "7 días", dias: 7 },
  { id: "mes", texto: "30 días", dias: 30 },
  { id: "todo", texto: "Todo", dias: 0 },
] as const;

export default function Billetera() {
  const { sesion, socias, pedidos, config, listo } = useDatos();
  const [periodo, setPeriodo] = useState<(typeof PERIODOS)[number]["id"]>("mes");
  if (!listo) return null;
  const yo = socias.find((s) => s.id === sesion?.id);
  if (!yo) return (<><Cabecera titulo="Mi billetera" volver="/socia" /><Pantalla><p>No encontramos tu cuenta.</p></Pantalla></>);

  const dias = PERIODOS.find((p) => p.id === periodo)!.dias;
  const desde = dias ? Date.now() - dias * 864e5 : 0;
  const hechos = pedidos.filter((p) => p.sociaId === yo.id && p.estado === "terminado").sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
  const delPeriodo = hechos.filter((p) => new Date(p.creadoEn).getTime() >= desde);
  const ganado = delPeriodo.reduce((t, p) => t + gananciaSocia(p), 0);
  const propinas = delPeriodo.reduce((t, p) => t + (p.propina || 0), 0);
  const porCobrar = hechos.filter((p) => p.pago.estado === "pendiente");
  const porPasar = hechos.filter((p) => p.pago.estado !== "pendiente" && !p.liquidado);
  const debes = porPasar.reduce((t, p) => t + parteUnaManito(p), 0);
  const nombreServicio = (id: string) => config.servicios.find((s) => s.id === id)?.nombre ?? id;

  return (
    <>
      <Cabecera titulo="Mi billetera" volver="/socia" />
      <Pantalla>
        <div className="grid grid-cols-3 gap-2">
          {PERIODOS.map((p) => (
            <button key={p.id} onClick={() => setPeriodo(p.id)} className={`rounded-xl py-2 font-bold ${periodo === p.id ? "bg-marca text-white" : "bg-white text-suave ring-1 ring-black/5"}`}>{p.texto}</button>
          ))}
        </div>

        <div className="tarjeta text-center">
          <p className="text-suave">Ganaste</p>
          <p className="text-4xl font-extrabold text-marca">{soles(ganado)}</p>
          <p className="text-sm text-suave">{delPeriodo.length} servicio{delPeriodo.length === 1 ? "" : "s"}{propinas > 0 && <> · incluye <b className="text-green-700">{soles(propinas)}</b> de propinas 💚</>}</p>
        </div>

        <div className="tarjeta space-y-2 border-l-8 border-acento">
          <p className="font-bold">📤 Por pasar a Una Manito</p>
          <p className="text-3xl font-extrabold">{soles(debes)}</p>
          <p className="text-sm text-suave">
            El cliente te paga todo a ti. De cada servicio, le pasas a Una Manito la comisión ({config.comisionPct}%)
            {config.cargoServicio > 0 ? " y el cargo de servicio" : ""}. Cuando lo recibamos, lo marcamos como pagado.
          </p>
          {debes > 0 && config.whatsappSoporte && (
            <a className="btn-acento block text-center" target="_blank" rel="noopener noreferrer"
              href={`https://wa.me/51${config.whatsappSoporte}?text=${encodeURIComponent(`Hola Una Manito, soy ${yo.nombre}. Les envío ${soles(debes)} de ${porPasar.length} servicios.`)}`}>
              Avisar que ya pagué
            </a>
          )}
        </div>

        {porCobrar.length > 0 && (
          <div className="tarjeta space-y-1 bg-acento-claro">
            <p className="font-bold">⏳ Clientes que aún no marcan el pago</p>
            {porCobrar.map((p) => (
              <Link key={p.id} href={`/socia/pedido/${p.id}`} className="flex justify-between text-sm"><span>{formatoFecha(p.creadoEn)}</span><b>{soles(pagoCliente(p))}</b></Link>
            ))}
          </div>
        )}

        <h2 className="pt-2 text-lg font-bold">Historial</h2>
        {delPeriodo.length === 0 && <p className="text-suave">Aún no tienes servicios en este periodo.</p>}
        {delPeriodo.map((p) => (
          <Link key={p.id} href={`/socia/pedido/${p.id}`} className="tarjeta block space-y-1">
            <div className="flex justify-between"><b>{nombreServicio(p.servicio)}</b><b className="text-marca">{soles(gananciaSocia(p))}</b></div>
            <p className="text-sm text-suave">{p.ubicacion.distrito} · {formatoFecha(p.fecha === "asap" ? p.creadoEn : p.fecha)}</p>
            <p className="text-sm">
              {p.pago.estado === "pendiente" ? "⏳ Pago pendiente" : p.liquidado ? "✅ Liquidado con Una Manito" : `📤 Pasar ${soles(parteUnaManito(p))}`}
              {p.pago.metodo && <span className="capitalize text-suave"> · {p.pago.metodo}</span>}
            </p>
          </Link>
        ))}
      </Pantalla>
    </>
  );
}
