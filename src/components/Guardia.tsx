"use client";
// Protege las rutas según la sesión (solo con Supabase; en modo demo no hace nada).
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { esEquipo, rutaDeRol } from "@/lib/api";
import { useDatos } from "@/lib/store";

export default function Guardia({ children }: { children: ReactNode }) {
  const { demo, listo, sesion, sinPerfil, registrarReferido } = useDatos();
  // Enlace de invitación (?ref=CODIGO): se guarda y se vincula cuando la persona ya tiene perfil.
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (ref && /^[A-Za-z0-9]{8}$/.test(ref)) localStorage.setItem("una-manito-ref", ref.toUpperCase());
      const guardado = localStorage.getItem("una-manito-ref");
      if (guardado && sesion?.rol === "cliente") {
        localStorage.removeItem("una-manito-ref");
        registrarReferido(guardado).catch(() => {});
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesion?.id]);
  const ruta = usePathname();
  const router = useRouter();
  const seccion = ruta.split("/")[1] as "cliente" | "socia" | "admin" | "";
  const privada = seccion === "cliente" || seccion === "socia" || seccion === "admin";
  const esRegistro = ruta.endsWith("/registro");

  let destino: string | null = null;
  if (!demo && listo && privada) {
    if (!sesion && !sinPerfil) destino = `/entrar?rol=${seccion === "socia" ? "socia" : "cliente"}`;
    else if (sinPerfil && !esRegistro) destino = seccion === "socia" ? "/socia/registro" : "/cliente/registro";
    // Con sesión de otro tipo (p. ej. cliente entrando a /socia): se pregunta si quiere cambiar de cuenta.
    else if (sesion && !esRegistro && !esEquipo(sesion.rol) && sesion.rol !== seccion) destino = seccion === "admin" ? rutaDeRol(sesion.rol) : `/entrar?rol=${seccion}`;
    else if (sesion && esRegistro) destino = rutaDeRol(sesion.rol);
  }

  useEffect(() => { if (destino) router.replace(destino); }, [destino, router]);

  if (!demo && privada && (!listo || destino)) {
    return <div className="flex min-h-dvh items-center justify-center text-suave">Cargando…</div>;
  }
  return <>{children}</>;
}
