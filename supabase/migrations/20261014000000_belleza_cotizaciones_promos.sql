-- Rubro Belleza: la clienta pide cotización (uñas, pestañas, cejas en un solo pedido), las socias ofertan
-- con su precio y adicionales, la clienta elige. Atención a domicilio o en el local de la socia.
-- Promociones de Una Manito: solo las ven las socias que aceptaron participar.

-- ───────────── Servicios: rubro y modo cotización ─────────────
alter table public.servicios
  add column if not exists rubro text not null default 'hogar' check (rubro in ('hogar', 'belleza')),
  add column if not exists cotizar boolean not null default false;

insert into public.servicios (id, nombre, icono, eslogan, activo, precio_hora, horas_min, recargo_materiales, orden, rubro, cotizar, tareas) values
  ('belleza', 'Belleza', '💅', 'Te damos una manito para verte linda, al toque.', true, 0, 1, 0, 10, 'belleza', true, array[
    'Uñas · Manicure clásica', 'Uñas · Manicure gel', 'Uñas · Uñas acrílicas', 'Uñas · Polygel', 'Uñas · Pedicure clásica', 'Uñas · Pedicure spa', 'Uñas · Retiro de gel o acrílico',
    'Pestañas · Extensiones pelo a pelo', 'Pestañas · Extensiones volumen', 'Pestañas · Lifting de pestañas', 'Pestañas · Retoque de extensiones',
    'Cejas · Perfilado', 'Cejas · Laminado', 'Cejas · Henna'])
on conflict (id) do update set rubro = excluded.rubro, cotizar = excluded.cotizar, tareas = excluded.tareas;

-- ───────────── Socias: local, portafolio ─────────────
alter table public.socias
  add column if not exists local_direccion text check (local_direccion is null or length(local_direccion) <= 200),
  add column if not exists local_distrito text,
  add column if not exists portafolio text[] not null default '{}';

-- ───────────── Promociones ─────────────
create table if not exists public.promociones (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (length(titulo) between 3 and 80),
  descripcion text check (length(descripcion) <= 300),
  descuento_pct numeric(5,2) not null check (descuento_pct between 1 and 70),
  activa boolean not null default true,
  creado_en timestamptz not null default now()
);
alter table public.promociones enable row level security;
drop policy if exists "ver promociones" on public.promociones;
create policy "ver promociones" on public.promociones for select using (activa or public.es_admin());
drop policy if exists "equipo gestiona promociones" on public.promociones;
create policy "equipo gestiona promociones" on public.promociones for all to authenticated using (public.es_admin()) with check (public.es_admin());

create table if not exists public.promo_socias (
  promo_id uuid references public.promociones(id) on delete cascade,
  socia_id uuid references public.socias(id) on delete cascade,
  primary key (promo_id, socia_id)
);
alter table public.promo_socias enable row level security;
drop policy if exists "ver participacion" on public.promo_socias;
create policy "ver participacion" on public.promo_socias for select using (socia_id = auth.uid() or public.es_admin());

-- ───────────── Pedidos ─────────────
alter table public.pedidos
  add column if not exists modalidad text not null default 'domicilio' check (modalidad in ('domicilio', 'local')),
  add column if not exists promo_id uuid references public.promociones(id) on delete set null,
  add column if not exists oferta_id uuid;

-- ───────────── Ofertas ─────────────
create table if not exists public.ofertas (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  socia_id uuid not null references public.socias(id) on delete cascade,
  precio numeric(10,2) not null check (precio > 0 and precio <= 5000),
  detalle jsonb not null default '[]',
  mensaje text check (length(mensaje) <= 300),
  creado_en timestamptz not null default now(),
  unique (pedido_id, socia_id)
);
alter table public.ofertas enable row level security;
drop policy if exists "ver ofertas" on public.ofertas;
create policy "ver ofertas" on public.ofertas for select using (
  socia_id = auth.uid() or public.es_admin()
  or exists (select 1 from pedidos p where p.id = pedido_id and p.cliente_id = auth.uid()));
alter publication supabase_realtime add table public.ofertas;

-- ───────────── Quién ve un pedido en búsqueda: además, si tiene promoción, solo las socias que participan ─────────────
create or replace function public.socia_participa(p_promo uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_promo is null or exists (select 1 from promo_socias where promo_id = p_promo and socia_id = auth.uid());
$$;
alter policy "ver pedidos" on public.pedidos using (
  cliente_id = auth.uid() or socia_id = auth.uid() or public.es_admin()
  or (estado = 'buscando' and public.socia_cubre(distrito, servicio) and public.socia_participa(promo_id)));

-- ───────────── Precio en el servidor: los servicios por cotización empiezan en 0 hasta elegir oferta ─────────────
create or replace function public.pedidos_antes_insertar() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  s servicios;
  c config;
  base numeric;
  pct numeric := 0;
  de_plan boolean := coalesce(current_setting('una.plan', true), '') = '1';
begin
  select * into s from servicios where id = new.servicio and activo;
  if not found then raise exception 'Servicio no disponible'; end if;
  if not exists (select 1 from distritos where nombre = new.distrito and habilitado) then
    raise exception 'Aún no atendemos en %', new.distrito;
  end if;
  if new.horas < s.horas_min then raise exception 'Mínimo % horas', s.horas_min; end if;
  select * into c from config where id = 1;
  if not de_plan then
    new.cliente_id := auth.uid();
    new.socia_id := null;
    new.estado := 'buscando';
    new.plan_origen := null;
    new.oferta_id := null;
  end if;
  new.pago_estado := 'pendiente';
  new.pago_metodo := null;
  new.propina := 0;
  new.liquidado := false;
  new.motivo_cancelacion := null;
  new.frecuencia := coalesce(new.frecuencia, 'unica');
  if new.frecuencia <> 'unica' and new.fecha is null then raise exception 'Un plan necesita fecha y hora'; end if;
  new.tareas := array(select t from unnest(coalesce(new.tareas, '{}')) t where t = any (s.tareas));
  new.cargo_servicio := c.cargo_servicio;
  new.comision_pct := c.comision_pct;

  if s.cotizar then
    if not de_plan then
      if cardinality(new.tareas) = 0 then raise exception 'Elige al menos un servicio'; end if;
      if new.promo_id is not null and not exists (select 1 from promociones where id = new.promo_id and activa) then
        raise exception 'Esa promoción ya terminó';
      end if;
      new.frecuencia := 'unica';
      new.total := 0;
    end if;
    new.con_materiales := true;
    new.recargo := 0;
    new.descuento := 0;
    return new;
  end if;

  new.modalidad := 'domicilio';
  new.promo_id := null;
  base := s.precio_hora * new.horas + case when new.con_materiales then s.recargo_materiales else 0 end;
  if new.fecha is null then pct := pct + c.recargo_urgente_pct; end if;
  if new.fecha is not null and extract(isodow from new.fecha at time zone 'America/Lima') in (6, 7) then
    pct := pct + c.recargo_finde_pct;
  end if;
  new.recargo := round(base * pct / 100, 2);
  new.descuento := case when new.frecuencia <> 'unica' then round((base + new.recargo) * c.descuento_plan_pct / 100, 2) else 0 end;
  new.total := base + new.recargo - new.descuento;
  return new;
end $$;

-- Los pedidos por cotización no se aceptan directo: se elige una oferta.
create or replace function public.aceptar_pedido(p_pedido uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update pedidos p set socia_id = auth.uid(), estado = 'aceptado'
  from socias s
  where p.id = p_pedido and p.estado = 'buscando'
    and s.id = auth.uid() and s.estado = 'aprobada' and s.disponible
    and p.distrito = any (s.distritos) and p.servicio = any (s.servicios)
    and not exists (select 1 from servicios v where v.id = p.servicio and v.cotizar);
  get diagnostics n = row_count;
  return n = 1;
end $$;

-- ───────────── Ofertar: sin teléfonos, redes ni enlaces (todo se coordina dentro de la app) ─────────────
create or replace function public.sin_contacto(t text) returns boolean
language sql immutable as $$
  select t is null or not (
    regexp_replace(t, '[\s\.\-]', '', 'g') ~ '\d{7,}'
    or t ~* '(@|https?://|www\.|wa\.me|whats|insta|facebook|tiktok|telegram|\.com)');
$$;

create or replace function public.ofertar(p_pedido uuid, p_precio numeric, p_detalle jsonb, p_mensaje text) returns void
language plpgsql security definer set search_path = public as $$
declare p pedidos; extra numeric;
begin
  select * into p from pedidos where id = p_pedido for update;
  if not found or p.estado <> 'buscando' then raise exception 'Este pedido ya no recibe ofertas'; end if;
  if not exists (select 1 from servicios where id = p.servicio and cotizar) then raise exception 'Este pedido no es por cotización'; end if;
  if not public.socia_cubre(p.distrito, p.servicio) then raise exception 'Activa “disponible” y revisa tus distritos y servicios'; end if;
  if not public.socia_participa(p.promo_id) then raise exception 'Este pedido es de una promoción en la que no participas'; end if;
  if p.modalidad = 'local' and not exists (select 1 from socias where id = auth.uid() and local_direccion is not null) then
    raise exception 'La clienta quiere ir a un local: registra el tuyo primero';
  end if;
  if jsonb_typeof(coalesce(p_detalle, '[]')) <> 'array' or jsonb_array_length(coalesce(p_detalle, '[]')) > 20 then raise exception 'Detalle no válido'; end if;
  select coalesce(sum((x->>'precio')::numeric), 0) into extra from jsonb_array_elements(coalesce(p_detalle, '[]')) x;
  if extra < 0 or extra > p_precio then raise exception 'Los adicionales no cuadran con el total'; end if;
  if not public.sin_contacto(p_mensaje) or not public.sin_contacto(p_detalle::text) then
    raise exception 'Por seguridad, no compartas teléfonos, redes ni enlaces. Podrán chatear al confirmar.';
  end if;
  insert into ofertas (pedido_id, socia_id, precio, detalle, mensaje)
  values (p_pedido, auth.uid(), round(p_precio, 2), coalesce(p_detalle, '[]'), nullif(trim(p_mensaje), ''))
  on conflict (pedido_id, socia_id) do update set precio = excluded.precio, detalle = excluded.detalle, mensaje = excluded.mensaje, creado_en = now();
end $$;

-- La clienta elige una oferta: el pedido queda aceptado con ese precio (menos la promoción, si hay).
create or replace function public.elegir_oferta(p_oferta uuid) returns void
language plpgsql security definer set search_path = public as $$
declare o ofertas; p pedidos; pct numeric := 0;
begin
  select * into o from ofertas where id = p_oferta;
  if not found then raise exception 'Oferta no encontrada'; end if;
  select * into p from pedidos where id = o.pedido_id and cliente_id = auth.uid() for update;
  if not found or p.estado <> 'buscando' then raise exception 'Este pedido ya no está buscando'; end if;
  if not exists (select 1 from socias where id = o.socia_id and estado = 'aprobada') then raise exception 'Esta socia ya no está disponible'; end if;
  if p.promo_id is not null then select coalesce(descuento_pct, 0) into pct from promociones where id = p.promo_id; end if;
  update pedidos set socia_id = o.socia_id, estado = 'aceptado', oferta_id = o.id,
    descuento = round(o.precio * coalesce(pct, 0) / 100, 2),
    total = o.precio - round(o.precio * coalesce(pct, 0) / 100, 2),
    comision_pct = (select comision_pct from config where id = 1)
  where id = p.id;
end $$;

-- ───────────── Socia: servicios, local, portafolio y promociones ─────────────
create or replace function public.set_mis_servicios(p_servicios text[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if cardinality(p_servicios) = 0 then raise exception 'Elige al menos un servicio'; end if;
  update socias set servicios = array(select x from unnest(p_servicios) x where x in (select id from servicios)) where id = auth.uid();
  if not found then raise exception 'Solo para socias'; end if;
end $$;

create or replace function public.set_local(p_direccion text, p_distrito text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update socias set local_direccion = nullif(trim(p_direccion), ''), local_distrito = nullif(trim(p_distrito), '') where id = auth.uid();
  if not found then raise exception 'Solo para socias'; end if;
end $$;

create or replace function public.set_portafolio(p_fotos text[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if cardinality(p_fotos) > 12 then raise exception 'Máximo 12 fotos'; end if;
  if exists (select 1 from unnest(p_fotos) f where f not like '%/storage/v1/object/public/fotos/' || auth.uid() || '/%') then
    raise exception 'Foto no válida';
  end if;
  update socias set portafolio = p_fotos where id = auth.uid();
  if not found then raise exception 'Solo para socias'; end if;
end $$;

create or replace function public.participar_promo(p_promo uuid, p_participar boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from socias where id = auth.uid()) then raise exception 'Solo para socias'; end if;
  if p_participar then
    if not exists (select 1 from promociones where id = p_promo and activa) then raise exception 'Esa promoción ya terminó'; end if;
    insert into promo_socias values (p_promo, auth.uid()) on conflict do nothing;
  else
    delete from promo_socias where promo_id = p_promo and socia_id = auth.uid();
  end if;
end $$;

-- ───────────── Permisos ─────────────
revoke execute on function public.ofertar(uuid, numeric, jsonb, text) from public, anon;
revoke execute on function public.elegir_oferta(uuid) from public, anon;
revoke execute on function public.set_mis_servicios(text[]) from public, anon;
revoke execute on function public.set_local(text, text) from public, anon;
revoke execute on function public.set_portafolio(text[]) from public, anon;
revoke execute on function public.participar_promo(uuid, boolean) from public, anon;
grant execute on function public.ofertar(uuid, numeric, jsonb, text) to authenticated;
grant execute on function public.elegir_oferta(uuid) to authenticated;
grant execute on function public.set_mis_servicios(text[]) to authenticated;
grant execute on function public.set_local(text, text) to authenticated;
grant execute on function public.set_portafolio(text[]) to authenticated;
grant execute on function public.participar_promo(uuid, boolean) to authenticated;

-- Aviso push a la clienta cuando llega una oferta nueva.
create or replace function public.avisar_oferta() returns trigger
language plpgsql security definer set search_path = public as $$
declare secreto text;
begin
  select valor into secreto from ajustes_privados where clave = 'push_secreto';
  if secreto is null then return new; end if;
  perform net.http_post(
    url := 'https://yrmyrhmmixeabwbglcse.supabase.co/functions/v1/avisos-push',
    body := jsonb_build_object('pedido_id', new.pedido_id, 'estado', 'oferta', 'socia_oferta', new.socia_id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-secreto', secreto)
  );
  return new;
end $$;
revoke execute on function public.avisar_oferta() from public, anon, authenticated;
drop trigger if exists avisar_oferta on public.ofertas;
create trigger avisar_oferta after insert on public.ofertas for each row execute function public.avisar_oferta();
