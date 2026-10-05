"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CampoFoto, CamposPersonales, errorPersonal, PERSONAL_VACIO } from "@/components/DatosPersonales";
import { AceptoTerminos, AutorizoDatos } from "@/components/Legal";
import { Cabecera, Opcion, Pantalla, accion } from "@/components/ui";
import { DISTRITOS_CALLAO, DISTRITOS_LIMA_TODOS, ESLOGAN_SOCIA } from "@/lib/config";
import { useDatos } from "@/lib/store";
import type { ServicioId } from "@/lib/tipos";

const PARENTESCOS = ["Madre", "Padre", "Esposo/a o pareja", "Hijo/a", "Hermano/a", "Otro familiar", "Amigo/a"];
const EXPERIENCIA = ["Menos de 1 año", "De 1 a 3 años", "De 3 a 5 años", "Más de 5 años"];

export default function RegistroSocia() {
  const { config, registrarSocia, nombreGuardado } = useDatos();
  const router = useRouter();
  const [nombre, setNombre] = useState(nombreGuardado);
  const [telefono, setTelefono] = useState("");
  const [personal, setPersonal] = useState(PERSONAL_VACIO);
  const [foto, setFoto] = useState<File | null>(null);
  const [dniFrente, setDniFrente] = useState<File | null>(null);
  const [dniReverso, setDniReverso] = useState<File | null>(null);
  const [direccion, setDireccion] = useState("");
  const [distritoResidencia, setDistritoResidencia] = useState("");
  const [emergenciaNombre, setEmergenciaNombre] = useState("");
  const [emergenciaParentesco, setEmergenciaParentesco] = useState("");
  const [emergenciaTelefono, setEmergenciaTelefono] = useState("");
  const [mismoCelular, setMismoCelular] = useState(true);
  const [cobroNumero, setCobroNumero] = useState("");
  const [experiencia, setExperiencia] = useState("");
  const [distritos, setDistritos] = useState<string[]>([]);
  const [servicios, setServicios] = useState<ServicioId[]>(["limpieza"]);
  const [declara, setDeclara] = useState(false);
  const [acepto, setAcepto] = useState(false);
  const [autorizo, setAutorizo] = useState(false);
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const celular = /^9\d{8}$/;
  const cobro = mismoCelular ? telefono : cobroNumero;

  // Lista de lo que falta, para decirlo en palabras simples.
  const faltan = [
    nombre.trim().split(" ").filter(Boolean).length < 2 && "nombre y apellido",
    !celular.test(telefono) && "celular",
    errorPersonal(personal) && "documento y fecha de nacimiento",
    !foto && "tu selfie",
    !dniFrente && "foto del DNI (frente)",
    !dniReverso && "foto del DNI (reverso)",
    (direccion.trim().length < 5 || !distritoResidencia) && "dirección donde vives",
    (emergenciaNombre.trim().length < 3 || !emergenciaParentesco || !celular.test(emergenciaTelefono)) && "contacto de emergencia",
    !celular.test(cobro) && "número de Yape o Plin",
    !experiencia && "experiencia",
    !distritos.length && "distritos donde trabajas",
    !servicios.length && "servicios",
    !declara && "declaración jurada",
    !acepto && "aceptar términos",
    !autorizo && "autorizar el uso de tus datos",
  ].filter(Boolean) as string[];

  const enviar = () => accion(async () => {
    await registrarSocia({
      nombre: nombre.trim(), telefono, foto: foto!, distritos, servicios, personal, dniFrente: dniFrente!, dniReverso: dniReverso!,
      verificacion: { direccion: direccion.trim(), distritoResidencia, emergenciaNombre: emergenciaNombre.trim(), emergenciaParentesco,
        emergenciaTelefono, cobroNumero: cobro, experiencia, declaraSinAntecedentes: declara },
    });
    router.push("/socia");
  });

  return (
    <>
      <Cabecera titulo="Quiero ser socia" volver="/" />
      <Pantalla>
        <p className="text-lg text-suave">{ESLOGAN_SOCIA} Completa tus datos: los revisamos y te avisamos por WhatsApp.</p>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (!faltan.length) enviar(); }}>
          <section className="tarjeta space-y-3">
            <h3 className="text-lg font-bold">1. Tus datos</h3>
            <div><label className="etiqueta">Nombre y apellido</label>
              <input className="campo" autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Rosa Quispe" /></div>
            <div><label className="etiqueta">Celular</label>
              <input className="campo" placeholder="9XXXXXXXX" inputMode="numeric" maxLength={9} value={telefono} onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ""))} /></div>
            <CamposPersonales valor={personal} onChange={setPersonal} />
          </section>

          <section className="tarjeta space-y-3">
            <h3 className="text-lg font-bold">2. Verifica tu identidad</h3>
            <p className="text-sm text-suave">Fotos claras, con buena luz y sin reflejos. Solo las ve el equipo de Una Manito.</p>
            <CampoFoto etiqueta="Tu selfie" ayuda="Esta foto la verán tus clientes" archivo={foto} onChange={setFoto} selfie />
            <CampoFoto etiqueta="DNI – parte de adelante" archivo={dniFrente} onChange={setDniFrente} />
            <CampoFoto etiqueta="DNI – parte de atrás" archivo={dniReverso} onChange={setDniReverso} />
          </section>

          <section className="tarjeta space-y-3">
            <h3 className="text-lg font-bold">3. ¿Dónde vives?</h3>
            <input className="campo" placeholder="Dirección (calle, número, referencia)" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
            <select className={`campo ${distritoResidencia ? "" : "text-suave"}`} value={distritoResidencia} onChange={(e) => setDistritoResidencia(e.target.value)}>
              <option value="" disabled>Distrito donde vives</option>
              {[...DISTRITOS_LIMA_TODOS, ...DISTRITOS_CALLAO].sort((a, b) => a.localeCompare(b)).map((d) => <option key={d}>{d}</option>)}
            </select>
          </section>

          <section className="tarjeta space-y-3">
            <h3 className="text-lg font-bold">4. Contacto de emergencia</h3>
            <p className="text-sm text-suave">Alguien a quien podamos llamar si te pasa algo durante un servicio.</p>
            <input className="campo" placeholder="Nombre" value={emergenciaNombre} onChange={(e) => setEmergenciaNombre(e.target.value)} />
            <select className={`campo ${emergenciaParentesco ? "" : "text-suave"}`} value={emergenciaParentesco} onChange={(e) => setEmergenciaParentesco(e.target.value)}>
              <option value="" disabled>Parentesco</option>
              {PARENTESCOS.map((p) => <option key={p}>{p}</option>)}
            </select>
            <input className="campo" placeholder="Celular (9XXXXXXXX)" inputMode="numeric" maxLength={9} value={emergenciaTelefono} onChange={(e) => setEmergenciaTelefono(e.target.value.replace(/\D/g, ""))} />
          </section>

          <section className="tarjeta space-y-3">
            <h3 className="text-lg font-bold">5. Tu trabajo</h3>
            <div><label className="etiqueta">¿A qué número te pagan por Yape o Plin?</label>
              <label className="mb-2 flex items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={mismoCelular} onChange={(e) => setMismoCelular(e.target.checked)} /> Es mi mismo celular</label>
              {!mismoCelular && <input className="campo" placeholder="Número de Yape o Plin" inputMode="numeric" maxLength={9} value={cobroNumero} onChange={(e) => setCobroNumero(e.target.value.replace(/\D/g, ""))} />}
            </div>
            <div><label className="etiqueta">Experiencia en el oficio</label>
              <div className="grid grid-cols-2 gap-2">{EXPERIENCIA.map((x) => <Opcion key={x} activo={experiencia === x} onClick={() => setExperiencia(x)}>{x}</Opcion>)}</div>
            </div>
            <div><label className="etiqueta">¿Qué servicios ofreces?</label>
              <div className="grid gap-2">
                {config.servicios.filter((s) => s.activo).map((s) => (
                  <Opcion key={s.id} activo={servicios.includes(s.id)} onClick={() => setServicios(toggle(servicios, s.id))}>{s.icono} {s.nombre}</Opcion>
                ))}
              </div>
            </div>
            <div><label className="etiqueta">¿En qué distritos quieres trabajar?</label>
              <div className="flex flex-wrap gap-2">
                {config.distritos.filter((d) => d.habilitado).map(({ nombre: d }) => (
                  <Opcion key={d} activo={distritos.includes(d)} onClick={() => setDistritos(toggle(distritos, d))}>{d}</Opcion>
                ))}
              </div>
            </div>
          </section>

          <label className="flex items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/5">
            <input type="checkbox" className="mt-1 h-6 w-6 shrink-0" checked={declara} onChange={(e) => setDeclara(e.target.checked)} />
            <span><b>Declaración jurada:</b> declaro que no tengo antecedentes policiales, penales ni judiciales, y autorizo a Una Manito a verificarlo. Mis datos son verdaderos.</span>
          </label>
          <AceptoTerminos valor={acepto} onChange={setAcepto} />
          <AutorizoDatos valor={autorizo} onChange={setAutorizo} socia />

          {faltan.length > 0 && <p className="rounded-xl bg-acento-claro p-3 text-sm"><b>Te falta:</b> {faltan.join(", ")}.</p>}
          <button className="btn-acento" disabled={faltan.length > 0}>Enviar solicitud</button>
        </form>
      </Pantalla>
    </>
  );
}
