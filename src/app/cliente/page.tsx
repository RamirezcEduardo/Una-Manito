"use client";
import Link from "next/link";
import { BotonWhatsApp } from "@/components/Extras";
import { MenuInferior } from "@/components/Menu";
import { Avatar, Cabecera, EstadoBadge, Pantalla } from "@/components/ui";
import { ESLOGAN_CLIENTE, formatoFecha, soles } from "@/lib/config";
import { useDatos } from "@/lib/store";
import { useRubro } from "@/lib/rubro";
import type { Servicio, Socia } from "@/lib/tipos";

export default function InicioCliente() {
  const { sesion, clientes, pedidos, config, verificaciones, promociones, socias, misReferidos } = useDatos();
  useRubro("hogar"); // el inicio siempre con los colores de la marca
  const promos = promociones.filter((p) => p.activa);
  const servicioDe = (id: string) => config.servicios.find((s) => s.id === id);
  const mios = pedidos.filter((p) => p.clienteId === sesion?.id);
  const terminados = mios.filter((p) => p.estado === "terminado" && p.sociaId).sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
  // "Volver a pedir": las últimas socias con las que tuvo un servicio (una vez cada una).
  const repetir: { socia: Socia; servicio: Servicio }[] = [];
  for (const p of terminados) {
    const socia = socias.find((s) => s.id === p.sociaId && s.estado === "aprobada");
    const servicio = servicioDe(p.servicio);
    if (socia && servicio?.activo && !repetir.some((r) => r.socia.id === socia.id) && repetir.length < 3) repetir.push({ socia, servicio });
  }
  // Recordatorio de retoque: uñas cada ~3 semanas, pestañas cada ~3 semanas, cabello cada ~6 semanas.
  const ultimoBelleza = terminados.find((p) => servicioDe(p.servicio)?.rubro === "belleza");
  const hayActivoBelleza = mios.some((p) => servicioDe(p.servicio)?.rubro === "belleza" && !["terminado", "cancelado"].includes(p.estado));
  const retoque = (() => {
    if (!ultimoBelleza || hayActivoBelleza) return null;
    const dias = Math.floor((Date.now() - new Date(ultimoBelleza.fecha === "asap" ? ultimoBelleza.creadoEn : ultimoBelleza.fecha).getTime()) / 864e5);
    const tiene = (g: string) => ultimoBelleza.tareas.some((t) => t.startsWith(g));
    const semanas = Math.floor(dias / 7);
    const nombre = socias.find((s) => s.id === ultimoBelleza.sociaId)?.nombre.split(" ")[0];
    const con = nombre ? ` con ${nombre}` : "";
    if ((tiene("Uñas") || tiene("Pedicure")) && dias >= 18) return { texto: `Tus uñas cumplen ${semanas} semanas`, detalle: `Es buen momento para el retoque. ¿Repetimos${con}?`, socia: ultimoBelleza.sociaId };
    if (tiene("Pestañas") && dias >= 18) return { texto: `Tus pestañas cumplen ${semanas} semanas`, detalle: `Toca retoque para que se vean perfectas. ¿Repetimos${con}?`, socia: ultimoBelleza.sociaId };
    if (tiene("Cabello") && dias >= 42) return { texto: `Pasaron ${semanas} semanas desde tu último corte o color`, detalle: `¿Agendamos${con}?`, socia: ultimoBelleza.sociaId };
    return null;
  })();
  const codigo = (sesion?.id ?? "").replace(/-/g, "").slice(0, 8).toUpperCase();
  const compartir = async () => {
    const url = `${window.location.origin}/?ref=${codigo}`;
    const texto = `Te invito a Una Manito 💛: limpieza del hogar y belleza (uñas, pestañas, cabello) con personas verificadas. Regístrate con mi enlace: ${url}`;
    try { if (navigator.share) { await navigator.share({ title: "Una Manito", text: texto, url }); return; } } catch { return; }
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
  };
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



        {/* Las dos puertas: cada una abre su mundo con sus colores. */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/cliente/hogar" className="flex flex-col items-center gap-1 rounded-3xl bg-gradient-to-br from-[#0b6ef0] to-[#0a4fc8] p-5 text-center text-white shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icono.svg" alt="" className="mb-1 h-12 w-12 rounded-xl ring-2 ring-white/60" />
            <span className="text-2xl font-black">Hogar</span>
            <span className="text-sm text-white/85">Limpieza y más</span>
          </Link>
          <Link href="/cliente/belleza" className="flex flex-col items-center gap-1 rounded-3xl bg-gradient-to-br from-[#f472b6] to-[#db2777] p-5 text-center text-white shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icono-belleza.svg" alt="" className="mb-1 h-12 w-12 rounded-xl ring-2 ring-white/60" />
            <span className="text-2xl font-black">Belleza</span>
            <span className="text-sm text-white/85">Uñas, pestañas, cabello…</span>
          </Link>
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
            <div className="flex items-center justify-between"><span className="font-bold">{servicioDe(p.servicio)?.icono} Tu pedido</span><EstadoBadge estado={p.estado} /></div>
            <p className="mt-1 text-suave">{p.ubicacion.direccion} · {p.total > 0 ? soles(p.total + p.cargoServicio) : "Recibiendo ofertas"}{p.frecuencia !== "unica" ? " · 🔁 plan" : ""}</p>
          </Link>
        ))}


        {retoque && (
          <Link href={`/cliente/nuevo?servicio=belleza${retoque.socia ? `&socia=${retoque.socia}` : ""}`} className="tarjeta block border-2 border-[#db2777] bg-[#fdf2f8]">
            <p className="font-bold">💅 {retoque.texto}</p>
            <p className="text-sm text-suave">{retoque.detalle}</p>
            <p className="mt-1 text-sm font-bold text-[#db2777]">Agendar mi retoque →</p>
          </Link>
        )}

        {promos.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-lg font-bold">🎁 Promociones</h2>
            <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
              {promos.map((p, i) => (
                <Link key={p.id} href={`/cliente/nuevo?servicio=belleza&promo=${p.id}`}
                  className={`w-[82%] shrink-0 snap-center rounded-3xl p-5 text-white shadow-lg ${["bg-gradient-to-br from-[#f472b6] to-[#be185d]", "bg-gradient-to-br from-[#f59e0b] to-[#db2777]", "bg-gradient-to-br from-[#8b5cf6] to-[#db2777]"][i % 3]}`}>
                  <p className="text-4xl font-black">−{p.descuentoPct}%</p>
                  <p className="text-xl font-extrabold">{p.titulo}</p>
                  {p.descripcion && <p className="mt-1 text-sm text-white/90">{p.descripcion}</p>}
                  <p className="mt-3 inline-block rounded-full bg-white px-3 py-1 text-sm font-bold text-[#be185d]">Quiero esta promo →</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {repetir.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-lg font-bold">💛 Volver a pedir</h2>
            {repetir.map(({ socia, servicio }) => (
              <Link key={socia.id + servicio.id} href={`/cliente/nuevo?servicio=${servicio.id}&socia=${socia.id}`} className="tarjeta flex items-center gap-3">
                <Avatar foto={socia.foto} nombre={socia.nombre} tam={52} />
                <div className="flex-1"><p className="font-bold">Repetir con {socia.nombre.split(" ")[0]}</p><p className="text-sm text-suave">{servicio.icono} {servicio.nombre} · ⭐ {socia.calificacion > 0 ? socia.calificacion.toFixed(1) : "Nueva"}</p></div>
                <span className="text-2xl text-marca">›</span>
              </Link>
            ))}
          </section>
        )}

        <section className="tarjeta space-y-3">
          <h2 className="text-lg font-bold">🎉 Invita a tus amigas</h2>
          <p className="text-sm text-suave">Comparte tu enlace. Cuando tu amiga se registre con él, quedará como tu invitada.</p>
          <div className="flex items-center justify-between rounded-xl bg-fondo p-3"><span className="text-sm text-suave">Tu código</span><b className="text-xl tracking-widest">{codigo}</b></div>
          <button className="btn-primario" onClick={compartir}>📲 Compartir mi enlace</button>
          {misReferidos.invitados > 0 && <p className="text-center text-sm">👭 {misReferidos.invitados} amiga{misReferidos.invitados === 1 ? "" : "s"} invitada{misReferidos.invitados === 1 ? "" : "s"} · {misReferidos.conServicio} ya usó un servicio</p>}
        </section>

        <section className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5"><p className="text-2xl">🛡️</p><p className="font-semibold">Socias verificadas con DNI y video</p></div>
          <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5"><p className="text-2xl">🆘</p><p className="font-semibold">Botón de emergencia en cada servicio</p></div>
          <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5"><p className="text-2xl">💬</p><p className="font-semibold">Chat y pago al final, sin sorpresas</p></div>
        </section>
      </Pantalla>
      <BotonWhatsApp />
      <MenuInferior rol="cliente" />
    </>
  );
}
