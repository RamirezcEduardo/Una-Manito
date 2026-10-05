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
