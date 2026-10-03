"use client";
// Contrato de la capa de datos: lo implementan el modo demo (store.tsx) y Supabase (store-supabase.tsx).
import { createContext } from "react";
import type { Calificacion, Cliente, Config, MetodoPago, Pedido, Socia } from "./tipos";

export type Rol = "cliente" | "socia" | "admin" | "ceo";
export interface Sesion { rol: Rol; id: string }

/** Admin y CEO comparten el panel de administración. */
export const esEquipo = (rol?: Rol) => rol === "admin" || rol === "ceo";
export const rutaDeRol = (rol: Rol) => (esEquipo(rol) ? "/admin" : `/${rol}`);

export interface Usuario { id: string; nombre: string; telefono: string; email?: string; rol: Rol; creadoEn?: string }
export interface Invitacion { email: string; nombre?: string; rol: "admin" | "ceo"; creadoEn: string }

export interface Datos {
  config: Config;
  clientes: Cliente[];
  socias: Socia[];
  pedidos: Pedido[];
  sesion: Sesion | null;
  /** Todos los usuarios (solo lo ve el equipo). */
  usuarios: Usuario[];
  invitaciones: Invitacion[];
}

export type NuevoPedido = Omit<Pedido, "id" | "estado" | "pago" | "creadoEn" | "clienteId" | "comisionPct" | "propina" | "motivoCancelacion">;
export type NuevaSocia = Omit<Socia, "id" | "estado" | "disponible" | "calificacion" | "serviciosHechos" | "foto"> & { foto: File | string };

export interface Api extends Datos {
  listo: boolean;
  demo: boolean;
  /** Usuario autenticado sin perfil todavía (debe completar el registro). */
  sinPerfil: boolean;
  entrar: (rol: Rol, id: string) => void; // solo demo
  /** Envía un código de 6 dígitos al correo (inicio de sesión sin contraseña). */
  enviarCodigo: (email: string) => Promise<void>;
  verificarCodigo: (email: string, codigo: string) => Promise<void>;
  salir: () => Promise<void>;
  registrarCliente: (c: Omit<Cliente, "id">) => Promise<void>;
  registrarSocia: (s: NuevaSocia) => Promise<void>;
  crearPedido: (p: NuevoPedido) => Promise<string>;
  aceptarPedido: (pedidoId: string) => Promise<boolean>;
  avanzarPedido: (pedidoId: string) => Promise<void>;
  cancelarPedido: (pedidoId: string, motivo?: string) => Promise<void>;
  marcarPagado: (pedidoId: string, metodo: MetodoPago, propina?: number) => Promise<void>;
  confirmarPago: (pedidoId: string) => Promise<void>;
  calificar: (pedidoId: string, quien: "socia" | "cliente", c: Calificacion) => Promise<void>;
  setDisponible: (v: boolean) => Promise<void>;
  setEstadoSocia: (id: string, estado: Socia["estado"]) => Promise<void>;
  setConfig: (c: Config) => Promise<void>;
  /** Solo el CEO: cambiar rol (cliente, admin o CEO). */
  setRolUsuario: (id: string, rol: "cliente" | "admin" | "ceo") => Promise<void>;
  /** Solo el CEO: invitar por correo al equipo. Si ya tiene cuenta, cambia su rol al toque. */
  invitarUsuario: (email: string, nombre: string, rol: "admin" | "ceo") => Promise<void>;
  eliminarInvitacion: (email: string) => Promise<void>;
  reiniciar: () => void; // solo demo
}


export const Ctx = createContext<Api | null>(null);
