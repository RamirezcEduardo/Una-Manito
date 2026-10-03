"use client";
import { useMemo } from "react";
import type { DatosPersonales } from "@/lib/tipos";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const pad = (n: number | string) => String(n).padStart(2, "0");

export const PERSONAL_VACIO: DatosPersonales = { tipoDocumento: "DNI", documento: "", fechaNacimiento: "" };

/** Devuelve un mensaje si los datos no sirven, o "" si están bien. */
export function errorPersonal(p: DatosPersonales): string {
  if (p.tipoDocumento === "DNI" && !/^\d{8}$/.test(p.documento)) return "El DNI tiene 8 dígitos.";
  if (p.tipoDocumento === "CE" && !/^[A-Za-z0-9]{8,12}$/.test(p.documento)) return "El carné de extranjería tiene entre 8 y 12 caracteres.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.fechaNacimiento)) return "Completa tu fecha de nacimiento.";
  const [a, m, d] = p.fechaNacimiento.split("-").map(Number);
  const nac = new Date(a, m - 1, d);
  if (nac.getMonth() !== m - 1) return "Esa fecha no existe.";
  const hace18 = new Date(); hace18.setFullYear(hace18.getFullYear() - 18);
  if (nac > hace18) return "Debes ser mayor de 18 años.";
  return "";
}

/** Tipo y número de documento + fecha de nacimiento (día, mes y año con listas, fáciles en el celular). */
export function CamposPersonales({ valor, onChange }: { valor: DatosPersonales; onChange: (v: DatosPersonales) => void }) {
  const [anio, mes, dia] = valor.fechaNacimiento ? valor.fechaNacimiento.split("-") : ["", "", ""];
  const anios = useMemo(() => { const hoy = new Date().getFullYear(); return Array.from({ length: 83 }, (_, i) => hoy - 18 - i); }, []);
  const fecha = (a: string, m: string, d: string) => onChange({ ...valor, fechaNacimiento: a && m && d ? `${a}-${m}-${d}` : (a || m || d ? `${a}-${m}-${d}` : "") });
  const error = valor.documento || valor.fechaNacimiento.replace(/-/g, "") ? errorPersonal(valor) : "";
  const completo = valor.documento && anio && mes && dia;

  return (
    <div className="space-y-3">
      <div>
        <label className="etiqueta">Documento de identidad</label>
        <div className="flex gap-2">
          <select className="campo !w-32 shrink-0" value={valor.tipoDocumento}
            onChange={(e) => onChange({ ...valor, tipoDocumento: e.target.value as "DNI" | "CE", documento: "" })}>
            <option value="DNI">DNI</option>
            <option value="CE">Carné ext.</option>
          </select>
          <input className="campo" required inputMode={valor.tipoDocumento === "DNI" ? "numeric" : "text"} maxLength={valor.tipoDocumento === "DNI" ? 8 : 12}
            placeholder={valor.tipoDocumento === "DNI" ? "8 dígitos" : "Número"} value={valor.documento}
            onChange={(e) => onChange({ ...valor, documento: valor.tipoDocumento === "DNI" ? e.target.value.replace(/\D/g, "") : e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase() })} />
        </div>
      </div>
      <div>
        <label className="etiqueta">Fecha de nacimiento</label>
        <div className="grid grid-cols-[1fr_1.6fr_1.2fr] gap-2">
          <select className="campo" value={dia} onChange={(e) => fecha(anio, mes, e.target.value)} aria-label="Día">
            <option value="">Día</option>
            {Array.from({ length: 31 }, (_, i) => <option key={i} value={pad(i + 1)}>{i + 1}</option>)}
          </select>
          <select className="campo" value={mes} onChange={(e) => fecha(anio, e.target.value, dia)} aria-label="Mes">
            <option value="">Mes</option>
            {MESES.map((m, i) => <option key={m} value={pad(i + 1)}>{m}</option>)}
          </select>
          <select className="campo" value={anio} onChange={(e) => fecha(e.target.value, mes, dia)} aria-label="Año">
            <option value="">Año</option>
            {anios.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>
      {error && completo && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <p className="text-xs text-suave">🔒 Tus datos son privados: solo los usa Una Manito para verificar tu identidad.</p>
    </div>
  );
}

/** Botón para tomar o subir una foto, con vista previa. */
export function CampoFoto({ etiqueta, ayuda, archivo, onChange, selfie = false }: { etiqueta: string; ayuda?: string; archivo: File | null; onChange: (f: File) => void; selfie?: boolean }) {
  const vista = useMemo(() => (archivo ? URL.createObjectURL(archivo) : ""), [archivo]);
  return (
    <label className="flex cursor-pointer items-center gap-4 rounded-2xl border-2 border-dashed border-gray-200 p-3 hover:border-marca">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {archivo ? <img src={vista} alt="" className={`h-20 w-20 shrink-0 object-cover ${selfie ? "rounded-full" : "rounded-xl"}`} />
        : <span className={`flex h-20 w-20 shrink-0 items-center justify-center bg-marca-claro text-3xl ${selfie ? "rounded-full" : "rounded-xl"}`}>{selfie ? "🤳" : "🪪"}</span>}
      <span>
        <span className="block font-bold">{etiqueta} {archivo && <span className="text-green-600">✓</span>}</span>
        <span className="block text-sm font-semibold text-marca">{archivo ? "Cambiar foto" : "Tomar o subir foto"}</span>
        {ayuda && <span className="block text-xs text-suave">{ayuda}</span>}
      </span>
      <input type="file" accept="image/*" capture={selfie ? "user" : "environment"} className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onChange(f); }} />
    </label>
  );
}
