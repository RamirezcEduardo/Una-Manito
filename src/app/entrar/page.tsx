"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Cabecera, Pantalla, mensajeError } from "@/components/ui";
import { rutaDeRol } from "@/lib/api";
import { useDatos } from "@/lib/store";

function Formulario() {
  const { enviarCodigo, verificarCodigo, sesion, sinPerfil, listo } = useDatos();
  const router = useRouter();
  const rol = useSearchParams().get("rol") === "socia" ? "socia" : "cliente";
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [paso, setPaso] = useState<"email" | "codigo">("email");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  // Ya autenticado: completar registro o ir a su panel.
  useEffect(() => {
    if (!listo) return;
    if (sinPerfil) router.replace(`/${rol}/registro`);
    else if (sesion) router.replace(rutaDeRol(sesion.rol));
  }, [listo, sinPerfil, sesion, rol, router]);

  const correr = async (f: () => Promise<void>) => {
    setCargando(true); setError("");
    try { await f(); } catch (e) { setError(mensajeError(e)); }
    setCargando(false);
  };

  return (
    <Pantalla>
      <div className="tarjeta space-y-4">
        {paso === "email" ? (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); correr(async () => { await enviarCodigo(email.trim()); setPaso("codigo"); }); }}>
            <h2 className="text-xl font-extrabold">{rol === "socia" ? "Entra como socia" : "Entra para pedir tu servicio"}</h2>
            <div><label className="etiqueta">Tu correo</label>
              <input className="campo" type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@gmail.com" /></div>
            <p className="text-sm text-suave">Te enviaremos un código de 6 dígitos. No necesitas contraseña.</p>
            <button className="btn-primario" disabled={cargando || !email.includes("@")}>{cargando ? "Enviando…" : "Enviarme el código"}</button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); correr(() => verificarCodigo(email.trim(), codigo)); }}>
            <h2 className="text-xl font-extrabold">Revisa tu correo 📩</h2>
            <p className="text-suave">Escribe el código que enviamos a <b>{email}</b></p>
            <input className="campo text-center text-3xl tracking-[.5em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
              value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))} />
            <button className="btn-primario" disabled={cargando || codigo.length < 6}>{cargando ? "Verificando…" : "Entrar"}</button>
            <button type="button" className="w-full font-semibold text-marca" onClick={() => { setPaso("email"); setCodigo(""); }}>Usar otro correo</button>
          </form>
        )}
        {error && <p className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
      </div>
    </Pantalla>
  );
}

export default function Entrar() {
  return (<><Cabecera titulo="Entrar" volver="/" /><Suspense><Formulario /></Suspense></>);
}
