"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { EnlaceReclamaciones } from "@/components/Extras";
import { Avatar, accion } from "@/components/ui";
import { useDatos } from "@/lib/store";

const OPCIONES = {
  cliente: [
    { href: "/cliente", icono: "🏠", texto: "Pedir" },
    { href: "/cliente/historial", icono: "🧾", texto: "Mis servicios" },
    { href: "/cliente/perfil", icono: "👤", texto: "Mi perfil" },
  ],
  socia: [
    { href: "/socia", icono: "🏠", texto: "Inicio" },
    { href: "/socia/billetera", icono: "💰", texto: "Billetera" },
    { href: "/socia/horario", icono: "📅", texto: "Horario" },
    { href: "/socia/perfil", icono: "👤", texto: "Mi perfil" },
  ],
} as const;

/** Menú fijo inferior dentro de la app (cliente o socia). */
export function MenuInferior({ rol }: { rol: "cliente" | "socia" }) {
  const ruta = usePathname();
  const opciones = OPCIONES[rol];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-[950] border-t bg-white pb-[env(safe-area-inset-bottom)] lg:inset-x-auto lg:bottom-0 lg:left-0 lg:top-[68px] lg:w-60 lg:border-r lg:border-t-0 lg:pb-0">
      <div className={`mx-auto grid max-w-md ${opciones.length === 3 ? "grid-cols-3" : "grid-cols-4"} lg:mx-0 lg:max-w-none lg:grid-cols-1 lg:gap-1 lg:p-3`}>
        {opciones.map((o) => {
          const activo = ruta === o.href;
          return (
            <Link key={o.href} href={o.href}
              className={`flex flex-col items-center gap-0.5 py-2 text-xs font-bold lg:flex-row lg:gap-3 lg:rounded-xl lg:px-3 lg:py-2.5 lg:text-base ${activo ? "text-marca lg:bg-marca lg:text-white" : "text-suave lg:hover:bg-marca-claro"}`}>
              <span className={`text-2xl lg:text-xl ${activo ? "" : "opacity-70 grayscale"}`}>{o.icono}</span>{o.texto}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Datos de la cuenta, cambio de contraseña y salida. */
export function PerfilVista({ rol }: { rol: "cliente" | "socia" }) {
  const { sesion, usuarios, clientes, socias, salir, cambiarContrasena, cambiarFoto, demo } = useDatos();
  const router = useRouter();
  const [nueva, setNueva] = useState("");
  const [abierto, setAbierto] = useState(false);
  const u = usuarios.find((x) => x.id === sesion?.id);
  const base = rol === "socia" ? socias.find((s) => s.id === sesion?.id) : clientes.find((c) => c.id === sesion?.id);
  const nombre = u?.nombre ?? base?.nombre ?? "";
  const foto = (rol === "socia" ? socias.find((s) => s.id === sesion?.id)?.foto : undefined) || u?.foto || clientes.find((c) => c.id === sesion?.id)?.foto;
  const [subiendo, setSubiendo] = useState(false);
  const filas: [string, string | undefined][] = [
    ["Nombre", nombre],
    ["Celular", u?.telefono ?? base?.telefono],
    ["Correo", u?.email],
    ["Documento", u?.personal ? `${u.personal.tipoDocumento} ${u.personal.documento}` : undefined],
    ["Nacimiento", u?.personal ? new Date(u.personal.fechaNacimiento + "T12:00").toLocaleDateString("es-PE") : undefined],
  ];
  return (
    <>
      <div className="tarjeta space-y-1 text-center">
        <label className="relative mx-auto block w-fit cursor-pointer" title="Cambiar foto">
          <Avatar foto={foto} nombre={nombre || "?"} tam={96} />
          <span className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-acento text-lg shadow ring-2 ring-white">{subiendo ? "⏳" : "📷"}</span>
          <input type="file" accept="image/*" className="hidden" disabled={subiendo}
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; setSubiendo(true); accion(() => cambiarFoto(f)).finally(() => setSubiendo(false)); }} />
        </label>
        <p className="text-sm font-semibold text-marca">{foto ? "Toca la foto para cambiarla" : "Toca para agregar tu foto"}</p>
        <p className="pt-2 text-xl font-extrabold">{nombre}</p>
        <p className="text-suave">{rol === "socia" ? "Socia de Una Manito" : "Cliente"}</p>
      </div>
      <div className="tarjeta divide-y">
        {filas.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 py-2"><span className="text-suave">{k}</span><b className="text-right">{v}</b></div>
        ))}
      </div>
      <p className="text-center text-sm text-suave">¿Necesitas cambiar tus datos? Escríbenos por WhatsApp.</p>

      {!demo && (
        <div className="tarjeta space-y-3">
          <button className="w-full text-left font-bold" onClick={() => setAbierto(!abierto)}>🔒 Cambiar contraseña {abierto ? "▲" : "▼"}</button>
          {abierto && (
            <>
              <input className="campo" type="password" autoComplete="new-password" placeholder="Nueva contraseña (mínimo 6)" value={nueva} onChange={(e) => setNueva(e.target.value)} />
              <button className="btn-primario" disabled={nueva.length < 6}
                onClick={() => accion(async () => { await cambiarContrasena(nueva); setNueva(""); setAbierto(false); alert("Listo, tu contraseña cambió."); })}>
                Guardar contraseña
              </button>
            </>
          )}
        </div>
      )}

      <div className="tarjeta space-y-2 text-sm">
        <Link href="/terminos" className="block underline">📄 Términos y condiciones</Link>
        <Link href="/privacidad" className="block underline">🔐 Política de privacidad</Link>
        <EnlaceReclamaciones className="block" />
      </div>
      <button className="btn border-2 border-red-300 bg-white text-red-600" onClick={async () => { await salir(); router.push("/"); }}>Cerrar sesión</button>
    </>
  );
}
