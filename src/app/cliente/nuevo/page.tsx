"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import BuscadorDireccion from "@/components/BuscadorDireccion";
import ElegirFecha from "@/components/ElegirFecha";
import { Mapa } from "@/components/MapaDinamico";
import { Cabecera, Opcion, Pantalla, accion } from "@/components/ui";
import { calcularPrecio, DISTRITOS_CALLAO, DISTRITOS_LIMA_TODOS, formatoFecha, LIMA, soles } from "@/lib/config";
import { direccionDePunto, emparejarDistrito, type Lugar } from "@/lib/geo";
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
  const [interior, setInterior] = useState("");
  const [buscandoDir, setBuscandoDir] = useState(false);
  const [fueraDeZona, setFueraDeZona] = useState("");
  const consulta = useRef<AbortController | null>(null);
  const [distrito, setDistrito] = useState("");
  const [referencia, setReferencia] = useState("");
  const [cuando, setCuando] = useState<"asap" | "programar">("asap");
  const [fecha, setFecha] = useState("");
  const [horas, setHoras] = useState(servicio.horasMin);
  const [conMateriales, setConMateriales] = useState(false);
  const [notas, setNotas] = useState("");
  const [confirmar, setConfirmar] = useState(false);

  const total = calcularPrecio(servicio, horas, conMateriales);
  const valido = direccion.trim().length > 4 && !!distrito && !fueraDeZona && (cuando === "asap" || fecha);

  // Pone el distrito detectado si lo atendemos; si no, avisa.
  // Si no se reconoce el distrito, se deja vacío para que la persona lo elija (nunca uno equivocado).
  const fijarDistrito = (candidatos: (string | undefined)[]) => {
    const todos = [...new Set([...DISTRITOS_LIMA_TODOS, ...DISTRITOS_CALLAO, ...config.distritos.map((x) => x.nombre)])];
    const detectado = emparejarDistrito(candidatos, todos);
    if (detectado && distritos.includes(detectado)) { setDistrito(detectado); setFueraDeZona(""); return; }
    setDistrito("");
    setFueraDeZona(detectado ? `Aún no atendemos en ${detectado}. ¡Muy pronto llegaremos!` : "");
  };

  // Al marcar un punto en el mapa, rellena la dirección y el distrito.
  const ubicar = async (lat: number, lng: number) => {
    setPos({ lat, lng });
    consulta.current?.abort();
    const ctrl = new AbortController();
    consulta.current = ctrl;
    setBuscandoDir(true);
    try {
      const l = await direccionDePunto(lat, lng, ctrl.signal);
      if (l.direccion) setDireccion(l.direccion);
      fijarDistrito(l.candidatos);
    } catch {
      // Sin conexión con el servicio de mapas: la persona escribe la dirección a mano.
    }
    if (!ctrl.signal.aborted) setBuscandoDir(false);
  };

  const elegirLugar = (l: Lugar) => {
    consulta.current?.abort();
    setBuscandoDir(false);
    setPos({ lat: l.lat, lng: l.lng });
    setDireccion(l.direccion || l.titulo);
    fijarDistrito(l.candidatos);
  };

  const usarMiUbicacion = () =>
    navigator.geolocation?.getCurrentPosition(
      (p) => ubicar(p.coords.latitude, p.coords.longitude),
      () => alert("No pudimos obtener tu ubicación. Revisa que el navegador tenga permiso."),
      { enableHighAccuracy: true, timeout: 10000 },
    );

  const enviar = () => accion(async () => {
    const id = await crearPedido({
      servicio: servicio.id, ubicacion: { direccion: [direccion.trim(), interior.trim()].filter(Boolean).join(", "), distrito, referencia, ...pos },
      fecha: cuando === "asap" ? "asap" : fecha, horas, conMateriales, notas, total,
    });
    router.push(`/cliente/pedido/${id}`);
  });

  return (
    <Pantalla>
      <div className="flex items-center gap-3"><span className="text-4xl">{servicio.icono}</span><div><h2 className="text-2xl font-extrabold">{servicio.nombre}</h2><p className="font-semibold text-marca-oscuro">{servicio.eslogan}</p></div></div>

      <section className="tarjeta space-y-3">
        <h3 className="text-lg font-bold">📍 ¿Dónde?</h3>
        <BuscadorDireccion cerca={pos} onElegir={elegirLugar} />
        <button type="button" className="font-semibold text-marca" onClick={usarMiUbicacion}>📌 Usar mi ubicación actual</button>
        <Mapa lat={pos.lat} lng={pos.lng} onPick={ubicar} />
        <p className="text-sm text-suave">Toca el mapa o arrastra el pin para ajustar el punto exacto.</p>
        <div>
          <label className="etiqueta">Dirección {buscandoDir && <span className="text-sm font-normal text-suave">· buscando…</span>}</label>
          <input className="campo" placeholder="Calle y número" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
        </div>
        <input className="campo" placeholder="Dpto, piso o interior (opcional)" value={interior} onChange={(e) => setInterior(e.target.value)} />
        <select className={`campo ${distrito ? "" : "text-suave"}`} value={distrito} onChange={(e) => { setDistrito(e.target.value); setFueraDeZona(""); }}>
          <option value="" disabled>Elige tu distrito</option>
          {distritos.map((d) => <option key={d}>{d}</option>)}
        </select>
        {fueraDeZona && <p className="rounded-xl bg-acento-claro p-3 font-semibold text-amber-900">{fueraDeZona}</p>}
        <input className="campo" placeholder="Referencia (opcional)" value={referencia} onChange={(e) => setReferencia(e.target.value)} />
      </section>

      <section className="tarjeta space-y-3">
        <h3 className="text-lg font-bold">🕒 ¿Cuándo?</h3>
        <div className="grid grid-cols-2 gap-2">
          <Opcion activo={cuando === "asap"} onClick={() => setCuando("asap")}>Lo antes posible</Opcion>
          <Opcion activo={cuando === "programar"} onClick={() => setCuando("programar")}>Elegir fecha</Opcion>
        </div>
        {cuando === "programar" && <ElegirFecha valor={fecha} onChange={setFecha} />}
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
              <li>📍 {[direccion, interior].filter(Boolean).join(", ")}, {distrito}</li>
              <li>🕒 {formatoFecha(cuando === "asap" ? "asap" : fecha)}</li>
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
