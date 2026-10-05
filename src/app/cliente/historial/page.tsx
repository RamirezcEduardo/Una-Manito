"use client";
import Link from "next/link";
import { Cabecera, EstadoBadge, Pantalla } from "@/components/ui";
import { soles } from "@/lib/config";
import { useDatos } from "@/lib/store";

export default function Historial() {
  const { pedidos, sesion, config } = useDatos();
  const mios = pedidos.filter((p) => p.clienteId === sesion?.id);
  return (
    <>
      <Cabecera titulo="Mis pedidos" volver="/cliente" />
      <Pantalla>
        {mios.length === 0 && <p className="text-center text-suave">Aún no tienes pedidos.</p>}
        {mios.map((p) => {
          const s = config.servicios.find((x) => x.id === p.servicio)!;
          return (
            <Link key={p.id} href={`/cliente/pedido/${p.id}`} className="tarjeta block space-y-1">
              <div className="flex items-center justify-between"><b>{s.icono} {s.nombre}</b><EstadoBadge estado={p.estado} /></div>
              <p className="text-suave">{new Date(p.creadoEn).toLocaleDateString("es-PE")} · {p.ubicacion.distrito} · {soles(p.total + p.cargoServicio)}</p>
            </Link>
          );
        })}
      </Pantalla>
    </>
  );
}
