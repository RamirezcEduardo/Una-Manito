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
}

export type EstadoPedido = "buscando" | "aceptado" | "en_camino" | "en_curso" | "terminado" | "cancelado";
export type MetodoPago = "yape" | "plin" | "efectivo";
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
  estado: EstadoPedido;
  total: number;
  comisionPct: number;
  pago: { metodo?: MetodoPago; estado: EstadoPago };
  calificacionSocia?: Calificacion;
  calificacionCliente?: Calificacion;
  creadoEn: string;
}

export interface Calificacion { estrellas: number; comentario?: string }

export interface Cliente { id: string; nombre: string; telefono: string; email?: string }

export type EstadoSocia = "pendiente" | "aprobada" | "rechazada";
export interface Socia {
  id: string;
  nombre: string;
  telefono: string;
  dni: string;
  foto: string;
  distritos: string[];
  servicios: ServicioId[];
  estado: EstadoSocia;
  disponible: boolean;
  calificacion: number;
  serviciosHechos: number;
}

export interface Config {
  comisionPct: number;
  distritos: { nombre: string; habilitado: boolean }[];
  servicios: Servicio[];
}
