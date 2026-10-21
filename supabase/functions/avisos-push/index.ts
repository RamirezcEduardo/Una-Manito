// Envía notificaciones push (Web Push) cuando se crea un pedido o cambia su estado.
// La llama la base de datos (trigger "avisar_push") con un secreto compartido.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const soles = (n: number) => `S/ ${n.toFixed(2)}`;
const horaLima = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("es-PE", { timeZone: "America/Lima", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "lo antes posible";

// ¿El pedido cae en el horario de la socia? Vacío = siempre.
function enHorario(h: Record<string, [number, number]> | null, fecha: string | null) {
  if (!h || Object.keys(h).length === 0) return true;
  const f = new Date(fecha ?? Date.now());
  const partes = new Intl.DateTimeFormat("en-US", { timeZone: "America/Lima", weekday: "short", hour: "numeric", minute: "numeric", hour12: false }).formatToParts(f);
  const dia = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(partes.find((p) => p.type === "weekday")!.value) + 1;
  const hora = Number(partes.find((p) => p.type === "hour")!.value) % 24 + Number(partes.find((p) => p.type === "minute")!.value) / 60;
  const r = h[String(dia)];
  return !!r && hora >= r[0] && hora < r[1];
}

async function enviar(usuarios: string[], aviso: { titulo: string; cuerpo: string; url: string }) {
  if (!usuarios.length) return 0;
  const { data: subs } = await sb.from("push_suscripciones").select("*").in("usuario_id", usuarios);
  let enviados = 0;
  await Promise.all((subs ?? []).map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(aviso), { TTL: 600, urgency: "high" });
      enviados++;
    } catch (e) {
      const codigo = (e as { statusCode?: number }).statusCode;
      if (codigo === 404 || codigo === 410) await sb.from("push_suscripciones").delete().eq("endpoint", s.endpoint); // suscripción vencida
    }
  }));
  return enviados;
}

Deno.serve(async (req) => {
  const { data: claves } = await sb.from("ajustes_privados").select("clave, valor");
  const k = Object.fromEntries((claves ?? []).map((c) => [c.clave, c.valor]));
  if (!k.push_secreto || req.headers.get("x-secreto") !== k.push_secreto) return new Response("No autorizado", { status: 401 });
  webpush.setVapidDetails("mailto:hola@unamanito.com", k.vapid_publica, k.vapid_privada);

  const { pedido_id, estado, socia_oferta } = await req.json();
  const { data: p } = await sb.from("pedidos").select("*").eq("id", pedido_id).single();
  if (!p) return new Response("Sin pedido", { status: 404 });

  const { data: servicio } = await sb.from("servicios").select("nombre, icono, cotizar").eq("id", p.servicio).single();
  const nombreServicio = servicio ? `${servicio.icono} ${servicio.nombre}` : "Servicio";
  const { data: socia } = p.socia_id ? await sb.from("perfiles").select("nombre").eq("id", p.socia_id).single() : { data: null };
  const nombreSocia = socia?.nombre?.split(" ")[0] ?? "Tu socia";
  let enviados = 0;

  if (estado === "buscando") {
    // Socias aprobadas y disponibles que cubren ese distrito y servicio, dentro de su horario.
    const { data: socias } = await sb.from("socias").select("id, distritos, servicios, horario")
      .eq("estado", "aprobada").eq("disponible", true).contains("distritos", [p.distrito]).contains("servicios", [p.servicio]);
    let ids = (socias ?? []).filter((s) => s.id !== p.cliente_id && enHorario(s.horario, p.fecha)).map((s) => s.id);
    // Pedido con promoción: solo las socias que participan.
    if (p.promo_id) {
      const { data: parts } = await sb.from("promo_socias").select("socia_id").eq("promo_id", p.promo_id);
      const dentro = new Set((parts ?? []).map((x) => x.socia_id));
      ids = ids.filter((id) => dentro.has(id));
    }
    // Si el cliente eligió a una socia, ella recibe el aviso primero.
    if (p.socia_preferida && ids.includes(p.socia_preferida)) ids = [p.socia_preferida];
    const gana = Number(p.total) - Math.round(Number(p.total) * Number(p.comision_pct)) / 100;
    enviados = await enviar(ids, {
      titulo: p.socia_preferida ? "💛 ¡Un cliente te eligió!" : "🔔 ¡Nuevo pedido cerca de ti!",
      cuerpo: servicio?.cotizar ? `${nombreServicio} · ${p.distrito} · ${horaLima(p.fecha)} · Piden cotización: manda tu precio` : `${nombreServicio} · ${p.distrito} · ${horaLima(p.fecha)} · Ganas ${soles(gana)}`,
      url: "/socia",
    });
  } else if (estado === "oferta" && p.estado === "buscando") {
    const { data: quien } = await sb.from("perfiles").select("nombre").eq("id", socia_oferta).single();
    enviados = await enviar([p.cliente_id], { titulo: "💌 ¡Tienes una nueva oferta!", cuerpo: `${quien?.nombre?.split(" ")[0] ?? "Una especialista"} te mandó su precio. Mira su perfil y sus trabajos.`, url: `/cliente/pedido/${p.id}` });
  } else if (estado === "aceptado" && servicio?.cotizar && p.socia_id) {
    enviados = await enviar([p.socia_id], { titulo: "🎉 ¡La clienta te eligió!", cuerpo: `${nombreServicio} · ${horaLima(p.fecha)} · ${soles(Number(p.total))}`, url: `/socia/pedido/${p.id}` });
  } else if (["aceptado", "en_camino", "en_curso", "terminado"].includes(estado)) {
    const textos: Record<string, [string, string]> = {
      aceptado: [`🎉 ¡${nombreSocia} aceptó tu pedido!`, `${nombreServicio} · ${horaLima(p.fecha)}`],
      en_camino: [`🛵 ${nombreSocia} va en camino`, "Mira en el mapa por dónde va"],
      en_curso: [`✨ ${nombreSocia} empezó el servicio`, "Puedes ver el avance en la app"],
      terminado: [`✅ ${nombreSocia} terminó`, "Paga y califica el servicio"],
    };
    enviados = await enviar([p.cliente_id], { titulo: textos[estado][0], cuerpo: textos[estado][1], url: `/cliente/pedido/${p.id}` });
  } else if (estado === "cancelado" && p.socia_id) {
    enviados = await enviar([p.socia_id], { titulo: "✖️ El cliente canceló el pedido", cuerpo: `${p.distrito} · ${horaLima(p.fecha)}`, url: `/socia/pedido/${p.id}` });
  }

  return new Response(JSON.stringify({ enviados }), { headers: { "Content-Type": "application/json" } });
});
