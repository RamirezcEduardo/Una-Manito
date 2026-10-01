"use client";
import Link from "next/link";
import { Cabecera, EstadoBadge, Pantalla } from "@/components/ui";
import { ESLOGAN_CLIENTE, soles } from "@/lib/config";
import { useDatos } from "@/lib/store";

export default function InicioCliente() {
  const { sesion, clientes, pedidos, config } = useDatos();
  const yo = clientes.find((c) => c.id === sesion?.id);
  const activos = pedidos.filter((p) => p.clienteId === sesion?.id && !["terminado", "cancelado"].includes(p.estado));

  return (
    <>
      <Cabecera titulo="Una Manito" />
      <Pantalla>
        <div>
          <p className="text-2xl font-extrabold">¡Hola{yo ? `, ${yo.nombre.split(" ")[0]}` : ""}! 👋</p>
          <p className="text-suave">{ESLOGAN_CLIENTE}</p>
        </div>

        {activos.map((p) => (
          <Link key={p.id} href={`/cliente/pedido/${p.id}`} className="tarjeta block border-l-8 border-acento">
            <div className="flex items-center justify-between"><span className="font-bold">Tu pedido</span><EstadoBadge estado={p.estado} /></div>
            <p className="mt-1 text-suave">{p.ubicacion.direccion} · {soles(p.total)}</p>
          </Link>
        ))}

        <h2 className="pt-2 text-lg font-bold">¿Qué necesitas hoy?</h2>
        <div className="grid grid-cols-2 gap-3">
          {config.servicios.map((s) =>
            s.activo ? (
              <Link key={s.id} href={`/cliente/nuevo?servicio=${s.id}`} className="tarjeta flex flex-col items-center gap-2 text-center ring-2 ring-marca">
                <span className="text-5xl">{s.icono}</span><span className="font-bold">{s.nombre}</span>
                <span className="text-sm text-marca-oscuro">{s.eslogan}</span>
                <span className="text-sm text-suave">desde {soles(s.precioHora)}/hora</span>
              </Link>
            ) : (
              <div key={s.id} className="tarjeta flex flex-col items-center gap-2 text-center opacity-50">
                <span className="text-5xl grayscale">{s.icono}</span><span className="font-bold">{s.nombre}</span>
                <span className="text-sm text-suave">Muy pronto</span>
              </div>
            )
          )}
        </div>

        <Link href="/cliente/historial" className="btn-borde block text-center">Mis pedidos</Link>
      </Pantalla>
    </>
  );
}
