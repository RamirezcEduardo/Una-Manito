"use client";
import { use } from "react";
import { AgregarCalendario, BotonEmergencia, CompartirUbicacion } from "@/components/Extras";
import { Mapa } from "@/components/MapaDinamico";
import { Cabecera, Contactar, EstadoBadge, Estrellas, FormCalificar, Pantalla, accion } from "@/components/ui";
import { comisionDe, ETIQUETA_ESTADO, FRECUENCIAS, formatoFecha, gananciaSocia, pagoCliente, parteUnaManito, SIGUIENTE_ESTADO, soles } from "@/lib/config";
import { useDatos } from "@/lib/store";

const BOTON = { aceptado: "🛵 Voy en camino", en_camino: "✨ Llegué, empezar servicio", en_curso: "✅ Terminé el servicio" } as const;

export default function PedidoSocia({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { pedidos, clientes, avanzarPedido, confirmarPago, calificar, listo } = useDatos();
  const p = pedidos.find((x) => x.id === id);
  if (!listo) return null;
  if (!p) return (<><Cabecera titulo="Pedido" volver="/socia" /><Pantalla><p>Pedido no encontrado.</p></Pantalla></>);
  const cliente = clientes.find((c) => c.id === p.clienteId);
  const sig = SIGUIENTE_ESTADO[p.estado];
  const neto = gananciaSocia(p);

  return (
    <>
      <Cabecera titulo="Servicio" volver="/socia" />
      <Pantalla>
        <div className="tarjeta flex items-center justify-between"><b>Estado</b><EstadoBadge estado={p.estado} /></div>
        <CompartirUbicacion pedido={p} />
        <div className="tarjeta space-y-2">
          <p className="text-lg font-bold">👤 {cliente?.nombre}</p>
          {cliente && !["terminado", "cancelado"].includes(p.estado) && (
            <Contactar telefono={cliente.telefono} mensaje={`Hola ${cliente.nombre.split(" ")[0]}, soy tu socia de Una Manito para el servicio en ${p.ubicacion.direccion}.`} />
          )}
          <Mapa lat={p.ubicacion.lat} lng={p.ubicacion.lng} alto={180} />
          <p>📍 {p.ubicacion.direccion}, {p.ubicacion.distrito}</p>
          {p.ubicacion.referencia && <p className="text-suave">Ref: {p.ubicacion.referencia}</p>}
          <a className="font-semibold text-marca" target="_blank" href={`https://www.google.com/maps/dir/?api=1&destination=${p.ubicacion.lat},${p.ubicacion.lng}`}>🧭 Cómo llegar</a>
          <p>🕒 {formatoFecha(p.fecha)}{p.frecuencia !== "unica" && <b className="text-green-700"> · 🔁 {FRECUENCIAS.find((f) => f.id === p.frecuencia)?.texto.toLowerCase()}</b>}</p>
          <p>⏱️ {p.horas} h · 🧴 {p.conMateriales ? "Llevas tus materiales" : "Materiales del cliente"}</p>
          {p.tareas.length > 0 && (
            <div className="rounded-xl bg-marca-claro p-3">
              <p className="font-bold">✅ El cliente pidió:</p>
              <ul className="mt-1 grid grid-cols-2 gap-x-3">{p.tareas.map((t) => <li key={t}>• {t}</li>)}</ul>
            </div>
          )}
          {p.notas && <p>📝 {p.notas}</p>}
          {p.estado === "cancelado" && <p className="rounded-xl bg-gray-100 p-3 font-semibold">✖️ El cliente canceló{p.motivoCancelacion ? `: ${p.motivoCancelacion}` : ""}</p>}
        </div>
        <div className="tarjeta space-y-1">
          <div className="flex justify-between"><span>Total del servicio</span><span>{soles(p.total)}</span></div>
          {p.recargo > 0 && <div className="flex justify-between text-sm text-green-700"><span>💰 Incluye pago extra por {p.fecha === "asap" ? "urgencia" : "fin de semana"}</span><span>{soles(p.recargo)}</span></div>}
          <div className="flex justify-between text-suave"><span>Comisión Una Manito ({p.comisionPct}%)</span><span>− {soles(comisionDe(p))}</span></div>
          {p.propina > 0 && <div className="flex justify-between font-semibold text-green-700"><span>Propina (100% tuya) 💚</span><span>+ {soles(p.propina)}</span></div>}
          <div className="flex justify-between text-xl font-extrabold text-marca"><span>Tú ganas</span><span>{soles(neto)}</span></div>
          <div className="mt-2 space-y-1 rounded-xl bg-gray-50 p-3 text-sm">
            <div className="flex justify-between"><span>💵 Cobra al cliente{p.cargoServicio > 0 ? " (incluye cargo de servicio)" : ""}</span><b>{soles(pagoCliente(p))}</b></div>
            <div className="flex justify-between text-suave"><span>De eso, le pasas a Una Manito</span><span>{soles(parteUnaManito(p))}</span></div>
          </div>
        </div>
        <AgregarCalendario pedido={p} titulo="Una Manito: servicio" />
        <BotonEmergencia pedido={p} quien="socia" />

        {sig && <button className="btn-primario py-6 text-xl" onClick={() => accion(() => avanzarPedido(p.id))}>{BOTON[p.estado as keyof typeof BOTON] ?? ETIQUETA_ESTADO[sig].texto}</button>}

        {p.estado === "terminado" && (
          p.pago.estado === "confirmado" ? <div className="tarjeta bg-green-50 font-bold text-green-800">✅ Pago recibido ({p.pago.metodo})</div>
          : p.pago.estado === "marcado_pagado" ? (
            <div className="tarjeta space-y-3"><p className="font-semibold">El cliente dice que pagó por <b className="capitalize">{p.pago.metodo}</b>.</p>
              <button className="btn-acento" onClick={() => accion(() => confirmarPago(p.id))}>Sí, recibí el pago</button></div>
          ) : <div className="tarjeta bg-acento-claro">⏳ Esperando que el cliente marque el pago.</div>
        )}

        {p.estado === "terminado" && (p.calificacionCliente
          ? <div className="tarjeta"><p className="font-bold">Calificaste al cliente</p><Estrellas valor={p.calificacionCliente.estrellas} /></div>
          : <FormCalificar titulo="¿Cómo te fue con el cliente?" onEnviar={(c) => accion(() => calificar(p.id, "cliente", c))} />)}
      </Pantalla>
    </>
  );
}
