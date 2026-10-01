"use client";
import { use } from "react";
import { Mapa } from "@/components/MapaDinamico";
import { Cabecera, EstadoBadge, Estrellas, FormCalificar, Pantalla } from "@/components/ui";
import { ETIQUETA_ESTADO, SIGUIENTE_ESTADO, soles } from "@/lib/config";
import { useDatos } from "@/lib/store";

const BOTON = { aceptado: "🛵 Voy en camino", en_camino: "✨ Llegué, empezar servicio", en_curso: "✅ Terminé el servicio" } as const;

export default function PedidoSocia({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { pedidos, clientes, cambiarEstado, confirmarPago, calificar, listo } = useDatos();
  const p = pedidos.find((x) => x.id === id);
  if (!listo) return null;
  if (!p) return (<><Cabecera titulo="Pedido" volver="/socia" /><Pantalla><p>Pedido no encontrado.</p></Pantalla></>);
  const cliente = clientes.find((c) => c.id === p.clienteId);
  const sig = SIGUIENTE_ESTADO[p.estado];
  const neto = p.total * (1 - p.comisionPct / 100);

  return (
    <>
      <Cabecera titulo="Servicio" volver="/socia" />
      <Pantalla>
        <div className="tarjeta flex items-center justify-between"><b>Estado</b><EstadoBadge estado={p.estado} /></div>
        <div className="tarjeta space-y-2">
          <p className="text-lg font-bold">👤 {cliente?.nombre}</p>
          {cliente && <a href={`tel:${cliente.telefono}`} className="font-semibold text-marca">📞 Llamar al cliente</a>}
          <Mapa lat={p.ubicacion.lat} lng={p.ubicacion.lng} alto={180} />
          <p>📍 {p.ubicacion.direccion}, {p.ubicacion.distrito}</p>
          {p.ubicacion.referencia && <p className="text-suave">Ref: {p.ubicacion.referencia}</p>}
          <a className="font-semibold text-marca" target="_blank" href={`https://www.google.com/maps/dir/?api=1&destination=${p.ubicacion.lat},${p.ubicacion.lng}`}>🧭 Cómo llegar</a>
          <p>⏱️ {p.horas} h · 🧴 {p.conMateriales ? "Llevas tus materiales" : "Materiales del cliente"}</p>
          {p.notas && <p>📝 {p.notas}</p>}
        </div>
        <div className="tarjeta space-y-1">
          <div className="flex justify-between"><span>Total del servicio</span><span>{soles(p.total)}</span></div>
          <div className="flex justify-between text-suave"><span>Comisión Una Manito ({p.comisionPct}%)</span><span>− {soles(p.total - neto)}</span></div>
          <div className="flex justify-between text-xl font-extrabold text-marca"><span>Tú ganas</span><span>{soles(neto)}</span></div>
        </div>

        {sig && <button className="btn-primario py-6 text-xl" onClick={() => cambiarEstado(p.id, sig)}>{BOTON[p.estado as keyof typeof BOTON] ?? ETIQUETA_ESTADO[sig].texto}</button>}

        {p.estado === "terminado" && (
          p.pago.estado === "confirmado" ? <div className="tarjeta bg-green-50 font-bold text-green-800">✅ Pago recibido ({p.pago.metodo})</div>
          : p.pago.estado === "marcado_pagado" ? (
            <div className="tarjeta space-y-3"><p className="font-semibold">El cliente dice que pagó por <b className="capitalize">{p.pago.metodo}</b>.</p>
              <button className="btn-acento" onClick={() => confirmarPago(p.id)}>Sí, recibí el pago</button></div>
          ) : <div className="tarjeta bg-acento-claro">⏳ Esperando que el cliente marque el pago.</div>
        )}

        {p.estado === "terminado" && (p.calificacionCliente
          ? <div className="tarjeta"><p className="font-bold">Calificaste al cliente</p><Estrellas valor={p.calificacionCliente.estrellas} /></div>
          : <FormCalificar titulo="¿Cómo te fue con el cliente?" onEnviar={(c) => calificar(p.id, "cliente", c)} />)}
      </Pantalla>
    </>
  );
}
