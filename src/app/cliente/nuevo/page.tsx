"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import BuscadorDireccion from "@/components/BuscadorDireccion";
import ElegirFecha, { errorFecha } from "@/components/ElegirFecha";
import { Mapa } from "@/components/MapaDinamico";
import { Cabecera, Opcion, Pantalla, accion } from "@/components/ui";
import { calcularPrecio, DISTRITOS_CALLAO, DISTRITOS_LIMA_TODOS, FRECUENCIAS, formatoFecha, LIMA, soles } from "@/lib/config";
import { direccionDePunto, emparejarDistrito, type Lugar } from "@/lib/geo";
import { useDatos } from "@/lib/store";
import type { Frecuencia, ServicioId } from "@/lib/tipos";

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
  // Por defecto se marcan las 5 tareas más comunes de una limpieza.
  const [tareas, setTareas] = useState<string[]>(servicio.tareas.slice(0, 5));
  const [confirmar, setConfirmar] = useState(false);
  const [frecuenciaElegida, setFrecuencia] = useState<Frecuencia>("unica");

  const fechaPedido = cuando === "asap" ? "asap" : fecha;
  // Un plan necesita fecha y hora fijas.
  const frecuencia: Frecuencia = cuando === "asap" ? "unica" : frecuenciaElegida;
  const plan = FRECUENCIAS.find((f) => f.id === frecuencia)!;
  const precio = calcularPrecio(servicio, horas, conMateriales, fechaPedido, config, frecuencia);
  const total = precio.total;
  const valido = direccion.trim().length > 4 && !!distrito && !fueraDeZona && (cuando === "asap" || !errorFecha(fecha));

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

  // Un solo envío: se bloquea al primer toque y solo se libera si hubo error.
  const [enviando, setEnviando] = useState(false);
  const bloqueo = useRef(false);
  const enviar = () => {
    if (bloqueo.current) return;
    bloqueo.current = true;
    setEnviando(true);
    accion(async () => {
      try {
        const id = await crearPedido({
          servicio: servicio.id, ubicacion: { direccion: [direccion.trim(), interior.trim()].filter(Boolean).join(", "), distrito, referencia, ...pos },
          fecha: fechaPedido, horas, conMateriales, notas, tareas, recargo: precio.recargo, descuento: precio.descuento, frecuencia, total,
        });
        router.replace(`/cliente/pedido/${id}`);
      } catch (e) {
        bloqueo.current = false;
        setEnviando(false);
        throw e;
      }
    });
  };

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
          <Opcion activo={cuando === "asap"} onClick={() => setCuando("asap")}>
            Lo antes posible{config.recargoUrgentePct > 0 && <span className="block text-sm font-normal text-suave">+{config.recargoUrgentePct}% por urgencia</span>}
          </Opcion>
          <Opcion activo={cuando === "programar"} onClick={() => setCuando("programar")}>Elegir fecha</Opcion>
        </div>
        {cuando === "programar" && config.recargoFindePct > 0 && <p className="text-sm text-suave">Sábados y domingos: +{config.recargoFindePct}%. Así tu socia gana más por trabajar el fin de semana 💪</p>}
        {cuando === "programar" && <ElegirFecha valor={fecha} onChange={setFecha} />}
      </section>

      {cuando === "programar" && (
        <section className="tarjeta space-y-3">
          <h3 className="text-lg font-bold">🔁 ¿Cada cuánto?</h3>
          <div className="grid grid-cols-3 gap-2">
            {FRECUENCIAS.map((f) => (
              <Opcion key={f.id} activo={frecuenciaElegida === f.id} onClick={() => setFrecuencia(f.id)}>
                {f.texto}{f.id !== "unica" && config.descuentoPlanPct > 0 && <span className="block text-sm font-normal text-green-700">−{config.descuentoPlanPct}%</span>}
              </Opcion>
            ))}
          </div>
          {frecuencia !== "unica" && (
            <p className="rounded-xl bg-green-50 p-3 text-sm text-green-900">
              💚 Con tu plan, la misma socia vuelve {plan.texto.toLowerCase()} el mismo día y a la misma hora. Puedes detenerlo cuando quieras.
            </p>
          )}
        </section>
      )}

      <section className="tarjeta space-y-3">
        <h3 className="text-lg font-bold">⏱️ ¿Cuántas horas?</h3>
        <div className="flex items-center justify-between">
          <button type="button" className="h-14 w-14 rounded-full bg-marca-claro text-3xl font-bold text-marca" onClick={() => setHoras(Math.max(servicio.horasMin, horas - 1))}>−</button>
          <span className="text-4xl font-extrabold">{horas} h</span>
          <button type="button" className="h-14 w-14 rounded-full bg-marca-claro text-3xl font-bold text-marca" onClick={() => setHoras(Math.min(10, horas + 1))}>+</button>
        </div>
        <p className="text-center text-sm text-suave">Mínimo {servicio.horasMin} horas</p>
      </section>

      {servicio.tareas.length > 0 && (
        <section className="tarjeta space-y-3">
          <h3 className="text-lg font-bold">✅ ¿Qué necesitas?</h3>
          <p className="text-sm text-suave">Marca lo que quieres que haga la socia. Así sabe qué priorizar en tus {horas} horas.</p>
          <div className="grid grid-cols-2 gap-2">
            {servicio.tareas.map((t) => (
              <Opcion key={t} activo={tareas.includes(t)} onClick={() => setTareas(tareas.includes(t) ? tareas.filter((x) => x !== t) : [...tareas, t])}>
                {tareas.includes(t) ? "✓ " : ""}{t}
              </Opcion>
            ))}
          </div>
        </section>
      )}

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
          <div className="flex-1"><p className="text-sm text-suave">Precio estimado</p><p className="text-2xl font-extrabold">{soles(precio.aPagar)}</p></div>
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
              <li>🕒 {formatoFecha(cuando === "asap" ? "asap" : fecha)}{frecuencia !== "unica" && ` · 🔁 ${plan.texto.toLowerCase()}`}</li>
              <li>🧴 {conMateriales ? "La socia lleva materiales" : "Materiales de la casa"}</li>
              {tareas.length > 0 && <li>✅ {tareas.join(", ")}</li>}
            </ul>
            <div className="space-y-1 rounded-2xl bg-marca-claro p-4">
              <div className="flex justify-between text-suave"><span>Servicio ({horas} h{conMateriales ? " + materiales" : ""})</span><span>{soles(precio.base)}</span></div>
              {precio.recargo > 0 && <div className="flex justify-between gap-3 text-suave"><span>Recargo ({precio.motivos.join(", ").toLowerCase()})</span><span className="shrink-0">+ {soles(precio.recargo)}</span></div>}
              {precio.descuento > 0 && <div className="flex justify-between text-green-700"><span>Descuento por plan (−{config.descuentoPlanPct}%)</span><span>− {soles(precio.descuento)}</span></div>}
              {precio.cargoServicio > 0 && <div className="flex justify-between text-suave"><span>Cargo de servicio</span><span>+ {soles(precio.cargoServicio)}</span></div>}
              <div className="flex justify-between text-lg"><span>Total estimado</span><b>{soles(precio.aPagar)}</b></div>
            </div>
            <p className="text-sm text-suave">Pagas al final por Yape, Plin o efectivo. Si quieres, puedes dejar una propina: va completa a tu socia.</p>
            <button className="btn-primario" disabled={enviando} onClick={enviar}>{enviando ? "Enviando…" : "Confirmar y buscar socia"}</button>
          </div>
        </div>
      )}
    </Pantalla>
  );
}

export default function NuevoPedido() {
  return (<><Cabecera titulo="Nuevo pedido" volver="/cliente" /><Suspense><Formulario /></Suspense></>);
}
