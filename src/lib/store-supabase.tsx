"use client";
// Implementación real de la capa de datos sobre Supabase.
// La seguridad vive en la base (RLS + funciones RPC): aquí solo se leen datos y se llaman acciones.
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Ctx, type Api, type Datos } from "./api";
import { CONFIG_INICIAL } from "./config";
import { supabase as sbOpcional } from "./supabase";
import type { Calificacion, Pedido, ServicioId } from "./tipos";

const VACIO: Datos = { config: CONFIG_INICIAL, clientes: [], socias: [], pedidos: [], sesion: null, usuarios: [], invitaciones: [], reclamaciones: [] };

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
    descuento: Number(r.descuento ?? 0),
    cargoServicio: Number(r.cargo_servicio ?? 0),
    frecuencia: r.frecuencia ?? "unica",
    planOrigen: r.plan_origen ?? undefined,
    liquidado: !!r.liquidado,
    motivoCancelacion: r.motivo_cancelacion ?? undefined,
    comisionPct: Number(r.comision_pct),
    pago: { metodo: r.pago_metodo ?? undefined, estado: r.pago_estado },
    calificacionSocia: cal("socia"),
    calificacionCliente: cal("cliente"),
    creadoEn: r.creado_en,
  };
}

const aPersonal = (p: { tipoDocumento: string; documento: string; fechaNacimiento: string }) =>
  ({ tipo_documento: p.tipoDocumento, documento: p.documento.trim().toUpperCase(), fecha_nacimiento: p.fechaNacimiento });

function falla(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const sb = sbOpcional!;
  const [d, setD] = useState<Datos>(VACIO);
  const [listo, setListo] = useState(false);
  const [sinPerfil, setSinPerfil] = useState(false);
  const uidRef = useRef<string | null>(null);
  const [nombreGuardado, setNombreGuardado] = useState("");
  const [rolGuardado, setRolGuardado] = useState<"cliente" | "socia" | null>(null);

  const cargar = useCallback(async () => {
    const { data: { user }, error: errorUsuario } = await sb.auth.getUser();
    // Sesión guardada que ya no es válida (usuario borrado o token vencido): se limpia para no quedar a medias.
    if (errorUsuario && errorUsuario.status && errorUsuario.status >= 400 && errorUsuario.status < 500 && errorUsuario.name !== "AuthSessionMissingError") {
      await sb.auth.signOut({ scope: "local" });
    }
    uidRef.current = user?.id ?? null;
    setNombreGuardado((user?.user_metadata?.nombre as string | undefined) ?? "");
    const r = user?.user_metadata?.rol;
    setRolGuardado(r === "socia" || r === "cliente" ? r : null);

    const [srv, dis, cfg] = await Promise.all([
      sb.from("servicios").select("*").order("orden"),
      sb.from("distritos").select("*").order("nombre"),
      sb.from("config").select("*").eq("id", 1).maybeSingle(),
    ]);
    const config = {
      comisionPct: Number(cfg.data?.comision_pct ?? CONFIG_INICIAL.comisionPct),
      recargoUrgentePct: Number(cfg.data?.recargo_urgente_pct ?? CONFIG_INICIAL.recargoUrgentePct),
      recargoFindePct: Number(cfg.data?.recargo_finde_pct ?? CONFIG_INICIAL.recargoFindePct),
      cargoServicio: Number(cfg.data?.cargo_servicio ?? CONFIG_INICIAL.cargoServicio),
      descuentoPlanPct: Number(cfg.data?.descuento_plan_pct ?? CONFIG_INICIAL.descuentoPlanPct),
      whatsappSoporte: (cfg.data?.whatsapp_soporte as string | null) ?? "",
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

    const [perfiles, socias, privado, pedidos, cals, invitaciones, personales, reclamos] = await Promise.all([
      sb.from("perfiles").select("*"),
      sb.from("socias").select("*"),
      sb.from("socias_privado").select("*"),
      sb.from("pedidos").select("*").order("creado_en", { ascending: false }),
      sb.from("calificaciones").select("*"),
      sb.from("invitaciones").select("*").order("creado_en", { ascending: false }),
      sb.from("perfiles_privado").select("*"),
      sb.from("reclamaciones").select("*").order("numero", { ascending: false }),
    ]);
    const personal = (id: string) => {
      const p = (personales.data ?? []).find((x: any) => x.id === id);
      return p ? { tipoDocumento: p.tipo_documento, documento: p.documento, fechaNacimiento: p.fecha_nacimiento } : undefined;
    };
    const ps = perfiles.data ?? [];
    const yo = ps.find((p: any) => p.id === user.id);
    setSinPerfil(!yo);

    setD({
      config,
      sesion: yo ? { rol: yo.rol, id: yo.id } : null,
      clientes: ps.map((p: any) => ({ id: p.id, nombre: p.nombre, telefono: p.telefono, email: p.email ?? undefined, foto: p.foto_url ?? undefined })),
      usuarios: ps.map((p: any) => ({ id: p.id, nombre: p.nombre, telefono: p.telefono, email: p.email ?? undefined, rol: p.rol, creadoEn: p.creado_en, personal: personal(p.id), foto: p.foto_url ?? undefined })),
      invitaciones: (invitaciones.data ?? []).map((i: any) => ({ email: i.email, nombre: i.nombre ?? undefined, rol: i.rol, creadoEn: i.creado_en })),
      socias: (socias.data ?? []).map((s: any) => {
        const p = ps.find((x: any) => x.id === s.id);
        return {
          id: s.id, nombre: p?.nombre ?? "Socia", telefono: p?.telefono ?? "",
          dni: (privado.data ?? []).find((x: any) => x.id === s.id)?.dni ?? undefined,
          personal: personal(s.id),
          verificacion: ((v: any) => v && {
            direccion: v.direccion ?? "", distritoResidencia: v.distrito_residencia ?? "", emergenciaNombre: v.emergencia_nombre ?? "",
            emergenciaParentesco: v.emergencia_parentesco ?? "", emergenciaTelefono: v.emergencia_telefono ?? "", cobroNumero: v.cobro_numero ?? "",
            experiencia: v.experiencia ?? "", dniFrente: v.dni_frente ?? undefined, dniReverso: v.dni_reverso ?? undefined, declaraSinAntecedentes: !!v.declara_sin_antecedentes,
          })((privado.data ?? []).find((x: any) => x.id === s.id)),
          foto: s.foto_url, distritos: s.distritos, servicios: s.servicios, estado: s.estado,
          disponible: s.disponible, calificacion: Number(s.calificacion), serviciosHechos: s.servicios_hechos, horario: s.horario ?? {},
        };
      }),
      pedidos: (pedidos.data ?? []).map((r: any) => aPedido(r, cals.data ?? [])),
      reclamaciones: (reclamos.data ?? []).map((r: any) => ({
        id: r.id, numero: Number(r.numero), creadoEn: r.creado_en, tipo: r.tipo, nombre: r.nombre, tipoDocumento: r.tipo_documento, documento: r.documento,
        email: r.email, telefono: r.telefono ?? undefined, direccion: r.direccion ?? undefined, menorDeEdad: !!r.menor_de_edad, apoderado: r.apoderado ?? undefined,
        bien: r.bien, monto: r.monto == null ? undefined : Number(r.monto), descripcionBien: r.descripcion_bien, detalle: r.detalle,
        pedidoConsumidor: r.pedido_consumidor, respuesta: r.respuesta ?? undefined, respondidoEn: r.respondido_en ?? undefined,
      })),
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
    nombreGuardado,
    rolGuardado,
    entrar: () => {},
    enviarCodigo: async (email) => {
      // Si el correo trae enlace en vez de código, el enlace vuelve a /entrar y la sesión se abre sola.
      const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/entrar` } });
      falla(error);
    },
    verificarCodigo: async (email, token) => {
      const { error } = await sb.auth.verifyOtp({ email, token, type: "email" });
      falla(error);
      await cargar();
    },
    entrarConContrasena: async (email, contrasena) => {
      const { error } = await sb.auth.signInWithPassword({ email, password: contrasena });
      falla(error);
      await cargar();
    },
    crearCuenta: async (email, contrasena, nombre, rol) => {
      // El enlace de confirmación vuelve con el tipo de cuenta, para llevarla al registro correcto.
      const { data, error } = await sb.auth.signUp({ email, password: contrasena, options: { emailRedirectTo: `${window.location.origin}/entrar?rol=${rol}`, data: { nombre, rol } } });
      falla(error);
      // Supabase responde sin error a un correo ya registrado, pero sin identidades.
      if (data.user && data.user.identities?.length === 0) throw new Error("Ese correo ya tiene cuenta. Entra con tu contraseña o usa “¿Olvidaste tu contraseña?”.");
      await cargar();
      return !data.session; // sin sesión = falta confirmar el correo
    },
    recuperarContrasena: async (email) => {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/entrar/nueva-contrasena` });
      falla(error);
    },
    cambiarContrasena: async (contrasena) => {
      const { error } = await sb.auth.updateUser({ password: contrasena });
      falla(error);
    },
    salir: async () => { await sb.auth.signOut(); await cargar(); },
    registrarCliente: async (c) => { await rpc("registrar_perfil", { p_nombre: c.nombre, p_telefono: c.telefono, p_personal: aPersonal(c.personal) }); },
    verDocumento: async (ruta) => {
      const { data, error } = await sb.storage.from("documentos").createSignedUrl(ruta, 300);
      falla(error);
      return data!.signedUrl;
    },
    registrarSocia: async (s) => {
      let foto = typeof s.foto === "string" ? s.foto : "";
      if (typeof s.foto !== "string") {
        const ruta = `${uidRef.current}/foto-${Date.now()}.${s.foto.name.split(".").pop() || "jpg"}`;
        const { error } = await sb.storage.from("fotos").upload(ruta, s.foto, { upsert: true });
        falla(error);
        foto = sb.storage.from("fotos").getPublicUrl(ruta).data.publicUrl;
      }
      // Fotos del DNI en el bucket privado (solo la socia y el equipo pueden verlas).
      const subirPrivado = async (archivo: File, nombre: string) => {
        const ruta = `${uidRef.current}/${nombre}-${Date.now()}.${archivo.name.split(".").pop() || "jpg"}`;
        const { error } = await sb.storage.from("documentos").upload(ruta, archivo, { upsert: true });
        falla(error);
        return ruta;
      };
      const [dniFrente, dniReverso] = await Promise.all([subirPrivado(s.dniFrente, "dni-frente"), subirPrivado(s.dniReverso, "dni-reverso")]);
      const v = s.verificacion;
      await rpc("registrar_perfil", {
        p_nombre: s.nombre, p_telefono: s.telefono, p_personal: aPersonal(s.personal),
        p_socia: {
          foto_url: foto, distritos: s.distritos, servicios: s.servicios, direccion: v.direccion, distrito_residencia: v.distritoResidencia,
          emergencia_nombre: v.emergenciaNombre, emergencia_parentesco: v.emergenciaParentesco, emergencia_telefono: v.emergenciaTelefono,
          cobro_numero: v.cobroNumero, experiencia: v.experiencia, dni_frente: dniFrente, dni_reverso: dniReverso, declara_sin_antecedentes: v.declaraSinAntecedentes,
        },
      });
    },
    crearPedido: async (p) => {
      // total y comisión los recalcula la base; aquí solo se envían los datos del pedido.
      const { data, error } = await sb.from("pedidos").insert({
        servicio: p.servicio, direccion: p.ubicacion.direccion, distrito: p.ubicacion.distrito,
        referencia: p.ubicacion.referencia || null, lat: p.ubicacion.lat, lng: p.ubicacion.lng,
        fecha: p.fecha === "asap" ? null : new Date(p.fecha).toISOString(),
        horas: p.horas, con_materiales: p.conMateriales, notas: p.notas || null, tareas: p.tareas, frecuencia: p.frecuencia,
      }).select("id").single();
      falla(error);
      await cargar();
      return data!.id as string;
    },
    aceptarPedido: async (id) => Boolean(await rpc("aceptar_pedido", { p_pedido: id })),
    // Se envía el estado que ve la socia: si llega un toque repetido, la base no avanza dos pasos.
    avanzarPedido: async (id) => { await rpc("avanzar_pedido", { p_pedido: id, p_desde: d.pedidos.find((p) => p.id === id)?.estado ?? "aceptado" }); },
    cancelarPedido: async (id, motivo) => { await rpc("cancelar_pedido", { p_pedido: id, p_motivo: motivo ?? null }); },
    marcarPagado: async (id, metodo, propina = 0) => { await rpc("marcar_pagado", { p_pedido: id, p_metodo: metodo, p_propina: propina }); },
    confirmarPago: async (id) => { await rpc("confirmar_pago", { p_pedido: id }); },
    calificar: async (id, _quien, c) => { await rpc("calificar", { p_pedido: id, p_estrellas: c.estrellas, p_comentario: c.comentario || null }); },
    setDisponible: async (v) => { await rpc("set_disponible", { p_valor: v }); },
    setEstadoSocia: async (id, estado) => { await rpc("set_estado_socia", { p_socia: id, p_estado: estado }); },
    setConfig: async (c) => {
      const r = await Promise.all([
        sb.from("config").update({
          comision_pct: c.comisionPct, recargo_urgente_pct: c.recargoUrgentePct, recargo_finde_pct: c.recargoFindePct,
          cargo_servicio: c.cargoServicio, descuento_plan_pct: c.descuentoPlanPct, whatsapp_soporte: c.whatsappSoporte || null,
        }).eq("id", 1),
        ...c.servicios.map((s) => sb.from("servicios").update({ activo: s.activo, precio_hora: s.precioHora }).eq("id", s.id)),
        ...c.distritos.map((x) => sb.from("distritos").update({ habilitado: x.habilitado }).eq("nombre", x.nombre)),
      ]);
      r.forEach((x) => falla(x.error));
      await cargar();
    },
    setRolUsuario: async (id, rol) => { await rpc("set_rol_usuario", { p_usuario: id, p_rol: rol }); },
    invitarUsuario: async (email, nombre, rol) => { await rpc("invitar_usuario", { p_email: email, p_nombre: nombre, p_rol: rol }); },
    eliminarInvitacion: async (email) => { await rpc("eliminar_invitacion", { p_email: email }); },
    detenerPlan: async (id) => { await rpc("detener_plan", { p_pedido: id }); },
    setHorario: async (h) => { await rpc("set_horario", { p_horario: h }); },
    marcarLiquidado: async (ids) => { await rpc("marcar_liquidado", { p_pedidos: ids }); },
    registrarReclamo: async (r) => {
      const { data, error } = await sb.rpc("registrar_reclamo", { p: {
        tipo: r.tipo, nombre: r.nombre, tipo_documento: r.tipoDocumento, documento: r.documento, email: r.email, telefono: r.telefono ?? "",
        direccion: r.direccion ?? "", menor_de_edad: r.menorDeEdad, apoderado: r.apoderado ?? "", bien: r.bien, monto: r.monto ?? "",
        descripcion_bien: r.descripcionBien, detalle: r.detalle, pedido_consumidor: r.pedidoConsumidor,
      } });
      falla(error);
      if (uidRef.current) await cargar();
      return Number(data);
    },
    responderReclamo: async (id, respuesta) => { await rpc("responder_reclamo", { p_id: id, p_respuesta: respuesta }); },
    cambiarFoto: async (archivo) => {
      if (!archivo.type.startsWith("image/")) throw new Error("Elige una imagen");
      if (archivo.size > 5 * 1024 * 1024) throw new Error("La foto debe pesar menos de 5 MB");
      const ruta = `${uidRef.current}/perfil-${Date.now()}.${archivo.name.split(".").pop() || "jpg"}`;
      const { error } = await sb.storage.from("fotos").upload(ruta, archivo);
      falla(error);
      await rpc("set_mi_foto", { p_url: sb.storage.from("fotos").getPublicUrl(ruta).data.publicUrl });
    },
    reiniciar: () => {},
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
