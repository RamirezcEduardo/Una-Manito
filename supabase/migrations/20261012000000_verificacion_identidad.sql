-- Verificación de identidad con prueba de vida (video corto con un gesto al azar), revisada por el equipo.
-- El video es un dato sensible (Ley 29733): se borra al revisarlo; solo queda el resultado.
alter table public.perfiles add column if not exists verificado boolean not null default false;

create table if not exists public.verificaciones (
  usuario_id uuid primary key,
  video text,
  gesto text not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobada', 'rechazada')),
  motivo text,
  creado_en timestamptz not null default now(),
  revisado_en timestamptz
);
alter table public.verificaciones enable row level security;
drop policy if exists "ver verificacion" on public.verificaciones;
create policy "ver verificacion" on public.verificaciones for select using (usuario_id = auth.uid() or public.es_admin());

create or replace function public.enviar_verificacion(p_video text, p_gesto text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_video not like auth.uid()::text || '/%' then raise exception 'Video no válido'; end if;
  if length(coalesce(p_gesto, '')) not between 3 and 80 then raise exception 'Gesto no válido'; end if;
  if not exists (select 1 from perfiles where id = auth.uid()) then raise exception 'Primero completa tu registro'; end if;
  insert into verificaciones (usuario_id, video, gesto, estado, motivo, creado_en, revisado_en)
  values (auth.uid(), p_video, p_gesto, 'pendiente', null, now(), null)
  on conflict (usuario_id) do update set video = excluded.video, gesto = excluded.gesto, estado = 'pendiente', motivo = null, creado_en = now(), revisado_en = null;
  update perfiles set verificado = false where id = auth.uid();
end $$;

create or replace function public.revisar_verificacion(p_usuario uuid, p_aprobar boolean, p_motivo text default null) returns text
language plpgsql security definer set search_path = public as $$
declare ruta text;
begin
  if not public.es_admin() then raise exception 'Solo administradores'; end if;
  select video into ruta from verificaciones where usuario_id = p_usuario for update;
  if not found then raise exception 'No hay verificación'; end if;
  update verificaciones set estado = case when p_aprobar then 'aprobada' else 'rechazada' end,
         motivo = left(p_motivo, 200), revisado_en = now(), video = null
  where usuario_id = p_usuario;
  update perfiles set verificado = p_aprobar where id = p_usuario;
  return ruta; -- la app borra este video del almacenamiento
end $$;
revoke execute on function public.enviar_verificacion(text, text) from public, anon;
revoke execute on function public.revisar_verificacion(uuid, boolean, text) from public, anon;
grant execute on function public.enviar_verificacion(text, text) to authenticated;
grant execute on function public.revisar_verificacion(uuid, boolean, text) to authenticated;

-- Una socia solo se aprueba si su identidad está verificada.
create or replace function public.set_estado_socia(p_socia uuid, p_estado public.estado_socia) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.es_admin() then raise exception 'Solo administradores'; end if;
  if p_estado = 'aprobada' and not exists (select 1 from perfiles where id = p_socia and verificado) then
    raise exception 'Primero aprueba su verificación de identidad (video)';
  end if;
  update socias set estado = p_estado, disponible = false where id = p_socia;
  update perfiles set rol = 'socia' where id = p_socia;
end $$;
update perfiles set verificado = true where id in (select id from socias where estado = 'aprobada');

-- Almacenamiento privado de los videos (máx. 15 MB).
insert into storage.buckets (id, name, public, file_size_limit) values ('verificaciones', 'verificaciones', false, 15728640) on conflict (id) do nothing;
drop policy if exists "subir mi verificacion" on storage.objects;
create policy "subir mi verificacion" on storage.objects for insert to authenticated
  with check (bucket_id = 'verificaciones' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "ver verificaciones" on storage.objects;
create policy "ver verificaciones" on storage.objects for select to authenticated
  using (bucket_id = 'verificaciones' and ((storage.foldername(name))[1] = auth.uid()::text or public.es_admin()));
drop policy if exists "borrar verificaciones" on storage.objects;
create policy "borrar verificaciones" on storage.objects for delete to authenticated
  using (bucket_id = 'verificaciones' and public.es_admin());
