import Link from "next/link";
import type { ReactNode } from "react";
import { EMPRESA } from "@/lib/legal";

export function DocumentoLegal({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <Link href="/" className="font-semibold text-marca">← Volver</Link>
      <h1 className="mt-4 text-3xl font-extrabold">{titulo}</h1>
      <p className="mt-1 text-sm text-suave">Última actualización: {EMPRESA.actualizado}</p>
      <article className="legal mt-6 space-y-4 leading-relaxed">{children}</article>
    </main>
  );
}

/** Casilla obligatoria de aceptación para los formularios de registro. */
export function AceptoTerminos({ valor, onChange }: { valor: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/5">
      <input type="checkbox" className="mt-1 h-6 w-6 shrink-0 accent-[var(--color-marca)]" checked={valor} onChange={(e) => onChange(e.target.checked)} />
      <span>
        Acepto los{" "}
        <Link href="/terminos" target="_blank" className="font-semibold text-marca underline">Términos y condiciones</Link>{" "}
        y la{" "}
        <Link href="/privacidad" target="_blank" className="font-semibold text-marca underline">Política de privacidad</Link>,
        y autorizo el uso de mis datos para prestar el servicio.
      </span>
    </label>
  );
}
