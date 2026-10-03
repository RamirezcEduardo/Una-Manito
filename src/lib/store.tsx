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

// ───── Datos de demostración: 30 días de pedidos para que el panel tenga qué mostrar ─────
const CLIENTES_DEMO = [
  { id: "c1", nombre: "Lucía Paredes", telefono: "987654321" },
  { id: "c2", nombre: "Jorge Salinas", telefono: "987111001" },
  { id: "c3", nombre: "María Fernández", telefono: "987111002" },
  { id: "c4", nombre: "Diego Ramos", telefono: "987111003" },
  { id: "c5", nombre: "Paola Chávez", telefono: "987111004" },
  { id: "c6", nombre: "Ricardo Vega", telefono: "987111005" },
];
const SOCIAS_DEMO: Datos["socias"] = [
  { id: "s1", nombre: "Rosa Quispe", telefono: "912345678", dni: "45678912", foto: "", distritos: ["Miraflores", "Surco", "Barranco"], servicios: ["limpieza"], estado: "aprobada", disponible: true, calificacion: 4.9, serviciosHechos: 132 },
  { id: "s2", nombre: "Carmen Huamán", telefono: "923456789", dni: "41234567", foto: "", distritos: ["San Isidro", "Lince"], servicios: ["limpieza"], estado: "pendiente", disponible: false, calificacion: 0, serviciosHechos: 0 },
  { id: "s3", nombre: "Elena Mamani", telefono: "934567890", dni: "42345678", foto: "", distritos: ["San Isidro", "San Borja", "Surco"], servicios: ["limpieza"], estado: "aprobada", disponible: false, calificacion: 4.7, serviciosHechos: 24 },
  { id: "s4", nombre: "Julia Torres", telefono: "945678901", dni: "43456789", foto: "", distritos: ["Jesús María", "Lince", "Pueblo Libre"], servicios: ["limpieza"], estado: "aprobada", disponible: false, calificacion: 4.5, serviciosHechos: 8 },
];
const ZONAS: [string, number, number, string[]][] = [
  ["Miraflores", -12.1211, -77.0297, ["s1"]], ["Surco", -12.135, -76.995, ["s1", "s3"]], ["San Isidro", -12.097, -77.036, ["s3"]],
  ["Barranco", -12.149, -77.021, ["s1"]], ["San Borja", -12.101, -76.999, ["s3"]], ["Jesús María", -12.077, -77.049, ["s4"]], ["Lince", -12.085, -77.035, ["s4"]],
];

function semillaPedidos(): Pedido[] {
  let n = 7;
  const azar = () => ((n = (n * 1103515245 + 12345) % 2147483648) / 2147483648);
  const elegir = <T,>(xs: T[]) => xs[Math.floor(azar() * xs.length)];
  const hoy = new Date(); hoy.setHours(12, 0, 0, 0);
  const lista: Pedido[] = [];
  for (let dia = 29; dia >= 0; dia--) {
    const cuantos = Math.floor(azar() * 3) + (dia % 7 === 0 || dia % 7 === 1 ? 2 : 0) + (dia < 10 ? 1 : 0);
    for (let k = 0; k < cuantos; k++) {
      const [distrito, lat, lng, sociasZona] = elegir(ZONAS);
      const horas = elegir([3, 3, 4, 4, 5, 6]);
      const conMateriales = azar() < 0.35;
      const urgente = azar() < 0.3;
      const base = 15 * horas + (conMateriales ? 10 : 0);
      const recargo = urgente ? Math.round(base * 10) / 100 : 0;
      const creado = new Date(hoy.getTime() - dia * 864e5 - Math.floor(azar() * 8) * 36e5);
      const cancelado = azar() < 0.1;
      lista.push({
        id: `d${dia}-${k}`, clienteId: elegir(CLIENTES_DEMO).id, sociaId: cancelado ? undefined : elegir(sociasZona), servicio: "limpieza",
        ubicacion: { direccion: `Calle ${elegir(["Las Begonias", "Los Pinos", "Schell", "Benavides", "Pardo", "Javier Prado"])} ${100 + Math.floor(azar() * 900)}`, distrito, lat, lng },
        fecha: urgente ? "asap" : creado.toISOString(), horas, conMateriales, tareas: ["Cocina", "Baños", "Pisos"],
        estado: cancelado ? "cancelado" : "terminado", recargo, total: base + recargo, propina: !cancelado && azar() < 0.35 ? elegir([5, 10, 20]) : 0,
        comisionPct: 15, pago: cancelado ? { estado: "pendiente" } : { metodo: elegir(["yape", "plin", "efectivo"] as const), estado: "confirmado" },
        motivoCancelacion: cancelado ? "Ya no lo necesito" : undefined,
        calificacionSocia: cancelado ? undefined : { estrellas: elegir([5, 5, 5, 4]) }, creadoEn: creado.toISOString(),
      });
    }
  }
  return lista.reverse();
}

const PEDIDOS_DEMO = semillaPedidos();
const CEO_DEMO = { id: "u-ceo", nombre: "Eduardo Ramírez", telefono: "999888777", email: "ceo@unamanito.pe", rol: "ceo" as const, creadoEn: "2026-09-01T10:00:00" };

const SEMILLA: Datos = {
  config: CONFIG_INICIAL,
  clientes: [...CLIENTES_DEMO, { id: CEO_DEMO.id, nombre: CEO_DEMO.nombre, telefono: CEO_DEMO.telefono }],
  socias: SOCIAS_DEMO,
  pedidos: PEDIDOS_DEMO,
  sesion: null,
  usuarios: [
    CEO_DEMO,
    { id: "u-admin", nombre: "Sofía Linares", telefono: "999777666", email: "sofia@unamanito.pe", rol: "admin", creadoEn: "2026-09-05T10:00:00" },
    ...CLIENTES_DEMO.map((c, i) => ({ ...c, email: `${c.nombre.split(" ")[0].toLowerCase()}@correo.pe`, rol: "cliente" as const, creadoEn: new Date(Date.now() - (40 - i * 5) * 864e5).toISOString() })),
    ...SOCIAS_DEMO.map((s, i) => ({ id: s.id, nombre: s.nombre, telefono: s.telefono, email: `${s.nombre.split(" ")[0].toLowerCase()}@correo.pe`, rol: "socia" as const, creadoEn: new Date(Date.now() - (35 - i * 6) * 864e5).toISOString() })),
  ],
  invitaciones: [{ email: "marketing@unamanito.pe", nombre: "Equipo de marketing", rol: "admin", creadoEn: new Date().toISOString() }],
};

const CLAVE = "una-manito-demo-v5";
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
    entrarConContrasena: async () => {},
    crearCuenta: async () => false,
    nombreGuardado: "",
    recuperarContrasena: async () => {},
    cambiarContrasena: async () => {},
    verificarCodigo: async () => {},
    salir: async () => mod((x) => ({ ...x, sesion: null })),
    registrarCliente: async (c) => {
      const id = nuevoId("c");
      mod((x) => ({ ...x, clientes: [...x.clientes, { ...c, id }], usuarios: [...x.usuarios, { ...c, id, rol: "cliente", creadoEn: new Date().toISOString() }], sesion: { rol: "cliente", id } }));
    },
    registrarSocia: async (s) => {
      const id = nuevoId("s");
      const foto = typeof s.foto === "string" ? s.foto : URL.createObjectURL(s.foto);
      mod((x) => ({
        ...x, socias: [...x.socias, { ...s, foto, id, estado: "pendiente", disponible: false, calificacion: 0, serviciosHechos: 0 }],
        usuarios: [...x.usuarios, { id, nombre: s.nombre, telefono: s.telefono, rol: "socia", creadoEn: new Date().toISOString() }], sesion: { rol: "socia", id },
      }));
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
    setRolUsuario: async (id, rol) => {
      if (d.sesion?.rol !== "ceo") throw new Error("Solo el CEO puede cambiar roles");
      if (id === d.sesion.id) throw new Error("No puedes cambiar tu propio rol");
      const u = d.usuarios.find((x) => x.id === id);
      if (u?.rol === "socia") throw new Error("Las socias se gestionan desde la sección Socias");
      if (u?.rol === "ceo" && rol !== "ceo" && d.usuarios.filter((x) => x.rol === "ceo").length <= 1) throw new Error("Debe quedar al menos un CEO");
      mod((x) => ({ ...x, usuarios: x.usuarios.map((u) => (u.id === id ? { ...u, rol } : u)) }));
    },
    invitarUsuario: async (email, nombre, rol) => {
      if (d.sesion?.rol !== "ceo") throw new Error("Solo el CEO puede invitar al equipo");
      const correo = email.trim().toLowerCase();
      if (!correo.includes("@")) throw new Error("Escribe un correo válido");
      if (d.usuarios.some((u) => u.email?.toLowerCase() === correo)) {
        mod((x) => ({ ...x, usuarios: x.usuarios.map((u) => (u.email?.toLowerCase() === correo ? { ...u, rol } : u)) }));
        return;
      }
      mod((x) => ({ ...x, invitaciones: [{ email: correo, nombre: nombre.trim() || undefined, rol, creadoEn: new Date().toISOString() }, ...x.invitaciones.filter((i) => i.email !== correo)] }));
    },
    eliminarInvitacion: async (email) => mod((x) => ({ ...x, invitaciones: x.invitaciones.filter((i) => i.email !== email) })),
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
