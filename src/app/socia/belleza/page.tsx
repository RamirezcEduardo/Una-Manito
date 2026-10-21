"use client";
import { useEffect, useRef, useState } from "react";
import { MenuInferior } from "@/components/Menu";
import { Cabecera, Opcion, Pantalla, accion } from "@/components/ui";
import { useDatos } from "@/lib/store";
import { useRubro } from "@/lib/rubro";
import type { ServicioId } from "@/lib/tipos";

/** Perfil de belleza de la socia: qué servicios ofrece, su local, sus trabajos y las promociones. */
export default function PerfilBelleza() {
  const { sesion, socias, config, promociones, listo, setMisServicios, setLocal, agregarPortafolio, quitarPortafolio, participarPromo } = useDatos();
  useRubro("belleza");
  const yo = socias.find((s) => s.id === sesion?.id);
  const distritos = config.distritos.filter((d) => d.habilitado).map((d) => d.nombre);
  const [direccion, setDireccion] = useState("");
  const [distrito, setDistrito] = useState("");
  const cargado = useRef(false);
  useEffect(() => { if (yo && !cargado.current) { cargado.current = true; setDireccion(yo.local?.direccion ?? ""); setDistrito(yo.local?.distrito ?? ""); } }, [yo]);
  const [subiendo, setSubiendo] = useState(false);
  if (!listo) return null;
  if (!yo) return (<><Cabecera titulo="Mi perfil de belleza" volver="/socia" /><Pantalla><p>No encontramos tu cuenta.</p></Pantalla></>);

  const ofrece = yo.servicios.includes("belleza");
  const alternar = (id: ServicioId) => {
    const nuevos = yo.servicios.includes(id) ? yo.servicios.filter((x) => x !== id) : [...yo.servicios, id];
    accion(() => setMisServicios(nuevos));
  };
  const promos = promociones.filter((p) => p.activa);

  return (
    <>
      <Cabecera titulo="Mi perfil de belleza" volver="/socia" />
      <Pantalla>
        <section className="tarjeta space-y-3">
          <h3 className="text-lg font-bold">🧰 Servicios que ofreces</h3>
          <div className="grid gap-2">
            {config.servicios.filter((s) => s.activo).map((s) => (
              <Opcion key={s.id} activo={yo.servicios.includes(s.id)} onClick={() => alternar(s.id)}>{yo.servicios.includes(s.id) ? "✓ " : ""}{s.icono} {s.nombre}</Opcion>
            ))}
          </div>
          {ofrece && <p className="text-sm text-suave">En belleza, las clientas piden cotización (uñas, pestañas y cejas, juntas o por separado) y tú mandas tu precio. Ellas ven tu perfil y tus trabajos antes de elegir.</p>}
        </section>

        {ofrece && <>
          <section className="tarjeta space-y-3">
            <h3 className="text-lg font-bold">📸 Mis trabajos ({yo.portafolio.length}/12)</h3>
            <p className="text-sm text-suave">Sube fotos de tus mejores trabajos. Es lo primero que miran las clientas al elegir.</p>
            <div className="grid grid-cols-3 gap-2">
              {yo.portafolio.map((u) => (
                <div key={u} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="Trabajo" className="aspect-square w-full rounded-xl object-cover" />
                  <button aria-label="Quitar" className="absolute right-1 top-1 h-7 w-7 rounded-full bg-black/60 text-white" onClick={() => confirm("¿Quitar esta foto?") && accion(() => quitarPortafolio(u))}>✕</button>
                </div>
              ))}
              {yo.portafolio.length < 12 && (
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-marca/40 text-center text-sm font-semibold text-marca">
                  {subiendo ? "⏳" : <><span className="text-2xl">📷</span>Agregar</>}
                  <input type="file" accept="image/*" className="hidden" disabled={subiendo}
                    onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; setSubiendo(true); accion(() => agregarPortafolio(f)).finally(() => setSubiendo(false)); }} />
                </label>
              )}
            </div>
          </section>

          <section className="tarjeta space-y-3">
            <h3 className="text-lg font-bold">📍 Mi local (opcional)</h3>
            <p className="text-sm text-suave">Si tienes local, las clientas pueden elegir “ir a tu local”. La dirección exacta solo la ve la clienta que te elija.</p>
            <input className="campo" placeholder="Dirección del local (ej. Av. Larco 345, int. 2)" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
            <select className={`campo ${distrito ? "" : "text-suave"}`} value={distrito} onChange={(e) => setDistrito(e.target.value)}>
              <option value="" disabled>Distrito del local</option>
              {distritos.map((d) => <option key={d}>{d}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-primario !py-3 !text-base" disabled={direccion.trim().length < 5 || !distrito} onClick={() => accion(async () => { await setLocal(direccion, distrito); alert("Local guardado ✅"); })}>Guardar local</button>
              {yo.local && <button className="btn-borde !py-3 !text-base" onClick={() => confirm("¿Quitar tu local?") && accion(async () => { await setLocal("", ""); setDireccion(""); setDistrito(""); })}>No tengo local</button>}
            </div>
          </section>

          <section className="tarjeta space-y-3">
            <h3 className="text-lg font-bold">🎁 Promociones de Una Manito</h3>
            <p className="text-sm text-suave">Si participas, recibes los pedidos de esa promoción (solo los ven las que participan). La clienta paga tu precio con el descuento indicado.</p>
            {promos.length === 0 && <p className="text-suave">Por ahora no hay promociones activas.</p>}
            {promos.map((p) => {
              const dentro = yo.promos.includes(p.id);
              return (
                <div key={p.id} className={`rounded-2xl border-2 p-4 ${dentro ? "border-marca bg-marca-claro" : "border-gray-200"}`}>
                  <p className="font-bold">{p.titulo} · −{p.descuentoPct}%</p>
                  {p.descripcion && <p className="text-sm text-suave">{p.descripcion}</p>}
                  <button className={`mt-2 ${dentro ? "btn-borde" : "btn-primario"} !py-2.5 !text-base`} onClick={() => accion(() => participarPromo(p.id, !dentro))}>
                    {dentro ? "✓ Participo · dejar de participar" : "Quiero participar"}
                  </button>
                </div>
              );
            })}
          </section>
        </>}
      </Pantalla>
      <MenuInferior rol="socia" />
    </>
  );
}
