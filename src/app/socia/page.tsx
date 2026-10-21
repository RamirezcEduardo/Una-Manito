"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { BotonWhatsApp } from "@/components/Extras";
import { MenuInferior } from "@/components/Menu";
import { ActivarAvisos } from "@/components/ActivarAvisos";
import { MiVerificacion } from "@/components/PruebaDeVida";
import { AlertaPedido, MapaEspera } from "@/components/Radar";
import { Avatar, Cabecera, EstadoBadge, Pantalla, accion } from "@/components/ui";
import { enHorario, ESLOGAN_SOCIA, formatoFecha, gananciaSocia, nivelSocia, soles } from "@/lib/config";
import { prepararSonido, useAvisoPedidosNuevos, usePermisoAvisos } from "@/lib/avisos";
import { useDatos } from "@/lib/store";
import { useRubro } from "@/lib/rubro";
import { FormOferta, ListaBelleza } from "@/components/Belleza";

export default function PanelSocia() {
  const { sesion, socias, pedidos, config, setDisponible, aceptarPedido, listo, ofertas } = useDatos();
  const [cotizando, setCotizando] = useState<string | null>(null);
  const router = useRouter();
  const yo = socias.find((s) => s.id === sesion?.id);
  useRubro(yo ? (yo.servicios.length > 0 && yo.servicios.every((x) => x === "belleza") ? "belleza" : "hogar") : undefined);
  const esCotizar = (p: { servicio: string }) => !!config.servicios.find((x) => x.id === p.servicio)?.cotizar;
  const cercanos = useMemo(() => (yo ? pedidos.filter((p) => p.estado === "buscando" && yo.distritos.includes(p.ubicacion.distrito) && yo.servicios.includes(p.servicio) && enHorario(yo.horario, p.fecha)
    && (!p.promoId || yo.promos.includes(p.promoId))
    // Si el cliente eligió a otra socia, esta lo ve recién a los 10 minutos.
    && (!p.sociaPreferida || p.sociaPreferida === yo.id || Date.now() - new Date(p.creadoEn).getTime() > 10 * 60_000))
    .sort((a, b) => Number(b.sociaPreferida === yo.id) - Number(a.sociaPreferida === yo.id)) : []), [pedidos, yo]);
  const paraAviso = useMemo(() => cercanos.map((p) => ({ id: p.id, texto: `${p.ubicacion.distrito} · ${formatoFecha(p.fecha)} · ${p.total > 0 ? `${p.horas} h` : "cotización"}` })), [cercanos]);
  const disponible = !!yo && yo.estado === "aprobada" && yo.disponible;
  useAvisoPedidosNuevos(paraAviso, disponible);
  const { permiso } = usePermisoAvisos();
  // Alerta grande: el pedido más reciente que la socia aún no descartó.
  const [descartados, setDescartados] = useState<string[]>([]);
  const [elegido, setElegido] = useState<string | null>(null); // pedido tocado en el mapa
  const alerta = disponible ? (cercanos.find((p) => p.id === elegido) ?? cercanos.find((p) => !descartados.includes(p.id))) : undefined;
  const descartar = useCallback(() => { if (alerta) setDescartados((d) => [...d, alerta.id]); setElegido(null); }, [alerta]);
  const aceptar = (id: string) => {
    if (esCotizar(pedidos.find((p) => p.id === id) ?? { servicio: "" })) { setCotizando(id); setDescartados((d) => [...d, id]); setElegido(null); return; }
    aceptarYIr(id);
  };
  const aceptarYIr = (id: string) => accion(async () => { if (await aceptarPedido(id)) router.push(`/socia/pedido/${id}`); else { alert("Otra socia ya tomó este pedido."); setDescartados((d) => [...d, id]); } });
  if (!listo) return null;
  if (!yo) return (<><Cabecera titulo="Socia" /><Pantalla><Link href="/" className="btn-primario block text-center">Ir al inicio</Link></Pantalla></>);

  if (yo.estado !== "aprobada") {
    return (
      <>
        <Cabecera titulo="Mi cuenta" />
        <Pantalla>
          <div className="tarjeta space-y-2 text-center">
            <div className="text-5xl">{yo.estado === "pendiente" ? "⏳" : "😔"}</div>
            <h2 className="text-xl font-extrabold">{yo.estado === "pendiente" ? "Tu solicitud está en revisión" : "Tu solicitud no fue aprobada"}</h2>
            <p className="text-suave">{yo.estado === "pendiente" ? "Te avisaremos por WhatsApp apenas te aprobemos. ¡Gracias por tu paciencia!" : "Escríbenos si crees que es un error."}</p>
          </div>
          {yo.estado === "pendiente" && <MiVerificacion />}
        </Pantalla>
      </>
    );
  }

  const mios = pedidos.filter((p) => p.sociaId === yo.id);
  const activos = mios.filter((p) => !["terminado", "cancelado"].includes(p.estado));
  const terminados = mios.filter((p) => p.estado === "terminado");
  const ganancias = terminados.reduce((t, p) => t + gananciaSocia(p), 0);
  const propinas = terminados.reduce((t, p) => t + (p.propina || 0), 0);
  const nivel = nivelSocia(yo);

  return (
    <>
      <Cabecera titulo={`Hola, ${yo.nombre.split(" ")[0]}`} />
      <Pantalla>
        <p className="text-suave">{ESLOGAN_SOCIA}</p>
        <button onClick={() => { prepararSonido(); accion(() => setDisponible(!yo.disponible)); }}
          className={`btn py-6 text-xl ${yo.disponible ? "bg-green-500 text-white" : "bg-gray-200 text-tinta"}`}>
          {yo.disponible ? "🟢 Estoy disponible" : "⚪ No disponible — tocar para activar"}
        </button>
        {yo.disponible && <MapaEspera socia={yo} pedidos={cercanos} onElegir={(p) => setElegido(p.id)} />}
        <ActivarAvisos texto="Activar avisos de pedidos (aunque la app esté cerrada)" />
        {yo.disponible && <p className="text-center text-sm text-suave">{permiso === "granted" ? "🔔 Te avisaremos con sonido aunque cierres la app." : "🔔 Deja esta pantalla abierta: te avisaremos con sonido cuando llegue un pedido."}</p>}

        {yo.servicios.includes("belleza") && (
          <Link href="/socia/belleza" className="tarjeta flex items-center gap-3 border-2 border-marca">
            <span className="text-4xl">💅</span>
            <div className="flex-1"><p className="font-bold">Mi perfil de belleza</p><p className="text-sm text-suave">Tus trabajos, tu local y promociones ({yo.portafolio.length} fotos{yo.local ? " · local registrado" : ""})</p></div>
            <span className="text-2xl text-marca">›</span>
          </Link>
        )}
        {!yo.servicios.includes("belleza") && config.servicios.some((x) => x.id === "belleza" && x.activo) && (
          <Link href="/socia/belleza" className="tarjeta block bg-marca-claro text-sm"><b>💅 ¿Haces uñas, pestañas o cejas?</b> Actívalo aquí y recibe pedidos de belleza.</Link>
        )}

        <div className="tarjeta flex items-center gap-4">
          <Avatar foto={yo.foto} nombre={yo.nombre} tam={64} />
          <div className="flex-1">
            <p className="text-lg font-extrabold">{nivel.actual.icono} {nivel.actual.nombre}</p>
            {nivel.siguiente ? (
              <p className="text-sm text-suave">
                {nivel.faltan > 0 ? `Te faltan ${nivel.faltan} servicios` : "Ya tienes los servicios"}
                {` y ${nivel.siguiente.minCalificacion}⭐ de calificación para ser ${nivel.siguiente.nombre} ${nivel.siguiente.icono}`}
              </p>
            ) : <p className="text-sm text-suave">¡Eres de las mejores! Los clientes ven tu insignia.</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="tarjeta"><p className="text-sm text-suave">Mis ganancias</p><p className="text-2xl font-extrabold text-marca">{soles(ganancias)}</p>{propinas > 0 && <p className="text-xs text-green-700">incluye {soles(propinas)} de propinas 💚</p>}</div>
          <div className="tarjeta"><p className="text-sm text-suave">Servicios</p><p className="text-2xl font-extrabold">{terminados.length}</p></div>
        </div>


        {activos.map((p) => (
          <Link key={p.id} href={`/socia/pedido/${p.id}`} className="tarjeta block border-l-8 border-marca">
            <div className="flex items-center justify-between"><b>Servicio actual</b><EstadoBadge estado={p.estado} /></div>
            <p className="text-suave">{p.ubicacion.direccion}, {p.ubicacion.distrito}</p>
          </Link>
        ))}

        <h2 className="pt-2 text-lg font-bold">Pedidos cerca de ti</h2>
        {!yo.disponible && <p className="text-suave">Activa “disponible” para ver pedidos.</p>}
        {yo.disponible && cercanos.length === 0 && <p className="text-suave">Aún no hay pedidos. Apenas llegue uno, te sale la alerta 🔔</p>}
        {yo.disponible && cercanos.map((p) => {
          const s = config.servicios.find((x) => x.id === p.servicio)!;
          if (s.cotizar) {
            const mia = ofertas.find((o) => o.pedidoId === p.id && o.sociaId === yo.id);
            return (
              <div key={p.id} className="tarjeta space-y-2">
                <div className="flex justify-between"><b>{s.icono} Piden cotización</b>{mia && <b className="text-marca">Ofertaste {soles(mia.precio)}</b>}</div>
                <p className="text-suave">📍 {p.ubicacion.distrito} · 🕒 {formatoFecha(p.fecha)} · {p.modalidad === "local" ? "📍 En tu local" : "🏠 A domicilio"}</p>
                {p.promoId && <p className="inline-block rounded-full bg-acento-claro px-2 py-0.5 text-sm font-bold text-amber-900">🎁 Promoción</p>}
                <div className="rounded-xl bg-marca-claro p-3"><ListaBelleza tareas={p.tareas} /></div>
                {p.notas && <p>📝 {p.notas}</p>}
                <button className={mia ? "btn-borde" : "btn-primario"} onClick={() => setCotizando(p.id)}>{mia ? "Cambiar mi oferta" : "💌 Enviar mi precio"}</button>
              </div>
            );
          }
          return (
            <div key={p.id} className="tarjeta space-y-2">
              <div className="flex justify-between"><b>{s.icono} {s.nombre}</b><b className="text-marca">{soles(gananciaSocia(p))}</b></div>
              {p.recargo > 0 && <p className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-sm font-bold text-green-800">💰 Pago extra por {p.fecha === "asap" ? "urgencia" : "fin de semana"}</p>}
              <p className="text-suave">📍 {p.ubicacion.distrito} · 🕒 {formatoFecha(p.fecha)}</p>
              {p.sociaPreferida === yo.id && <p className="inline-block rounded-full bg-acento-claro px-2 py-0.5 text-sm font-bold text-amber-900">💛 Este cliente te eligió a ti</p>}
              {p.frecuencia !== "unica" && <p className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-sm font-bold text-green-800">🔁 Cliente fijo: {p.frecuencia === "semanal" ? "cada semana" : "cada 15 días"}</p>}
              <p className="text-suave">⏱️ {p.horas} h · 🧴 {p.conMateriales ? "Llevas tus materiales" : "Materiales del cliente"}</p>
              {p.tareas.length > 0 && <p className="text-suave">✅ {p.tareas.join(", ")}</p>}
              <button className="btn-primario" onClick={() => aceptar(p.id)}>Aceptar pedido</button>
            </div>
          );
        })}
      </Pantalla>
      <BotonWhatsApp mensaje="Hola Una Manito, soy socia y necesito ayuda." />
      {alerta && <AlertaPedido pedido={alerta} servicio={config.servicios.find((x) => x.id === alerta.servicio)} onAceptar={() => aceptar(alerta.id)} onCerrar={descartar} />}
      {cotizando && (() => {
        const p = pedidos.find((x) => x.id === cotizando);
        if (!p) return null;
        return (
          <div className="fixed inset-0 z-[2500] flex items-end bg-black/50" onClick={() => setCotizando(null)}>
            <div className="mx-auto max-h-[90vh] w-full max-w-md space-y-3 overflow-y-auto rounded-t-3xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-extrabold">💌 Tu oferta</h3>
              <div className="rounded-xl bg-marca-claro p-3"><p className="font-bold">La clienta pidió:</p><ListaBelleza tareas={p.tareas} /></div>
              <p className="text-sm text-suave">📍 {p.ubicacion.distrito} · 🕒 {formatoFecha(p.fecha)} · {p.modalidad === "local" ? "en tu local" : "a domicilio"}</p>
              {p.notas && <p>📝 {p.notas}</p>}
              <FormOferta pedido={p} onListo={() => { setCotizando(null); alert("¡Oferta enviada! Te avisaremos si la clienta te elige."); }} />
              <button className="w-full py-2 font-semibold text-suave" onClick={() => setCotizando(null)}>Cerrar</button>
            </div>
          </div>
        );
      })()}
      <MenuInferior rol="socia" />
    </>
  );
}
