"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ESLOGAN_SOCIA } from "@/lib/config";
import { useDatos } from "@/lib/store";

// Tarjetas que se turnan sobre el video: cuentan cómo funciona la app.
const ESTADOS = [
  { icono: "🧹", fondo: "#e6f0fe", titulo: "Limpieza · Rosa aceptó tu pedido", detalle: "🌟 Socia Estrella · 4.9⭐" },
  { icono: "🔧", fondo: "#fff4e0", titulo: "Gasfitería · Carlos va en camino", detalle: "Llega en 15 min · Muy pronto en la app" },
  { icono: "💡", fondo: "#e6f0fe", titulo: "Electricidad · Luis terminó", detalle: "⭐⭐⭐⭐⭐ “¡Rápido y amable!”" },
  { icono: "💚", fondo: "#dcfce7", titulo: "Trabajo digno para tu oficio", detalle: "Tú eliges tu horario y tus distritos" },
];

const IconoEscudo = () => (
  <svg viewBox="0 0 24 24" className="mx-auto h-7 w-7" fill="none" stroke="#0b6ef0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></svg>
);
const IconoBillete = () => (
  <svg viewBox="0 0 24 24" className="mx-auto h-7 w-7" fill="none" stroke="#f6a01a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="12" rx="3" /><circle cx="12" cy="12" r="2.5" /></svg>
);
const IconoReloj = () => (
  <svg viewBox="0 0 24 24" className="mx-auto h-7 w-7" fill="none" stroke="#0b6ef0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);

export default function Inicio() {
  const { clientes, socias, entrar, demo, config } = useDatos();
  const activos = config.servicios.filter((s) => s.activo);
  const precioDesde = Math.min(...(activos.length ? activos : config.servicios).map((s) => s.precioHora));
  const router = useRouter();
  // En modo demo se entra con usuarios de prueba; con Supabase se inicia sesión con código por correo.
  const ir = (rol: "cliente" | "socia" | "admin", id: string | undefined, ruta: string) => {
    if (!demo) return router.push(rol === "socia" ? "/entrar?rol=socia" : "/entrar");
    if (id) entrar(rol, id);
    router.push(ruta);
  };

  const beneficios = [
    { icono: <IconoEscudo />, texto: "Socias verificadas" },
    { icono: <IconoBillete />, texto: "Pagas al terminar" },
    { icono: <IconoReloj />, texto: `Desde S/ ${precioDesde} la hora` },
  ];

  return (
    <main className="min-h-dvh">
      {/* ───── Portada: video de oficios + mensaje ───── */}
      <section className="lg:grid lg:min-h-dvh lg:grid-cols-[1fr_1.1fr]">
        <div className="relative h-[360px] overflow-hidden rounded-b-[40px] bg-marca lg:order-2 lg:h-auto lg:rounded-b-none lg:rounded-bl-[80px]">
          <video className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline preload="auto" poster="/video/oficios-poster.jpg" aria-hidden>
            <source src="/video/oficios.webm" type="video/webm" />
            <source src="/video/oficios.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-[#0b1f44]/30 via-transparent to-[#0a4fc8]/85" />
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-2xl bg-[#0b1f44]/40 py-1.5 pl-1.5 pr-3 text-lg font-black text-white backdrop-blur lg:left-8 lg:top-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icono.svg" alt="" className="h-9 w-9 rounded-[10px]" />
            una manito
          </div>
          <div className="absolute inset-x-4 bottom-5 h-[68px] lg:inset-x-auto lg:bottom-12 lg:right-10 lg:w-[400px]">
            {ESTADOS.map((e, i) => (
              <div key={e.titulo} className="estado-ciclo absolute inset-0 flex items-center gap-3 rounded-2xl bg-white px-4 shadow-xl" style={{ animationDelay: `${i * 2}s` }}>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl" style={{ background: e.fondo }}>{e.icono}</span>
                <span className="min-w-0">
                  <b className="block truncate text-[15px]">{e.titulo}</b>
                  <span className="block truncate text-sm text-suave">{e.detalle}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto w-full max-w-md px-5 pb-6 pt-7 lg:order-1 lg:flex lg:max-w-xl lg:flex-col lg:justify-center lg:px-16">
          <h1 className="entrar text-[2.4rem] font-black leading-[1.05] tracking-tight lg:text-6xl">
            Todos los oficios,<br /><span className="text-marca">a una manito.</span>
          </h1>
          <p className="entrar mt-3 text-lg text-suave lg:text-xl" style={{ animationDelay: ".15s" }}>
            Socias y socios verificados en tu distrito. Pide en 1 minuto y paga al terminar.
          </p>
          <div className="entrar mt-6 space-y-3" style={{ animationDelay: ".3s" }}>
            <Link href={demo ? "/cliente/registro" : "/entrar?rol=cliente"} className="btn-primario block text-center">Pedir un servicio</Link>
            <button className="btn-borde" onClick={() => ir("cliente", clientes[0]?.id, "/cliente")}>Ya tengo cuenta</button>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            {beneficios.map((b, i) => (
              <div key={b.texto} className="beneficio rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5"
                style={{ animationDelay: `${0.5 + i * 0.15}s, ${1.5 + i * 2}s` }}>
                {b.icono}
                <p className="mt-1 text-sm font-bold leading-tight">{b.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Cómo funciona y trabajar con nosotros ───── */}
      <section className="mx-auto grid max-w-md gap-6 px-5 pb-10 lg:max-w-5xl lg:grid-cols-2 lg:py-16">
        <div className="tarjeta space-y-3">
          <h2 className="text-lg font-bold">¿Cómo funciona?</h2>
          {[
            ["1", "Pide en 1 minuto", "Elige el servicio, marca tu casa en el mapa y la hora."],
            ["2", "Una socia acepta", "Ves su nombre, foto y calificación, y la sigues en tiempo real."],
            ["3", "Paga al terminar", "Por Yape, Plin o efectivo. Y califica el servicio."],
          ].map(([n, titulo, texto]) => (
            <div key={n} className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-marca font-extrabold text-white">{n}</span>
              <div><p className="font-bold">{titulo}</p><p className="text-sm text-suave">{texto}</p></div>
            </div>
          ))}
        </div>

        <div className="space-y-3 rounded-3xl bg-acento-claro p-5">
          <h2 className="text-lg font-bold">¿Trabajas en un oficio?</h2>
          <p className="text-suave">{ESLOGAN_SOCIA}</p>
          <ul className="space-y-1 text-sm font-semibold">
            <li>🕒 Tú eliges tus horarios y distritos</li>
            <li>💰 Ganas más los fines de semana y en pedidos urgentes</li>
            <li>💚 Las propinas son 100% tuyas</li>
            <li>🌟 Sube de nivel y destaca ante los clientes</li>
          </ul>
          <Link href={demo ? "/socia/registro" : "/entrar?rol=socia"} className="btn-acento block text-center">Quiero trabajar con Una Manito</Link>
          <button className="btn w-full bg-white text-tinta" onClick={() => ir("socia", socias[0]?.id, "/socia")}>Ya trabajo aquí, entrar</button>
        </div>
      </section>

      <footer className="pb-8 text-center text-sm text-suave">
        <Link href="/terminos" className="underline">Términos</Link> · <Link href="/privacidad" className="underline">Privacidad</Link>
        {demo && <><br /><button className="mt-3 underline" onClick={() => ir("admin", "admin", "/admin")}>Entrar como administrador (demo)</button></>}
      </footer>
    </main>
  );
}
