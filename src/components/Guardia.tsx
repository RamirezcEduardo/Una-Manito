"use client";
// Protege las rutas según la sesión (solo con Supabase; en modo demo no hace nada).
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useDatos } from "@/lib/store";

export default function Guardia({ children }: { children: ReactNode }) {
  const { demo, listo, sesion, sinPerfil } = useDatos();
  const ruta = usePathname();
  const router = useRouter();
  const seccion = ruta.split("/")[1] as "cliente" | "socia" | "admin" | "";
  const privada = seccion === "cliente" || seccion === "socia" || seccion === "admin";
  const esRegistro = ruta.endsWith("/registro");

  let destino: string | null = null;
  if (!demo && listo && privada) {
    if (!sesion && !sinPerfil) destino = `/entrar?rol=${seccion === "socia" ? "socia" : "cliente"}`;
    else if (sinPerfil && !esRegistro) destino = seccion === "socia" ? "/socia/registro" : "/cliente/registro";
    else if (sesion && !esRegistro && sesion.rol !== "admin" && sesion.rol !== seccion) destino = `/${sesion.rol}`;
    else if (sesion && esRegistro) destino = `/${sesion.rol}`;
  }

  useEffect(() => { if (destino) router.replace(destino); }, [destino, router]);

  if (!demo && privada && (!listo || destino)) {
    return <div className="flex min-h-dvh items-center justify-center text-suave">Cargando…</div>;
  }
  return <>{children}</>;
}
