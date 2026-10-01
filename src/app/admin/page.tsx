"use client";
import { useState } from "react";
import { Cabecera, EstadoBadge, Pantalla } from "@/components/ui";
import { ETIQUETA_ESTADO, soles } from "@/lib/config";
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
  const comisiones = terminados.reduce((t, p) => t + (p.total * p.comisionPct) / 100, 0);
  const kpis = [
    ["Servicios terminados", terminados.length],
    ["Pedidos activos", pedidos.filter((p) => !["terminado", "cancelado"].includes(p.estado)).length],
    ["Ingresos totales", soles(ingresos)],
    ["Comisiones", soles(comisiones)],
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.foto} alt="" className="h-14 w-14 rounded-full object-cover" />
            <div className="flex-1"><b>{s.nombre}</b><p className="text-sm text-suave">DNI {s.dni} · {s.telefono}</p></div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold capitalize">{s.estado}</span>
          </div>
          <p className="text-sm text-suave">📍 {s.distritos.join(", ")}</p>
          {s.estado === "pendiente" && (
            <div className="grid grid-cols-2 gap-2">
              <button className="btn bg-green-500 py-3 text-white" onClick={() => setEstadoSocia(s.id, "aprobada")}>Aprobar</button>
              <button className="btn bg-red-100 py-3 text-red-700" onClick={() => setEstadoSocia(s.id, "rechazada")}>Rechazar</button>
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
  const { config, setConfig, reiniciar } = useDatos();
  const [c, setC] = useState(config);
  return (
    <>
      <div className="tarjeta space-y-2">
        <label className="etiqueta">Comisión de la plataforma (%)</label>
        <input type="number" min={0} max={50} className="campo" value={c.comisionPct} onChange={(e) => setC({ ...c, comisionPct: +e.target.value })} />
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
        <h3 className="font-bold">Distritos habilitados</h3>
        <div className="grid grid-cols-2 gap-2">
          {c.distritos.map((d, i) => (
            <label key={d.nombre} className="flex items-center gap-2">
              <input type="checkbox" className="h-5 w-5" checked={d.habilitado} onChange={(e) => setC({ ...c, distritos: c.distritos.map((x, j) => (j === i ? { ...x, habilitado: e.target.checked } : x)) })} />
              {d.nombre}
            </label>
          ))}
        </div>
      </div>
      <button className="btn-primario" onClick={() => { setConfig(c); alert("Ajustes guardados"); }}>Guardar ajustes</button>
      <button className="w-full text-sm text-suave underline" onClick={reiniciar}>Reiniciar datos de demostración</button>
    </>
  );
}
