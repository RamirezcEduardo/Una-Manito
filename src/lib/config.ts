import type { Config, EstadoPedido, Servicio } from "./tipos";

export const ESLOGAN_CLIENTE = "Te damos una manito, al toque."; // general; cada servicio tiene el suyo
export const ESLOGAN_SOCIA = "Te damos una manito para crecer.";

export const SERVICIOS_INICIALES: Servicio[] = [
  { id: "limpieza", nombre: "Limpieza del hogar", icono: "🧹", eslogan: "Te damos una manito en tu hogar, al toque.", activo: true, precioHora: 15, horasMin: 3, recargoMateriales: 10 },
  { id: "gasfiteria", nombre: "Gasfitería", icono: "🔧", eslogan: "Te damos una manito con tus caños, al toque.", activo: false, precioHora: 35, horasMin: 1, recargoMateriales: 0 },
  { id: "electricidad", nombre: "Electricidad", icono: "💡", eslogan: "Te damos una manito con la luz, al toque.", activo: false, precioHora: 35, horasMin: 1, recargoMateriales: 0 },
  { id: "lavado_autos", nombre: "Lavado de autos", icono: "🚗", eslogan: "Te damos una manito con tu auto, al toque.", activo: false, precioHora: 25, horasMin: 1, recargoMateriales: 5 },
  { id: "piscinas", nombre: "Limpieza de piscinas", icono: "🏊", eslogan: "Te damos una manito con tu piscina, al toque.", activo: false, precioHora: 30, horasMin: 2, recargoMateriales: 15 },
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

export function calcularPrecio(s: Servicio, horas: number, conMateriales: boolean) {
  return s.precioHora * horas + (conMateriales ? s.recargoMateriales : 0);
}

export const soles = (n: number) => `S/ ${n.toFixed(2)}`;
export const LIMA = { lat: -12.0931, lng: -77.0465 };
