"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Cabecera, Pantalla, mensajeError } from "@/components/ui";
import { esEquipo, rutaDeRol } from "@/lib/api";
import { useDatos } from "@/lib/store";

type Modo = "entrar" | "crear" | "codigo" | "olvido";

function Formulario() {
  const { enviarCodigo, verificarCodigo, entrarConContrasena, crearCuenta, recuperarContrasena, salir, sesion, sinPerfil, listo, rolGuardado } = useDatos();
  const router = useRouter();
  const params = useSearchParams();
  // ?rol=socia|cliente indica a qué app quiere entrar; ?modo=crear abre directamente "Crear cuenta".
  const rolPedido = params.get("rol") === "socia" ? "socia" : params.get("rol") === "cliente" ? "cliente" : null;
  const rol = rolPedido ?? rolGuardado ?? "cliente";
  const [modo, setModo] = useState<Modo>(params.get("modo") === "crear" ? "crear" : "entrar");
  // Hay una sesión abierta de otro tipo (p. ej. cliente) y se pidió entrar como socia: se pregunta antes de redirigir.
  const otraCuenta = !!sesion && !!rolPedido && sesion.rol !== rolPedido;
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [repetir, setRepetir] = useState("");
  const [ver, setVer] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [codigoEnviado, setCodigoEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  // Ya autenticado: completar registro o ir a su panel.
  useEffect(() => {
    if (!listo) return;
    if (sinPerfil) router.replace(`/${rol}/registro`);
    else if (sesion && !otraCuenta) router.replace(rutaDeRol(sesion.rol));
  }, [listo, sinPerfil, sesion, rol, router, otraCuenta]);

  const correr = async (f: () => Promise<void>) => {
    setCargando(true); setError(""); setAviso("");
    try { await f(); } catch (e) { setError(mensajeError(e)); }
    setCargando(false);
  };
  const cambiar = (m: Modo) => { setModo(m); setError(""); setAviso(""); setCodigoEnviado(false); setCodigo(""); };
  const correoValido = email.includes("@") && email.includes(".");

  const campoCorreo = (
    <div><label className="etiqueta">Tu correo</label>
      <input className="campo" type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@gmail.com" /></div>
  );
  const campoContrasena = (etiqueta: string, valor: string, cambio: (v: string) => void, auto: string) => (
    <div><label className="etiqueta">{etiqueta}</label>
      <div className="relative">
        <input className="campo pr-20" type={ver ? "text" : "password"} autoComplete={auto} required minLength={6} value={valor} onChange={(e) => cambio(e.target.value)} />
        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-marca" onClick={() => setVer(!ver)}>{ver ? "Ocultar" : "Ver"}</button>
      </div></div>
  );

  if (otraCuenta && sesion) {
    const como = (r: string) => (r === "socia" ? "socia" : esEquipo(r as never) ? "parte del equipo" : "cliente");
    return (
      <Pantalla>
        <div className="tarjeta space-y-3 text-center">
          <div className="text-4xl">🔄</div>
          <h2 className="text-xl font-extrabold">Ya tienes una sesión abierta como {como(sesion.rol)}</h2>
          <p className="text-suave">Para entrar como {como(rolPedido!)}, primero cierra esta sesión.</p>
          <button className="btn-primario" onClick={() => correr(salir)}>Cerrar sesión y entrar como {como(rolPedido!)}</button>
          <button className="btn-borde" onClick={() => router.replace(rutaDeRol(sesion.rol))}>Seguir como {como(sesion.rol)}</button>
        </div>
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      {rol === "socia" && <p className="text-center font-semibold text-marca-oscuro">🧹 Acceso para socias</p>}
      {(modo === "entrar" || modo === "crear") && (
        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-white p-1 ring-1 ring-black/5">
          {(["entrar", "crear"] as const).map((m) => (
            <button key={m} onClick={() => cambiar(m)} className={`rounded-xl py-2.5 font-bold ${modo === m ? "bg-marca text-white" : "text-suave"}`}>
              {m === "entrar" ? "Ya tengo cuenta" : "Crear cuenta"}
            </button>
          ))}
        </div>
      )}

      <div className="tarjeta space-y-4">
        {modo === "entrar" && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); correr(() => entrarConContrasena(email.trim(), contrasena)); }}>
            <h2 className="text-xl font-extrabold">¡Hola de nuevo! 👋</h2>
            {campoCorreo}
            {campoContrasena("Contraseña", contrasena, setContrasena, "current-password")}
            <button className="btn-primario" disabled={cargando || !correoValido || contrasena.length < 6}>{cargando ? "Entrando…" : "Entrar"}</button>
            <button type="button" className="w-full font-semibold text-marca" onClick={() => cambiar("olvido")}>¿Olvidaste tu contraseña?</button>
          </form>
        )}

        {modo === "crear" && (
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            if (contrasena !== repetir) { setError("Las contraseñas no coinciden."); return; }
            correr(async () => {
              const confirmar = await crearCuenta(email.trim(), contrasena, nombre.trim(), rol);
              if (confirmar) setAviso(`Te enviamos un correo a ${email.trim()}. Toca el enlace para confirmar tu cuenta y luego entra con tu contraseña. Revisa también Spam.`);
            });
          }}>
            <h2 className="text-xl font-extrabold">{rol === "socia" ? "Crea tu cuenta para trabajar con nosotros" : "Crea tu cuenta"}</h2>
            <div><label className="etiqueta">Nombre y apellido</label>
              <input className="campo" autoComplete="name" required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Lucía Paredes" /></div>
            {campoCorreo}
            {campoContrasena("Crea una contraseña (mínimo 6 caracteres)", contrasena, setContrasena, "new-password")}
            {campoContrasena("Repite la contraseña", repetir, setRepetir, "new-password")}
            <button className="btn-primario" disabled={cargando || nombre.trim().split(" ").filter(Boolean).length < 2 || !correoValido || contrasena.length < 6 || !repetir}>{cargando ? "Creando…" : "Crear cuenta"}</button>
          </form>
        )}

        {modo === "olvido" && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); correr(async () => { await recuperarContrasena(email.trim()); setAviso(`Listo. Te enviamos un correo a ${email.trim()} para crear una contraseña nueva. Revisa también Spam.`); }); }}>
            <h2 className="text-xl font-extrabold">Recupera tu contraseña</h2>
            <p className="text-suave">Te enviaremos un correo con un enlace para crear una nueva.</p>
            {campoCorreo}
            <button className="btn-primario" disabled={cargando || !correoValido}>{cargando ? "Enviando…" : "Enviarme el correo"}</button>
            <button type="button" className="w-full font-semibold text-marca" onClick={() => cambiar("entrar")}>Volver</button>
          </form>
        )}

        {modo === "codigo" && (!codigoEnviado ? (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); correr(async () => { await enviarCodigo(email.trim()); setCodigoEnviado(true); }); }}>
            <h2 className="text-xl font-extrabold">Entrar sin contraseña</h2>
            {campoCorreo}
            <p className="text-sm text-suave">Te enviaremos un código o un enlace para entrar.</p>
            <button className="btn-primario" disabled={cargando || !correoValido}>{cargando ? "Enviando…" : "Enviarme el código"}</button>
            <button type="button" className="w-full font-semibold text-marca" onClick={() => cambiar("entrar")}>Usar contraseña</button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); correr(() => verificarCodigo(email.trim(), codigo)); }}>
            <h2 className="text-xl font-extrabold">Revisa tu correo 📩</h2>
            <p className="text-suave">Escribe el código que enviamos a <b>{email}</b>, o toca el enlace del correo desde este mismo celular.</p>
            <input className="campo text-center text-3xl tracking-[.5em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
              value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))} />
            <button className="btn-primario" disabled={cargando || codigo.length < 6}>{cargando ? "Verificando…" : "Entrar"}</button>
            <button type="button" className="w-full font-semibold text-marca" onClick={() => { setCodigoEnviado(false); setCodigo(""); }}>Usar otro correo</button>
          </form>
        ))}

        {aviso && <p className="rounded-xl bg-green-50 p-3 font-semibold text-green-800">{aviso}</p>}
        {error && <p className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
      </div>

      {modo !== "codigo" && (
        <button className="w-full text-center font-semibold text-suave underline" onClick={() => cambiar("codigo")}>Prefiero entrar con un código al correo</button>
      )}
      <p className="text-center text-sm text-suave">Al continuar aceptas los <Link href="/terminos" className="underline">Términos</Link> y la <Link href="/privacidad" className="underline">Privacidad</Link>.</p>
    </Pantalla>
  );
}

export default function Entrar() {
  return (<><Cabecera titulo="Entrar" volver="/" /><Suspense><Formulario /></Suspense></>);
}
