"use client";
// Almacén de datos simulado (localStorage) para el bosquejo del frontend.
// Todas las pantallas usan solo este hook: al conectar Supabase se reemplaza
// la implementación de estas funciones sin tocar las pantallas.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { CONFIG_INICIAL } from "./config";
import type { Calificacion, Cliente, Config, EstadoPedido, MetodoPago, Pedido, Socia } from "./tipos";

type Rol = "cliente" | "socia" | "admin";
interface Sesion { rol: Rol; id: string }

interface Datos {
  config: Config;
  clientes: Cliente[];
  socias: Socia[];
  pedidos: Pedido[];
  sesion: Sesion | null;
}

const SEMILLA: Datos = {
  config: CONFIG_INICIAL,
  clientes: [{ id: "c1", nombre: "Lucía Paredes", telefono: "987654321" }],
  socias: [
    { id: "s1", nombre: "Rosa Quispe", telefono: "912345678", dni: "45678912", foto: "https://i.pravatar.cc/200?img=47", distritos: ["Miraflores", "Surco", "Barranco"], servicios: ["limpieza"], estado: "aprobada", disponible: true, calificacion: 4.9, serviciosHechos: 132 },
    { id: "s2", nombre: "Carmen Huamán", telefono: "923456789", dni: "41234567", foto: "https://i.pravatar.cc/200?img=45", distritos: ["San Isidro", "Lince"], servicios: ["limpieza"], estado: "pendiente", disponible: false, calificacion: 0, serviciosHechos: 0 },
  ],
  pedidos: [
    { id: "p1", clienteId: "c1", sociaId: "s1", servicio: "limpieza", ubicacion: { direccion: "Av. Larco 345, dpto 502", distrito: "Miraflores", lat: -12.1211, lng: -77.0297 }, fecha: "2026-09-20T09:00:00", horas: 4, conMateriales: false, estado: "terminado", total: 60, comisionPct: 15, pago: { metodo: "yape", estado: "confirmado" }, calificacionSocia: { estrellas: 5, comentario: "¡Impecable!" }, creadoEn: "2026-09-19T18:00:00" },
  ],
  sesion: null,
};

const CLAVE = "una-manito-demo-v2";
const nuevoId = (p: string) => p + Math.random().toString(36).slice(2, 8);

interface Api extends Datos {
  listo: boolean;
  entrar: (rol: Rol, id: string) => void;
  salir: () => void;
  registrarCliente: (c: Omit<Cliente, "id">) => void;
  registrarSocia: (s: Omit<Socia, "id" | "estado" | "disponible" | "calificacion" | "serviciosHechos">) => void;
  crearPedido: (p: Omit<Pedido, "id" | "estado" | "pago" | "creadoEn" | "clienteId" | "comisionPct">) => string;
  aceptarPedido: (pedidoId: string) => boolean;
  cambiarEstado: (pedidoId: string, estado: EstadoPedido) => void;
  marcarPagado: (pedidoId: string, metodo: MetodoPago) => void;
  confirmarPago: (pedidoId: string) => void;
  calificar: (pedidoId: string, quien: "socia" | "cliente", c: Calificacion) => void;
  setDisponible: (v: boolean) => void;
  setEstadoSocia: (id: string, estado: Socia["estado"]) => void;
  setConfig: (c: Config) => void;
  reiniciar: () => void;
}

const Ctx = createContext<Api | null>(null);

export function DatosProvider({ children }: { children: ReactNode }) {
  const [d, setD] = useState<Datos>(SEMILLA);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CLAVE);
      if (raw) setD(JSON.parse(raw));
    } catch {}
    setListo(true);
  }, []);
  useEffect(() => {
    if (listo) try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch {}
  }, [d, listo]);

  const mod = useCallback((f: (d: Datos) => Datos) => setD((x) => f(x)), []);
  const modPedido = (id: string, f: (p: Pedido) => Pedido) =>
    mod((x) => ({ ...x, pedidos: x.pedidos.map((p) => (p.id === id ? f(p) : p)) }));

  const api: Api = {
    ...d,
    listo,
    entrar: (rol, id) => mod((x) => ({ ...x, sesion: { rol, id } })),
    salir: () => mod((x) => ({ ...x, sesion: null })),
    registrarCliente: (c) => {
      const id = nuevoId("c");
      mod((x) => ({ ...x, clientes: [...x.clientes, { ...c, id }], sesion: { rol: "cliente", id } }));
    },
    registrarSocia: (s) => {
      const id = nuevoId("s");
      mod((x) => ({ ...x, socias: [...x.socias, { ...s, id, estado: "pendiente", disponible: false, calificacion: 0, serviciosHechos: 0 }], sesion: { rol: "socia", id } }));
    },
    crearPedido: (p) => {
      const id = nuevoId("p");
      mod((x) => ({
        ...x,
        pedidos: [{ ...p, id, clienteId: x.sesion!.id, estado: "buscando", pago: { estado: "pendiente" }, comisionPct: x.config.comisionPct, creadoEn: new Date().toISOString() }, ...x.pedidos],
      }));
      return id;
    },
    aceptarPedido: (pedidoId) => {
      // En Supabase esto será un UPDATE ... WHERE estado = 'buscando' (el primero gana).
      const p = d.pedidos.find((x) => x.id === pedidoId);
      if (!p || p.estado !== "buscando") return false;
      modPedido(pedidoId, (p) => (p.estado === "buscando" ? { ...p, estado: "aceptado", sociaId: d.sesion!.id } : p));
      return true;
    },
    cambiarEstado: (id, estado) => modPedido(id, (p) => ({ ...p, estado })),
    marcarPagado: (id, metodo) => modPedido(id, (p) => ({ ...p, pago: { metodo, estado: "marcado_pagado" } })),
    confirmarPago: (id) => modPedido(id, (p) => ({ ...p, pago: { ...p.pago, estado: "confirmado" } })),
    calificar: (id, quien, c) =>
      modPedido(id, (p) => (quien === "socia" ? { ...p, calificacionSocia: c } : { ...p, calificacionCliente: c })),
    setDisponible: (v) => mod((x) => ({ ...x, socias: x.socias.map((s) => (s.id === x.sesion?.id ? { ...s, disponible: v } : s)) })),
    setEstadoSocia: (id, estado) => mod((x) => ({ ...x, socias: x.socias.map((s) => (s.id === id ? { ...s, estado } : s)) })),
    setConfig: (config) => mod((x) => ({ ...x, config })),
    reiniciar: () => setD(SEMILLA),
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useDatos() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useDatos fuera de DatosProvider");
  return c;
}
