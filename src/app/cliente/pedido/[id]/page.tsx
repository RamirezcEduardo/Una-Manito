"use client";
import { use, useEffect, useRef, useState } from "react";
import { AgregarCalendario, BotonEmergencia, BotonWhatsApp } from "@/components/Extras";
import { Mapa } from "@/components/MapaDinamico";
import { BuscandoSocia, SociaAcepto } from "@/components/Radar";
import { Avatar, Cabecera, Contactar, EstadoBadge, Estrellas, FormCalificar, NivelBadge, Pantalla, accion } from "@/components/ui";
import { FRECUENCIAS, formatoFecha, MOTIVOS_CANCELACION, PROPINAS, soles } from "@/lib/config";
import { useDatos } from "@/lib/store";
import type { EstadoPedido, MetodoPago } from "@/lib/tipos";

const PASOS: EstadoPedido[] = ["buscando", "aceptado", "en_camino", "en_curso", "terminado"];
const PASO_TEXTO = ["Buscando", "Aceptado", "En camino", "En curso", "Terminado"];
const MENSAJE_ETAPA: Partial<Record<EstadoPedido, (nombre: string) => string>> = {
  aceptado: (n) => `🤝 ${n} aceptó y se está preparando`,
  en_camino: (n) => `🛵 ${n} va en camino a tu casa`,
  en_curso: (n) => `✨ ${n} está trabajando en tu casa`,
  terminado: (n) => `✅ ${n} terminó. ¡Paga y califica!`,
};

export default function DetallePedido({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { pedidos, socias, config, cancelarPedido, marcarPagado, calificar, detenerPlan, listo } = useDatos();
  const p = pedidos.find((x) => x.id === id);
  const [cancelando, setCancelando] = useState(false);
  const [paciencia, setPaciencia] = useState(false); // "Seguir esperando"
  const minutosBuscando = useMinutosDesde(p?.estado === "buscando" ? p.creadoEn : undefined);
  // Celebración: solo cuando el pedido pasa de "buscando" a "aceptado" con la pantalla abierta.
  const estadoAnterior = useRef(p?.estado);
  const [celebrar, setCelebrar] = useState(false);
  useEffect(() => {
    if (estadoAnterior.current === "buscando" && p?.estado === "aceptado") setCelebrar(true);
    estadoAnterior.current = p?.estado;
  }, [p?.estado]);
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
          {socia && MENSAJE_ETAPA[p.estado] && <p className="rounded-2xl bg-marca-claro p-3 text-center text-lg font-bold text-marca-oscuro">{MENSAJE_ETAPA[p.estado]!(socia.nombre.split(" ")[0])}</p>}
          {p.estado === "cancelado" && p.motivoCancelacion && <p className="text-center text-suave">Motivo: {p.motivoCancelacion}</p>}
        </div>

        {p.estado === "buscando" && <BuscandoSocia pedido={p} disponibles={socias.filter((s) => s.estado === "aprobada" && s.disponible && s.distritos.includes(p.ubicacion.distrito) && s.servicios.includes(p.servicio)).length} />}

        {p.estado === "buscando" && minutosBuscando >= 20 && !paciencia && (
          <div className="tarjeta space-y-3 border-2 border-acento">
            <h3 className="text-lg font-bold">⏳ Aún no encontramos socia</h3>
            <p className="text-suave">Llevamos {minutosBuscando} minutos buscando. A veces a estas horas hay menos socias disponibles.</p>
            <button className="btn-primario" onClick={() => setPaciencia(true)}>Seguir esperando</button>
            <button className="btn-borde" onClick={() => setCancelando(true)}>Cancelar y pedir para otra hora</button>
          </div>
        )}

        {socia && (
          <div className="tarjeta space-y-3">
          <div className="flex items-center gap-4">
            <Avatar foto={socia.foto} nombre={socia.nombre} />
            <div className="flex-1 space-y-1">
              <p className="text-lg font-bold">{socia.nombre}</p>
              <NivelBadge socia={socia} />
              <p className="text-suave">⭐ {socia.calificacion > 0 ? socia.calificacion.toFixed(1) : "Nueva"} · {socia.serviciosHechos} servicios</p>
            </div>
          </div>
          {!["terminado", "cancelado"].includes(p.estado) && (
            <Contactar telefono={socia.telefono} mensaje={`Hola ${socia.nombre.split(" ")[0]}, te escribo por mi pedido de Una Manito en ${p.ubicacion.direccion}.`} />
          )}
          </div>
        )}

        <div className="tarjeta space-y-2">
          {p.estado !== "buscando" && <Mapa lat={p.ubicacion.lat} lng={p.ubicacion.lng} alto={160} />}
          <p>📍 {p.ubicacion.direccion}, {p.ubicacion.distrito}</p>
          <p>🕒 {formatoFecha(p.fecha)} · {p.horas} h</p>
          <p>🧴 {p.conMateriales ? "La socia lleva materiales" : "Materiales de la casa"}</p>
          {p.tareas.length > 0 && <p>✅ {p.tareas.join(", ")}</p>}
          {p.notas && <p>📝 {p.notas}</p>}
          {p.frecuencia !== "unica" && <p className="font-semibold text-green-700">🔁 Plan {FRECUENCIAS.find((f) => f.id === p.frecuencia)?.texto.toLowerCase()} con la misma socia</p>}
          {p.recargo > 0 && <p className="text-sm text-suave">Incluye recargo de {soles(p.recargo)}</p>}
          {p.descuento > 0 && <p className="text-sm text-green-700">Incluye descuento por plan de {soles(p.descuento)}</p>}
          {p.cargoServicio > 0 && <p className="text-sm text-suave">Servicio {soles(p.total)} + cargo de servicio {soles(p.cargoServicio)}</p>}
          <p className="text-xl font-extrabold">Total: {soles(p.total + p.cargoServicio)}</p>
          {p.propina > 0 && <p className="font-semibold text-green-700">+ Propina para tu socia: {soles(p.propina)} 💚</p>}
        </div>

        <AgregarCalendario pedido={p} titulo={`Una Manito: ${config.servicios.find((x) => x.id === p.servicio)?.nombre ?? "servicio"}`} />
        <BotonEmergencia pedido={p} quien="cliente" />

        {p.frecuencia !== "unica" && !["terminado", "cancelado"].includes(p.estado) && (
          <button className="w-full py-2 text-sm font-semibold text-suave underline"
            onClick={() => confirm("¿Detener tu plan? Esta visita se mantiene, pero no se agendarán más.") && accion(() => detenerPlan(p.id))}>
            Detener mi plan recurrente
          </button>
        )}

        {p.estado === "terminado" && <Pago total={p.total + p.cargoServicio} estado={p.pago.estado} metodo={p.pago.metodo} onPagar={(m, propina) => accion(() => marcarPagado(p.id, m, propina))} />}

        {p.estado === "terminado" && socia && (p.calificacionSocia
          ? <div className="tarjeta"><p className="font-bold">Tu calificación</p><Estrellas valor={p.calificacionSocia.estrellas} /></div>
          : <FormCalificar titulo={`¿Cómo te fue con ${socia.nombre.split(" ")[0]}?`} onEnviar={(c) => accion(() => calificar(p.id, "socia", c))} />)}

        {["buscando", "aceptado"].includes(p.estado) && (
          <button className="btn border-2 border-red-300 bg-white text-red-600" onClick={() => setCancelando(true)}>Cancelar pedido</button>
        )}

        {cancelando && (
          <div className="fixed inset-0 z-[2000] flex items-end bg-black/40" onClick={() => setCancelando(false)}>
            <div className="mx-auto w-full max-w-md space-y-3 rounded-t-3xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-extrabold">¿Por qué cancelas?</h3>
              <p className="text-sm text-suave">Nos ayuda a mejorar. {p.sociaId && "Le avisaremos a tu socia."}</p>
              {MOTIVOS_CANCELACION.map((m) => (
                <button key={m} className="btn border-2 border-gray-200 bg-white text-left text-base font-semibold"
                  onClick={() => accion(async () => { await cancelarPedido(p.id, m); setCancelando(false); })}>{m}</button>
              ))}
              <button className="w-full py-2 font-semibold text-marca" onClick={() => setCancelando(false)}>No cancelar</button>
            </div>
          </div>
        )}
      </Pantalla>
      {celebrar && socia && <SociaAcepto socia={socia} onCerrar={() => setCelebrar(false)} />}
      <BotonWhatsApp mensaje={`Hola Una Manito, tengo una consulta sobre mi pedido ${p.id.slice(0, 8)}.`} />
    </>
  );
}

/** Minutos transcurridos desde una fecha, actualizándose cada 30 segundos. */
function useMinutosDesde(desde?: string) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    if (!desde) return;
    const t = setInterval(() => setAhora(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [desde]);
  return desde ? Math.floor((ahora - new Date(desde).getTime()) / 60_000) : 0;
}

function Pago({ total, estado, metodo, onPagar }: { total: number; estado: string; metodo?: MetodoPago; onPagar: (m: MetodoPago, propina: number) => void }) {
  const [propina, setPropina] = useState(0);
  if (estado === "confirmado") return <div className="tarjeta bg-green-50 font-bold text-green-800">✅ Pago confirmado por la socia ({metodo})</div>;
  if (estado === "marcado_pagado") return <div className="tarjeta bg-acento-claro font-semibold">⏳ Marcaste pagado por {metodo}. Esperando que la socia confirme.</div>;
  return (
    <div className="tarjeta space-y-3">
      <h3 className="text-lg font-bold">💚 ¿Quieres dejar propina?</h3>
      <p className="text-sm text-suave">Va completa a tu socia. Es opcional.</p>
      <div className="grid grid-cols-4 gap-2">
        {PROPINAS.map((v) => (
          <button key={v} type="button" onClick={() => setPropina(v)}
            className={`rounded-xl border-2 py-3 font-bold ${propina === v ? "border-marca bg-marca text-white" : "border-gray-200 bg-white"}`}>
            {v === 0 ? "No" : `S/ ${v}`}
          </button>
        ))}
      </div>
      <p className="text-center text-lg">Total a pagar: <b>{soles(total + propina)}</b></p>
      <h3 className="text-lg font-bold">💸 ¿Cómo pagaste?</h3>
      <div className="grid grid-cols-3 gap-2">
        {(["yape", "plin", "efectivo"] as MetodoPago[]).map((m) => (
          <button key={m} className="btn bg-marca-claro py-3 text-base capitalize text-marca-oscuro" onClick={() => onPagar(m, propina)}>{m}</button>
        ))}
      </div>
    </div>
  );
}
