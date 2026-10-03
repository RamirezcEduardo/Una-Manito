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
