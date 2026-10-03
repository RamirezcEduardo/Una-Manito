"use client";
// Implementación real de la capa de datos sobre Supabase.
// La seguridad vive en la base (RLS + funciones RPC): aquí solo se leen datos y se llaman acciones.
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Ctx, type Api, type Datos } from "./api";
import { CONFIG_INICIAL } from "./config";
import { supabase as sbOpcional } from "./supabase";
import type { Calificacion, Pedido, ServicioId } from "./tipos";

const VACIO: Datos = { config: CONFIG_INICIAL, clientes: [], socias: [], pedidos: [], sesion: null, usuarios: [], invitaciones: [] };

/* eslint-disable @typescript-eslint/no-explicit-any */
function aPedido(r: any, cals: any[]): Pedido {
  const cal = (para: string): Calificacion | undefined => {
    const c = cals.find((x) => x.pedido_id === r.id && x.para === para);
    return c ? { estrellas: c.estrellas, comentario: c.comentario ?? undefined } : undefined;
  };
  return {
    id: r.id,
    clienteId: r.cliente_id,
    sociaId: r.socia_id ?? undefined,
    servicio: r.servicio,
    ubicacion: { direccion: r.direccion, distrito: r.distrito, referencia: r.referencia ?? undefined, lat: r.lat, lng: r.lng },
    fecha: r.fecha ?? "asap",
    horas: r.horas,
    conMateriales: r.con_materiales,
    notas: r.notas ?? undefined,
    tareas: r.tareas ?? [],
    estado: r.estado,
    recargo: Number(r.recargo ?? 0),
    total: Number(r.total),
    propina: Number(r.propina ?? 0),
    motivoCancelacion: r.motivo_cancelacion ?? undefined,
    comisionPct: Number(r.comision_pct),
    pago: { metodo: r.pago_metodo ?? undefined, estado: r.pago_estado },
    calificacionSocia: cal("socia"),
    calificacionCliente: cal("cliente"),
    creadoEn: r.creado_en,
  };
}

function falla(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const sb = sbOpcional!;
  const [d, setD] = useState<Datos>(VACIO);
  const [listo, setListo] = useState(false);
  const [sinPerfil, setSinPerfil] = useState(false);
  const uidRef = useRef<string | null>(null);

  const cargar = useCallback(async () => {
    const { data: { user } } = await sb.auth.getUser();
    uidRef.current = user?.id ?? null;

    const [srv, dis, cfg] = await Promise.all([
      sb.from("servicios").select("*").order("orden"),
      sb.from("distritos").select("*").order("nombre"),
      sb.from("config").select("*").eq("id", 1).maybeSingle(),
    ]);
    const config = {
      comisionPct: Number(cfg.data?.comision_pct ?? CONFIG_INICIAL.comisionPct),
      recargoUrgentePct: Number(cfg.data?.recargo_urgente_pct ?? CONFIG_INICIAL.recargoUrgentePct),
      recargoFindePct: Number(cfg.data?.recargo_finde_pct ?? CONFIG_INICIAL.recargoFindePct),
      distritos: (dis.data ?? []).map((x: any) => ({ nombre: x.nombre, habilitado: x.habilitado })),
      servicios: (srv.data ?? []).map((x: any) => ({
        id: x.id as ServicioId, nombre: x.nombre, icono: x.icono, eslogan: x.eslogan, activo: x.activo,
        precioHora: Number(x.precio_hora), horasMin: x.horas_min, recargoMateriales: Number(x.recargo_materiales), tareas: x.tareas ?? [],
      })),
    };

    if (!user) {
      setSinPerfil(false);
      setD({ ...VACIO, config });
      setListo(true);
      return;
    }

    const [perfiles, socias, privado, pedidos, cals, invitaciones] = await Promise.all([
      sb.from("perfiles").select("*"),
      sb.from("socias").select("*"),
      sb.from("socias_privado").select("*"),
      sb.from("pedidos").select("*").order("creado_en", { ascending: false }),
      sb.from("calificaciones").select("*"),
      sb.from("invitaciones").select("*").order("creado_en", { ascending: false }),
    ]);
    const ps = perfiles.data ?? [];
    const yo = ps.find((p: any) => p.id === user.id);
    setSinPerfil(!yo);

    setD({
      config,
      sesion: yo ? { rol: yo.rol, id: yo.id } : null,
      clientes: ps.map((p: any) => ({ id: p.id, nombre: p.nombre, telefono: p.telefono, email: p.email ?? undefined })),
      usuarios: ps.map((p: any) => ({ id: p.id, nombre: p.nombre, telefono: p.telefono, email: p.email ?? undefined, rol: p.rol, creadoEn: p.creado_en })),
      invitaciones: (invitaciones.data ?? []).map((i: any) => ({ email: i.email, nombre: i.nombre ?? undefined, rol: i.rol, creadoEn: i.creado_en })),
      socias: (socias.data ?? []).map((s: any) => {
        const p = ps.find((x: any) => x.id === s.id);
        return {
          id: s.id, nombre: p?.nombre ?? "Socia", telefono: p?.telefono ?? "",
          dni: (privado.data ?? []).find((x: any) => x.id === s.id)?.dni,
          foto: s.foto_url, distritos: s.distritos, servicios: s.servicios, estado: s.estado,
          disponible: s.disponible, calificacion: Number(s.calificacion), serviciosHechos: s.servicios_hechos,
        };
      }),
      pedidos: (pedidos.data ?? []).map((r: any) => aPedido(r, cals.data ?? [])),
    });
    setListo(true);
  }, [sb]);

  useEffect(() => {
    cargar().catch((e) => { console.error(e); setListo(true); });
    const { data: auth } = sb.auth.onAuthStateChange(() => { cargar().catch(console.error); });
    // Cambios en pedidos y socias llegan en tiempo real (filtrados por RLS).
    let t: ReturnType<typeof setTimeout> | undefined;
    const recargar = () => { clearTimeout(t); t = setTimeout(() => cargar().catch(console.error), 300); };
    const canal = sb.channel("cambios")
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, recargar)
      .on("postgres_changes", { event: "*", schema: "public", table: "socias" }, recargar)
      .subscribe();
    return () => { auth.subscription.unsubscribe(); sb.removeChannel(canal); clearTimeout(t); };
  }, [sb, cargar]);

  const rpc = async (fn: string, args: Record<string, unknown>) => {
    const { data, error } = await sb.rpc(fn, args);
    falla(error);
    await cargar();
    return data;
  };

  const api: Api = {
    ...d,
    listo,
    demo: false,
    sinPerfil,
    entrar: () => {},
    enviarCodigo: async (email) => {
      const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
      falla(error);
    },
    verificarCodigo: async (email, token) => {
      const { error } = await sb.auth.verifyOtp({ email, token, type: "email" });
      falla(error);
      await cargar();
    },
    salir: async () => { await sb.auth.signOut(); await cargar(); },
    registrarCliente: async (c) => { await rpc("registrar_perfil", { p_nombre: c.nombre, p_telefono: c.telefono }); },
    registrarSocia: async (s) => {
      let foto = typeof s.foto === "string" ? s.foto : "";
      if (typeof s.foto !== "string") {
        const ruta = `${uidRef.current}/foto-${Date.now()}.${s.foto.name.split(".").pop() || "jpg"}`;
        const { error } = await sb.storage.from("fotos").upload(ruta, s.foto, { upsert: true });
        falla(error);
        foto = sb.storage.from("fotos").getPublicUrl(ruta).data.publicUrl;
      }
      await rpc("registrar_perfil", {
        p_nombre: s.nombre, p_telefono: s.telefono,
        p_socia: { dni: s.dni, foto_url: foto, distritos: s.distritos, servicios: s.servicios },
      });
    },
    crearPedido: async (p) => {
      // total y comisión los recalcula la base; aquí solo se envían los datos del pedido.
      const { data, error } = await sb.from("pedidos").insert({
        servicio: p.servicio, direccion: p.ubicacion.direccion, distrito: p.ubicacion.distrito,
        referencia: p.ubicacion.referencia || null, lat: p.ubicacion.lat, lng: p.ubicacion.lng,
        fecha: p.fecha === "asap" ? null : new Date(p.fecha).toISOString(),
        horas: p.horas, con_materiales: p.conMateriales, notas: p.notas || null, tareas: p.tareas,
      }).select("id").single();
      falla(error);
      await cargar();
      return data!.id as string;
    },
    aceptarPedido: async (id) => Boolean(await rpc("aceptar_pedido", { p_pedido: id })),
    avanzarPedido: async (id) => { await rpc("avanzar_pedido", { p_pedido: id }); },
    cancelarPedido: async (id, motivo) => { await rpc("cancelar_pedido", { p_pedido: id, p_motivo: motivo ?? null }); },
    marcarPagado: async (id, metodo, propina = 0) => { await rpc("marcar_pagado", { p_pedido: id, p_metodo: metodo, p_propina: propina }); },
    confirmarPago: async (id) => { await rpc("confirmar_pago", { p_pedido: id }); },
    calificar: async (id, _quien, c) => { await rpc("calificar", { p_pedido: id, p_estrellas: c.estrellas, p_comentario: c.comentario || null }); },
    setDisponible: async (v) => { await rpc("set_disponible", { p_valor: v }); },
    setEstadoSocia: async (id, estado) => { await rpc("set_estado_socia", { p_socia: id, p_estado: estado }); },
    setConfig: async (c) => {
      const r = await Promise.all([
        sb.from("config").update({ comision_pct: c.comisionPct, recargo_urgente_pct: c.recargoUrgentePct, recargo_finde_pct: c.recargoFindePct }).eq("id", 1),
        ...c.servicios.map((s) => sb.from("servicios").update({ activo: s.activo, precio_hora: s.precioHora }).eq("id", s.id)),
        ...c.distritos.map((x) => sb.from("distritos").update({ habilitado: x.habilitado }).eq("nombre", x.nombre)),
      ]);
      r.forEach((x) => falla(x.error));
      await cargar();
    },
    setRolUsuario: async (id, rol) => { await rpc("set_rol_usuario", { p_usuario: id, p_rol: rol }); },
    invitarUsuario: async (email, nombre, rol) => { await rpc("invitar_usuario", { p_email: email, p_nombre: nombre, p_rol: rol }); },
    eliminarInvitacion: async (email) => { await rpc("eliminar_invitacion", { p_email: email }); },
    reiniciar: () => {},
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
