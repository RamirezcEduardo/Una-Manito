"use client";
import Link from "next/link";
import { useState } from "react";
import { accion } from "@/components/ui";
import { EMPRESA } from "@/lib/legal";
import { useDatos } from "@/lib/store";
import type { NuevaReclamacion } from "@/lib/api";

const VACIO: NuevaReclamacion = {
  tipo: "reclamo", nombre: "", tipoDocumento: "DNI", documento: "", email: "", telefono: "", direccion: "", menorDeEdad: false, apoderado: "",
  bien: "servicio", monto: undefined, descripcionBien: "", detalle: "", pedidoConsumidor: "",
};

/** Libro de Reclamaciones virtual (Código de Protección y Defensa del Consumidor y Ley 32495). */
export default function LibroReclamaciones() {
  const { registrarReclamo } = useDatos();
  const [r, setR] = useState<NuevaReclamacion>(VACIO);
  const [hecho, setHecho] = useState<number | null>(null);
  const [acepto, setAcepto] = useState(false);
  const cambiar = <K extends keyof NuevaReclamacion>(k: K, v: NuevaReclamacion[K]) => setR({ ...r, [k]: v });

  const faltan = [
    r.nombre.trim().length < 3 && "nombre",
    !(r.tipoDocumento === "DNI" ? /^\d{8}$/ : /^[A-Za-z0-9]{8,12}$/).test(r.documento.trim()) && "documento",
    !/^\S+@\S+\.\S+$/.test(r.email.trim()) && "correo",
    r.telefono && !/^\d{9}$/.test(r.telefono) && "celular",
    r.menorDeEdad && (r.apoderado ?? "").trim().length < 3 && "apoderado",
    r.descripcionBien.trim().length < 3 && "qué contrataste",
    r.detalle.trim().length < 10 && "detalle",
    r.pedidoConsumidor.trim().length < 3 && "tu pedido",
    !acepto && "confirmación",
  ].filter(Boolean) as string[];

  if (hecho !== null) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 px-5 py-8">
        <div className="tarjeta space-y-3 text-center">
          <div className="text-5xl">📕</div>
          <h1 className="text-2xl font-extrabold">Registramos tu {r.tipo}</h1>
          <p className="text-lg">Número: <b>{String(hecho).padStart(6, "0")}-{new Date().getFullYear()}</b></p>
          <p className="text-suave">Guarda este número. Te responderemos a <b>{r.email}</b> en un plazo máximo de <b>15 días hábiles</b>.</p>
          <p className="text-sm text-suave">Fecha: {new Date().toLocaleString("es-PE")}</p>
          <button className="btn-borde" onClick={() => window.print()}>🖨️ Imprimir o guardar en PDF</button>
          <Link href="/" className="btn-primario block text-center">Volver al inicio</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-5 py-8">
      <Link href="/" className="font-semibold text-marca">← Volver</Link>
      <h1 className="text-3xl font-extrabold">📕 Libro de Reclamaciones</h1>
      <div className="tarjeta text-sm text-suave">
        <p><b className="text-tinta">{EMPRESA.razonSocial}</b> · RUC {EMPRESA.ruc}</p>
        <p>{EMPRESA.direccion} · Nombre comercial: {EMPRESA.nombre}</p>
        <p>Fecha: {new Date().toLocaleDateString("es-PE")}</p>
      </div>

      <section className="tarjeta space-y-3">
        <h2 className="text-lg font-bold">1. Tus datos</h2>
        <div><label className="etiqueta">Nombre y apellido</label><input className="campo" value={r.nombre} onChange={(e) => cambiar("nombre", e.target.value)} /></div>
        <div className="grid grid-cols-[110px_1fr] gap-2">
          <select className="campo" value={r.tipoDocumento} onChange={(e) => cambiar("tipoDocumento", e.target.value as "DNI" | "CE")} aria-label="Tipo de documento"><option>DNI</option><option value="CE">C. E.</option></select>
          <input className="campo" inputMode={r.tipoDocumento === "DNI" ? "numeric" : "text"} placeholder="Número de documento" value={r.documento} onChange={(e) => cambiar("documento", e.target.value)} />
        </div>
        <div><label className="etiqueta">Correo (aquí te responderemos)</label><input className="campo" type="email" value={r.email} onChange={(e) => cambiar("email", e.target.value)} /></div>
        <div className="grid gap-2 sm:grid-cols-2">
          <input className="campo" inputMode="numeric" placeholder="Celular (opcional)" value={r.telefono} onChange={(e) => cambiar("telefono", e.target.value.replace(/\D/g, "").slice(0, 9))} />
          <input className="campo" placeholder="Domicilio (opcional)" value={r.direccion} onChange={(e) => cambiar("direccion", e.target.value)} />
        </div>
        <label className="flex items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={r.menorDeEdad} onChange={(e) => cambiar("menorDeEdad", e.target.checked)} /> Soy menor de edad</label>
        {r.menorDeEdad && <input className="campo" placeholder="Nombre del padre, madre o apoderado" value={r.apoderado} onChange={(e) => cambiar("apoderado", e.target.value)} />}
      </section>

      <section className="tarjeta space-y-3">
        <h2 className="text-lg font-bold">2. Lo que contrataste</h2>
        <div className="grid grid-cols-2 gap-2">
          {(["servicio", "producto"] as const).map((b) => (
            <button key={b} type="button" onClick={() => cambiar("bien", b)} className={`rounded-xl border-2 py-3 font-bold capitalize ${r.bien === b ? "border-marca bg-marca text-white" : "border-gray-200 bg-white"}`}>{b}</button>
          ))}
        </div>
        <input className="campo" placeholder="Ej. Limpieza del hogar de 3 horas del 5 de octubre" value={r.descripcionBien} onChange={(e) => cambiar("descripcionBien", e.target.value)} />
        <input className="campo" type="number" min={0} placeholder="Monto pagado en S/ (opcional)" value={r.monto ?? ""} onChange={(e) => cambiar("monto", e.target.value === "" ? undefined : +e.target.value)} />
      </section>

      <section className="tarjeta space-y-3">
        <h2 className="text-lg font-bold">3. Tu reclamo o queja</h2>
        <div className="grid grid-cols-2 gap-2">
          {(["reclamo", "queja"] as const).map((t) => (
            <button key={t} type="button" onClick={() => cambiar("tipo", t)} className={`rounded-xl border-2 py-3 font-bold capitalize ${r.tipo === t ? "border-marca bg-marca text-white" : "border-gray-200 bg-white"}`}>{t}</button>
          ))}
        </div>
        <p className="text-sm text-suave">
          <b>Reclamo:</b> no estás de acuerdo con el servicio que recibiste. <b>Queja:</b> no estás de acuerdo con la atención, sin relación directa con el servicio.
        </p>
        <div><label className="etiqueta">Cuéntanos qué pasó</label><textarea className="campo" rows={4} value={r.detalle} onChange={(e) => cambiar("detalle", e.target.value)} /></div>
        <div><label className="etiqueta">¿Qué solución esperas?</label><textarea className="campo" rows={2} value={r.pedidoConsumidor} onChange={(e) => cambiar("pedidoConsumidor", e.target.value)} /></div>
      </section>

      <label className="flex items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/5">
        <input type="checkbox" className="mt-1 h-6 w-6 shrink-0" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} />
        <span className="text-sm">Confirmo que los datos son verdaderos y autorizo su uso para atender este {r.tipo}.</span>
      </label>
      <p className="text-xs text-suave">
        La formulación del reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para interponer una denuncia ante el INDECOPI.
        El proveedor responderá en un plazo no mayor a 15 días hábiles.
      </p>
      {faltan.length > 0 && <p className="text-sm text-suave">Te falta: {faltan.join(", ")}.</p>}
      <button className="btn-primario" disabled={faltan.length > 0}
        onClick={() => accion(async () => setHecho(await registrarReclamo({ ...r, documento: r.documento.trim().toUpperCase(), telefono: r.telefono || undefined, direccion: r.direccion || undefined, apoderado: r.menorDeEdad ? r.apoderado : undefined })))}>
        Enviar {r.tipo}
      </button>
    </main>
  );
}
