"use client";
import { useState } from "react";
import { Avatar, Cabecera, EstadoBadge, NivelBadge, Pantalla, accion } from "@/components/ui";
import { comisionDe, DISTRITOS_CALLAO, ETIQUETA_ESTADO, gananciaSocia, soles } from "@/lib/config";
import { useDatos } from "@/lib/store";
import type { EstadoPedido } from "@/lib/tipos";

type Pestana = "resumen" | "socias" | "pedidos" | "config";

export default function Admin() {
  const [tab, setTab] = useState<Pestana>("resumen");
  return (
    <>
      <Cabecera titulo="Administración" />
      <nav className="sticky top-[60px] z-[999] flex gap-1 overflow-x-auto bg-white px-2 py-2 shadow-sm">
        {(["resumen", "socias", "pedidos", "config"] as Pestana[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-xl px-3 py-2 font-semibold capitalize ${tab === t ? "bg-marca text-white" : "text-suave"}`}>
            {t === "config" ? "Ajustes" : t}
          </button>
        ))}
      </nav>
      <Pantalla>
        {tab === "resumen" && <Resumen />}
        {tab === "socias" && <Socias />}
        {tab === "pedidos" && <Pedidos />}
        {tab === "config" && <Ajustes />}
      </Pantalla>
    </>
  );
}

function Resumen() {
  const { pedidos, socias } = useDatos();
  const terminados = pedidos.filter((p) => p.estado === "terminado");
  const ingresos = terminados.reduce((t, p) => t + p.total, 0);
  const comisiones = terminados.reduce((t, p) => t + comisionDe(p), 0);
  const pagadoSocias = terminados.reduce((t, p) => t + gananciaSocia(p), 0);
  const propinas = terminados.reduce((t, p) => t + (p.propina || 0), 0);
  const kpis = [
    ["Servicios terminados", terminados.length],
    ["Pedidos activos", pedidos.filter((p) => !["terminado", "cancelado"].includes(p.estado)).length],
    ["Ingresos totales", soles(ingresos)],
    ["Comisiones (lo que ganas)", soles(comisiones)],
    ["Ganado por socias", soles(pagadoSocias)],
    ["Propinas para socias", soles(propinas)],
    ["Socias aprobadas", socias.filter((s) => s.estado === "aprobada").length],
    ["Por aprobar", socias.filter((s) => s.estado === "pendiente").length],
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {kpis.map(([k, v]) => (
        <div key={k} className="tarjeta"><p className="text-sm text-suave">{k}</p><p className="text-2xl font-extrabold">{v}</p></div>
      ))}
    </div>
  );
}

function Socias() {
  const { socias, setEstadoSocia } = useDatos();
  const orden = [...socias].sort((a) => (a.estado === "pendiente" ? -1 : 1));
  return (
    <>
      {orden.map((s) => (
        <div key={s.id} className="tarjeta space-y-3">
          <div className="flex items-center gap-3">
            <Avatar foto={s.foto} nombre={s.nombre} tam={56} />
            <div className="flex-1"><b>{s.nombre}</b> {s.estado === "aprobada" && <NivelBadge socia={s} />}<p className="text-sm text-suave">{s.dni && `DNI ${s.dni} · `}{s.telefono}</p></div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold capitalize">{s.estado}</span>
          </div>
          <p className="text-sm text-suave">📍 {s.distritos.join(", ")}</p>
          {s.estado === "pendiente" && (
            <div className="grid grid-cols-2 gap-2">
              <button className="btn bg-green-500 py-3 text-white" onClick={() => accion(() => setEstadoSocia(s.id, "aprobada"))}>Aprobar</button>
              <button className="btn bg-red-100 py-3 text-red-700" onClick={() => accion(() => setEstadoSocia(s.id, "rechazada"))}>Rechazar</button>
            </div>
          )}
        </div>
      ))}
    </>
  );
}

function Pedidos() {
  const { pedidos, socias, clientes } = useDatos();
  const [filtro, setFiltro] = useState<EstadoPedido | "todos">("todos");
  const lista = pedidos.filter((p) => filtro === "todos" || p.estado === filtro);
  return (
    <>
      <select className="campo" value={filtro} onChange={(e) => setFiltro(e.target.value as EstadoPedido | "todos")}>
        <option value="todos">Todos los estados</option>
        {Object.entries(ETIQUETA_ESTADO).map(([k, v]) => <option key={k} value={k}>{v.texto}</option>)}
      </select>
      {lista.map((p) => (
        <div key={p.id} className="tarjeta space-y-1 text-sm">
          <div className="flex justify-between"><b className="text-base">#{p.id}</b><EstadoBadge estado={p.estado} /></div>
          <p>Cliente: {clientes.find((c) => c.id === p.clienteId)?.nombre ?? "—"}</p>
          <p>Socia: {socias.find((s) => s.id === p.sociaId)?.nombre ?? "—"}</p>
          <p className="text-suave">{p.ubicacion.distrito} · {p.horas} h · {soles(p.total)} · pago: {p.pago.estado}</p>
        </div>
      ))}
    </>
  );
}

function Ajustes() {
  const { config, setConfig, reiniciar, demo } = useDatos();
  const [c, setC] = useState(config);
  return (
    <>
      <div className="tarjeta space-y-2">
        <label className="etiqueta">Comisión de la plataforma (%)</label>
        <input type="number" min={0} max={50} className="campo" value={c.comisionPct} onChange={(e) => setC({ ...c, comisionPct: +e.target.value })} />
        <label className="etiqueta pt-2">Recargo “lo antes posible” (%)</label>
        <input type="number" min={0} max={100} className="campo" value={c.recargoUrgentePct} onChange={(e) => setC({ ...c, recargoUrgentePct: +e.target.value })} />
        <label className="etiqueta pt-2">Recargo sábados y domingos (%)</label>
        <input type="number" min={0} max={100} className="campo" value={c.recargoFindePct} onChange={(e) => setC({ ...c, recargoFindePct: +e.target.value })} />
        <p className="text-sm text-suave">Los recargos suben el total: la socia gana más y la comisión también.</p>
      </div>
      <div className="tarjeta space-y-3">
        <h3 className="font-bold">Servicios y precios por hora</h3>
        {c.servicios.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <input type="checkbox" className="h-5 w-5" checked={s.activo} onChange={(e) => setC({ ...c, servicios: c.servicios.map((x, j) => (j === i ? { ...x, activo: e.target.checked } : x)) })} />
            <span className="flex-1">{s.icono} {s.nombre}</span>
            <span className="text-suave">S/</span>
            <input type="number" className="campo !w-20 !py-2" value={s.precioHora} onChange={(e) => setC({ ...c, servicios: c.servicios.map((x, j) => (j === i ? { ...x, precioHora: +e.target.value } : x)) })} />
          </div>
        ))}
      </div>
      <div className="tarjeta space-y-2">
        <h3 className="font-bold">Distritos habilitados <span className="font-normal text-suave">({c.distritos.filter((d) => d.habilitado).length} de {c.distritos.length})</span></h3>
        {[["Lima Metropolitana", (n: string) => !DISTRITOS_CALLAO.includes(n)], ["Callao", (n: string) => DISTRITOS_CALLAO.includes(n)]].map(([titulo, es]) => {
          const del = (n: string) => (es as (n: string) => boolean)(n);
          const marcar = (v: boolean) => setC({ ...c, distritos: c.distritos.map((x) => (del(x.nombre) ? { ...x, habilitado: v } : x)) });
          return (
            <div key={titulo as string} className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-marca-oscuro">{titulo as string}</h4>
                <div className="flex gap-3 text-sm font-semibold text-marca">
                  <button type="button" onClick={() => marcar(true)}>Todos</button>
                  <button type="button" onClick={() => marcar(false)}>Ninguno</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {c.distritos.map((d, i) => del(d.nombre) && (
                  <label key={d.nombre} className="flex items-center gap-2">
                    <input type="checkbox" className="h-5 w-5 shrink-0" checked={d.habilitado} onChange={(e) => setC({ ...c, distritos: c.distritos.map((x, j) => (j === i ? { ...x, habilitado: e.target.checked } : x)) })} />
                    {d.nombre}
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <button className="btn-primario" onClick={() => accion(async () => { await setConfig(c); alert("Ajustes guardados"); })}>Guardar ajustes</button>
      {demo && <button className="w-full text-sm text-suave underline" onClick={reiniciar}>Reiniciar datos de demostración</button>}
    </>
  );
}
