"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CamposPersonales, errorPersonal, PERSONAL_VACIO } from "@/components/DatosPersonales";
import { AceptoTerminos, AutorizoDatos } from "@/components/Legal";
import { Cabecera, Pantalla, accion } from "@/components/ui";
import { useDatos } from "@/lib/store";

export default function RegistroCliente() {
  const { registrarCliente, demo, nombreGuardado } = useDatos();
  const router = useRouter();
  const [nombre, setNombre] = useState(nombreGuardado);
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [acepto, setAcepto] = useState(false);
  const [autorizo, setAutorizo] = useState(false);
  const [personal, setPersonal] = useState(PERSONAL_VACIO);
  const valido = nombre.trim().length > 2 && /^9\d{8}$/.test(telefono) && !errorPersonal(personal) && acepto && autorizo;

  return (
    <>
      <Cabecera titulo="Crea tu cuenta" volver="/" />
      <Pantalla>
        <form className="tarjeta space-y-4" onSubmit={(e) => { e.preventDefault(); accion(async () => { await registrarCliente({ nombre, telefono, email, personal }); router.push("/cliente"); }); }}>
          <div><label className="etiqueta">Nombre y apellido</label><input className="campo" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Lucía Paredes" /></div>
          <div><label className="etiqueta">Celular</label><input className="campo" inputMode="numeric" maxLength={9} value={telefono} onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ""))} placeholder="9XXXXXXXX" />
            <p className="mt-1 text-sm text-suave">Para que la socia pueda llamarte.</p></div>
          {demo && <div><label className="etiqueta">Correo (opcional)</label><input className="campo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>}
          <CamposPersonales valor={personal} onChange={setPersonal} />
          <AceptoTerminos valor={acepto} onChange={setAcepto} />
          <AutorizoDatos valor={autorizo} onChange={setAutorizo} />
          <button className="btn-primario" disabled={!valido}>Continuar</button>
        </form>
      </Pantalla>
    </>
  );
}
