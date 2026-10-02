-- Una Manito: esquema inicial (beta)
-- Roles: cliente, socia, admin. Toda escritura sensible pasa por funciones RPC
-- (security definer) para que nadie pueda saltarse las reglas desde el navegador.


-- ───────────── Catálogos y configuración ─────────────
create table public.servicios (
  id text primary key,
  nombre text not null,
  icono text not null,
  eslogan text not null,
  activo boolean not null default false,
  precio_hora numeric(10,2) not null check (precio_hora >= 0),
  horas_min int not null default 1 check (horas_min > 0),
  recargo_materiales numeric(10,2) not null default 0 check (recargo_materiales >= 0),
  orden int not null default 0
);

create table public.distritos (
  nombre text primary key,
  habilitado boolean not null default false
);

create table public.config (
  id int primary key default 1 check (id = 1),
  comision_pct numeric(5,2) not null default 15 check (comision_pct between 0 and 100)
);

-- ───────────── Usuarios ─────────────
create type public.rol as enum ('cliente', 'socia', 'admin');

create table public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  rol public.rol not null default 'cliente',
  nombre text not null check (length(trim(nombre)) > 1),
  telefono text not null check (telefono ~ '^9\d{8}$'),
  email text,
  creado_en timestamptz not null default now()
);

create type public.estado_socia as enum ('pendiente', 'aprobada', 'rechazada');

create table public.socias (
  id uuid primary key references public.perfiles(id) on delete cascade,
  foto_url text not null,
  distritos text[] not null default '{}',
  servicios text[] not null default '{}',
  estado public.estado_socia not null default 'pendiente',
  disponible boolean not null default false,
  calificacion numeric(3,2) not null default 0,
  servicios_hechos int not null default 0,
  creado_en timestamptz not null default now()
);

-- Datos privados de la socia: solo ella y el admin (el cliente no ve el DNI).
create table public.socias_privado (
  id uuid primary key references public.socias(id) on delete cascade,
  dni text not null unique check (dni ~ '^\d{8}$')
);

-- ───────────── Pedidos ─────────────
create type public.estado_pedido as enum ('buscando', 'aceptado', 'en_camino', 'en_curso', 'terminado', 'cancelado');
create type public.metodo_pago as enum ('yape', 'plin', 'efectivo', 'tarjeta');
create type public.estado_pago as enum ('pendiente', 'marcado_pagado', 'confirmado');

create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.perfiles(id),
  socia_id uuid references public.socias(id),
  servicio text not null references public.servicios(id),
  direccion text not null,
  distrito text not null references public.distritos(nombre),
  referencia text,
  lat double precision not null,
  lng double precision not null,
  fecha timestamptz,                 -- null = "lo antes posible"
  horas int not null check (horas between 1 and 12),
  con_materiales boolean not null default false,
  notas text,
  estado public.estado_pedido not null default 'buscando',
  total numeric(10,2) not null default 0,
  comision_pct numeric(5,2) not null default 0,
  -- Pago: en beta es manual. pago_proveedor/pago_referencia quedan listos para Culqi o Mercado Pago.
  pago_metodo public.metodo_pago,
  pago_estado public.estado_pago not null default 'pendiente',
  pago_proveedor text,
  pago_referencia text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index pedidos_cliente_idx on public.pedidos (cliente_id, creado_en desc);
create index pedidos_socia_idx on public.pedidos (socia_id, creado_en desc);
create index pedidos_buscando_idx on public.pedidos (distrito, servicio) where estado = 'buscando';

create table public.calificaciones (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  autor_id uuid not null references public.perfiles(id),
  destinatario_id uuid not null references public.perfiles(id),
  para public.rol not null check (para in ('cliente', 'socia')),
  estrellas int not null check (estrellas between 1 and 5),
  comentario text,
  creado_en timestamptz not null default now(),
  unique (pedido_id, para)
);

-- ───────────── Funciones auxiliares ─────────────
create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfiles where id = auth.uid() and rol = 'admin');
$$;

-- La socia actual cubre este distrito y servicio (sin pasar por RLS para evitar recursión).
create or replace function public.socia_cubre(p_distrito text, p_servicio text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from socias where id = auth.uid() and estado = 'aprobada' and disponible
                 and p_distrito = any (distritos) and p_servicio = any (servicios));
$$;

-- El usuario actual comparte algún pedido con esta persona.
create or replace function public.es_contraparte(p_perfil uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from pedidos where (cliente_id = auth.uid() and socia_id = p_perfil)
                                          or (socia_id = auth.uid() and cliente_id = p_perfil));
$$;

-- Precio y comisión los calcula el servidor, nunca el navegador.
create or replace function public.pedidos_antes_insertar() returns trigger
language plpgsql security definer set search_path = public as $$
declare s servicios;
begin
  select * into s from servicios where id = new.servicio and activo;
  if not found then raise exception 'Servicio no disponible'; end if;
  if not exists (select 1 from distritos where nombre = new.distrito and habilitado) then
    raise exception 'Aún no atendemos en %', new.distrito;
  end if;
  if new.horas < s.horas_min then raise exception 'Mínimo % horas', s.horas_min; end if;
  new.cliente_id := auth.uid();
  new.socia_id := null;
  new.estado := 'buscando';
  new.pago_estado := 'pendiente';
  new.pago_metodo := null;
  new.total := s.precio_hora * new.horas + case when new.con_materiales then s.recargo_materiales else 0 end;
  new.comision_pct := (select comision_pct from config where id = 1);
  return new;
end $$;
create trigger pedidos_antes_insertar before insert on public.pedidos
  for each row execute function public.pedidos_antes_insertar();

create or replace function public.tocar_actualizado() returns trigger language plpgsql as $$
begin new.actualizado_en := now(); return new; end $$;
create trigger pedidos_actualizado before update on public.pedidos
  for each row execute function public.tocar_actualizado();

-- ───────────── Acciones (RPC) ─────────────

-- El primero que acepta se lo queda: el UPDATE solo afecta si sigue en 'buscando'.
create or replace function public.aceptar_pedido(p_pedido uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update pedidos p set socia_id = auth.uid(), estado = 'aceptado'
  from socias s
  where p.id = p_pedido and p.estado = 'buscando'
    and s.id = auth.uid() and s.estado = 'aprobada' and s.disponible
    and p.distrito = any (s.distritos) and p.servicio = any (s.servicios);
  get diagnostics n = row_count;
  return n = 1;
end $$;

create or replace function public.avanzar_pedido(p_pedido uuid) returns public.estado_pedido
language plpgsql security definer set search_path = public as $$
declare actual estado_pedido; siguiente estado_pedido;
begin
  select estado into actual from pedidos where id = p_pedido and socia_id = auth.uid() for update;
  if not found then raise exception 'Pedido no encontrado'; end if;
  siguiente := case actual when 'aceptado' then 'en_camino' when 'en_camino' then 'en_curso' when 'en_curso' then 'terminado' end;
  if siguiente is null then raise exception 'El pedido ya no puede avanzar'; end if;
  update pedidos set estado = siguiente where id = p_pedido;
  if siguiente = 'terminado' then
    update socias set servicios_hechos = servicios_hechos + 1 where id = auth.uid();
  end if;
  return siguiente;
end $$;

create or replace function public.cancelar_pedido(p_pedido uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update pedidos set estado = 'cancelado'
  where id = p_pedido and estado in ('buscando', 'aceptado')
    and (cliente_id = auth.uid() or public.es_admin());
  if not found then raise exception 'Este pedido ya no se puede cancelar'; end if;
end $$;

create or replace function public.marcar_pagado(p_pedido uuid, p_metodo public.metodo_pago) returns void
language plpgsql security definer set search_path = public as $$
begin
  update pedidos set pago_metodo = p_metodo, pago_estado = 'marcado_pagado', pago_proveedor = 'manual'
  where id = p_pedido and cliente_id = auth.uid() and estado = 'terminado' and pago_estado = 'pendiente';
  if not found then raise exception 'No se pudo registrar el pago'; end if;
end $$;

create or replace function public.confirmar_pago(p_pedido uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update pedidos set pago_estado = 'confirmado'
  where id = p_pedido and socia_id = auth.uid() and pago_estado = 'marcado_pagado';
  if not found then raise exception 'No hay pago por confirmar'; end if;
end $$;

create or replace function public.calificar(p_pedido uuid, p_estrellas int, p_comentario text) returns void
language plpgsql security definer set search_path = public as $$
declare p pedidos;
begin
  select * into p from pedidos where id = p_pedido and estado = 'terminado';
  if not found then raise exception 'Solo se califica un servicio terminado'; end if;
  if auth.uid() = p.cliente_id and p.socia_id is not null then
    insert into calificaciones (pedido_id, autor_id, destinatario_id, para, estrellas, comentario)
    values (p.id, auth.uid(), p.socia_id, 'socia', p_estrellas, p_comentario);
    update socias set calificacion = (select round(avg(estrellas), 2) from calificaciones where destinatario_id = p.socia_id and para = 'socia')
    where id = p.socia_id;
  elsif auth.uid() = p.socia_id then
    insert into calificaciones (pedido_id, autor_id, destinatario_id, para, estrellas, comentario)
    values (p.id, auth.uid(), p.cliente_id, 'cliente', p_estrellas, p_comentario);
  else
    raise exception 'No participaste en este pedido';
  end if;
end $$;

create or replace function public.set_disponible(p_valor boolean) returns void
language sql security definer set search_path = public as $$
  update socias set disponible = p_valor where id = auth.uid() and estado = 'aprobada';
$$;

create or replace function public.set_estado_socia(p_socia uuid, p_estado public.estado_socia) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.es_admin() then raise exception 'Solo administradores'; end if;
  update socias set estado = p_estado, disponible = false where id = p_socia;
  update perfiles set rol = 'socia' where id = p_socia;
end $$;

-- Registro: crea el perfil (y la ficha de socia) del usuario autenticado. El rol nunca es admin.
create or replace function public.registrar_perfil(p_nombre text, p_telefono text, p_socia jsonb default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into perfiles (id, rol, nombre, telefono, email)
  values (auth.uid(), (case when p_socia is null then 'cliente' else 'socia' end)::rol, p_nombre, p_telefono,
          (select email from auth.users where id = auth.uid()))
  on conflict (id) do update set nombre = excluded.nombre, telefono = excluded.telefono;
  if p_socia is not null then
    insert into socias (id, foto_url, distritos, servicios)
    values (auth.uid(), p_socia->>'foto_url',
            array(select jsonb_array_elements_text(p_socia->'distritos')),
            array(select jsonb_array_elements_text(p_socia->'servicios')));
    insert into socias_privado (id, dni) values (auth.uid(), p_socia->>'dni');
  end if;
end $$;

-- Resumen para el panel de administración.
create or replace function public.resumen_admin() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.es_admin() then raise exception 'Solo administradores'; end if;
  return json_build_object(
    'terminados', (select count(*) from pedidos where estado = 'terminado'),
    'activos', (select count(*) from pedidos where estado not in ('terminado', 'cancelado')),
    'ingresos', (select coalesce(sum(total), 0) from pedidos where estado = 'terminado'),
    'comisiones', (select coalesce(sum(total * comision_pct / 100), 0) from pedidos where estado = 'terminado'),
    'socias_aprobadas', (select count(*) from socias where estado = 'aprobada'),
    'socias_pendientes', (select count(*) from socias where estado = 'pendiente')
  );
end $$;

-- ───────────── Seguridad por filas (RLS) ─────────────
alter table public.servicios enable row level security;
alter table public.distritos enable row level security;
alter table public.config enable row level security;
alter table public.perfiles enable row level security;
alter table public.socias enable row level security;
alter table public.socias_privado enable row level security;
alter table public.pedidos enable row level security;
alter table public.calificaciones enable row level security;

-- Catálogos: lectura pública, escritura solo admin.
create policy "leer servicios" on public.servicios for select using (true);
create policy "admin servicios" on public.servicios for all using (public.es_admin()) with check (public.es_admin());
create policy "leer distritos" on public.distritos for select using (true);
create policy "admin distritos" on public.distritos for all using (public.es_admin()) with check (public.es_admin());
create policy "leer config" on public.config for select using (true);
create policy "admin config" on public.config for update using (public.es_admin()) with check (public.es_admin());

-- Perfiles: el propio, el de la contraparte de un pedido, o admin.
create policy "ver perfiles" on public.perfiles for select using (
  id = auth.uid() or public.es_admin() or public.es_contraparte(id)
);

-- Socias: la propia, admin, o el cliente que la tiene asignada.
create policy "ver socias" on public.socias for select using (
  id = auth.uid() or public.es_admin() or public.es_contraparte(id)
);

create policy "ver socias_privado" on public.socias_privado for select using (id = auth.uid() or public.es_admin());

-- Pedidos: el cliente crea y ve los suyos; la socia ve los suyos y los que están buscando en su zona.
create policy "crear pedido" on public.pedidos for insert to authenticated with check (true);
create policy "ver pedidos" on public.pedidos for select using (
  cliente_id = auth.uid() or socia_id = auth.uid() or public.es_admin()
  or (estado = 'buscando' and public.socia_cubre(distrito, servicio))
);

create policy "ver calificaciones" on public.calificaciones for select using (
  autor_id = auth.uid() or destinatario_id = auth.uid() or public.es_admin()
);

-- ───────────── Fotos de socias (Storage) ─────────────
insert into storage.buckets (id, name, public) values ('fotos', 'fotos', true) on conflict (id) do nothing;
create policy "subir mi foto" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ───────────── Tiempo real ─────────────
alter publication supabase_realtime add table public.pedidos, public.socias;

-- ───────────── Datos iniciales ─────────────
insert into public.config (id, comision_pct) values (1, 15);

insert into public.servicios (id, nombre, icono, eslogan, activo, precio_hora, horas_min, recargo_materiales, orden) values
  ('limpieza', 'Limpieza del hogar', '🧹', 'Te damos una manito en tu hogar, al toque.', true, 15, 3, 10, 1),
  ('gasfiteria', 'Gasfitería', '🔧', 'Te damos una manito con tus caños, al toque.', false, 35, 1, 0, 2),
  ('electricidad', 'Electricidad', '💡', 'Te damos una manito con la luz, al toque.', false, 35, 1, 0, 3),
  ('lavado_autos', 'Lavado de autos', '🚗', 'Te damos una manito con tu auto, al toque.', false, 25, 1, 5, 4),
  ('piscinas', 'Limpieza de piscinas', '🏊', 'Te damos una manito con tu piscina, al toque.', false, 30, 2, 15, 5);

insert into public.distritos (nombre, habilitado) values
  ('Miraflores', true), ('San Isidro', true), ('Surco', true), ('San Borja', true), ('Barranco', true),
  ('La Molina', true), ('Jesús María', true), ('Lince', true), ('Magdalena', true), ('Pueblo Libre', true),
  ('San Miguel', false), ('Surquillo', false), ('Chorrillos', false), ('Los Olivos', false);
