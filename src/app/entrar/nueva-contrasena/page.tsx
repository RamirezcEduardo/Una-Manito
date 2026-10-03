"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Cabecera, Pantalla, mensajeError } from "@/components/ui";
import { useDatos } from "@/lib/store";

/** Llega aquí desde el correo de "¿Olvidaste tu contraseña?" (Supabase abre la sesión con el enlace). */
export default function NuevaContrasena() {
  const { cambiarContrasena } = useDatos();
  const router = useRouter();
  const [contrasena, setContrasena] = useState("");
  const [repetir, setRepetir] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  return (
    <>
      <Cabecera titulo="Nueva contraseña" volver="/entrar" />
      <Pantalla>
        <form className="tarjeta space-y-4" onSubmit={async (e) => {
          e.preventDefault();
          if (contrasena !== repetir) { setError("Las contraseñas no coinciden."); return; }
          setCargando(true); setError("");
          try { await cambiarContrasena(contrasena); alert("¡Listo! Tu contraseña fue cambiada."); router.replace("/entrar"); }
          catch (err) { setError(mensajeError(err)); }
          setCargando(false);
        }}>
          <h2 className="text-xl font-extrabold">Crea tu nueva contraseña</h2>
          <div><label className="etiqueta">Nueva contraseña (mínimo 6 caracteres)</label>
            <input className="campo" type="password" autoComplete="new-password" minLength={6} required value={contrasena} onChange={(e) => setContrasena(e.target.value)} /></div>
          <div><label className="etiqueta">Repítela</label>
            <input className="campo" type="password" autoComplete="new-password" minLength={6} required value={repetir} onChange={(e) => setRepetir(e.target.value)} /></div>
          {error && <p className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
          <button className="btn-primario" disabled={cargando || contrasena.length < 6}>{cargando ? "Guardando…" : "Guardar contraseña"}</button>
        </form>
      </Pantalla>
    </>
  );
}
