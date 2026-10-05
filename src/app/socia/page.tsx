"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { BotonWhatsApp } from "@/components/Extras";
import { Avatar, Cabecera, EstadoBadge, Pantalla, accion } from "@/components/ui";
import { enHorario, ESLOGAN_SOCIA, formatoFecha, gananciaSocia, nivelSocia, parteUnaManito, soles } from "@/lib/config";
import { prepararSonido, useAvisoPedidosNuevos, usePermisoAvisos } from "@/lib/avisos";
import { useDatos } from "@/lib/store";

export default function PanelSocia() {
  const { sesion, socias, pedidos, config, setDisponible, aceptarPedido, listo } = useDatos();
  const router = useRouter();
  const yo = socias.find((s) => s.id === sesion?.id);
  const cercanos = useMemo(() => (yo ? pedidos.filter((p) => p.estado === "buscando" && yo.distritos.includes(p.ubicacion.distrito) && yo.servicios.includes(p.servicio) && enHorario(yo.horario, p.fecha)) : []), [pedidos, yo]);
  const paraAviso = useMemo(() => cercanos.map((p) => ({ id: p.id, texto: `${p.ubicacion.distrito} · ${formatoFecha(p.fecha)} · ${p.horas} h` })), [cercanos]);
  const disponible = !!yo && yo.estado === "aprobada" && yo.disponible;
  useAvisoPedidosNuevos(paraAviso, disponible);
  const { permiso, pedir } = usePermisoAvisos();
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
  const debes = terminados.filter((p) => p.pago.estado !== "pendiente" && !p.liquidado).reduce((t, p) => t + parteUnaManito(p), 0);

  return (
    <>
      <Cabecera titulo={`Hola, ${yo.nombre.split(" ")[0]}`} />
      <Pantalla>
        <p className="text-suave">{ESLOGAN_SOCIA}</p>
        <button onClick={() => { prepararSonido(); accion(() => setDisponible(!yo.disponible)); }}
          className={`btn py-6 text-xl ${yo.disponible ? "bg-green-500 text-white" : "bg-gray-200 text-tinta"}`}>
          {yo.disponible ? "🟢 Estoy disponible" : "⚪ No disponible — tocar para activar"}
        </button>
        {yo.disponible && permiso === "default" && (
          <button onClick={pedir} className="btn border-2 border-acento bg-acento-claro text-tinta">🔔 Activar avisos de pedidos nuevos</button>
        )}
        {yo.disponible && permiso === "denied" && (
          <p className="rounded-xl bg-acento-claro p-3 text-sm">🔕 Los avisos están bloqueados. Actívalos en los ajustes del navegador para enterarte de pedidos nuevos.</p>
        )}
        {yo.disponible && <p className="text-center text-sm text-suave">🔔 Deja esta pantalla abierta: te avisaremos con sonido cuando llegue un pedido.</p>}

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

        <div className="grid grid-cols-2 gap-3">
          <Link href="/socia/billetera" className="tarjeta block text-center font-bold">💰 Mi billetera{debes > 0 && <span className="block text-sm font-normal text-amber-800">Por pasar: {soles(debes)}</span>}</Link>
          <Link href="/socia/horario" className="tarjeta block text-center font-bold">📅 Mi horario<span className="block text-sm font-normal text-suave">{Object.keys(yo.horario ?? {}).length ? `${Object.keys(yo.horario).length} días` : "Todos los días"}</span></Link>
        </div>

        {activos.map((p) => (
          <Link key={p.id} href={`/socia/pedido/${p.id}`} className="tarjeta block border-l-8 border-marca">
            <div className="flex items-center justify-between"><b>Servicio actual</b><EstadoBadge estado={p.estado} /></div>
            <p className="text-suave">{p.ubicacion.direccion}, {p.ubicacion.distrito}</p>
          </Link>
        ))}

        <h2 className="pt-2 text-lg font-bold">Pedidos cerca de ti</h2>
        {!yo.disponible && <p className="text-suave">Activa “disponible” para ver pedidos.</p>}
        {yo.disponible && cercanos.length === 0 && <p className="text-suave">No hay pedidos por ahora en tus distritos y horario. Te avisaremos 🔔</p>}
        {yo.disponible && cercanos.map((p) => {
          const s = config.servicios.find((x) => x.id === p.servicio)!;
          return (
            <div key={p.id} className="tarjeta space-y-2">
              <div className="flex justify-between"><b>{s.icono} {s.nombre}</b><b className="text-marca">{soles(gananciaSocia(p))}</b></div>
              {p.recargo > 0 && <p className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-sm font-bold text-green-800">💰 Pago extra por {p.fecha === "asap" ? "urgencia" : "fin de semana"}</p>}
              <p className="text-suave">📍 {p.ubicacion.distrito} · 🕒 {formatoFecha(p.fecha)}</p>
              {p.frecuencia !== "unica" && <p className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-sm font-bold text-green-800">🔁 Cliente fijo: {p.frecuencia === "semanal" ? "cada semana" : "cada 15 días"}</p>}
              <p className="text-suave">⏱️ {p.horas} h · 🧴 {p.conMateriales ? "Llevas tus materiales" : "Materiales del cliente"}</p>
              {p.tareas.length > 0 && <p className="text-suave">✅ {p.tareas.join(", ")}</p>}
              <button className="btn-primario" onClick={() => accion(async () => { if (await aceptarPedido(p.id)) router.push(`/socia/pedido/${p.id}`); else alert("Otra socia ya tomó este pedido."); })}>Aceptar pedido</button>
            </div>
          );
        })}
      </Pantalla>
      <BotonWhatsApp mensaje="Hola Una Manito, soy socia y necesito ayuda." />
    </>
  );
}
