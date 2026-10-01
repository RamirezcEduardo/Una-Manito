import type { Config, EstadoPedido, Servicio } from "./tipos";

export const ESLOGAN_CLIENTE = "Te damos una manito, al toque.";
export const ESLOGAN_SOCIA = "Te damos la mano para crecer."; // TODO: confirmar texto final

export const SERVICIOS_INICIALES: Servicio[] = [
  { id: "limpieza", nombre: "Limpieza del hogar", icono: "🧹", activo: true, precioHora: 15, horasMin: 3, recargoMateriales: 10 },
  { id: "gasfiteria", nombre: "Gasfitería", icono: "🔧", activo: false, precioHora: 35, horasMin: 1, recargoMateriales: 0 },
  { id: "electricidad", nombre: "Electricidad", icono: "💡", activo: false, precioHora: 35, horasMin: 1, recargoMateriales: 0 },
  { id: "lavado_autos", nombre: "Lavado de autos", icono: "🚗", activo: false, precioHora: 25, horasMin: 1, recargoMateriales: 5 },
  { id: "piscinas", nombre: "Limpieza de piscinas", icono: "🏊", activo: false, precioHora: 30, horasMin: 2, recargoMateriales: 15 },
];

export const DISTRITOS_LIMA = [
  "Miraflores", "San Isidro", "Surco", "San Borja", "Barranco", "La Molina",
  "Jesús María", "Lince", "Magdalena", "Pueblo Libre", "San Miguel", "Surquillo", "Chorrillos", "Los Olivos",
];

export const CONFIG_INICIAL: Config = {
  comisionPct: 15,
  distritos: DISTRITOS_LIMA.map((nombre, i) => ({ nombre, habilitado: i < 10 })),
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

export function calcularPrecio(s: Servicio, horas: number, conMateriales: boolean) {
  return s.precioHora * horas + (conMateriales ? s.recargoMateriales : 0);
}

export const soles = (n: number) => `S/ ${n.toFixed(2)}`;
export const LIMA = { lat: -12.0931, lng: -77.0465 };
