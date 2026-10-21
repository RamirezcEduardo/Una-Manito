"use client";
// Belleza: pedidos por cotización. La clienta ve las ofertas (con el perfil y los trabajos de cada socia) y elige;
// la socia arma su oferta con precio base + adicionales.
import { useState } from "react";
import { Avatar, NivelBadge, accion } from "@/components/ui";
import { ADICIONALES_BELLEZA, ICONO_GRUPO, soles } from "@/lib/config";
import { useDatos } from "@/lib/store";
import type { Oferta, Pedido, Socia } from "@/lib/tipos";

const conDescuento = (precio: number, pct: number) => Math.round((precio - Math.round(precio * pct) / 100) * 100) / 100;

/** Lista de lo que pidió la clienta, con íconos por grupo. */
export function ListaBelleza({ tareas }: { tareas: string[] }) {
  return (
    <ul className="space-y-1">
      {tareas.map((t) => <li key={t}>{ICONO_GRUPO[t.split(" · ")[0]] ?? "•"} {t}</li>)}
    </ul>
  );
}

/** Desglose de una oferta: base + adicionales = total. */
function Desglose({ oferta, pct }: { oferta: Oferta; pct: number }) {
  const extras = oferta.detalle.reduce((t, d) => t + d.precio, 0);
  return (
    <div className="space-y-0.5 rounded-xl bg-fondo p-3 text-sm">
      <div className="flex justify-between"><span>Servicio{oferta.detalle.length ? " base" : " (todo incluido)"}</span><span>{soles(oferta.precio - extras)}</span></div>
      {oferta.detalle.map((d) => <div key={d.nombre} className="flex justify-between text-suave"><span>+ {d.nombre}</span><span>{soles(d.precio)}</span></div>)}
      {pct > 0 && <div className="flex justify-between font-semibold text-green-700"><span>🎁 Promoción −{pct}%</span><span>− {soles(oferta.precio - conDescuento(oferta.precio, pct))}</span></div>}
    </div>
  );
}

/** Perfil de la socia con sus trabajos: solo se ve desde una oferta o un pedido. */
export function PerfilSocia({ socia, onCerrar }: { socia: Socia; onCerrar: () => void }) {
  const [grande, setGrande] = useState<string>();
  return (
    <div className="fixed inset-0 z-[2500] flex items-end bg-black/50" onClick={onCerrar}>
      <div className="mx-auto max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-t-3xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-4">
          <Avatar foto={socia.foto} nombre={socia.nombre} tam={80} />
          <div className="space-y-1">
            <p className="text-xl font-extrabold">{socia.nombre.split(" ")[0]} {socia.verificado && <span className="align-middle text-sm text-green-700">✅</span>}</p>
            <NivelBadge socia={socia} />
            <p className="text-suave">⭐ {socia.calificacion > 0 ? socia.calificacion.toFixed(1) : "Nueva"} · {socia.serviciosHechos} servicios</p>
          </div>
        </div>
        <p className="text-sm">{socia.local ? `📍 Tiene local en ${socia.local.distrito} · ` : ""}🏠 Atiende en {socia.distritos.slice(0, 4).join(", ")}{socia.distritos.length > 4 ? "…" : ""}</p>
        <div>
          <p className="mb-2 font-bold">📸 Sus trabajos</p>
          {socia.portafolio.length === 0 ? <p className="text-sm text-suave">Aún no sube fotos de sus trabajos.</p> : (
            <div className="grid grid-cols-3 gap-2">
              {socia.portafolio.map((u) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={u} src={u} alt="Trabajo" className="aspect-square w-full cursor-pointer rounded-xl object-cover" onClick={() => setGrande(u)} />
              ))}
            </div>
          )}
        </div>
        <button className="btn-borde" onClick={onCerrar}>Volver a las ofertas</button>
      </div>
      {grande && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={grande} alt="Trabajo" className="fixed inset-0 z-[2600] m-auto max-h-[90vh] max-w-[95vw] rounded-2xl bg-black object-contain" onClick={(e) => { e.stopPropagation(); setGrande(undefined); }} />
      )}
    </div>
  );
}

/** La clienta ve las ofertas de su pedido y elige una. */
export function OfertasRecibidas({ pedido }: { pedido: Pedido }) {
  const { ofertas, socias, promociones, elegirOferta } = useDatos();
  const [perfil, setPerfil] = useState<Socia>();
  const pct = promociones.find((p) => p.id === pedido.promoId)?.descuentoPct ?? 0;
  const lista = ofertas.filter((o) => o.pedidoId === pedido.id).sort((a, b) => a.precio - b.precio);
  return (
    <div className="space-y-3">
      <div className="tarjeta space-y-1 bg-marca-claro text-center">
        <p className="text-xl font-extrabold text-marca-oscuro">{lista.length ? `💌 ${lista.length} oferta${lista.length === 1 ? "" : "s"} para ti` : "💌 Esperando ofertas…"}</p>
        <p className="text-sm text-suave">{lista.length ? "Mira su perfil y sus trabajos antes de elegir." : "Les avisamos a las especialistas cercanas. Suelen responder en minutos."}</p>
      </div>
      {lista.map((o) => {
        const s = socias.find((x) => x.id === o.sociaId);
        if (!s) return null;
        const nombre = s.nombre.split(" ")[0];
        return (
          <div key={o.id} className="tarjeta space-y-3">
            <div className="flex items-center gap-3">
              <Avatar foto={s.foto} nombre={s.nombre} tam={56} />
              <div className="flex-1">
                <p className="font-bold">{nombre}</p>
                <p className="text-sm text-suave">⭐ {s.calificacion > 0 ? s.calificacion.toFixed(1) : "Nueva"} · {s.serviciosHechos} servicios{pedido.modalidad === "local" && s.local ? ` · 📍 ${s.local.distrito}` : ""}</p>
              </div>
              <div className="text-right">
                {pct > 0 && <p className="text-sm text-suave line-through">{soles(o.precio)}</p>}
                <p className="text-2xl font-extrabold text-marca">{soles(conDescuento(o.precio, pct))}</p>
              </div>
            </div>
            <Desglose oferta={o} pct={pct} />
            {o.mensaje && <p className="rounded-xl bg-white p-3 text-sm italic ring-1 ring-black/5">“{o.mensaje}”</p>}
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-borde !py-3 !text-base" onClick={() => setPerfil(s)}>👀 Perfil y trabajos</button>
              <button className="btn-primario !py-3 !text-base" onClick={() => confirm(`¿Elegir a ${nombre} por ${soles(conDescuento(o.precio, pct))}?`) && accion(() => elegirOferta(o.id))}>Elegir a {nombre}</button>
            </div>
          </div>
        );
      })}
      {perfil && <PerfilSocia socia={perfil} onCerrar={() => setPerfil(undefined)} />}
    </div>
  );
}

/** Dirección del local de la socia (se muestra recién cuando la clienta la eligió). */
export function LocalSocia({ socia }: { socia: Socia }) {
  if (!socia.local) return null;
  const q = encodeURIComponent(`${socia.local.direccion}, ${socia.local.distrito}, Lima`);
  return (
    <div className="tarjeta space-y-2 border-2 border-marca">
      <p className="text-lg font-bold">📍 Te atiende en su local</p>
      <p>{socia.local.direccion}, {socia.local.distrito}</p>
      <a className="font-semibold text-marca" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${q}`}>🧭 Cómo llegar</a>
    </div>
  );
}

/** La socia arma su oferta: precio base + adicionales con su precio + mensaje. */
export function FormOferta({ pedido, onListo }: { pedido: Pedido; onListo?: () => void }) {
  const { ofertas, sesion, ofertar, socias, promociones } = useDatos();
  const yo = socias.find((s) => s.id === sesion?.id);
  const mia = ofertas.find((o) => o.pedidoId === pedido.id && o.sociaId === sesion?.id);
  const extrasPrevios = mia?.detalle ?? [];
  const [base, setBase] = useState(mia ? String(mia.precio - extrasPrevios.reduce((t, d) => t + d.precio, 0)) : "");
  const [extras, setExtras] = useState<Record<string, string>>(Object.fromEntries(extrasPrevios.map((d) => [d.nombre, String(d.precio)])));
  const [mensaje, setMensaje] = useState(mia?.mensaje ?? "");
  const promo = promociones.find((p) => p.id === pedido.promoId);
  const detalle = Object.entries(extras).filter(([, v]) => Number(v) > 0).map(([nombre, v]) => ({ nombre, precio: Number(v) }));
  const total = (Number(base) || 0) + detalle.reduce((t, d) => t + d.precio, 0);
  const sinLocal = pedido.modalidad === "local" && !yo?.local;
  return (
    <div className="space-y-3">
      {promo && <p className="rounded-xl bg-acento-claro p-3 text-sm">🎁 Promoción <b>{promo.titulo}</b>: la clienta paga tu precio con −{promo.descuentoPct}% (participas en esta promo).</p>}
      {sinLocal && <p className="rounded-xl bg-acento-claro p-3 text-sm font-semibold">📍 La clienta quiere ir a un local. Registra tu local en “Mi perfil de belleza” para poder ofertar.</p>}
      <div>
        <label className="etiqueta">Tu precio por todo lo que pidió (S/)</label>
        <input className="campo" inputMode="decimal" placeholder="Ej. 60" value={base} onChange={(e) => setBase(e.target.value.replace(/[^\d.]/g, ""))} />
        <p className="mt-1 text-xs text-suave">Puedes ponerlo como paquete: un solo precio por todo.</p>
      </div>
      <div>
        <p className="etiqueta">✨ Adicionales que le ofreces (opcional)</p>
        <div className="flex flex-wrap gap-2">
          {ADICIONALES_BELLEZA.map((a) => {
            const activo = a in extras;
            return (
              <button key={a} type="button" onClick={() => setExtras((x) => { const y = { ...x }; if (activo) delete y[a]; else y[a] = ""; return y; })}
                className={`rounded-full border-2 px-3 py-1 text-sm font-semibold ${activo ? "border-marca bg-marca-claro text-marca-oscuro" : "border-gray-200 bg-white"}`}>{activo ? "✓ " : "+ "}{a}</button>
            );
          })}
        </div>
        {Object.keys(extras).map((a) => (
          <div key={a} className="mt-2 flex items-center gap-2">
            <span className="flex-1 text-sm font-semibold">{a}</span>
            <span className="text-sm">S/</span>
            <input className="campo !w-24 !py-2" inputMode="decimal" placeholder="0" value={extras[a]} onChange={(e) => setExtras((x) => ({ ...x, [a]: e.target.value.replace(/[^\d.]/g, "") }))} />
          </div>
        ))}
      </div>
      <textarea className="campo" rows={2} maxLength={300} placeholder="Mensaje para la clienta (ej. llevo todos los materiales; diseño a mano alzada)" value={mensaje} onChange={(e) => setMensaje(e.target.value)} />
      <p className="text-xs text-suave">🔒 No pongas teléfonos ni redes: podrán chatear cuando te elija.</p>
      <div className="flex items-center justify-between rounded-xl bg-marca-claro p-3"><span className="font-semibold">Total de tu oferta</span><b className="text-xl text-marca-oscuro">{soles(total)}</b></div>
      <button className="btn-primario" disabled={!(Number(base) > 0) || sinLocal} onClick={() => accion(async () => { await ofertar(pedido.id, total, detalle, mensaje); onListo?.(); })}>
        {mia ? "Actualizar mi oferta" : "Enviar oferta"}
      </button>
    </div>
  );
}
