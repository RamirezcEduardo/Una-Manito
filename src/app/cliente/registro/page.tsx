"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AceptoTerminos } from "@/components/Legal";
import { Cabecera, Pantalla, accion } from "@/components/ui";
import { useDatos } from "@/lib/store";

export default function RegistroCliente() {
  const { registrarCliente, demo } = useDatos();
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [acepto, setAcepto] = useState(false);
  const valido = nombre.trim().length > 2 && /^9\d{8}$/.test(telefono) && acepto;

  return (
    <>
      <Cabecera titulo="Crea tu cuenta" volver="/" />
      <Pantalla>
        <form className="tarjeta space-y-4" onSubmit={(e) => { e.preventDefault(); accion(async () => { await registrarCliente({ nombre, telefono, email }); router.push("/cliente"); }); }}>
          <div><label className="etiqueta">Tu nombre</label><input className="campo" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Lucía Paredes" /></div>
          <div><label className="etiqueta">Celular</label><input className="campo" inputMode="numeric" maxLength={9} value={telefono} onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ""))} placeholder="9XXXXXXXX" />
            <p className="mt-1 text-sm text-suave">Para que la socia pueda llamarte.</p></div>
          {demo && <div><label className="etiqueta">Correo (opcional)</label><input className="campo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>}
          <AceptoTerminos valor={acepto} onChange={setAcepto} />
          <button className="btn-primario" disabled={!valido}>Continuar</button>
        </form>
      </Pantalla>
    </>
  );
}
