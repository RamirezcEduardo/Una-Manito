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

-- Avanzar sin saltarse pasos por doble toque: la app envía el estado que ve la socia.
create or replace function public.avanzar_pedido(p_pedido uuid, p_desde public.estado_pedido) returns public.estado_pedido
language plpgsql security definer set search_path = public as $$
declare actual estado_pedido;
begin
  -- "for update": si llegan dos toques a la vez, el segundo espera y luego ve el estado ya cambiado.
  select estado into actual from pedidos where id = p_pedido and socia_id = auth.uid() for update;
  if not found then raise exception 'Pedido no encontrado'; end if;
  if actual <> p_desde then return actual; end if;
  return public.avanzar_pedido(p_pedido);
end $$;
revoke execute on function public.avanzar_pedido(uuid, public.estado_pedido) from public, anon;
grant execute on function public.avanzar_pedido(uuid, public.estado_pedido) to authenticated;
