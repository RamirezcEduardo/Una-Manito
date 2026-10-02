"use client";
import { use } from "react";
import { Mapa } from "@/components/MapaDinamico";
import { Cabecera, EstadoBadge, Estrellas, FormCalificar, Pantalla, accion } from "@/components/ui";
import { soles } from "@/lib/config";
import { useDatos } from "@/lib/store";
import type { EstadoPedido, MetodoPago } from "@/lib/tipos";

const PASOS: EstadoPedido[] = ["buscando", "aceptado", "en_camino", "en_curso", "terminado"];
const PASO_TEXTO = ["Buscando", "Aceptado", "En camino", "En curso", "Terminado"];

export default function DetallePedido({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { pedidos, socias, cancelarPedido, marcarPagado, calificar, listo } = useDatos();
  const p = pedidos.find((x) => x.id === id);
  if (!listo) return null;
  if (!p) return (<><Cabecera titulo="Pedido" volver="/cliente" /><Pantalla><p>No encontramos este pedido.</p></Pantalla></>);
  const socia = socias.find((s) => s.id === p.sociaId);
  const paso = PASOS.indexOf(p.estado);

  return (
    <>
      <Cabecera titulo="Tu pedido" volver="/cliente" />
      <Pantalla>
        <div className="tarjeta space-y-4">
          <div className="flex items-center justify-between"><span className="text-lg font-bold">Estado</span><EstadoBadge estado={p.estado} /></div>
          {p.estado !== "cancelado" && (
            <ol className="flex justify-between">
              {PASO_TEXTO.map((t, i) => (
                <li key={t} className="flex flex-1 flex-col items-center text-center text-xs">
                  <span className={`mb-1 h-4 w-4 rounded-full ${i <= paso ? "bg-marca" : "bg-gray-200"}`} />{t}
                </li>
              ))}
            </ol>
          )}
          {p.estado === "buscando" && <p className="animate-pulse text-center text-suave">Estamos avisando a las socias cercanas…</p>}
        </div>

        {socia && (
          <div className="tarjeta flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={socia.foto} alt={socia.nombre} className="h-20 w-20 rounded-full object-cover ring-4 ring-marca-claro" />
            <div className="flex-1">
              <p className="text-lg font-bold">{socia.nombre}</p>
              <p className="text-suave">⭐ {socia.calificacion.toFixed(1)} · {socia.serviciosHechos} servicios</p>
              <a href={`tel:${socia.telefono}`} className="font-semibold text-marca">📞 Llamar</a>
            </div>
          </div>
        )}

        <div className="tarjeta space-y-2">
          <Mapa lat={p.ubicacion.lat} lng={p.ubicacion.lng} alto={160} />
          <p>📍 {p.ubicacion.direccion}, {p.ubicacion.distrito}</p>
          <p>🕒 {p.fecha === "asap" ? "Lo antes posible" : new Date(p.fecha).toLocaleString("es-PE")} · {p.horas} h</p>
          <p>🧴 {p.conMateriales ? "La socia lleva materiales" : "Materiales de la casa"}</p>
          {p.notas && <p>📝 {p.notas}</p>}
          <p className="text-xl font-extrabold">Total: {soles(p.total)}</p>
        </div>

        {p.estado === "terminado" && <Pago estado={p.pago.estado} metodo={p.pago.metodo} onPagar={(m) => accion(() => marcarPagado(p.id, m))} />}

        {p.estado === "terminado" && socia && (p.calificacionSocia
          ? <div className="tarjeta"><p className="font-bold">Tu calificación</p><Estrellas valor={p.calificacionSocia.estrellas} /></div>
          : <FormCalificar titulo={`¿Cómo te fue con ${socia.nombre.split(" ")[0]}?`} onEnviar={(c) => accion(() => calificar(p.id, "socia", c))} />)}

        {["buscando", "aceptado"].includes(p.estado) && (
          <button className="btn border-2 border-red-300 bg-white text-red-600" onClick={() => accion(() => cancelarPedido(p.id))}>Cancelar pedido</button>
        )}
      </Pantalla>
    </>
  );
}

function Pago({ estado, metodo, onPagar }: { estado: string; metodo?: MetodoPago; onPagar: (m: MetodoPago) => void }) {
  if (estado === "confirmado") return <div className="tarjeta bg-green-50 font-bold text-green-800">✅ Pago confirmado por la socia ({metodo})</div>;
  if (estado === "marcado_pagado") return <div className="tarjeta bg-acento-claro font-semibold">⏳ Marcaste pagado por {metodo}. Esperando que la socia confirme.</div>;
  return (
    <div className="tarjeta space-y-3">
      <h3 className="text-lg font-bold">💸 ¿Cómo pagaste?</h3>
      <div className="grid grid-cols-3 gap-2">
        {(["yape", "plin", "efectivo"] as MetodoPago[]).map((m) => (
          <button key={m} className="btn bg-marca-claro py-3 text-base capitalize text-marca-oscuro" onClick={() => onPagar(m)}>{m}</button>
        ))}
      </div>
    </div>
  );
}
