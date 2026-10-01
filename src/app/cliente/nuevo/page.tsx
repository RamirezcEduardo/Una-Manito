"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Mapa } from "@/components/MapaDinamico";
import { Cabecera, Opcion, Pantalla } from "@/components/ui";
import { LIMA, calcularPrecio, soles } from "@/lib/config";
import { useDatos } from "@/lib/store";
import type { ServicioId } from "@/lib/tipos";

function Formulario() {
  const { config, crearPedido } = useDatos();
  const router = useRouter();
  const params = useSearchParams();
  const servicio = config.servicios.find((s) => s.id === (params.get("servicio") as ServicioId)) ?? config.servicios[0];
  const distritos = config.distritos.filter((d) => d.habilitado).map((d) => d.nombre);

  const [pos, setPos] = useState(LIMA);
  const [direccion, setDireccion] = useState("");
  const [distrito, setDistrito] = useState(distritos[0] ?? "");
  const [referencia, setReferencia] = useState("");
  const [cuando, setCuando] = useState<"asap" | "programar">("asap");
  const [fecha, setFecha] = useState("");
  const [horas, setHoras] = useState(servicio.horasMin);
  const [conMateriales, setConMateriales] = useState(false);
  const [notas, setNotas] = useState("");
  const [confirmar, setConfirmar] = useState(false);

  const total = calcularPrecio(servicio, horas, conMateriales);
  const valido = direccion.trim().length > 4 && (cuando === "asap" || fecha);

  const usarMiUbicacion = () =>
    navigator.geolocation?.getCurrentPosition((p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }));

  const enviar = () => {
    const id = crearPedido({
      servicio: servicio.id, ubicacion: { direccion, distrito, referencia, ...pos },
      fecha: cuando === "asap" ? "asap" : fecha, horas, conMateriales, notas, total,
    });
    router.push(`/cliente/pedido/${id}`);
  };

  return (
    <Pantalla>
      <div className="flex items-center gap-3"><span className="text-4xl">{servicio.icono}</span><div><h2 className="text-2xl font-extrabold">{servicio.nombre}</h2><p className="font-semibold text-marca-oscuro">{servicio.eslogan}</p></div></div>

      <section className="tarjeta space-y-3">
        <h3 className="text-lg font-bold">📍 ¿Dónde?</h3>
        <Mapa lat={pos.lat} lng={pos.lng} onPick={(lat, lng) => setPos({ lat, lng })} />
        <p className="text-sm text-suave">Toca el mapa o arrastra el pin hasta tu casa.</p>
        <button type="button" className="font-semibold text-marca" onClick={usarMiUbicacion}>Usar mi ubicación actual</button>
        <input className="campo" placeholder="Dirección (calle, número, dpto)" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
        <select className="campo" value={distrito} onChange={(e) => setDistrito(e.target.value)}>
          {distritos.map((d) => <option key={d}>{d}</option>)}
        </select>
        <input className="campo" placeholder="Referencia (opcional)" value={referencia} onChange={(e) => setReferencia(e.target.value)} />
      </section>

      <section className="tarjeta space-y-3">
        <h3 className="text-lg font-bold">🕒 ¿Cuándo?</h3>
        <div className="grid grid-cols-2 gap-2">
          <Opcion activo={cuando === "asap"} onClick={() => setCuando("asap")}>Lo antes posible</Opcion>
          <Opcion activo={cuando === "programar"} onClick={() => setCuando("programar")}>Elegir fecha</Opcion>
        </div>
        {cuando === "programar" && <input type="datetime-local" className="campo" value={fecha} onChange={(e) => setFecha(e.target.value)} />}
      </section>

      <section className="tarjeta space-y-3">
        <h3 className="text-lg font-bold">⏱️ ¿Cuántas horas?</h3>
        <div className="flex items-center justify-between">
          <button type="button" className="h-14 w-14 rounded-full bg-marca-claro text-3xl font-bold text-marca" onClick={() => setHoras(Math.max(servicio.horasMin, horas - 1))}>−</button>
          <span className="text-4xl font-extrabold">{horas} h</span>
          <button type="button" className="h-14 w-14 rounded-full bg-marca-claro text-3xl font-bold text-marca" onClick={() => setHoras(Math.min(10, horas + 1))}>+</button>
        </div>
        <p className="text-center text-sm text-suave">Mínimo {servicio.horasMin} horas</p>
      </section>

      <section className="tarjeta space-y-3">
        <h3 className="text-lg font-bold">🧴 Materiales de limpieza</h3>
        <div className="grid gap-2">
          <Opcion activo={!conMateriales} onClick={() => setConMateriales(false)}>Uso los míos (de la casa)</Opcion>
          <Opcion activo={conMateriales} onClick={() => setConMateriales(true)}>Que la socia los lleve (+{soles(servicio.recargoMateriales)})</Opcion>
        </div>
        <textarea className="campo" rows={3} placeholder="Notas para la socia (ej. tengo mascota, tocar intercomunicador 502)" value={notas} onChange={(e) => setNotas(e.target.value)} />
      </section>

      <div className="fixed inset-x-0 bottom-0 z-[1000] border-t bg-white p-4">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <div className="flex-1"><p className="text-sm text-suave">Precio estimado</p><p className="text-2xl font-extrabold">{soles(total)}</p></div>
          <button className="btn-primario !w-auto" disabled={!valido} onClick={() => setConfirmar(true)}>Revisar</button>
        </div>
      </div>

      {confirmar && (
        <div className="fixed inset-0 z-[2000] flex items-end bg-black/40" onClick={() => setConfirmar(false)}>
          <div className="mx-auto w-full max-w-md space-y-3 rounded-t-3xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-extrabold">Confirma tu pedido</h3>
            <ul className="space-y-1 text-suave">
              <li>{servicio.icono} {servicio.nombre} · {horas} horas</li>
              <li>📍 {direccion}, {distrito}</li>
              <li>🕒 {cuando === "asap" ? "Lo antes posible" : new Date(fecha).toLocaleString("es-PE")}</li>
              <li>🧴 {conMateriales ? "La socia lleva materiales" : "Materiales de la casa"}</li>
            </ul>
            <div className="flex justify-between rounded-2xl bg-marca-claro p-4 text-lg"><span>Total estimado</span><b>{soles(total)}</b></div>
            <p className="text-sm text-suave">Pagas al final por Yape, Plin o efectivo.</p>
            <button className="btn-primario" onClick={enviar}>Confirmar y buscar socia</button>
          </div>
        </div>
      )}
    </Pantalla>
  );
}

export default function NuevoPedido() {
  return (<><Cabecera titulo="Nuevo pedido" volver="/cliente" /><Suspense><Formulario /></Suspense></>);
}
