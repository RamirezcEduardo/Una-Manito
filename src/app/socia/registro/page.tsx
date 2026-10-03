"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AceptoTerminos } from "@/components/Legal";
import { Cabecera, Opcion, Pantalla, accion } from "@/components/ui";
import { ESLOGAN_SOCIA } from "@/lib/config";
import { useDatos } from "@/lib/store";
import type { ServicioId } from "@/lib/tipos";

export default function RegistroSocia() {
  const { config, registrarSocia, nombreGuardado } = useDatos();
  const router = useRouter();
  const [nombre, setNombre] = useState(nombreGuardado);
  const [telefono, setTelefono] = useState("");
  const [dni, setDni] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const vista = useMemo(() => (foto ? URL.createObjectURL(foto) : ""), [foto]);
  const [distritos, setDistritos] = useState<string[]>([]);
  const [servicios, setServicios] = useState<ServicioId[]>(["limpieza"]);
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const [acepto, setAcepto] = useState(false);
  const valido = acepto && nombre.length > 2 && /^9\d{8}$/.test(telefono) && /^\d{8}$/.test(dni) && foto && distritos.length && servicios.length;

  return (
    <>
      <Cabecera titulo="Quiero ser socia" volver="/" />
      <Pantalla>
        <p className="text-lg text-suave">{ESLOGAN_SOCIA}</p>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (foto) accion(async () => { await registrarSocia({ nombre, telefono, dni, foto, distritos, servicios }); router.push("/socia"); }); }}>
          <div className="tarjeta space-y-3">
            <h3 className="text-lg font-bold">Tus datos</h3>
            <input className="campo" placeholder="Nombre completo" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            <input className="campo" placeholder="Celular (9XXXXXXXX)" inputMode="numeric" maxLength={9} value={telefono} onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ""))} />
            <input className="campo" placeholder="DNI (8 dígitos)" inputMode="numeric" maxLength={8} value={dni} onChange={(e) => setDni(e.target.value.replace(/\D/g, ""))} />
          </div>
          <div className="tarjeta space-y-3">
            <h3 className="text-lg font-bold">Tu foto</h3>
            <label className="flex cursor-pointer items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {foto ? <img src={vista} alt="" className="h-20 w-20 rounded-full object-cover" /> : <span className="flex h-20 w-20 items-center justify-center rounded-full bg-marca-claro text-3xl">📷</span>}
              <span className="font-semibold text-marca">{foto ? "Cambiar foto" : "Tomar o subir foto"}</span>
              <input type="file" accept="image/*" capture="user" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setFoto(f); }} />
            </label>
          </div>
          <div className="tarjeta space-y-3">
            <h3 className="text-lg font-bold">¿En qué distritos trabajas?</h3>
            <div className="flex flex-wrap gap-2">
              {config.distritos.filter((d) => d.habilitado).map(({ nombre: d }) => (
                <Opcion key={d} activo={distritos.includes(d)} onClick={() => setDistritos(toggle(distritos, d))}>{d}</Opcion>
              ))}
            </div>
          </div>
          <div className="tarjeta space-y-3">
            <h3 className="text-lg font-bold">¿Qué servicios ofreces?</h3>
            <div className="grid gap-2">
              {config.servicios.filter((s) => s.activo).map((s) => (
                <Opcion key={s.id} activo={servicios.includes(s.id)} onClick={() => setServicios(toggle(servicios, s.id))}>{s.icono} {s.nombre}</Opcion>
              ))}
            </div>
          </div>
          <AceptoTerminos valor={acepto} onChange={setAcepto} />
          <button className="btn-acento" disabled={!valido}>Enviar solicitud</button>
        </form>
      </Pantalla>
    </>
  );
}
