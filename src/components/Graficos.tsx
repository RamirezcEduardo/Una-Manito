"use client";
// Gráficos simples en SVG: una serie por gráfico, color de marca, tooltip al pasar el mouse o tocar.
import { useEffect, useMemo, useRef, useState } from "react";

const AZUL = "#0B6EF0";
const GRILLA = "#E8EBEF";
const TINTA_SUAVE = "#5B6B76";

/** Redondea el máximo del eje a un número "bonito" (10, 20, 50, 100…). */
function techo(max: number) {
  if (max <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(max)));
  const m = max / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}

export interface Punto { etiqueta: string; valor: number; detalle?: string }

/** Área con línea: para algo que cambia en el tiempo (ventas por día). */
export function GraficoArea({ datos, formato, alto = 220 }: { datos: Punto[]; formato: (v: number) => string; alto?: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const caja = useRef<HTMLDivElement>(null);
  const [activo, setActivo] = useState<number | null>(null);
  // El dibujo usa el ancho real en píxeles, así los textos se leen igual en celular y computadora.
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = alto, izq = 48, der = 12, arr = 12, aba = 26;
  const max = techo(Math.max(...datos.map((d) => d.valor), 0));
  const x = (i: number) => izq + (datos.length <= 1 ? 0 : (i * (W - izq - der)) / (datos.length - 1));
  const y = (v: number) => arr + (1 - v / max) * (H - arr - aba);
  const linea = datos.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.valor).toFixed(1)}`).join("");
  const area = `${linea}L${x(datos.length - 1)},${y(0)}L${x(0)},${y(0)}Z`;
  const marcas = [0, 0.5, 1].map((f) => f * max);
  const cadaN = Math.max(1, Math.ceil(datos.length / Math.max(3, Math.floor(W / 90))));

  const mover = (clienteX: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r || !datos.length) return;
    const px = ((clienteX - r.left) / r.width) * W;
    const i = Math.round(((px - izq) / (W - izq - der)) * (datos.length - 1));
    setActivo(Math.max(0, Math.min(datos.length - 1, i)));
  };
  const a = activo != null ? datos[activo] : null;

  return (
    <div ref={caja} className="relative">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full touch-none select-none" role="img"
        aria-label={`Gráfico de ${datos.length} días`}
        onPointerMove={(e) => mover(e.clientX)} onPointerDown={(e) => mover(e.clientX)} onPointerLeave={() => setActivo(null)}>
        {marcas.map((m) => (
          <g key={m}>
            <line x1={izq} x2={W - der} y1={y(m)} y2={y(m)} stroke={GRILLA} strokeWidth="1" />
            <text x={izq - 8} y={y(m) + 4} textAnchor="end" fontSize="11" fill={TINTA_SUAVE}>{formato(m)}</text>
          </g>
        ))}
        {datos.map((d, i) => i % cadaN === 0 && (
          <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="11" fill={TINTA_SUAVE}>{d.etiqueta}</text>
        ))}
        <path d={area} fill={AZUL} opacity="0.1" />
        <path d={linea} fill="none" stroke={AZUL} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {activo != null && a && (
          <g>
            <line x1={x(activo)} x2={x(activo)} y1={arr} y2={y(0)} stroke={TINTA_SUAVE} strokeWidth="1" opacity=".5" />
            <circle cx={x(activo)} cy={y(a.valor)} r="5" fill={AZUL} stroke="#fff" strokeWidth="2" />
          </g>
        )}
      </svg>
      {a && activo != null && (
        <div className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-xl bg-tinta px-3 py-2 text-sm text-white shadow-lg"
          style={{ left: `${(x(activo) / W) * 100}%` }}>
          <b className="block">{formato(a.valor)}</b>
          <span className="text-white/80">{a.detalle ?? a.etiqueta}</span>
        </div>
      )}
    </div>
  );
}

/** Barras horizontales: para comparar categorías (distritos, estados). */
export function BarrasH({ datos, formato = String }: { datos: Punto[]; formato?: (v: number) => string }) {
  const [activo, setActivo] = useState<number | null>(null);
  const max = useMemo(() => Math.max(...datos.map((d) => d.valor), 1), [datos]);
  if (!datos.length) return <p className="text-sm text-suave">Sin datos en este periodo.</p>;
  return (
    <ul className="space-y-2.5">
      {datos.map((d, i) => (
        <li key={d.etiqueta} className="relative" onPointerEnter={() => setActivo(i)} onPointerLeave={() => setActivo(null)} onPointerDown={() => setActivo(i)}>
          <div className="mb-1 flex justify-between gap-2 text-sm">
            <span className="truncate font-semibold">{d.etiqueta}</span>
            <span className="shrink-0 text-suave">{formato(d.valor)}</span>
          </div>
          <div className="h-3 rounded-r bg-transparent">
            <div className="h-3 rounded-r" style={{ width: `${Math.max(2, (d.valor / max) * 100)}%`, background: AZUL, opacity: activo == null || activo === i ? 1 : 0.45 }} />
          </div>
          {activo === i && d.detalle && (
            <div className="pointer-events-none absolute right-0 top-0 z-10 -translate-y-full rounded-xl bg-tinta px-3 py-1.5 text-xs text-white shadow-lg">{d.detalle}</div>
          )}
        </li>
      ))}
    </ul>
  );
}
