"use client";
// Capa de datos. Todas las pantallas usan solo el hook useDatos().
// - Con NEXT_PUBLIC_SUPABASE_URL/ANON_KEY: datos reales en Supabase (ver store-supabase.tsx).
// - Sin credenciales: modo demostración con datos guardados en el navegador.
import { useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Ctx, type Api, type Datos } from "./api";
import { CONFIG_INICIAL } from "./config";
import { MODO_DEMO } from "./supabase";
import { SupabaseProvider } from "./store-supabase";
import type { EstadoPedido, Pedido } from "./tipos";

const SEMILLA: Datos = {
  config: CONFIG_INICIAL,
  clientes: [{ id: "c1", nombre: "Lucía Paredes", telefono: "987654321" }],
  socias: [
    { id: "s1", nombre: "Rosa Quispe", telefono: "912345678", dni: "45678912", foto: "", distritos: ["Miraflores", "Surco", "Barranco"], servicios: ["limpieza"], estado: "aprobada", disponible: true, calificacion: 4.9, serviciosHechos: 132 },
    { id: "s2", nombre: "Carmen Huamán", telefono: "923456789", dni: "41234567", foto: "", distritos: ["San Isidro", "Lince"], servicios: ["limpieza"], estado: "pendiente", disponible: false, calificacion: 0, serviciosHechos: 0 },
  ],
  pedidos: [
    { id: "p1", clienteId: "c1", sociaId: "s1", servicio: "limpieza", ubicacion: { direccion: "Av. Larco 345, dpto 502", distrito: "Miraflores", lat: -12.1211, lng: -77.0297 }, fecha: "2026-09-20T09:00:00", horas: 4, conMateriales: false, tareas: ["Cocina", "Baños", "Pisos"], estado: "terminado", recargo: 0, total: 60, propina: 10, comisionPct: 15, pago: { metodo: "yape", estado: "confirmado" }, calificacionSocia: { estrellas: 5, comentario: "¡Impecable!" }, creadoEn: "2026-09-19T18:00:00" },
  ],
  sesion: null,
};

const CLAVE = "una-manito-demo-v4";
const nuevoId = (p: string) => p + Math.random().toString(36).slice(2, 8);
const SIGUIENTE: Partial<Record<EstadoPedido, EstadoPedido>> = { aceptado: "en_camino", en_camino: "en_curso", en_curso: "terminado" };

function DemoProvider({ children }: { children: ReactNode }) {
  const [d, setD] = useState<Datos>(SEMILLA);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CLAVE);
      // La sesión es por pestaña, para poder probar cliente y socia a la vez.
      const sesionPestana = sessionStorage.getItem(CLAVE + "-sesion");
      if (raw) {
        const guardado = JSON.parse(raw) as Datos;
        setD(sesionPestana ? { ...guardado, sesion: JSON.parse(sesionPestana) } : guardado);
      }
    } catch {}
    setListo(true);
  }, []);
  useEffect(() => {
    if (listo) try {
      localStorage.setItem(CLAVE, JSON.stringify(d));
      sessionStorage.setItem(CLAVE + "-sesion", JSON.stringify(d.sesion));
    } catch {}
  }, [d, listo]);
  // Si se abre la demo en dos pestañas (cliente y socia), los cambios se ven en ambas.
  useEffect(() => {
    const alCambiar = (e: StorageEvent) => {
      if (e.key !== CLAVE || !e.newValue) return;
      try { const otro = JSON.parse(e.newValue) as Datos; setD((x) => ({ ...otro, sesion: x.sesion })); } catch {}
    };
    window.addEventListener("storage", alCambiar);
    return () => window.removeEventListener("storage", alCambiar);
  }, []);

  const mod = useCallback((f: (d: Datos) => Datos) => setD((x) => f(x)), []);
  const modPedido = (id: string, f: (p: Pedido) => Pedido) =>
    mod((x) => ({ ...x, pedidos: x.pedidos.map((p) => (p.id === id ? f(p) : p)) }));

  const api: Api = {
    ...d,
    listo,
    demo: true,
    sinPerfil: false,
    entrar: (rol, id) => mod((x) => ({ ...x, sesion: { rol, id } })),
    enviarCodigo: async () => {},
    verificarCodigo: async () => {},
    salir: async () => mod((x) => ({ ...x, sesion: null })),
    registrarCliente: async (c) => {
      const id = nuevoId("c");
      mod((x) => ({ ...x, clientes: [...x.clientes, { ...c, id }], sesion: { rol: "cliente", id } }));
    },
    registrarSocia: async (s) => {
      const id = nuevoId("s");
      const foto = typeof s.foto === "string" ? s.foto : URL.createObjectURL(s.foto);
      mod((x) => ({ ...x, socias: [...x.socias, { ...s, foto, id, estado: "pendiente", disponible: false, calificacion: 0, serviciosHechos: 0 }], sesion: { rol: "socia", id } }));
    },
    crearPedido: async (p) => {
      const id = nuevoId("p");
      mod((x) => ({
        ...x,
        pedidos: [{ ...p, id, clienteId: x.sesion!.id, estado: "buscando", pago: { estado: "pendiente" }, propina: 0, comisionPct: x.config.comisionPct, creadoEn: new Date().toISOString() }, ...x.pedidos],
      }));
      return id;
    },
    aceptarPedido: async (pedidoId) => {
      const p = d.pedidos.find((x) => x.id === pedidoId);
      if (!p || p.estado !== "buscando") return false;
      modPedido(pedidoId, (p) => (p.estado === "buscando" ? { ...p, estado: "aceptado", sociaId: d.sesion!.id } : p));
      return true;
    },
    avanzarPedido: async (id) => modPedido(id, (p) => ({ ...p, estado: SIGUIENTE[p.estado] ?? p.estado })),
    cancelarPedido: async (id, motivo) => modPedido(id, (p) => ({ ...p, estado: "cancelado", motivoCancelacion: motivo })),
    marcarPagado: async (id, metodo, propina = 0) => modPedido(id, (p) => ({ ...p, propina, pago: { metodo, estado: "marcado_pagado" } })),
    confirmarPago: async (id) => modPedido(id, (p) => ({ ...p, pago: { ...p.pago, estado: "confirmado" } })),
    calificar: async (id, quien, c) =>
      modPedido(id, (p) => (quien === "socia" ? { ...p, calificacionSocia: c } : { ...p, calificacionCliente: c })),
    setDisponible: async (v) => mod((x) => ({ ...x, socias: x.socias.map((s) => (s.id === x.sesion?.id ? { ...s, disponible: v } : s)) })),
    setEstadoSocia: async (id, estado) => mod((x) => ({ ...x, socias: x.socias.map((s) => (s.id === id ? { ...s, estado } : s)) })),
    setConfig: async (config) => mod((x) => ({ ...x, config })),
    reiniciar: () => setD(SEMILLA),
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function DatosProvider({ children }: { children: ReactNode }) {
  return MODO_DEMO ? <DemoProvider>{children}</DemoProvider> : <SupabaseProvider>{children}</SupabaseProvider>;
}

export function useDatos() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useDatos fuera de DatosProvider");
  return c;
}
