-- Notificaciones push (Web Push): avisos con la app cerrada.
-- Las claves VAPID y el secreto se guardan aparte en ajustes_privados (no se suben al repositorio):
--   insert into ajustes_privados (clave, valor) values ('vapid_publica','…'),('vapid_privada','…'),('push_secreto','…');
create extension if not exists pg_net with schema extensions;

create table if not exists public.push_suscripciones (
  endpoint text primary key,
  usuario_id uuid not null default auth.uid(),
  p256dh text not null,
  auth text not null,
  creado_en timestamptz not null default now()
);
alter table public.push_suscripciones enable row level security;
drop policy if exists "mis suscripciones ver" on public.push_suscripciones;
create policy "mis suscripciones ver" on public.push_suscripciones for select using (usuario_id = auth.uid());
drop policy if exists "mis suscripciones crear" on public.push_suscripciones;
create policy "mis suscripciones crear" on public.push_suscripciones for insert to authenticated with check (usuario_id = auth.uid());
drop policy if exists "mis suscripciones borrar" on public.push_suscripciones;
create policy "mis suscripciones borrar" on public.push_suscripciones for delete using (usuario_id = auth.uid());

create table if not exists public.ajustes_privados (clave text primary key, valor text not null);
alter table public.ajustes_privados enable row level security; -- sin políticas: solo el servidor la lee

create or replace function public.guardar_suscripcion(p_endpoint text, p_p256dh text, p_auth text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Inicia sesión'; end if;
  if p_endpoint !~ '^https://' or length(p_endpoint) > 1000 then raise exception 'Suscripción no válida'; end if;
  insert into push_suscripciones (endpoint, usuario_id, p256dh, auth) values (p_endpoint, auth.uid(), p_p256dh, p_auth)
  on conflict (endpoint) do update set usuario_id = auth.uid(), p256dh = excluded.p256dh, auth = excluded.auth, creado_en = now();
end $$;
revoke execute on function public.guardar_suscripcion(text, text, text) from public, anon;
grant execute on function public.guardar_suscripcion(text, text, text) to authenticated;

create or replace function public.clave_push() returns text
language sql stable security definer set search_path = public as $$ select valor from ajustes_privados where clave = 'vapid_publica' $$;
grant execute on function public.clave_push() to anon, authenticated;

-- Pedido nuevo o cambio de estado → función "avisos-push" (supabase/functions/avisos-push).
create or replace function public.avisar_push() returns trigger
language plpgsql security definer set search_path = public as $$
declare secreto text;
begin
  if tg_op = 'UPDATE' and new.estado is not distinct from old.estado then return new; end if;
  select valor into secreto from ajustes_privados where clave = 'push_secreto';
  if secreto is null then return new; end if;
  perform net.http_post(
    url := 'https://yrmyrhmmixeabwbglcse.supabase.co/functions/v1/avisos-push',
    body := jsonb_build_object('pedido_id', new.id, 'estado', new.estado),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-secreto', secreto)
  );
  return new;
end $$;
revoke execute on function public.avisar_push() from public, anon, authenticated;
drop trigger if exists avisar_push on public.pedidos;
create trigger avisar_push after insert or update of estado on public.pedidos for each row execute function public.avisar_push();
