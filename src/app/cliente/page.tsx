"use client";
import Link from "next/link";
import { BotonWhatsApp } from "@/components/Extras";
import { MenuInferior } from "@/components/Menu";
import { Cabecera, EstadoBadge, Pantalla } from "@/components/ui";
import { ESLOGAN_CLIENTE, formatoFecha, soles } from "@/lib/config";
import { useDatos } from "@/lib/store";
import { fijarRubro, useRubro } from "@/lib/rubro";
import type { Rubro } from "@/lib/tipos";

export default function InicioCliente() {
  const { sesion, clientes, pedidos, config, verificaciones, promociones } = useDatos();
  const rubro = useRubro();
  const servicios = config.servicios.filter((s) => s.rubro === rubro);
  const promos = promociones.filter((p) => p.activa);
  const enRevision = verificaciones.some((v) => v.usuarioId === sesion?.id && v.estado === "pendiente");
  const yo = clientes.find((c) => c.id === sesion?.id);
  const activos = pedidos.filter((p) => p.clienteId === sesion?.id && !["terminado", "cancelado"].includes(p.estado));
  // Recordatorio de la próxima visita programada (las de las próximas 48 horas destacan).
  const proxima = activos.filter((p) => p.fecha !== "asap" && new Date(p.fecha) > new Date()).sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
  const pronto = proxima && new Date(proxima.fecha).getTime() - Date.now() < 48 * 36e5;

  return (
    <>
      <Cabecera titulo="Una Manito" />
      <Pantalla>
        <div>
          <p className="text-2xl font-extrabold">¡Hola{yo ? `, ${yo.nombre.split(" ")[0]}` : ""}! 👋</p>
          <p className="text-suave">{ESLOGAN_CLIENTE}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-black/5">
          {([["hogar", "🏠 Hogar"], ["belleza", "💅 Belleza"]] as [Rubro, string][]).map(([r, t]) => (
            <button key={r} onClick={() => fijarRubro(r)}
              className={`rounded-xl py-3 text-lg font-bold transition-colors duration-300 ${rubro === r ? "bg-marca text-white" : "text-suave"}`}>{t}</button>
          ))}
        </div>

        {yo && !yo.verificado && !enRevision && (
          <Link href="/cliente/perfil" className="tarjeta block border-2 border-acento bg-acento-claro">
            <p className="font-bold">🛡️ Verifica tu identidad</p>
            <p className="text-sm text-suave">Toma 4 segundos. Las socias atienden con más confianza a clientes verificados.</p>
          </Link>
        )}

        {pronto && (
          <Link href={`/cliente/pedido/${proxima.id}`} className="tarjeta block bg-acento-claro">
            <p className="font-bold">⏰ Recuerda: tu próxima visita es {formatoFecha(proxima.fecha)}</p>
            <p className="text-sm text-suave">Deja la casa lista y, si usas tus materiales, tenlos a la mano.</p>
          </Link>
        )}

        {activos.map((p) => (
          <Link key={p.id} href={`/cliente/pedido/${p.id}`} className="tarjeta block border-l-8 border-acento">
            <div className="flex items-center justify-between"><span className="font-bold">{config.servicios.find((s) => s.id === p.servicio)?.icono} Tu pedido</span><EstadoBadge estado={p.estado} /></div>
            <p className="mt-1 text-suave">{p.ubicacion.direccion} · {p.total > 0 ? soles(p.total + p.cargoServicio) : "Recibiendo ofertas"}{p.frecuencia !== "unica" ? " · 🔁 plan" : ""}</p>
          </Link>
        ))}

        {rubro === "belleza" && (
          <div className="tarjeta space-y-3 bg-marca-claro text-center">
            <p className="text-2xl font-extrabold text-marca-oscuro">💅 Belleza a tu manera</p>
            <p className="text-suave">Uñas, pestañas y cejas en un solo pedido. Las especialistas te mandan su precio y tú eliges, viendo su perfil y sus trabajos.</p>
            <p className="text-sm font-semibold">🏠 A domicilio o 📍 en su local</p>
          </div>
        )}
        {rubro === "belleza" && promos.map((p) => (
          <Link key={p.id} href={`/cliente/nuevo?servicio=belleza&promo=${p.id}`} className="tarjeta block border-2 border-dashed border-acento bg-acento-claro">
            <p className="font-extrabold">🎁 {p.titulo} · −{p.descuentoPct}%</p>
            {p.descripcion && <p className="text-sm text-suave">{p.descripcion}</p>}
            <p className="mt-1 text-sm font-bold text-marca">Pedir con esta promoción →</p>
          </Link>
        ))}

        <h2 className="pt-2 text-lg font-bold">¿Qué necesitas hoy?</h2>
        <div className="grid grid-cols-2 gap-3">
          {servicios.map((s) =>
            s.activo ? (
              <Link key={s.id} href={`/cliente/nuevo?servicio=${s.id}`} className="tarjeta flex flex-col items-center gap-2 text-center ring-2 ring-marca">
                <span className="text-5xl">{s.icono}</span><span className="font-bold">{s.nombre}</span>
                <span className="text-sm text-marca-oscuro">{s.eslogan}</span>
                <span className="text-sm text-suave">{s.cotizar ? "Pide tu cotización" : `desde ${soles(s.precioHora)}/hora`}</span>
              </Link>
            ) : (
              <div key={s.id} className="tarjeta flex flex-col items-center gap-2 text-center opacity-50">
                <span className="text-5xl grayscale">{s.icono}</span><span className="font-bold">{s.nombre}</span>
                <span className="text-sm text-suave">Muy pronto</span>
              </div>
            )
          )}
        </div>

      </Pantalla>
      <BotonWhatsApp />
      <MenuInferior rol="cliente" />
    </>
  );
}
