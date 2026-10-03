"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ESLOGAN_CLIENTE, ESLOGAN_SOCIA } from "@/lib/config";
import { useDatos } from "@/lib/store";

export default function Inicio() {
  const { clientes, socias, entrar, demo } = useDatos();
  const router = useRouter();
  // En modo demo se entra con usuarios de prueba; con Supabase se inicia sesión con código por correo.
  const ir = (rol: "cliente" | "socia" | "admin", id: string | undefined, ruta: string) => {
    if (!demo) return router.push(rol === "socia" ? "/entrar?rol=socia" : "/entrar");
    if (id) entrar(rol, id);
    router.push(ruta);
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
      <div className="text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icono.svg" alt="" className="mx-auto h-28 w-28 drop-shadow-lg" />
        <h1 className="mt-4 text-5xl font-black tracking-tight">una <span className="text-marca">manito</span></h1>
        <p className="mt-3 text-xl font-semibold text-marca-oscuro">{ESLOGAN_CLIENTE}</p>
      </div>

      <section className="mt-6 space-y-3">
        <h2 className="text-lg font-bold">¿Necesitas ayuda en casa?</h2>
        <Link href={demo ? "/cliente/registro" : "/entrar?rol=cliente"} className="btn-primario block text-center">Pedir un servicio</Link>
        <button className="btn-borde" onClick={() => ir("cliente", clientes[0]?.id, "/cliente")}>Ya tengo cuenta</button>
      </section>

      <section className="mt-8 space-y-3 rounded-3xl bg-acento-claro p-5">
        <h2 className="text-lg font-bold">¿Quieres trabajar con nosotros?</h2>
        <p className="text-suave">{ESLOGAN_SOCIA}</p>
        <Link href={demo ? "/socia/registro" : "/entrar?rol=socia"} className="btn-acento block text-center">Quiero ser socia</Link>
        <button className="btn w-full bg-white text-tinta" onClick={() => ir("socia", socias[0]?.id, "/socia")}>Soy socia, entrar</button>
      </section>

      <p className="mt-8 text-center text-sm text-suave">
        <Link href="/terminos" className="underline">Términos</Link> · <Link href="/privacidad" className="underline">Privacidad</Link>
      </p>
      {demo && <button className="mt-3 text-sm text-suave underline" onClick={() => ir("admin", "admin", "/admin")}>Entrar como administrador (demo)</button>}
    </main>
  );
}
