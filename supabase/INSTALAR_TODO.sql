-- ============================================================
-- UNA MANITO · Instalación completa de la base de datos
-- Pega TODO este archivo en Supabase → SQL Editor → Run.
-- Si ya corriste una versión anterior, corre solo las migraciones nuevas de supabase/migrations/.
-- ============================================================

-- ───────────── 20261001000000_esquema_inicial.sql ─────────────
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

-- ───────────── 20261002000000_todos_los_distritos.sql ─────────────
-- Todos los distritos de Lima Metropolitana (habilitados) y del Callao (deshabilitados).
-- Se puede ejecutar más de una vez: si el distrito ya existe, solo actualiza si está habilitado.
insert into public.distritos (nombre, habilitado) values
  ('Ancón', true),
  ('Ate', true),
  ('Barranco', true),
  ('Breña', true),
  ('Carabayllo', true),
  ('Chaclacayo', true),
  ('Chorrillos', true),
  ('Cieneguilla', true),
  ('Comas', true),
  ('El Agustino', true),
  ('Independencia', true),
  ('Jesús María', true),
  ('La Molina', true),
  ('La Victoria', true),
  ('Lima', true),
  ('Lince', true),
  ('Los Olivos', true),
  ('Lurigancho', true),
  ('Lurín', true),
  ('Magdalena', true),
  ('Miraflores', true),
  ('Pachacámac', true),
  ('Pucusana', true),
  ('Pueblo Libre', true),
  ('Puente Piedra', true),
  ('Punta Hermosa', true),
  ('Punta Negra', true),
  ('Rímac', true),
  ('San Bartolo', true),
  ('San Borja', true),
  ('San Isidro', true),
  ('San Juan de Lurigancho', true),
  ('San Juan de Miraflores', true),
  ('San Luis', true),
  ('San Martín de Porres', true),
  ('San Miguel', true),
  ('Santa Anita', true),
  ('Santa María del Mar', true),
  ('Santa Rosa', true),
  ('Surco', true),
  ('Surquillo', true),
  ('Villa El Salvador', true),
  ('Villa María del Triunfo', true),
  ('Callao', false),
  ('Bellavista', false),
  ('Carmen de la Legua', false),
  ('La Perla', false),
  ('La Punta', false),
  ('Mi Perú', false),
  ('Ventanilla', false)
on conflict (nombre) do update set habilitado = excluded.habilitado;

-- ───────────── 20261003000000_aceptacion_terminos.sql ─────────────
-- Fecha en que cada usuario aceptó los Términos y la Política de privacidad.
-- La casilla es obligatoria para registrarse, así que se guarda al crear el perfil.
alter table public.perfiles add column if not exists terminos_aceptados_en timestamptz default now();

-- ───────────── 20261004000000_recargos_propinas_tareas.sql ─────────────
-- Recargos (urgencia y fin de semana), propinas, lista de tareas y motivo de cancelación.

-- ───────────── Configuración ─────────────
alter table public.config
  add column if not exists recargo_urgente_pct numeric(5,2) not null default 10 check (recargo_urgente_pct between 0 and 100),
  add column if not exists recargo_finde_pct numeric(5,2) not null default 10 check (recargo_finde_pct between 0 and 100);

alter table public.servicios add column if not exists tareas text[] not null default '{}';
update public.servicios
  set tareas = array['Cocina', 'Baños', 'Dormitorios', 'Sala y comedor', 'Pisos', 'Ventanas por dentro', 'Planchado', 'Lavado de ropa']
  where id = 'limpieza' and tareas = '{}';

-- ───────────── Pedidos ─────────────
alter table public.pedidos
  add column if not exists tareas text[] not null default '{}',
  add column if not exists recargo numeric(10,2) not null default 0,
  add column if not exists propina numeric(10,2) not null default 0 check (propina between 0 and 500),
  add column if not exists motivo_cancelacion text;

-- Precio calculado en el servidor: base × (1 + % urgencia si es "lo antes posible" + % fin de semana).
-- Debe coincidir con calcularPrecio() del frontend.
create or replace function public.pedidos_antes_insertar() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  s servicios;
  c config;
  base numeric;
  pct numeric := 0;
begin
  select * into s from servicios where id = new.servicio and activo;
  if not found then raise exception 'Servicio no disponible'; end if;
  if not exists (select 1 from distritos where nombre = new.distrito and habilitado) then
    raise exception 'Aún no atendemos en %', new.distrito;
  end if;
  if new.horas < s.horas_min then raise exception 'Mínimo % horas', s.horas_min; end if;
  select * into c from config where id = 1;

  new.cliente_id := auth.uid();
  new.socia_id := null;
  new.estado := 'buscando';
  new.pago_estado := 'pendiente';
  new.pago_metodo := null;
  new.propina := 0;
  new.motivo_cancelacion := null;
  -- Solo se guardan tareas que existen para ese servicio.
  new.tareas := array(select t from unnest(coalesce(new.tareas, '{}')) t where t = any (s.tareas));

  base := s.precio_hora * new.horas + case when new.con_materiales then s.recargo_materiales else 0 end;
  if new.fecha is null then pct := pct + c.recargo_urgente_pct; end if;
  if new.fecha is not null and extract(isodow from new.fecha at time zone 'America/Lima') in (6, 7) then
    pct := pct + c.recargo_finde_pct;
  end if;
  new.recargo := round(base * pct / 100, 2);
  new.total := base + new.recargo;
  new.comision_pct := c.comision_pct;
  return new;
end $$;

-- ───────────── Cancelar con motivo ─────────────
drop function if exists public.cancelar_pedido(uuid);
create or replace function public.cancelar_pedido(p_pedido uuid, p_motivo text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  update pedidos set estado = 'cancelado', motivo_cancelacion = left(p_motivo, 200)
  where id = p_pedido and estado in ('buscando', 'aceptado')
    and (cliente_id = auth.uid() or public.es_admin());
  if not found then raise exception 'Este pedido ya no se puede cancelar'; end if;
end $$;

-- ───────────── Pagar con propina (100% para la socia) ─────────────
drop function if exists public.marcar_pagado(uuid, public.metodo_pago);
create or replace function public.marcar_pagado(p_pedido uuid, p_metodo public.metodo_pago, p_propina numeric default 0) returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(p_propina, 0) < 0 or coalesce(p_propina, 0) > 500 then raise exception 'Propina no válida'; end if;
  update pedidos set pago_metodo = p_metodo, pago_estado = 'marcado_pagado', pago_proveedor = 'manual', propina = coalesce(p_propina, 0)
  where id = p_pedido and cliente_id = auth.uid() and estado = 'terminado' and pago_estado = 'pendiente';
  if not found then raise exception 'No se pudo registrar el pago'; end if;
end $$;

-- ───────────── Resumen del admin con propinas y ganancias de socias ─────────────
create or replace function public.resumen_admin() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.es_admin() then raise exception 'Solo administradores'; end if;
  return json_build_object(
    'terminados', (select count(*) from pedidos where estado = 'terminado'),
    'activos', (select count(*) from pedidos where estado not in ('terminado', 'cancelado')),
    'ingresos', (select coalesce(sum(total), 0) from pedidos where estado = 'terminado'),
    'comisiones', (select coalesce(sum(total * comision_pct / 100), 0) from pedidos where estado = 'terminado'),
    'propinas', (select coalesce(sum(propina), 0) from pedidos where estado = 'terminado'),
    'ganado_socias', (select coalesce(sum(total * (1 - comision_pct / 100) + propina), 0) from pedidos where estado = 'terminado'),
    'socias_aprobadas', (select count(*) from socias where estado = 'aprobada'),
    'socias_pendientes', (select count(*) from socias where estado = 'pendiente')
  );
end $$;

-- ───────────── 20261005000000_usuarios_y_ceo.sql ─────────────
-- Rol CEO, administración de usuarios e invitaciones al equipo.
-- El CEO puede dar o quitar los roles de administrador y CEO; los administradores solo ven.

alter type public.rol add value if not exists 'ceo';

-- Se compara como texto para poder usar el valor nuevo dentro de esta misma migración.
create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfiles where id = auth.uid() and rol::text in ('admin', 'ceo'));
$$;

create or replace function public.es_ceo() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfiles where id = auth.uid() and rol::text = 'ceo');
$$;

-- ───────────── Invitaciones ─────────────
-- Quien es invitado entra con su correo y, al completar el registro, recibe el rol indicado.
create table if not exists public.invitaciones (
  email text primary key check (email = lower(email) and email like '%@%'),
  nombre text,
  rol text not null check (rol in ('admin', 'ceo')),
  creado_por uuid references public.perfiles(id),
  creado_en timestamptz not null default now()
);
alter table public.invitaciones enable row level security;
drop policy if exists "ver invitaciones" on public.invitaciones;
create policy "ver invitaciones" on public.invitaciones for select using (public.es_admin());

create or replace function public.invitar_usuario(p_email text, p_nombre text, p_rol text) returns void
language plpgsql security definer set search_path = public as $$
declare correo text := lower(trim(p_email));
begin
  if not public.es_ceo() then raise exception 'Solo el CEO puede invitar al equipo'; end if;
  if p_rol not in ('admin', 'ceo') then raise exception 'Rol no válido'; end if;
  -- Si la persona ya tiene cuenta, se le cambia el rol directamente.
  if exists (select 1 from perfiles where lower(email) = correo) then
    update perfiles set rol = p_rol::rol where lower(email) = correo;
    return;
  end if;
  insert into invitaciones (email, nombre, rol, creado_por) values (correo, nullif(trim(p_nombre), ''), p_rol, auth.uid())
  on conflict (email) do update set nombre = excluded.nombre, rol = excluded.rol, creado_por = excluded.creado_por, creado_en = now();
end $$;

create or replace function public.eliminar_invitacion(p_email text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.es_ceo() then raise exception 'Solo el CEO puede gestionar invitaciones'; end if;
  delete from invitaciones where email = lower(trim(p_email));
end $$;

-- ───────────── Cambiar el rol de un usuario ─────────────
create or replace function public.set_rol_usuario(p_usuario uuid, p_rol text) returns void
language plpgsql security definer set search_path = public as $$
declare actual text;
begin
  if not public.es_ceo() then raise exception 'Solo el CEO puede cambiar roles'; end if;
  if p_rol not in ('cliente', 'admin', 'ceo') then raise exception 'Rol no válido'; end if;
  if p_usuario = auth.uid() then raise exception 'No puedes cambiar tu propio rol'; end if;
  select rol::text into actual from perfiles where id = p_usuario;
  if actual is null then raise exception 'Usuario no encontrado'; end if;
  if actual = 'socia' then raise exception 'Las socias se gestionan desde la sección Socias'; end if;
  if actual = 'ceo' and p_rol <> 'ceo' and (select count(*) from perfiles where rol::text = 'ceo') <= 1 then
    raise exception 'Debe quedar al menos un CEO';
  end if;
  update perfiles set rol = p_rol::rol where id = p_usuario;
end $$;

-- ───────────── Registro: aplica la invitación si existe ─────────────
create or replace function public.registrar_perfil(p_nombre text, p_telefono text, p_socia jsonb default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  correo text := (select lower(email) from auth.users where id = auth.uid());
  invitado text := (select rol from invitaciones where email = correo);
begin
  insert into perfiles (id, rol, nombre, telefono, email)
  values (auth.uid(),
          (case when invitado is not null and p_socia is null then invitado
                when p_socia is null then 'cliente' else 'socia' end)::rol,
          p_nombre, p_telefono, correo)
  on conflict (id) do update set nombre = excluded.nombre, telefono = excluded.telefono;
  if invitado is not null and p_socia is null then delete from invitaciones where email = correo; end if;
  if p_socia is not null then
    insert into socias (id, foto_url, distritos, servicios)
    values (auth.uid(), p_socia->>'foto_url',
            array(select jsonb_array_elements_text(p_socia->'distritos')),
            array(select jsonb_array_elements_text(p_socia->'servicios')));
    insert into socias_privado (id, dni) values (auth.uid(), p_socia->>'dni');
  end if;
end $$;

-- Nadie puede ponerse rol de admin o CEO editando su perfil: las escrituras solo pasan por estas funciones.

-- ───────────── 20261006000000_datos_personales.sql ─────────────
-- Datos personales (documento y fecha de nacimiento) para todos, y verificación de socias.
-- Todo esto es privado: solo lo ve la propia persona y el equipo (admin/CEO).

-- ───────────── Datos personales de todos ─────────────
create table if not exists public.perfiles_privado (
  id uuid primary key references public.perfiles(id) on delete cascade,
  tipo_documento text not null check (tipo_documento in ('DNI', 'CE')),
  documento text not null,
  fecha_nacimiento date not null check (fecha_nacimiento <= (current_date - interval '18 years')),
  unique (tipo_documento, documento),
  check ((tipo_documento = 'DNI' and documento ~ '^\d{8}$') or (tipo_documento = 'CE' and documento ~ '^[A-Za-z0-9]{8,12}$'))
);
alter table public.perfiles_privado enable row level security;
drop policy if exists "ver perfiles_privado" on public.perfiles_privado;
create policy "ver perfiles_privado" on public.perfiles_privado for select using (id = auth.uid() or public.es_admin());

-- ───────────── Verificación de socias ─────────────
-- El documento ahora vive en perfiles_privado (DNI o carné de extranjería); la columna antigua queda opcional.
alter table public.socias_privado alter column dni drop not null;
alter table public.socias_privado
  add column if not exists direccion text,
  add column if not exists distrito_residencia text,
  add column if not exists emergencia_nombre text,
  add column if not exists emergencia_parentesco text,
  add column if not exists emergencia_telefono text,
  add column if not exists cobro_numero text,
  add column if not exists experiencia text,
  add column if not exists dni_frente text,   -- ruta en el bucket privado "documentos"
  add column if not exists dni_reverso text,
  add column if not exists declara_sin_antecedentes boolean not null default false;

-- Fotos del DNI: bucket privado. Cada persona sube a su carpeta; solo ella y el equipo pueden verlas.
insert into storage.buckets (id, name, public) values ('documentos', 'documentos', false) on conflict (id) do nothing;
drop policy if exists "subir mis documentos" on storage.objects;
create policy "subir mis documentos" on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "ver documentos" on storage.objects;
create policy "ver documentos" on storage.objects for select to authenticated
  using (bucket_id = 'documentos' and ((storage.foldername(name))[1] = auth.uid()::text or public.es_admin()));

-- ───────────── Registro con datos personales ─────────────
drop function if exists public.registrar_perfil(text, text, jsonb);
create or replace function public.registrar_perfil(p_nombre text, p_telefono text, p_personal jsonb, p_socia jsonb default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  correo text := (select lower(email) from auth.users where id = auth.uid());
  invitado text := (select rol from invitaciones where email = correo);
  nacimiento date := (p_personal->>'fecha_nacimiento')::date;
begin
  if nacimiento is null or nacimiento > current_date - interval '18 years' then
    raise exception 'Debes ser mayor de 18 años';
  end if;
  if exists (select 1 from perfiles_privado where tipo_documento = p_personal->>'tipo_documento'
             and documento = upper(p_personal->>'documento') and id <> auth.uid()) then
    raise exception 'Ese documento ya está registrado en otra cuenta';
  end if;

  insert into perfiles (id, rol, nombre, telefono, email)
  values (auth.uid(),
          (case when invitado is not null and p_socia is null then invitado
                when p_socia is null then 'cliente' else 'socia' end)::rol,
          p_nombre, p_telefono, correo)
  on conflict (id) do update set nombre = excluded.nombre, telefono = excluded.telefono;
  if invitado is not null and p_socia is null then delete from invitaciones where email = correo; end if;

  insert into perfiles_privado (id, tipo_documento, documento, fecha_nacimiento)
  values (auth.uid(), p_personal->>'tipo_documento', upper(p_personal->>'documento'), nacimiento)
  on conflict (id) do update set tipo_documento = excluded.tipo_documento, documento = excluded.documento, fecha_nacimiento = excluded.fecha_nacimiento;

  if p_socia is not null then
    if not coalesce((p_socia->>'declara_sin_antecedentes')::boolean, false) then
      raise exception 'Debes aceptar la declaración jurada';
    end if;
    insert into socias (id, foto_url, distritos, servicios)
    values (auth.uid(), p_socia->>'foto_url',
            array(select jsonb_array_elements_text(p_socia->'distritos')),
            array(select jsonb_array_elements_text(p_socia->'servicios')))
    on conflict (id) do nothing;
    insert into socias_privado (id, dni, direccion, distrito_residencia, emergencia_nombre, emergencia_parentesco, emergencia_telefono,
                                cobro_numero, experiencia, dni_frente, dni_reverso, declara_sin_antecedentes)
    values (auth.uid(),
            case when p_personal->>'tipo_documento' = 'DNI' then p_personal->>'documento' end,
            p_socia->>'direccion', p_socia->>'distrito_residencia', p_socia->>'emergencia_nombre', p_socia->>'emergencia_parentesco',
            p_socia->>'emergencia_telefono', p_socia->>'cobro_numero', p_socia->>'experiencia', p_socia->>'dni_frente', p_socia->>'dni_reverso', true)
    on conflict (id) do nothing;
  end if;
end $$;

-- ───────────── 20261007000000_endurecer_permisos.sql ─────────────
-- Endurecimiento: las acciones solo las llaman usuarios con sesión iniciada.
-- (es_admin, es_ceo, es_contraparte y socia_cubre se mantienen: las usan las políticas RLS.)
alter function public.tocar_actualizado() set search_path = public;

revoke execute on function public.pedidos_antes_insertar() from public, anon, authenticated;
revoke execute on function public.tocar_actualizado() from public, anon, authenticated;

do $$
declare f text;
begin
  foreach f in array array[
    'aceptar_pedido(uuid)', 'avanzar_pedido(uuid)', 'calificar(uuid,integer,text)',
    'cancelar_pedido(uuid,text)', 'confirmar_pago(uuid)', 'eliminar_invitacion(text)',
    'invitar_usuario(text,text,text)', 'marcar_pagado(uuid,metodo_pago,numeric)',
    'registrar_perfil(text,text,jsonb,jsonb)', 'resumen_admin()', 'set_disponible(boolean)',
    'set_estado_socia(uuid,estado_socia)', 'set_rol_usuario(uuid,text)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- ───────────── 20261008000000_planes_billetera_reclamos.sql ─────────────
-- Cargo de servicio, planes recurrentes, billetera de la socia (liquidaciones), horario de la socia,
-- WhatsApp de soporte, autorización de datos personales y Libro de Reclamaciones.

-- ───────────── Configuración ─────────────
alter table public.config
  add column if not exists cargo_servicio numeric(10,2) not null default 0 check (cargo_servicio between 0 and 50),
  add column if not exists descuento_plan_pct numeric(5,2) not null default 5 check (descuento_plan_pct between 0 and 50),
  add column if not exists whatsapp_soporte text check (whatsapp_soporte ~ '^9\d{8}$');

-- ───────────── Pedidos ─────────────
alter table public.pedidos
  add column if not exists cargo_servicio numeric(10,2) not null default 0,
  add column if not exists descuento numeric(10,2) not null default 0,
  add column if not exists frecuencia text not null default 'unica' check (frecuencia in ('unica', 'semanal', 'quincenal')),
  add column if not exists plan_origen uuid references public.pedidos(id) on delete set null,
  add column if not exists liquidado boolean not null default false;

-- ───────────── Socias: horario semanal ─────────────
-- {"1": [8, 18], "2": [8, 18], ...} con 1 = lunes … 7 = domingo. Vacío = cualquier día y hora.
alter table public.socias add column if not exists horario jsonb not null default '{}';

-- ───────────── Autorización expresa de datos personales (Ley 29733) ─────────────
-- La casilla es obligatoria para registrarse, así que se guarda al crear el perfil.
alter table public.perfiles add column if not exists datos_autorizados_en timestamptz default now();

-- ───────────── Precio en el servidor ─────────────
-- total = base + recargo − descuento de plan (sobre esto se calcula la comisión de la socia).
-- cargo_servicio se cobra aparte al cliente y es 100% de Una Manito.
-- Los pedidos que crea un plan (siguiente visita) conservan cliente, socia y estado.
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
  end if;
  new.pago_estado := 'pendiente';
  new.pago_metodo := null;
  new.propina := 0;
  new.liquidado := false;
  new.motivo_cancelacion := null;
  new.frecuencia := coalesce(new.frecuencia, 'unica');
  if new.frecuencia <> 'unica' and new.fecha is null then raise exception 'Un plan necesita fecha y hora'; end if;
  new.tareas := array(select t from unnest(coalesce(new.tareas, '{}')) t where t = any (s.tareas));

  base := s.precio_hora * new.horas + case when new.con_materiales then s.recargo_materiales else 0 end;
  if new.fecha is null then pct := pct + c.recargo_urgente_pct; end if;
  if new.fecha is not null and extract(isodow from new.fecha at time zone 'America/Lima') in (6, 7) then
    pct := pct + c.recargo_finde_pct;
  end if;
  new.recargo := round(base * pct / 100, 2);
  new.descuento := case when new.frecuencia <> 'unica' then round((base + new.recargo) * c.descuento_plan_pct / 100, 2) else 0 end;
  new.total := base + new.recargo - new.descuento;
  new.cargo_servicio := c.cargo_servicio;
  new.comision_pct := c.comision_pct;
  return new;
end $$;

-- ───────────── Al terminar una visita de un plan, se agenda la siguiente con la misma socia ─────────────
create or replace function public.avanzar_pedido(p_pedido uuid) returns public.estado_pedido
language plpgsql security definer set search_path = public as $$
declare p pedidos; siguiente estado_pedido;
begin
  select * into p from pedidos where id = p_pedido and socia_id = auth.uid() for update;
  if not found then raise exception 'Pedido no encontrado'; end if;
  siguiente := case p.estado when 'aceptado' then 'en_camino' when 'en_camino' then 'en_curso' when 'en_curso' then 'terminado' end;
  if siguiente is null then raise exception 'El pedido ya no puede avanzar'; end if;
  update pedidos set estado = siguiente where id = p_pedido;
  if siguiente = 'terminado' then
    update socias set servicios_hechos = servicios_hechos + 1 where id = auth.uid();
    if p.frecuencia <> 'unica' and p.fecha is not null then
      perform set_config('una.plan', '1', true);
      insert into pedidos (cliente_id, socia_id, estado, servicio, direccion, distrito, referencia, lat, lng, fecha, horas,
                           con_materiales, notas, tareas, frecuencia, plan_origen, total, comision_pct)
      values (p.cliente_id, p.socia_id, 'aceptado', p.servicio, p.direccion, p.distrito, p.referencia, p.lat, p.lng,
              p.fecha + case p.frecuencia when 'semanal' then interval '7 days' else interval '14 days' end,
              p.horas, p.con_materiales, p.notas, p.tareas, p.frecuencia, coalesce(p.plan_origen, p.id), 0, 0);
      perform set_config('una.plan', '', true);
    end if;
  end if;
  return siguiente;
end $$;

-- El cliente (o el equipo) detiene el plan: esa visita queda como única y no se agendan más.
create or replace function public.detener_plan(p_pedido uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update pedidos set frecuencia = 'unica'
  where id = p_pedido and frecuencia <> 'unica' and estado not in ('terminado', 'cancelado')
    and (cliente_id = auth.uid() or public.es_admin());
  if not found then raise exception 'No se pudo detener el plan'; end if;
end $$;

-- ───────────── Horario de la socia ─────────────
create or replace function public.set_horario(p_horario jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if jsonb_typeof(coalesce(p_horario, '{}')) <> 'object' then raise exception 'Horario no válido'; end if;
  update socias set horario = coalesce(p_horario, '{}') where id = auth.uid();
  if not found then raise exception 'Solo para socias'; end if;
end $$;

-- ───────────── Liquidaciones: la socia cobra directo al cliente y luego paga a Una Manito su parte ─────────────
create or replace function public.marcar_liquidado(p_pedidos uuid[]) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.es_admin() then raise exception 'Solo administradores'; end if;
  update pedidos set liquidado = true
  where id = any (p_pedidos) and estado = 'terminado' and pago_estado <> 'pendiente' and not liquidado;
  get diagnostics n = row_count;
  return n;
end $$;

-- ───────────── Libro de Reclamaciones virtual (Ley 32495 / Código de Protección al Consumidor) ─────────────
create table if not exists public.reclamaciones (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity,
  creado_en timestamptz not null default now(),
  usuario_id uuid,
  tipo text not null check (tipo in ('reclamo', 'queja')),
  nombre text not null check (length(nombre) between 3 and 120),
  tipo_documento text not null check (tipo_documento in ('DNI', 'CE')),
  documento text not null check (length(documento) between 8 and 12),
  email text not null check (email like '%@%'),
  telefono text check (telefono is null or telefono ~ '^\d{9}$'),
  direccion text,
  menor_de_edad boolean not null default false,
  apoderado text,
  bien text not null check (bien in ('producto', 'servicio')),
  monto numeric(10,2) check (monto is null or monto >= 0),
  descripcion_bien text not null check (length(descripcion_bien) <= 500),
  detalle text not null check (length(detalle) between 10 and 3000),
  pedido_consumidor text not null check (length(pedido_consumidor) between 3 and 1500),
  respuesta text,
  respondido_en timestamptz
);
alter table public.reclamaciones enable row level security;
drop policy if exists "ver reclamaciones" on public.reclamaciones;
create policy "ver reclamaciones" on public.reclamaciones for select using (usuario_id = auth.uid() or public.es_admin());

-- Cualquiera puede registrar (incluso sin cuenta). Devuelve el número correlativo.
create or replace function public.registrar_reclamo(p jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare n bigint;
begin
  insert into reclamaciones (usuario_id, tipo, nombre, tipo_documento, documento, email, telefono, direccion, menor_de_edad, apoderado,
                             bien, monto, descripcion_bien, detalle, pedido_consumidor)
  values (auth.uid(), p->>'tipo', trim(p->>'nombre'), coalesce(p->>'tipo_documento', 'DNI'), upper(trim(p->>'documento')), lower(trim(p->>'email')),
          nullif(trim(p->>'telefono'), ''), nullif(trim(p->>'direccion'), ''), coalesce((p->>'menor_de_edad')::boolean, false),
          nullif(trim(p->>'apoderado'), ''), coalesce(p->>'bien', 'servicio'), nullif(p->>'monto', '')::numeric,
          trim(p->>'descripcion_bien'), trim(p->>'detalle'), trim(p->>'pedido_consumidor'))
  returning numero into n;
  return n;
end $$;

create or replace function public.responder_reclamo(p_id uuid, p_respuesta text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.es_admin() then raise exception 'Solo administradores'; end if;
  if length(trim(coalesce(p_respuesta, ''))) < 5 then raise exception 'Escribe una respuesta'; end if;
  update reclamaciones set respuesta = trim(p_respuesta), respondido_en = now() where id = p_id;
end $$;

-- ───────────── Permisos ─────────────
revoke execute on function public.detener_plan(uuid) from public, anon;
revoke execute on function public.set_horario(jsonb) from public, anon;
revoke execute on function public.marcar_liquidado(uuid[]) from public, anon;
revoke execute on function public.responder_reclamo(uuid, text) from public, anon;
grant execute on function public.detener_plan(uuid) to authenticated;
grant execute on function public.set_horario(jsonb) to authenticated;
grant execute on function public.marcar_liquidado(uuid[]) to authenticated;
grant execute on function public.responder_reclamo(uuid, text) to authenticated;
grant execute on function public.registrar_reclamo(jsonb) to anon, authenticated;

-- ───────────── 20261009000000_foto_perfil_sin_duplicados.sql ─────────────
-- Foto de perfil para todos los usuarios y bloqueo de pedidos duplicados por doble toque.
alter table public.perfiles add column if not exists foto_url text;

create or replace function public.set_mi_foto(p_url text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_url is null or length(p_url) > 500 or p_url !~ '^https://' then raise exception 'Foto no válida'; end if;
  update perfiles set foto_url = p_url where id = auth.uid();
  if not found then raise exception 'Perfil no encontrado'; end if;
  update socias set foto_url = p_url where id = auth.uid();
end $$;
revoke execute on function public.set_mi_foto(text) from public, anon;
grant execute on function public.set_mi_foto(text) to authenticated;

-- Mismo cliente, servicio y dirección buscando socia en los últimos 2 minutos = duplicado.
create or replace function public.pedidos_sin_duplicados() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('una.plan', true), '') = '1' then return new; end if;
  if exists (select 1 from pedidos where cliente_id = auth.uid() and servicio = new.servicio and direccion = new.direccion
             and estado = 'buscando' and creado_en > now() - interval '2 minutes') then
    raise exception 'Ya enviaste este pedido. Estamos buscando socia.';
  end if;
  return new;
end $$;
revoke execute on function public.pedidos_sin_duplicados() from public, anon, authenticated;
drop trigger if exists pedidos_sin_duplicados on public.pedidos;
create trigger pedidos_sin_duplicados before insert on public.pedidos for each row execute function public.pedidos_sin_duplicados();
