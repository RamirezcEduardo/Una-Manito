"use client";
import Link from "next/link";
import { BotonWhatsApp } from "@/components/Extras";
import { MenuInferior } from "@/components/Menu";
import { Cabecera, Pantalla } from "@/components/ui";
import { soles } from "@/lib/config";
import { useDatos } from "@/lib/store";
import { useRubro } from "@/lib/rubro";
import type { Rubro } from "@/lib/tipos";

/** Servicios de un rubro (Hogar o Belleza). Al entrar, la app toma los colores de ese rubro. */
export default function SeccionRubro({ rubro }: { rubro: Rubro }) {
  const { config, promociones } = useDatos();
  useRubro(rubro);
  const servicios = config.servicios.filter((s) => s.rubro === rubro);
  const promos = rubro === "belleza" ? promociones.filter((p) => p.activa) : [];
  return (
    <>
      <Cabecera titulo={rubro === "belleza" ? "Belleza" : "Hogar"} volver="/cliente" />
      <Pantalla>
        {rubro === "belleza" ? (
          <div className="tarjeta space-y-2 bg-marca-claro text-center">
            <p className="text-2xl font-extrabold text-marca-oscuro">💅 Belleza a tu manera</p>
            <p className="text-suave">Uñas, pedicure, pestañas, cejas y cabello. Elige lo que quieras: las especialistas te mandan su precio y tú eliges, viendo su perfil y sus trabajos.</p>
            <p className="text-sm font-semibold">🏠 A domicilio o 📍 en su local</p>
          </div>
        ) : (
          <div className="tarjeta space-y-2 bg-marca-claro text-center">
            <p className="text-2xl font-extrabold text-marca-oscuro">🏠 Tu hogar, en buenas manos</p>
            <p className="text-suave">Socias verificadas, precio claro por horas y seguimiento en vivo.</p>
          </div>
        )}
        {promos.map((p) => (
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
