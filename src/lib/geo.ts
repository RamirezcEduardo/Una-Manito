// Búsqueda y geocodificación inversa con servicios gratuitos de OpenStreetMap.
// - Photon (komoot): búsqueda con sugerencias mientras se escribe (permite autocompletar).
// - Nominatim: dirección a partir de un punto del mapa (solo por acción del usuario, máx. 1/seg).

export interface Lugar {
  titulo: string;      // "Av. José Larco 345"
  detalle: string;     // "Miraflores, Lima"
  direccion: string;   // texto para el campo dirección
  distrito?: string;   // distrito tal como viene del mapa
  candidatos: string[]; // textos donde puede venir el distrito
  lat: number;
  lng: number;
}

// Caja de Lima Metropolitana y Callao (oeste, sur, este, norte).
const LIMA_BBOX = [-77.25, -12.55, -76.75, -11.75];
const LIMA_CENTRO = { lat: -12.0931, lng: -77.0465 };

const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

// Nombres que OpenStreetMap usa distinto a como los conoce la gente.
const ALIAS: Record<string, string> = {
  "santiago de surco": "Surco",
  "magdalena del mar": "Magdalena",
  "cercado de lima": "Lima",
  "lima cercado": "Lima",
  "rimac": "Rímac",
};

/**
 * Busca cuál distrito aparece en los textos de la dirección.
 * Primero coincidencias exactas (para no confundir "San Juan de Miraflores" con "Miraflores"),
 * luego textos que contienen el nombre, probando primero los nombres más largos.
 */
export function emparejarDistrito(candidatos: (string | undefined)[], distritos: string[]): string | undefined {
  const textos = candidatos.filter(Boolean).map((c) => normalizar(c!).replace(/^(distrito de|distrito|provincia de)\s+/, ""));
  const claves = distritos.map((d) => [normalizar(d), d] as const);
  const porClave = new Map(claves);
  for (const t of textos) {
    const alias = ALIAS[t];
    if (alias && distritos.includes(alias)) return alias;
    if (t !== "lima" && porClave.has(t)) return porClave.get(t);
  }
  const largos = [...claves].sort((x, y) => y[0].length - x[0].length);
  for (const t of textos) {
    for (const [k, d] of largos) {
      if (k === "lima") continue; // "Lima" aparece en casi todas las direcciones
      if (new RegExp(`(^|\\W)${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\W|$)`).test(t)) return d;
    }
  }
  // "Lima" (Cercado) solo si no apareció ningún otro distrito.
  if (textos.includes("lima") && porClave.has("lima")) return porClave.get("lima");
  return undefined;
}

const unir = (...p: (string | undefined)[]) => p.filter(Boolean).join(" ");

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function buscarLugares(texto: string, cerca = LIMA_CENTRO, senal?: AbortSignal): Promise<Lugar[]> {
  const q = texto.trim();
  if (q.length < 3) return [];
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "6");
  url.searchParams.set("lat", String(cerca.lat));
  url.searchParams.set("lon", String(cerca.lng));
  url.searchParams.set("bbox", LIMA_BBOX.join(","));
  const r = await fetch(url, { signal: senal });
  if (!r.ok) throw new Error("No pudimos buscar la dirección");
  const json = await r.json();
  return (json.features ?? []).map((f: any): Lugar => {
    const p = f.properties ?? {};
    const calle = unir(p.street, p.housenumber);
    const titulo = p.name && p.name !== p.street ? (calle ? `${p.name}, ${calle}` : p.name) : calle || p.name || "Ubicación";
    const distrito = p.district || p.locality || p.city;
    const candidatos = [p.district, p.locality, p.city, p.county, p.name].filter(Boolean);
    return {
      candidatos,
      titulo,
      detalle: [distrito, p.city !== distrito ? p.city : undefined].filter(Boolean).join(", "),
      direccion: calle || p.name || "",
      distrito,
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
    };
  });
}

export async function direccionDePunto(lat: number, lng: number, senal?: AbortSignal): Promise<Lugar> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", "18");
  url.searchParams.set("accept-language", "es");
  const r = await fetch(url, { signal: senal });
  if (!r.ok) throw new Error("No pudimos obtener la dirección");
  const j = await r.json();
  const a = j.address ?? {};
  const calle = unir(a.road || a.pedestrian || a.footway, a.house_number);
  // En Lima el distrito suele venir como city_district, suburb, city o town.
  // Además se revisan todas las partes del nombre completo ("…, Miraflores, Lima, Perú").
  const partes = String(j.display_name ?? "").split(",").map((x: string) => x.trim());
  const candidatos = [a.city_district, a.suburb, a.town, a.municipality, a.city, a.county, a.quarter, a.neighbourhood, ...partes].filter(Boolean);
  return {
    titulo: calle || j.name || "Ubicación seleccionada",
    detalle: candidatos[0] ?? "",
    direccion: calle || j.name || "",
    distrito: candidatos[0],
    candidatos,
    lat,
    lng,
  };
}
