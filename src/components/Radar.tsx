"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui";
import { formatoFecha, gananciaSocia, soles } from "@/lib/config";
import { NivelBadge } from "@/components/ui";
import type { Pedido, Servicio, Socia } from "@/lib/tipos";

const MapaRadar = dynamic(() => import("./MapaRadar"), { ssr: false, loading: () => <div className="h-[340px] animate-pulse bg-[#0a4fc8]" /> });

// Posición estable en el radar para cada distrito (no es un mapa real: es una vista llamativa de "dónde busco").
const posicion = (nombre: string, i: number, total: number) => {
  const h = [...nombre].reduce((a, c) => a + c.charCodeAt(0), 0);
  const angulo = (i / Math.max(total, 1)) * 2 * Math.PI + (h % 60) / 60;
  const radio = 28 + (h % 14);
  return { left: `${50 + radio * Math.cos(angulo)}%`, top: `${50 + radio * Math.sin(angulo)}%` };
};

/** Radar animado mientras la socia está disponible: sus distritos y los pedidos que aparecen. */
export function RadarEspera({ socia, pedidos }: { socia: Socia; pedidos: Pedido[] }) {
  const distritos = socia.distritos.slice(0, 8);
  const conPedido = new Set(pedidos.map((p) => p.ubicacion.distrito));
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#0a4fc8] to-[#0b1f44] p-4 text-white shadow-lg">
      <div className="relative mx-auto aspect-square w-full max-w-[320px]">
        {/* anillos */}
        {[1, 0.72, 0.44].map((t) => (
          <div key={t} className="absolute rounded-full border border-white/15" style={{ inset: `${(1 - t) * 50}%` }} />
        ))}
        {/* ondas */}
        {[0, 1, 2].map((i) => (
          <div key={i} className="radar-onda absolute inset-0 rounded-full border-2 border-[#4da3ff]" style={{ animationDelay: `${i}s` }} />
        ))}
        {/* barrido */}
        <div className="radar-barrido absolute inset-0 rounded-full" style={{ background: "conic-gradient(from 0deg, rgba(77,163,255,0.45), rgba(77,163,255,0) 70deg)" }} />
        {/* distritos */}
        {distritos.map((d, i) => {
          const hay = conPedido.has(d);
          return (
            <div key={d} className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={posicion(d, i, distritos.length)}>
              <span className={`mx-auto block rounded-full ${hay ? "radar-punto h-5 w-5 bg-acento ring-4 ring-acento/40" : "h-2.5 w-2.5 bg-white/70"}`} />
              <span className={`mt-1 block whitespace-nowrap text-[11px] font-semibold ${hay ? "text-acento" : "text-white/70"}`}>{d}</span>
            </div>
          );
        })}
        {/* la socia al centro */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ring-white">
          <Avatar foto={socia.foto} nombre={socia.nombre} tam={64} />
        </div>
      </div>
      <p className="mt-2 text-center text-lg font-extrabold">
        {pedidos.length > 0 ? `🔔 ${pedidos.length} pedido${pedidos.length === 1 ? "" : "s"} cerca de ti` : "Buscando pedidos cerca de ti…"}
      </p>
      <p className="text-center text-sm text-white/70">
        {socia.distritos.length} distrito{socia.distritos.length === 1 ? "" : "s"} · {Object.keys(socia.horario ?? {}).length ? "dentro de tu horario" : "cualquier día y hora"}
      </p>
    </div>
  );
}

/** Mapa real de Lima con radar sobre la socia y los pedidos cercanos marcados con lo que gana. */
export function MapaEspera({ socia, pedidos, onElegir }: { socia: Socia; pedidos: Pedido[]; onElegir: (p: Pedido) => void }) {
  return (
    <div className="relative overflow-hidden rounded-3xl shadow-lg ring-1 ring-black/10">
      <MapaRadar pedidos={pedidos} onElegir={onElegir} />
      <p className="absolute right-2 top-2 z-[500] rounded bg-white/80 px-1.5 text-[10px] text-suave">© OpenStreetMap</p>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[500] bg-gradient-to-t from-[#0b1f44]/90 via-[#0b1f44]/60 to-transparent px-4 pb-6 pt-10 text-white">
        <p className="text-lg font-extrabold">
          {pedidos.length > 0 ? `🔔 ${pedidos.length} pedido${pedidos.length === 1 ? "" : "s"} cerca de ti` : "📡 Buscando pedidos cerca de ti…"}
        </p>
        <p className="text-sm text-white/80">
          {socia.distritos.length} distrito{socia.distritos.length === 1 ? "" : "s"} · {Object.keys(socia.horario ?? {}).length ? "dentro de tu horario" : "cualquier día y hora"}
          {pedidos.length > 0 && " · toca un globo para verlo"}
        </p>
      </div>
    </div>
  );
}

const SEGUNDOS = 45;

/** Alerta grande de pedido nuevo, con cuenta regresiva. */
export function AlertaPedido({ pedido, servicio, onAceptar, onCerrar }: { pedido: Pedido; servicio?: Servicio; onAceptar: () => void; onCerrar: () => void }) {
  const [quedan, setQuedan] = useState(SEGUNDOS);
  useEffect(() => {
    navigator.vibrate?.([300, 150, 300]);
    const t = setInterval(() => setQuedan((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [pedido.id]);
  useEffect(() => { if (quedan <= 0) onCerrar(); }, [quedan, onCerrar]);
  return (
    <div className="fixed inset-0 z-[3000] flex items-end bg-[#0b1f44]/70 backdrop-blur-sm sm:items-center">
      <div className="alerta-subir mx-auto w-full max-w-md overflow-hidden rounded-t-3xl bg-white sm:rounded-3xl">
        <div className="bg-acento px-5 py-3 text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-tinta/70">¡Nuevo pedido!</p>
          <p className="text-4xl font-black text-tinta">{soles(gananciaSocia(pedido))}</p>
          <p className="text-sm font-semibold text-tinta/80">es lo que tú ganas</p>
        </div>
        <div className="space-y-2 p-5">
          <p className="text-xl font-extrabold">{servicio?.icono} {servicio?.nombre ?? "Servicio"}</p>
          <p className="text-lg">📍 <b>{pedido.ubicacion.distrito}</b></p>
          <p>🕒 {formatoFecha(pedido.fecha)} · ⏱️ {pedido.horas} h</p>
          <p>🧴 {pedido.conMateriales ? "Llevas tus materiales" : "Materiales del cliente"}</p>
          {pedido.recargo > 0 && <p className="inline-block rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-800">💰 Incluye pago extra</p>}
          {pedido.frecuencia !== "unica" && <p className="inline-block rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-800">🔁 Cliente fijo</p>}
          <button className="alerta-latido btn-acento mt-2 py-5 text-xl" onClick={onAceptar}>Aceptar pedido</button>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full bg-acento transition-all duration-1000 ease-linear" style={{ width: `${(quedan / SEGUNDOS) * 100}%` }} />
          </div>
          <button className="w-full py-2 font-semibold text-suave" onClick={onCerrar}>Ahora no ({quedan} s)</button>
        </div>
      </div>
    </div>
  );
}

/** Cliente esperando: mapa con su casa al centro y ondas de búsqueda. */
export function BuscandoSocia({ pedido, disponibles }: { pedido: Pedido; disponibles: number }) {
  return (
    <div className="relative overflow-hidden rounded-3xl shadow-lg ring-1 ring-black/10">
      <MapaRadar casa={[pedido.ubicacion.lat, pedido.ubicacion.lng]} alto={300} />
      <p className="absolute right-2 top-2 z-[500] rounded bg-white/80 px-1.5 text-[10px] text-suave">© OpenStreetMap</p>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[500] bg-gradient-to-t from-[#0b1f44]/90 via-[#0b1f44]/60 to-transparent px-4 pb-5 pt-10 text-white">
        <p className="text-xl font-extrabold">🔎 Buscando a tu socia…</p>
        <p className="text-sm text-white/85">
          {disponibles > 0 ? `${disponibles} socia${disponibles === 1 ? "" : "s"} disponible${disponibles === 1 ? "" : "s"} en ${pedido.ubicacion.distrito}` : `Estamos avisando a las socias de ${pedido.ubicacion.distrito}`}
        </p>
      </div>
    </div>
  );
}

/** Celebración cuando una socia acepta el pedido del cliente. */
export function SociaAcepto({ socia, onCerrar }: { socia: Socia; onCerrar: () => void }) {
  useEffect(() => { navigator.vibrate?.([200, 100, 200]); }, []);
  const nombre = socia.nombre.split(" ")[0];
  return (
    <div className="fixed inset-0 z-[3000] flex items-end bg-[#0b1f44]/70 backdrop-blur-sm sm:items-center" onClick={onCerrar}>
      <div className="alerta-subir mx-auto w-full max-w-md space-y-3 rounded-t-3xl bg-white p-6 text-center sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="text-5xl">🎉</div>
        <h3 className="text-2xl font-black">¡{nombre} aceptó tu pedido!</h3>
        <div className="mx-auto w-fit rounded-full ring-4 ring-acento">
          <Avatar foto={socia.foto} nombre={socia.nombre} tam={110} />
        </div>
        <p className="text-xl font-extrabold">{socia.nombre}</p>
        <div className="flex justify-center"><NivelBadge socia={socia} /></div>
        <p className="text-suave">⭐ {socia.calificacion > 0 ? socia.calificacion.toFixed(1) : "Nueva"} · {socia.serviciosHechos} servicios hechos</p>
        <p className="rounded-2xl bg-marca-claro p-3 font-semibold text-marca-oscuro">Te avisaremos cuando vaya en camino. Puedes escribirle desde tu pedido.</p>
        <button className="btn-primario" onClick={onCerrar}>¡Genial!</button>
      </div>
    </div>
  );
}

/** Cliente con socia asignada: moto animada en camino o casa con la socia trabajando. */
/** Distancia en km entre dos puntos (fórmula del haversine). */
const km = (a: [number, number], b: [number, number]) => {
  const r = (g: number) => (g * Math.PI) / 180;
  const h = Math.sin(r(b[0] - a[0]) / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(r(b[1] - a[1]) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
};

export function MapaServicio({ pedido, socia, gps }: { pedido: Pedido; socia: Socia; gps?: { lat: number; lng: number; en: string } }) {
  const nombre = socia.nombre.split(" ")[0];
  const [, refrescar] = useState(0);
  useEffect(() => { const t = setInterval(() => refrescar((x) => x + 1), 15_000); return () => clearInterval(t); }, []);
  // Solo se usa si es reciente (menos de 3 minutos).
  const vivo = gps && Date.now() - new Date(gps.en).getTime() < 3 * 60_000 ? gps : undefined;
  const casa: [number, number] = [pedido.ubicacion.lat, pedido.ubicacion.lng];
  const dist = vivo ? km([vivo.lat, vivo.lng], casa) : 0;
  // En Lima, ~18 km/h promedio en ciudad, más 2 minutos para estacionar y tocar la puerta.
  const minutos = vivo ? Math.max(1, Math.round((dist / 18) * 60) + 2) : 0;
  const etapa = pedido.estado === "en_curso" ? "curso" : pedido.estado === "en_camino" ? "camino" : undefined;
  const texto = {
    aceptado: [`🤝 ${nombre} se está preparando`, "Te avisaremos cuando salga hacia tu casa"],
    en_camino: vivo
      ? [`🛵 ${nombre} llega en ~${minutos} min`, `A ${dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`} de tu casa · ubicación en vivo`]
      : [`🛵 ${nombre} va en camino`, "Esperando su ubicación en vivo…"],
    en_curso: [`✨ ${nombre} está trabajando en tu casa`, `${pedido.horas} h de servicio`],
  }[pedido.estado as "aceptado" | "en_camino" | "en_curso"];
  if (!texto) return null;
  return (
    <div className="relative overflow-hidden rounded-3xl shadow-lg ring-1 ring-black/10">
      <MapaRadar casa={casa} etapa={etapa} inicial={nombre[0]?.toUpperCase()} alto={300} sociaGps={vivo ? [vivo.lat, vivo.lng] : undefined} />
      {vivo && pedido.estado === "en_camino" && <span className="absolute left-3 top-3 z-[500] flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white"><span className="radar-punto h-2 w-2 rounded-full bg-white" /> EN VIVO</span>}
      <p className="absolute right-2 top-2 z-[500] rounded bg-white/80 px-1.5 text-[10px] text-suave">© OpenStreetMap</p>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[500] bg-gradient-to-t from-[#0b1f44]/90 via-[#0b1f44]/60 to-transparent px-4 pb-5 pt-10 text-white">
        <p className="text-xl font-extrabold">{texto[0]}</p>
        <p className="text-sm text-white/80">{texto[1]}</p>
      </div>
    </div>
  );
}
