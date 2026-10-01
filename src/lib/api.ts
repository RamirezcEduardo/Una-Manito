"use client";
// Contrato de la capa de datos: lo implementan el modo demo (store.tsx) y Supabase (store-supabase.tsx).
import { createContext } from "react";
import type { Calificacion, Cliente, Config, MetodoPago, Pedido, Socia } from "./tipos";

export type Rol = "cliente" | "socia" | "admin";
export interface Sesion { rol: Rol; id: string }

export interface Datos {
  config: Config;
  clientes: Cliente[];
  socias: Socia[];
  pedidos: Pedido[];
  sesion: Sesion | null;
}

export type NuevoPedido = Omit<Pedido, "id" | "estado" | "pago" | "creadoEn" | "clienteId" | "comisionPct">;
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
  cancelarPedido: (pedidoId: string) => Promise<void>;
  marcarPagado: (pedidoId: string, metodo: MetodoPago) => Promise<void>;
  confirmarPago: (pedidoId: string) => Promise<void>;
  calificar: (pedidoId: string, quien: "socia" | "cliente", c: Calificacion) => Promise<void>;
  setDisponible: (v: boolean) => Promise<void>;
  setEstadoSocia: (id: string, estado: Socia["estado"]) => Promise<void>;
  setConfig: (c: Config) => Promise<void>;
  reiniciar: () => void; // solo demo
}


export const Ctx = createContext<Api | null>(null);
