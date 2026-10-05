// Tipos de dominio. Pensados para mapear 1:1 con las tablas de Supabase más adelante.

export type ServicioId = "limpieza" | "gasfiteria" | "electricidad" | "lavado_autos" | "piscinas";

export interface Servicio {
  id: ServicioId;
  nombre: string;
  icono: string;
  eslogan: string;
  activo: boolean;
  precioHora: number; // soles
  horasMin: number;
  recargoMateriales: number; // soles fijos si la socia lleva materiales
  tareas: string[]; // lo que el cliente puede marcar ("Cocina", "Baños"…)
}

export type EstadoPedido = "buscando" | "aceptado" | "en_camino" | "en_curso" | "terminado" | "cancelado";
export type MetodoPago = "yape" | "plin" | "efectivo";
export type Frecuencia = "unica" | "semanal" | "quincenal";
export type EstadoPago = "pendiente" | "marcado_pagado" | "confirmado";

export interface Ubicacion {
  direccion: string;
  distrito: string;
  referencia?: string;
  lat: number;
  lng: number;
}

export interface Pedido {
  id: string;
  clienteId: string;
  sociaId?: string;
  servicio: ServicioId;
  ubicacion: Ubicacion;
  fecha: string | "asap"; // ISO o "lo antes posible"
  horas: number;
  conMateriales: boolean; // true = la socia lleva materiales
  notas?: string;
  tareas: string[];   // lo que el cliente pidió que se haga
  estado: EstadoPedido;
  recargo: number;    // soles extra por urgencia o fin de semana (ya incluidos en total)
  total: number;
  descuento: number;  // descuento por plan recurrente (ya restado del total)
  cargoServicio: number; // cargo fijo al cliente, 100% de Una Manito (no está en total)
  propina: number;    // 100% para la socia, no paga comisión
  frecuencia: Frecuencia; // plan recurrente: al terminar se agenda la siguiente visita
  planOrigen?: string;
  liquidado: boolean; // la socia ya pagó a Una Manito su comisión y el cargo
  motivoCancelacion?: string;
  comisionPct: number;
  pago: { metodo?: MetodoPago; estado: EstadoPago };
  calificacionSocia?: Calificacion;
  calificacionCliente?: Calificacion;
  creadoEn: string;
}

export interface Calificacion { estrellas: number; comentario?: string }

export interface Cliente { id: string; nombre: string; telefono: string; email?: string }

/** Datos personales privados (solo la persona y el equipo los ven). */
export interface DatosPersonales {
  tipoDocumento: "DNI" | "CE"; // CE = carné de extranjería
  documento: string;
  fechaNacimiento: string; // AAAA-MM-DD
}

/** Verificación de la socia (privada). Las fotos del DNI son rutas en un bucket privado o URLs locales en la demo. */
export interface VerificacionSocia {
  direccion: string;
  distritoResidencia: string;
  emergenciaNombre: string;
  emergenciaParentesco: string;
  emergenciaTelefono: string;
  cobroNumero: string; // Yape o Plin
  experiencia: string;
  dniFrente?: string;
  dniReverso?: string;
  declaraSinAntecedentes: boolean;
}

export type EstadoSocia = "pendiente" | "aprobada" | "rechazada";
export interface Socia {
  id: string;
  nombre: string;
  telefono: string;
  dni?: string; // solo visible para la propia socia y el admin
  personal?: DatosPersonales; // solo para la propia socia y el equipo
  verificacion?: VerificacionSocia; // solo para la propia socia y el equipo
  foto: string;
  distritos: string[];
  servicios: ServicioId[];
  estado: EstadoSocia;
  disponible: boolean;
  calificacion: number;
  serviciosHechos: number;
  horario: Horario;
}

/** Días y horas en que la socia trabaja: {"1": [8, 18]} con 1 = lunes … 7 = domingo. Vacío = siempre. */
export type Horario = Partial<Record<"1" | "2" | "3" | "4" | "5" | "6" | "7", [number, number]>>;

export interface Reclamacion {
  id: string;
  numero: number;
  creadoEn: string;
  tipo: "reclamo" | "queja";
  nombre: string;
  tipoDocumento: "DNI" | "CE";
  documento: string;
  email: string;
  telefono?: string;
  direccion?: string;
  menorDeEdad: boolean;
  apoderado?: string;
  bien: "producto" | "servicio";
  monto?: number;
  descripcionBien: string;
  detalle: string;
  pedidoConsumidor: string;
  respuesta?: string;
  respondidoEn?: string;
}

export interface Config {
  comisionPct: number;
  recargoUrgentePct: number; // pedidos "lo antes posible"
  recargoFindePct: number;   // sábados y domingos
  cargoServicio: number;     // soles fijos por pedido que paga el cliente (100% Una Manito)
  descuentoPlanPct: number;  // descuento para planes semanales o quincenales
  whatsappSoporte: string;   // celular de atención (9XXXXXXXX); vacío = sin botón
  distritos: { nombre: string; habilitado: boolean }[];
  servicios: Servicio[];
}
