"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { BarrasH, GraficoArea } from "@/components/Graficos";
import { Avatar, Cabecera, EstadoBadge, NivelBadge, accion } from "@/components/ui";
import type { Rol } from "@/lib/api";
import { comisionDe, DISTRITOS_CALLAO, ETIQUETA_ESTADO, gananciaSocia, soles } from "@/lib/config";
import { useDatos } from "@/lib/store";
import type { EstadoPedido, Pedido } from "@/lib/tipos";

type Seccion = "resumen" | "pedidos" | "socias" | "usuarios" | "ajustes";

const SECCIONES: { id: Seccion; texto: string; icono: string }[] = [
  { id: "resumen", texto: "Resumen", icono: "📊" },
  { id: "pedidos", texto: "Pedidos", icono: "🧾" },
  { id: "socias", texto: "Socias", icono: "🧹" },
  { id: "usuarios", texto: "Usuarios", icono: "👥" },
  { id: "ajustes", texto: "Ajustes", icono: "⚙️" },
];

const ROL_TEXTO: Record<Rol, { texto: string; clase: string }> = {
  ceo: { texto: "CEO", clase: "bg-tinta text-white" },
  admin: { texto: "Administrador", clase: "bg-marca-claro text-marca-oscuro" },
  socia: { texto: "Socia", clase: "bg-acento-claro text-amber-900" },
  cliente: { texto: "Cliente", clase: "bg-gray-100 text-gray-700" },
};

const fechaCorta = (iso: string) => new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "short" });
const solesCortos = (v: number) => (v >= 1000 ? `S/ ${(v / 1000).toFixed(1)}k` : `S/ ${Math.round(v)}`);

export default function Admin() {
  const [seccion, setSeccion] = useState<Seccion>("resumen");
  const { sesion, usuarios, salir, socias } = useDatos();
  const router = useRouter();
  const yo = usuarios.find((u) => u.id === sesion?.id);
  const pendientes = socias.filter((s) => s.estado === "pendiente").length;
  const actual = SECCIONES.find((s) => s.id === seccion)!;

  return (
    <div className="min-h-dvh lg:flex">
      {/* Menú lateral (computadora) */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-black/5 bg-white p-5 lg:flex">
        <div className="mb-8 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icono.svg" alt="" className="h-10 w-10 rounded-xl" />
          <div><p className="text-lg font-black leading-tight">una <span className="text-marca">manito</span></p><p className="text-xs text-suave">Administración</p></div>
        </div>
        <nav className="flex-1 space-y-1">
          {SECCIONES.map((s) => (
            <button key={s.id} onClick={() => setSeccion(s.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left font-semibold ${seccion === s.id ? "bg-marca text-white" : "text-suave hover:bg-marca-claro"}`}>
              <span aria-hidden>{s.icono}</span>{s.texto}
              {s.id === "socias" && pendientes > 0 && <span className="ml-auto rounded-full bg-acento px-2 text-xs text-tinta">{pendientes}</span>}
            </button>
          ))}
        </nav>
        {yo && (
          <div className="flex items-center gap-3 rounded-2xl bg-fondo p-3">
            <Avatar nombre={yo.nombre} tam={40} />
            <div className="min-w-0 flex-1"><p className="truncate font-bold">{yo.nombre}</p><span className={`rounded-full px-2 text-xs font-bold ${ROL_TEXTO[yo.rol].clase}`}>{ROL_TEXTO[yo.rol].texto}</span></div>
          </div>
        )}
        <button className="mt-3 rounded-xl py-2 text-sm font-semibold text-suave hover:bg-gray-100" onClick={async () => { await salir(); router.push("/"); }}>Salir</button>
      </aside>

      <div className="flex-1 lg:ml-64">
        {/* Celular: cabecera y pestañas */}
        <div className="lg:hidden">
          <Cabecera titulo="Administración" />
          <nav className="sticky top-[60px] z-[999] flex gap-1 overflow-x-auto bg-white px-2 py-2 shadow-sm">
            {SECCIONES.map((s) => (
              <button key={s.id} onClick={() => setSeccion(s.id)} className={`shrink-0 rounded-xl px-3 py-2 font-semibold ${seccion === s.id ? "bg-marca text-white" : "text-suave"}`}>{s.texto}</button>
            ))}
          </nav>
        </div>
        <header className="hidden items-center justify-between px-8 pt-8 lg:flex">
          <h1 className="text-3xl font-extrabold">{actual.texto}</h1>
          <p className="text-suave">{new Date().toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" })}</p>
        </header>
        <main className="mx-auto max-w-md space-y-4 px-4 py-5 lg:max-w-7xl lg:px-8 lg:py-6">
          {seccion === "resumen" && <Resumen irA={setSeccion} />}
          {seccion === "pedidos" && <Pedidos />}
          {seccion === "socias" && <Socias />}
          {seccion === "usuarios" && <Usuarios />}
          {seccion === "ajustes" && <Ajustes />}
        </main>
      </div>
    </div>
  );
}

function Tarjeta({ titulo, children, className = "", accion: extra }: { titulo: string; children: ReactNode; className?: string; accion?: ReactNode }) {
  return (
    <section className={`tarjeta ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-2"><h2 className="font-bold">{titulo}</h2>{extra}</div>
      {children}
    </section>
  );
}

function Kpi({ titulo, valor, nota }: { titulo: string; valor: string | number; nota?: string }) {
  return (
    <div className="tarjeta">
      <p className="text-sm text-suave">{titulo}</p>
      <p className="mt-1 whitespace-nowrap text-xl font-extrabold tracking-tight sm:text-2xl lg:text-3xl">{valor}</p>
      {nota && <p className="mt-1 text-xs text-suave">{nota}</p>}
    </div>
  );
}

function Resumen({ irA }: { irA: (s: Seccion) => void }) {
  const { pedidos, socias, clientes } = useDatos();
  const [dias, setDias] = useState(30);
  const desde = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (dias - 1)); return d; }, [dias]);
  const enPeriodo = pedidos.filter((p) => new Date(p.creadoEn) >= desde);
  const terminados = enPeriodo.filter((p) => p.estado === "terminado");
  const ventas = terminados.reduce((t, p) => t + p.total, 0);
  const comisiones = terminados.reduce((t, p) => t + comisionDe(p), 0);
  const paraSocias = terminados.reduce((t, p) => t + gananciaSocia(p), 0);
  const cancelados = enPeriodo.filter((p) => p.estado === "cancelado").length;

  const porDia = useMemo(() => Array.from({ length: dias }, (_, i) => {
    const d = new Date(desde); d.setDate(d.getDate() + i);
    const delDia = terminados.filter((p) => new Date(p.creadoEn).toDateString() === d.toDateString());
    return { etiqueta: d.toLocaleDateString("es-PE", { day: "numeric", month: "numeric" }), valor: delDia.reduce((t, p) => t + p.total, 0),
      detalle: `${delDia.length} servicio${delDia.length === 1 ? "" : "s"} · ${d.toLocaleDateString("es-PE", { weekday: "short", day: "numeric", month: "short" })}` };
  }), [dias, desde, terminados]);

  const porEstado = (Object.keys(ETIQUETA_ESTADO) as EstadoPedido[])
    .map((e) => ({ etiqueta: `${ETIQUETA_ESTADO[e].icono} ${ETIQUETA_ESTADO[e].texto}`, valor: enPeriodo.filter((p) => p.estado === e).length }))
    .filter((x) => x.valor > 0);

  const porDistrito = Object.entries(terminados.reduce<Record<string, Pedido[]>>((acc, p) => { (acc[p.ubicacion.distrito] ??= []).push(p); return acc; }, {}))
    .map(([distrito, ps]) => ({ etiqueta: distrito, valor: ps.length, detalle: `Ventas: ${soles(ps.reduce((t, p) => t + p.total, 0))}` }))
    .sort((a, b) => b.valor - a.valor).slice(0, 6);

  const recientes = [...pedidos].sort((a, b) => b.creadoEn.localeCompare(a.creadoEn)).slice(0, 8);
  const pendientes = socias.filter((s) => s.estado === "pendiente").length;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {[7, 30, 90].map((n) => (
          <button key={n} onClick={() => setDias(n)} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${dias === n ? "bg-tinta text-white" : "bg-white text-suave ring-1 ring-black/10"}`}>Últimos {n} días</button>
        ))}
        {pendientes > 0 && (
          <button onClick={() => irA("socias")} className="ml-auto rounded-full bg-acento-claro px-4 py-1.5 text-sm font-bold text-amber-900">⏳ {pendientes} socia{pendientes > 1 ? "s" : ""} por aprobar →</button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Kpi titulo="Ventas" valor={soles(ventas)} nota={`${terminados.length} servicios terminados`} />
        <Kpi titulo="Tu comisión" valor={soles(comisiones)} nota="Lo que gana Una Manito" />
        <Kpi titulo="Ganado por socias" valor={soles(paraSocias)} nota="Incluye propinas" />
        <Kpi titulo="Ticket promedio" valor={soles(terminados.length ? ventas / terminados.length : 0)} nota={`${cancelados} cancelados · ${clientes.length} clientes`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Tarjeta titulo="Ventas por día" className="lg:col-span-2"><GraficoArea datos={porDia} formato={solesCortos} /></Tarjeta>
        <Tarjeta titulo="Pedidos por estado"><BarrasH datos={porEstado} /></Tarjeta>
        <Tarjeta titulo="Distritos con más servicios"><BarrasH datos={porDistrito} formato={(v) => `${v} servicios`} /></Tarjeta>
        <Tarjeta titulo="Pedidos recientes" className="lg:col-span-2" accion={<button onClick={() => irA("pedidos")} className="text-sm font-semibold text-marca">Ver todos →</button>}>
          <TablaPedidos pedidos={recientes} />
        </Tarjeta>
      </div>
    </>
  );
}

function TablaPedidos({ pedidos }: { pedidos: Pedido[] }) {
  const { socias, clientes } = useDatos();
  const nombre = (lista: { id: string; nombre: string }[], id?: string) => lista.find((x) => x.id === id)?.nombre ?? "—";
  if (!pedidos.length) return <p className="text-sm text-suave">No hay pedidos.</p>;
  return (
    <>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-left text-sm">
          <thead className="text-suave"><tr className="border-b border-black/5">
            <th className="py-2 font-semibold">Fecha</th><th className="font-semibold">Cliente</th><th className="font-semibold">Distrito</th>
            <th className="font-semibold">Socia</th><th className="text-right font-semibold">Total</th><th className="pl-4 font-semibold">Estado</th>
          </tr></thead>
          <tbody>
            {pedidos.map((p) => (
              <tr key={p.id} className="border-b border-black/5 last:border-0">
                <td className="py-2.5">{fechaCorta(p.creadoEn)}</td><td>{nombre(clientes, p.clienteId)}</td><td>{p.ubicacion.distrito}</td>
                <td>{nombre(socias, p.sociaId)}</td><td className="text-right font-semibold">{soles(p.total)}</td><td className="pl-4"><EstadoBadge estado={p.estado} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-2 lg:hidden">
        {pedidos.map((p) => (
          <div key={p.id} className="rounded-2xl bg-fondo p-3 text-sm">
            <div className="flex items-center justify-between"><b>{nombre(clientes, p.clienteId)}</b><EstadoBadge estado={p.estado} /></div>
            <p className="text-suave">{fechaCorta(p.creadoEn)} · {p.ubicacion.distrito} · {nombre(socias, p.sociaId)} · <b className="text-tinta">{soles(p.total)}</b></p>
          </div>
        ))}
      </div>
    </>
  );
}

function Pedidos() {
  const { pedidos, clientes, socias } = useDatos();
  const [filtro, setFiltro] = useState<EstadoPedido | "todos">("todos");
  const [busca, setBusca] = useState("");
  const q = busca.trim().toLowerCase();
  const lista = [...pedidos].sort((a, b) => b.creadoEn.localeCompare(a.creadoEn)).filter((p) => {
    if (filtro !== "todos" && p.estado !== filtro) return false;
    if (!q) return true;
    const texto = [p.id, p.ubicacion.distrito, p.ubicacion.direccion, clientes.find((c) => c.id === p.clienteId)?.nombre, socias.find((s) => s.id === p.sociaId)?.nombre].join(" ").toLowerCase();
    return texto.includes(q);
  });
  return (
    <Tarjeta titulo={`${lista.length} pedidos`}>
      <div className="mb-4 flex flex-col gap-2 lg:flex-row">
        <input className="campo lg:max-w-sm" placeholder="Buscar por cliente, socia, distrito…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <select className="campo lg:max-w-xs" value={filtro} onChange={(e) => setFiltro(e.target.value as EstadoPedido | "todos")}>
          <option value="todos">Todos los estados</option>
          {Object.entries(ETIQUETA_ESTADO).map(([k, v]) => <option key={k} value={k}>{v.texto}</option>)}
        </select>
      </div>
      <TablaPedidos pedidos={lista.slice(0, 100)} />
      {lista.length > 100 && <p className="mt-3 text-center text-sm text-suave">Mostrando los 100 más recientes.</p>}
    </Tarjeta>
  );
}

function Usuarios() {
  const { usuarios, invitaciones, sesion, setRolUsuario, invitarUsuario, eliminarInvitacion, demo } = useDatos();
  const esCeo = sesion?.rol === "ceo";
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "equipo" | "cliente" | "socia">("todos");
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [rolNuevo, setRolNuevo] = useState<"admin" | "ceo">("admin");
  const q = busca.trim().toLowerCase();
  const lista = usuarios
    .filter((u) => filtro === "todos" || (filtro === "equipo" ? u.rol === "admin" || u.rol === "ceo" : u.rol === filtro))
    .filter((u) => !q || [u.nombre, u.email, u.telefono].join(" ").toLowerCase().includes(q))
    .sort((a, b) => ["ceo", "admin", "socia", "cliente"].indexOf(a.rol) - ["ceo", "admin", "socia", "cliente"].indexOf(b.rol) || a.nombre.localeCompare(b.nombre));
  const cuenta = (r: string) => usuarios.filter((u) => (r === "equipo" ? u.rol === "admin" || u.rol === "ceo" : u.rol === r)).length;

  const selectorRol = (u: (typeof usuarios)[number]) => {
    const editable = esCeo && u.id !== sesion?.id && u.rol !== "socia";
    if (!editable) return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${ROL_TEXTO[u.rol].clase}`}>{ROL_TEXTO[u.rol].texto}{u.id === sesion?.id ? " (tú)" : ""}</span>;
    return (
      <select className="rounded-xl border-2 border-gray-200 bg-white px-2 py-1 text-sm font-semibold" value={u.rol}
        onChange={(e) => { const r = e.target.value as "cliente" | "admin" | "ceo"; if (confirm(`¿Cambiar a ${u.nombre} a ${ROL_TEXTO[r].texto}?`)) accion(() => setRolUsuario(u.id, r)); }}>
        <option value="cliente">Cliente</option><option value="admin">Administrador</option><option value="ceo">CEO</option>
      </select>
    );
  };

  return (
    <div className="grid items-start gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:order-2">
        <Tarjeta titulo="Invitar al equipo">
          {esCeo ? (
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); accion(async () => { await invitarUsuario(email, nombre, rolNuevo); setEmail(""); setNombre(""); }); }}>
              <input className="campo" type="email" required placeholder="correo@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              <input className="campo" placeholder="Nombre (opcional)" value={nombre} onChange={(e) => setNombre(e.target.value)} />
              <select className="campo" value={rolNuevo} onChange={(e) => setRolNuevo(e.target.value as "admin" | "ceo")}>
                <option value="admin">Administrador: ve todo y aprueba socias</option>
                <option value="ceo">CEO: además gestiona usuarios y roles</option>
              </select>
              <button className="btn-primario">Enviar invitación</button>
              <p className="text-xs text-suave">La persona entra a la app con ese correo y, al registrarse, recibe el rol. Si ya tiene cuenta, el rol cambia al toque.</p>
            </form>
          ) : <p className="text-sm text-suave">Solo el CEO puede invitar personas y cambiar roles.</p>}
        </Tarjeta>
        {invitaciones.length > 0 && (
          <Tarjeta titulo={`Invitaciones pendientes (${invitaciones.length})`}>
            <ul className="space-y-2">
              {invitaciones.map((i) => (
                <li key={i.email} className="flex items-center gap-2 rounded-xl bg-fondo p-2.5 text-sm">
                  <div className="min-w-0 flex-1"><p className="truncate font-semibold">{i.nombre ?? i.email}</p><p className="truncate text-suave">{i.email} · {ROL_TEXTO[i.rol].texto}</p></div>
                  {esCeo && <button className="rounded-lg px-2 py-1 font-semibold text-red-600 hover:bg-red-50" onClick={() => accion(() => eliminarInvitacion(i.email))}>Quitar</button>}
                </li>
              ))}
            </ul>
          </Tarjeta>
        )}
        <details className="tarjeta text-sm">
          <summary className="cursor-pointer font-bold">¿Cómo creo el primer usuario CEO?</summary>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-suave">
            <li>Entra a la app con tu correo y regístrate como cliente.</li>
            <li>En Supabase, abre <b>SQL Editor</b> y ejecuta:<br />
              <code className="mt-1 block rounded-lg bg-tinta p-2 text-xs text-white">update perfiles set rol = &apos;ceo&apos; where email = &apos;tu-correo@gmail.com&apos;;</code></li>
            <li>Vuelve a entrar: verás este panel. Desde aquí ya puedes invitar a tu equipo sin tocar SQL.</li>
          </ol>
          {demo && <p className="mt-3 rounded-lg bg-acento-claro p-2">En la demo ya entraste como CEO.</p>}
        </details>
      </div>

      <Tarjeta titulo={`${lista.length} usuarios`} className="lg:order-1 lg:col-span-2">
        <div className="mb-4 flex flex-col gap-2">
          <input className="campo" placeholder="Buscar por nombre, correo o celular…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            {([["todos", "Todos", usuarios.length], ["equipo", "Equipo", cuenta("equipo")], ["cliente", "Clientes", cuenta("cliente")], ["socia", "Socias", cuenta("socia")]] as const).map(([id, texto, n]) => (
              <button key={id} onClick={() => setFiltro(id)} className={`rounded-full px-3 py-1 text-sm font-semibold ${filtro === id ? "bg-tinta text-white" : "bg-fondo text-suave"}`}>{texto} · {n}</button>
            ))}
          </div>
        </div>
        <div className="hidden lg:block">
          <table className="w-full text-left text-sm">
            <thead className="text-suave"><tr className="border-b border-black/5"><th className="py-2 font-semibold">Usuario</th><th className="font-semibold">Celular</th><th className="font-semibold">Alta</th><th className="font-semibold">Rol</th></tr></thead>
            <tbody>
              {lista.map((u) => (
                <tr key={u.id} className="border-b border-black/5 last:border-0">
                  <td className="py-2.5"><div className="flex items-center gap-3"><Avatar nombre={u.nombre} tam={36} /><div><p className="font-semibold">{u.nombre}</p><p className="text-suave">{u.email ?? "—"}</p></div></div></td>
                  <td>{u.telefono}{u.personal && <span className="block text-xs text-suave">{u.personal.tipoDocumento} {u.personal.documento}</span>}</td><td>{u.creadoEn ? fechaCorta(u.creadoEn) : "—"}</td><td>{selectorRol(u)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="space-y-2 lg:hidden">
          {lista.map((u) => (
            <li key={u.id} className="flex items-center gap-3 rounded-2xl bg-fondo p-3">
              <Avatar nombre={u.nombre} tam={40} />
              <div className="min-w-0 flex-1"><p className="truncate font-semibold">{u.nombre}</p><p className="truncate text-sm text-suave">{u.email ?? u.telefono}</p></div>
              {selectorRol(u)}
            </li>
          ))}
        </ul>
      </Tarjeta>
    </div>
  );
}

function Socias() {
  const { socias, setEstadoSocia } = useDatos();
  const orden = [...socias].sort((a) => (a.estado === "pendiente" ? -1 : 1));
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {orden.map((s) => (
        <div key={s.id} className="tarjeta space-y-3">
          <div className="flex items-center gap-3">
            <Avatar foto={s.foto} nombre={s.nombre} tam={56} />
            <div className="flex-1"><b>{s.nombre}</b> {s.estado === "aprobada" && <NivelBadge socia={s} />}
              <p className="text-sm text-suave">{s.personal ? `${s.personal.tipoDocumento} ${s.personal.documento} · ` : s.dni ? `DNI ${s.dni} · ` : ""}{s.telefono}</p></div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold capitalize">{s.estado}</span>
          </div>
          <p className="text-sm text-suave">📍 Trabaja en: {s.distritos.join(", ")}</p>
          <FichaVerificacion socia={s} abierta={s.estado === "pendiente"} />
          {s.estado === "pendiente" && (
            <div className="grid grid-cols-2 gap-2">
              <button className="btn bg-green-500 py-3 text-white" onClick={() => accion(() => setEstadoSocia(s.id, "aprobada"))}>Aprobar</button>
              <button className="btn bg-red-100 py-3 text-red-700" onClick={() => accion(() => setEstadoSocia(s.id, "rechazada"))}>Rechazar</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const edad = (f: string) => { const n = new Date(f + "T12:00:00"), h = new Date(); return h.getFullYear() - n.getFullYear() - (h < new Date(h.getFullYear(), n.getMonth(), n.getDate()) ? 1 : 0); };

/** Datos privados de la socia para revisarla antes de aprobar (solo el equipo los ve). */
function FichaVerificacion({ socia, abierta }: { socia: import("@/lib/tipos").Socia; abierta: boolean }) {
  const { verDocumento } = useDatos();
  const v = socia.verificacion, p = socia.personal;
  if (!v && !p) return null;
  const ver = (ruta?: string) => ruta && accion(async () => { window.open(await verDocumento(ruta), "_blank", "noopener"); });
  const fila = (k: string, val?: string | number) => val ? <div className="flex justify-between gap-3 py-1"><dt className="text-suave">{k}</dt><dd className="text-right font-semibold">{val}</dd></div> : null;
  return (
    <details className="rounded-2xl bg-fondo p-3 text-sm" open={abierta}>
      <summary className="cursor-pointer font-bold">🔒 Datos de verificación</summary>
      <dl className="mt-2 divide-y divide-black/5">
        {p && fila("Documento", `${p.tipoDocumento} ${p.documento}`)}
        {p && fila("Nacimiento", `${new Date(p.fechaNacimiento + "T12:00:00").toLocaleDateString("es-PE")} (${edad(p.fechaNacimiento)} años)`)}
        {v && fila("Vive en", `${v.direccion}, ${v.distritoResidencia}`)}
        {v && fila("Emergencia", `${v.emergenciaNombre} (${v.emergenciaParentesco}) · ${v.emergenciaTelefono}`)}
        {v && fila("Yape / Plin", v.cobroNumero)}
        {v && fila("Experiencia", v.experiencia)}
        {v && fila("Declaración jurada", v.declaraSinAntecedentes ? "✅ Aceptada" : "❌ No")}
      </dl>
      {v && (v.dniFrente || v.dniReverso) && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" className="rounded-xl bg-white py-2 font-semibold text-marca ring-1 ring-black/10" onClick={() => ver(v.dniFrente)}>🪪 DNI frente</button>
          <button type="button" className="rounded-xl bg-white py-2 font-semibold text-marca ring-1 ring-black/10" onClick={() => ver(v.dniReverso)}>🪪 DNI reverso</button>
        </div>
      )}
    </details>
  );
}

function Ajustes() {
  const { config, setConfig, reiniciar, demo } = useDatos();
  const [c, setC] = useState(config);
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <div className="space-y-4">
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
      </div>
      <div className="tarjeta space-y-2 lg:row-span-2">
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
      <div className="space-y-2 lg:col-start-1">
        <button className="btn-primario" onClick={() => accion(async () => { await setConfig(c); alert("Ajustes guardados"); })}>Guardar ajustes</button>
        {demo && <button className="w-full text-sm text-suave underline" onClick={reiniciar}>Reiniciar datos de demostración</button>}
      </div>
    </div>
  );
}
