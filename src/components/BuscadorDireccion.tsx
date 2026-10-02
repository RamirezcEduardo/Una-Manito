"use client";
import { useEffect, useRef, useState } from "react";
import { buscarLugares, type Lugar } from "@/lib/geo";

/** Caja de búsqueda con sugerencias, al estilo de Google Maps. */
export default function BuscadorDireccion({ cerca, onElegir }: { cerca: { lat: number; lng: number }; onElegir: (l: Lugar) => void }) {
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<Lugar[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const cercaRef = useRef(cerca);
  cercaRef.current = cerca;

  useEffect(() => {
    if (texto.trim().length < 3) { setResultados([]); setError(""); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setCargando(true); setError("");
      try {
        const r = await buscarLugares(texto, cercaRef.current, ctrl.signal);
        setResultados(r);
        if (!r.length) setError("No encontramos esa dirección. Prueba con otra o marca en el mapa.");
      } catch (e) {
        if (!ctrl.signal.aborted) setError("No pudimos buscar. Marca tu casa en el mapa.");
        void e;
      }
      if (!ctrl.signal.aborted) setCargando(false);
    }, 400);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [texto]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-3 focus-within:border-marca">
        <span aria-hidden className="text-xl">🔎</span>
        <input
          className="w-full bg-transparent py-3 text-lg outline-none"
          placeholder="Busca tu dirección o un lugar"
          value={texto}
          onChange={(e) => { setTexto(e.target.value); setAbierto(true); }}
          onFocus={() => setAbierto(true)}
          enterKeyHint="search"
          autoComplete="street-address"
        />
        {texto && <button type="button" aria-label="Borrar" className="text-xl text-suave" onClick={() => { setTexto(""); setResultados([]); }}>✕</button>}
      </div>
      {abierto && (cargando || error || resultados.length > 0) && (
        <ul className="absolute inset-x-0 top-full z-[1100] mt-1 max-h-80 overflow-auto rounded-xl bg-white shadow-lg ring-1 ring-black/10">
          {cargando && !resultados.length && <li className="px-4 py-3 text-suave">Buscando…</li>}
          {error && !cargando && <li className="px-4 py-3 text-suave">{error}</li>}
          {resultados.map((r, i) => (
            <li key={`${r.lat},${r.lng},${i}`}>
              <button type="button" className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-marca-claro"
                onClick={() => { onElegir(r); setTexto(r.titulo); setAbierto(false); }}>
                <span aria-hidden className="pt-0.5">📍</span>
                <span><span className="block font-semibold">{r.titulo}</span>{r.detalle && <span className="block text-sm text-suave">{r.detalle}</span>}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
