-- Cupones de descuento. Los paga Una Manito: la socia cobra su precio completo y el descuento sale de la parte de Una Manito.
-- Cupón de bienvenida: quien se registra con el código de una amiga recibe uno personal (un solo uso).
alter table public.config
  add column if not exists cupon_ref_pct numeric(5,2) not null default 10 check (cupon_ref_pct between 0 and 50),
  add column if not exists cupon_ref_tope numeric(10,2) not null default 8 check (cupon_ref_tope >= 0),
  add column if not exists cupon_ref_minimo numeric(10,2) not null default 50 check (cupon_ref_minimo >= 0),
  add column if not exists cupon_ref_dias int not null default 30 check (cupon_ref_dias between 1 and 365);

create table if not exists public.cupones (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique check (codigo ~ '^[A-Z0-9-]{4,20}$'),
  descripcion text,
  pct numeric(5,2) not null check (pct between 1 and 50),
  tope numeric(10,2) not null check (tope > 0),
  minimo numeric(10,2) not null default 0 check (minimo >= 0),
  vence_en timestamptz,
  usuario_id uuid references public.perfiles(id) on delete cascade, -- null = cupón general (cualquiera con el código)
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);
alter table public.cupones enable row level security;
drop policy if exists "ver cupones" on public.cupones;
create policy "ver cupones" on public.cupones for select using (usuario_id = auth.uid() or public.es_admin());
drop policy if exists "equipo gestiona cupones" on public.cupones;
create policy "equipo gestiona cupones" on public.cupones for all to authenticated using (public.es_admin()) with check (public.es_admin());

alter table public.pedidos
  add column if not exists cupon_id uuid references public.cupones(id) on delete set null,
  add column if not exists descuento_cupon numeric(10,2) not null default 0;

-- ¿Puede la persona usar este cupón? (activo, vigente, suyo o general, y sin usar en otro pedido no cancelado)
create or replace function public.cupon_valido(c public.cupones, p_usuario uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select c.activo and (c.vence_en is null or c.vence_en > now()) and (c.usuario_id is null or c.usuario_id = p_usuario)
    and not exists (select 1 from pedidos where cliente_id = p_usuario and cupon_id = c.id and estado <> 'cancelado');
$$;

create or replace function public.descuento_de_cupon(p_cupon uuid, p_total numeric) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce((select case when p_total >= c.minimo then least(round(p_total * c.pct / 100, 2), c.tope) else 0 end
                   from cupones c where c.id = p_cupon), 0);
$$;

-- Consultar un cupón general por su código (sin poder listar todos).
create or replace function public.ver_cupon(p_codigo text) returns json
language plpgsql stable security definer set search_path = public as $$
declare c cupones;
begin
  select * into c from cupones where codigo = upper(trim(p_codigo));
  if not found or not public.cupon_valido(c, auth.uid()) then raise exception 'Ese cupón no existe, ya venció o ya lo usaste'; end if;
  return json_build_object('id', c.id, 'codigo', c.codigo, 'descripcion', c.descripcion, 'pct', c.pct, 'tope', c.tope, 'minimo', c.minimo, 'vence_en', c.vence_en);
end $$;

-- Al crear el pedido: valida el cupón y, si el precio ya se conoce (hogar), calcula el descuento.
create or replace function public.pedidos_cupon() returns trigger
language plpgsql security definer set search_path = public as $$
declare c cupones;
begin
  if new.cupon_id is null or coalesce(current_setting('una.plan', true), '') = '1' then new.cupon_id := null; new.descuento_cupon := 0; return new; end if;
  select * into c from cupones where id = new.cupon_id;
  if not found or not public.cupon_valido(c, new.cliente_id) then raise exception 'Ese cupón no existe, ya venció o ya lo usaste'; end if;
  new.descuento_cupon := public.descuento_de_cupon(c.id, new.total);
  return new;
end $$;
drop trigger if exists pedidos_cupon on public.pedidos;
-- "zz" para correr después de pedidos_antes_insertar (que fija cliente y total).
create trigger zz_pedidos_cupon before insert on public.pedidos for each row execute function public.pedidos_cupon();

-- Belleza: el descuento se calcula cuando la clienta elige la oferta.
create or replace function public.elegir_oferta(p_oferta uuid) returns void
language plpgsql security definer set search_path = public as $$
declare o ofertas; p pedidos; pct numeric := 0; total numeric;
begin
  select * into o from ofertas where id = p_oferta;
  if not found then raise exception 'Oferta no encontrada'; end if;
  select * into p from pedidos where id = o.pedido_id and cliente_id = auth.uid() for update;
  if not found or p.estado <> 'buscando' then raise exception 'Este pedido ya no está buscando'; end if;
  if not exists (select 1 from socias where id = o.socia_id and estado = 'aprobada') then raise exception 'Esta socia ya no está disponible'; end if;
  if p.promo_id is not null then select coalesce(descuento_pct, 0) into pct from promociones where id = p.promo_id; end if;
  total := o.precio - round(o.precio * coalesce(pct, 0) / 100, 2);
  update pedidos set socia_id = o.socia_id, estado = 'aceptado', oferta_id = o.id,
    descuento = round(o.precio * coalesce(pct, 0) / 100, 2),
    total = total,
    descuento_cupon = case when p.cupon_id is null then 0 else public.descuento_de_cupon(p.cupon_id, total) end,
    comision_pct = (select comision_pct from config where id = 1)
  where id = p.id;
end $$;

-- Cupón de bienvenida al usar un código de referido.
create or replace function public.registrar_referido(p_codigo text) returns boolean
language plpgsql security definer set search_path = public as $$
declare quien uuid; c config;
begin
  if auth.uid() is null or exists (select 1 from referidos where invitado = auth.uid()) then return false; end if;
  if not exists (select 1 from perfiles where id = auth.uid() and creado_en > now() - interval '7 days') then return false; end if;
  if exists (select 1 from pedidos where cliente_id = auth.uid()) then return false; end if;
  select id into quien from perfiles where public.codigo_referido(id) = upper(trim(p_codigo)) and id <> auth.uid();
  if quien is null then return false; end if;
  insert into referidos (invitado, invitador) values (auth.uid(), quien);
  select * into c from config where id = 1;
  if c.cupon_ref_pct > 0 and c.cupon_ref_tope > 0 then
    insert into cupones (codigo, descripcion, pct, tope, minimo, vence_en, usuario_id)
    values ('BIENVENIDA-' || public.codigo_referido(auth.uid()), 'Cupón de bienvenida por invitación de una amiga',
            c.cupon_ref_pct, c.cupon_ref_tope, c.cupon_ref_minimo, now() + make_interval(days => c.cupon_ref_dias), auth.uid())
    on conflict (codigo) do nothing;
  end if;
  return true;
end $$;

revoke execute on function public.ver_cupon(text) from public, anon;
grant execute on function public.ver_cupon(text) to authenticated;
revoke execute on function public.cupon_valido(public.cupones, uuid) from public, anon, authenticated;
revoke execute on function public.descuento_de_cupon(uuid, numeric) from public, anon, authenticated;
