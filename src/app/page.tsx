"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ESLOGAN_CLIENTE, ESLOGAN_SOCIA } from "@/lib/config";
import { useDatos } from "@/lib/store";

export default function Inicio() {
  const { clientes, socias, entrar } = useDatos();
  const router = useRouter();
  const demo = (rol: "cliente" | "socia" | "admin", id: string, ruta: string) => { entrar(rol, id); router.push(ruta); };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
      <div className="text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Una Manito" className="mx-auto w-64" />
        <h1 className="sr-only">Una Manito</h1>
        <p className="mt-3 text-xl font-semibold text-marca-oscuro">{ESLOGAN_CLIENTE}</p>
      </div>

      <section className="mt-6 space-y-3">
        <h2 className="text-lg font-bold">¿Necesitas ayuda en casa?</h2>
        <Link href="/cliente/registro" className="btn-primario block text-center">Pedir un servicio</Link>
        <button className="btn-borde" onClick={() => demo("cliente", clientes[0].id, "/cliente")}>Ya tengo cuenta</button>
      </section>

      <section className="mt-8 space-y-3 rounded-3xl bg-acento-claro p-5">
        <h2 className="text-lg font-bold">¿Quieres trabajar con nosotros?</h2>
        <p className="text-suave">{ESLOGAN_SOCIA}</p>
        <Link href="/socia/registro" className="btn-acento block text-center">Quiero ser socia</Link>
        <button className="btn w-full bg-white text-tinta" onClick={() => demo("socia", socias[0].id, "/socia")}>Soy socia, entrar</button>
      </section>

      <button className="mt-8 text-sm text-suave underline" onClick={() => demo("admin", "admin", "/admin")}>Entrar como administrador (demo)</button>
    </main>
  );
}
