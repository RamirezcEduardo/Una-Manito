-- Ubicación en vivo de la socia mientras va en camino. Solo la ven el cliente del pedido, la socia y el equipo.
-- Se borra sola cuando la socia llega (o el pedido se cancela).
create table if not exists public.seguimiento (
  pedido_id uuid primary key,
  lat double precision not null,
  lng double precision not null,
  actualizado_en timestamptz not null default now()
);
alter table public.seguimiento enable row level security;
drop policy if exists "ver seguimiento" on public.seguimiento;
create policy "ver seguimiento" on public.seguimiento for select using (
  public.es_admin() or exists (select 1 from public.pedidos p where p.id = pedido_id and (p.cliente_id = auth.uid() or p.socia_id = auth.uid()))
);

create or replace function public.actualizar_ubicacion(p_pedido uuid, p_lat double precision, p_lng double precision) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_lat not between -90 and 90 or p_lng not between -180 and 180 then raise exception 'Ubicación no válida'; end if;
  if not exists (select 1 from pedidos where id = p_pedido and socia_id = auth.uid() and estado in ('aceptado', 'en_camino')) then
    return; -- fuera de la etapa de traslado no se guarda nada
  end if;
  insert into seguimiento (pedido_id, lat, lng, actualizado_en) values (p_pedido, p_lat, p_lng, now())
  on conflict (pedido_id) do update set lat = excluded.lat, lng = excluded.lng, actualizado_en = now();
end $$;
revoke execute on function public.actualizar_ubicacion(uuid, double precision, double precision) from public, anon;
grant execute on function public.actualizar_ubicacion(uuid, double precision, double precision) to authenticated;

create or replace function public.borrar_seguimiento() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.estado not in ('aceptado', 'en_camino') then delete from seguimiento where pedido_id = new.id; end if;
  return new;
end $$;
revoke execute on function public.borrar_seguimiento() from public, anon, authenticated;
drop trigger if exists borrar_seguimiento on public.pedidos;
create trigger borrar_seguimiento after update of estado on public.pedidos for each row execute function public.borrar_seguimiento();

alter publication supabase_realtime add table public.seguimiento;
