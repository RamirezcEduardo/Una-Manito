import type { Config, EstadoPedido, Frecuencia, Horario, Servicio } from "./tipos";

export const ESLOGAN_CLIENTE = "Te damos una manito, al toque."; // general; cada servicio tiene el suyo
export const ESLOGAN_SOCIA = "Te damos una manito para crecer.";

export const SERVICIOS_INICIALES: Servicio[] = [
  { id: "limpieza", nombre: "Limpieza del hogar", icono: "🧹", eslogan: "Te damos una manito en tu hogar, al toque.", activo: true, precioHora: 15, horasMin: 3, recargoMateriales: 10, tareas: ["Cocina", "Baños", "Dormitorios", "Sala y comedor", "Pisos", "Ventanas por dentro", "Planchado", "Lavado de ropa"] },
  { id: "gasfiteria", nombre: "Gasfitería", icono: "🔧", eslogan: "Te damos una manito con tus caños, al toque.", activo: false, precioHora: 35, horasMin: 1, recargoMateriales: 0, tareas: [] },
  { id: "electricidad", nombre: "Electricidad", icono: "💡", eslogan: "Te damos una manito con la luz, al toque.", activo: false, precioHora: 35, horasMin: 1, recargoMateriales: 0, tareas: [] },
  { id: "lavado_autos", nombre: "Lavado de autos", icono: "🚗", eslogan: "Te damos una manito con tu auto, al toque.", activo: false, precioHora: 25, horasMin: 1, recargoMateriales: 5, tareas: [] },
  { id: "piscinas", nombre: "Limpieza de piscinas", icono: "🏊", eslogan: "Te damos una manito con tu piscina, al toque.", activo: false, precioHora: 30, horasMin: 2, recargoMateriales: 15, tareas: [] },
];

// Los 43 distritos de Lima Metropolitana y los 7 del Callao (también sirven para reconocer el distrito de un punto del mapa).
export const DISTRITOS_LIMA_TODOS = [
  "Ancón", "Ate", "Barranco", "Breña", "Carabayllo", "Chaclacayo", "Chorrillos", "Cieneguilla", "Comas",
  "El Agustino", "Independencia", "Jesús María", "La Molina", "La Victoria", "Lima", "Lince", "Los Olivos",
  "Lurigancho", "Lurín", "Magdalena", "Miraflores", "Pachacámac", "Pucusana", "Pueblo Libre", "Puente Piedra",
  "Punta Hermosa", "Punta Negra", "Rímac", "San Bartolo", "San Borja", "San Isidro", "San Juan de Lurigancho",
  "San Juan de Miraflores", "San Luis", "San Martín de Porres", "San Miguel", "Santa Anita", "Santa María del Mar",
  "Santa Rosa", "Surco", "Surquillo", "Villa El Salvador", "Villa María del Triunfo",
];
export const DISTRITOS_CALLAO = ["Callao", "Bellavista", "Carmen de la Legua", "La Perla", "La Punta", "Mi Perú", "Ventanilla"];

export const CONFIG_INICIAL: Config = {
  comisionPct: 15,
  recargoUrgentePct: 10,
  recargoFindePct: 10,
  cargoServicio: 0,
  descuentoPlanPct: 5,
  whatsappSoporte: "",
  distritos: [
    ...DISTRITOS_LIMA_TODOS.map((nombre) => ({ nombre, habilitado: true })),
    ...DISTRITOS_CALLAO.map((nombre) => ({ nombre, habilitado: false })),
  ],
  servicios: SERVICIOS_INICIALES,
};

export const ETIQUETA_ESTADO: Record<EstadoPedido, { texto: string; color: string; icono: string }> = {
  buscando: { texto: "Buscando socia", color: "bg-acento-claro text-amber-800", icono: "🔎" },
  aceptado: { texto: "Aceptado", color: "bg-marca-claro text-marca-oscuro", icono: "🤝" },
  en_camino: { texto: "En camino", color: "bg-marca-claro text-marca-oscuro", icono: "🛵" },
  en_curso: { texto: "En curso", color: "bg-blue-100 text-blue-800", icono: "✨" },
  terminado: { texto: "Terminado", color: "bg-green-100 text-green-800", icono: "✅" },
  cancelado: { texto: "Cancelado", color: "bg-gray-200 text-gray-700", icono: "✖️" },
};

export const SIGUIENTE_ESTADO: Partial<Record<EstadoPedido, EstadoPedido>> = {
  aceptado: "en_camino",
  en_camino: "en_curso",
  en_curso: "terminado",
};

export const esFinDeSemana = (fecha: string) => fecha !== "asap" && [0, 6].includes(new Date(fecha).getDay());

/**
 * Precio del pedido. Debe coincidir con el cálculo de la base de datos (pedidos_antes_insertar):
 * base = precio por hora × horas + materiales; recargo = base × (% urgencia + % fin de semana);
 * descuento = (base + recargo) × % de plan si es semanal o quincenal. El cargo de servicio va aparte.
 */
export function calcularPrecio(s: Servicio, horas: number, conMateriales: boolean, fecha: string,
  c: Pick<Config, "recargoUrgentePct" | "recargoFindePct" | "descuentoPlanPct" | "cargoServicio">, frecuencia: Frecuencia = "unica") {
  const base = s.precioHora * horas + (conMateriales ? s.recargoMateriales : 0);
  const motivos: string[] = [];
  let pct = 0;
  if (fecha === "asap" && c.recargoUrgentePct > 0) { pct += c.recargoUrgentePct; motivos.push(`Lo antes posible +${c.recargoUrgentePct}%`); }
  if (esFinDeSemana(fecha) && c.recargoFindePct > 0) { pct += c.recargoFindePct; motivos.push(`Fin de semana +${c.recargoFindePct}%`); }
  const recargo = Math.round(base * pct) / 100;
  const descuento = frecuencia !== "unica" ? Math.round((base + recargo) * c.descuentoPlanPct) / 100 : 0;
  const total = Math.round((base + recargo - descuento) * 100) / 100;
  return { base, recargo, descuento, total, cargoServicio: c.cargoServicio, aPagar: total + c.cargoServicio, motivos };
}

/** Lo que gana la socia: el total menos la comisión, más la propina completa. */
// La comisión se redondea al céntimo y la socia recibe el resto, así las cifras siempre cuadran.
export const comisionDe = (p: { total: number; comisionPct: number }) => Math.round(p.total * p.comisionPct) / 100;
export const gananciaSocia = (p: { total: number; comisionPct: number; propina: number }) =>
  Math.round((p.total - comisionDe(p) + (p.propina || 0)) * 100) / 100;

/** Lo que paga el cliente: servicio + cargo de servicio + propina. */
export const pagoCliente = (p: { total: number; cargoServicio: number; propina: number }) =>
  Math.round((p.total + (p.cargoServicio || 0) + (p.propina || 0)) * 100) / 100;
/** Lo que la socia le debe a Una Manito cuando el cliente le paga directo: comisión + cargo de servicio. */
export const parteUnaManito = (p: { total: number; comisionPct: number; cargoServicio: number }) =>
  Math.round((comisionDe(p) + (p.cargoServicio || 0)) * 100) / 100;

export const FRECUENCIAS: { id: Frecuencia; texto: string; dias: number }[] = [
  { id: "unica", texto: "Solo esta vez", dias: 0 },
  { id: "quincenal", texto: "Cada 15 días", dias: 14 },
  { id: "semanal", texto: "Cada semana", dias: 7 },
];

export const DIAS_SEMANA: { id: keyof Horario; corto: string; largo: string }[] = [
  { id: "1", corto: "Lun", largo: "Lunes" }, { id: "2", corto: "Mar", largo: "Martes" }, { id: "3", corto: "Mié", largo: "Miércoles" },
  { id: "4", corto: "Jue", largo: "Jueves" }, { id: "5", corto: "Vie", largo: "Viernes" }, { id: "6", corto: "Sáb", largo: "Sábado" },
  { id: "7", corto: "Dom", largo: "Domingo" },
];

/** ¿El pedido cae dentro del horario de la socia? Sin horario = siempre. "Lo antes posible" = ahora. */
export function enHorario(h: Horario | undefined, fecha: string) {
  if (!h || Object.keys(h).length === 0) return true;
  const f = fecha === "asap" ? new Date() : new Date(fecha);
  const dia = String(((f.getDay() + 6) % 7) + 1) as keyof Horario;
  const rango = h[dia];
  if (!rango) return false;
  const hora = f.getHours() + f.getMinutes() / 60;
  return hora >= rango[0] && hora < rango[1];
}

export const MOTIVOS_CANCELACION = ["Ya no lo necesito", "Me equivoqué de fecha u hora", "Demoran en encontrar socia", "Encontré otra opción", "Otro motivo"];

export const PROPINAS = [0, 5, 10, 20];

/** Niveles de socia según calificación y servicios terminados. */
export const NIVELES = [
  { id: "estrella", nombre: "Socia Estrella", icono: "🌟", minServicios: 50, minCalificacion: 4.8 },
  { id: "confiable", nombre: "Socia Confiable", icono: "💎", minServicios: 10, minCalificacion: 4.5 },
  { id: "nueva", nombre: "Socia Nueva", icono: "🌱", minServicios: 0, minCalificacion: 0 },
] as const;

export function nivelSocia(s: { calificacion: number; serviciosHechos: number }) {
  const actual = NIVELES.find((n) => s.serviciosHechos >= n.minServicios && (n.minServicios === 0 || s.calificacion >= n.minCalificacion))!;
  const i = NIVELES.indexOf(actual);
  const siguiente = i > 0 ? NIVELES[i - 1] : undefined;
  return { actual, siguiente, faltan: siguiente ? Math.max(0, siguiente.minServicios - s.serviciosHechos) : 0 };
}

export const soles = (n: number) => `S/ ${n.toFixed(2)}`;
export const LIMA = { lat: -12.0931, lng: -77.0465 };

/** "sáb 4 oct, 9:00 a. m." — o "Lo antes posible". */
export const formatoFecha = (f: string) =>
  f === "asap" ? "Lo antes posible" : new Date(f).toLocaleString("es-PE", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
