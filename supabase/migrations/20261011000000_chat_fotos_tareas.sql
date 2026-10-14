-- Chat cliente–socia, fotos de antes y después, avance de tareas y socia preferida.
alter table public.pedidos
  add column if not exists tareas_hechas text[] not null default '{}',
  add column if not exists fotos jsonb not null default '[]',
  add column if not exists socia_preferida uuid;

create table if not exists public.mensajes (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  autor_id uuid not null default auth.uid(),
  texto text not null check (length(trim(texto)) between 1 and 1000),
  creado_en timestamptz not null default now()
);
create index if not exists mensajes_pedido on public.mensajes (pedido_id, creado_en);
alter table public.mensajes enable row level security;
drop policy if exists "ver mensajes" on public.mensajes;
create policy "ver mensajes" on public.mensajes for select using (
  public.es_admin() or exists (select 1 from public.pedidos p where p.id = pedido_id and (p.cliente_id = auth.uid() or p.socia_id = auth.uid()))
);
drop policy if exists "escribir mensajes" on public.mensajes;
create policy "escribir mensajes" on public.mensajes for insert to authenticated with check (
  autor_id = auth.uid() and exists (
    select 1 from public.pedidos p where p.id = pedido_id and p.socia_id is not null
      and (p.cliente_id = auth.uid() or p.socia_id = auth.uid())
      and (p.estado in ('aceptado', 'en_camino', 'en_curso') or (p.estado = 'terminado' and p.actualizado_en > now() - interval '2 days'))
  )
);
alter publication supabase_realtime add table public.mensajes;

create or replace function public.marcar_tarea(p_pedido uuid, p_tarea text, p_hecha boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  update pedidos set tareas_hechas = case
      when p_hecha then (select array(select distinct t from unnest(tareas_hechas || p_tarea) t where t = any (tareas)))
      else array_remove(tareas_hechas, p_tarea) end
  where id = p_pedido and socia_id = auth.uid() and estado in ('en_curso', 'terminado');
  if not found then raise exception 'Solo durante el servicio'; end if;
end $$;

create or replace function public.agregar_foto(p_pedido uuid, p_tipo text, p_ruta text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_tipo not in ('antes', 'despues') then raise exception 'Tipo no válido'; end if;
  if p_ruta not like p_pedido::text || '/%' then raise exception 'Ruta no válida'; end if;
  update pedidos set fotos = fotos || jsonb_build_array(jsonb_build_object('tipo', p_tipo, 'ruta', p_ruta, 'en', now()))
  where id = p_pedido and socia_id = auth.uid() and estado in ('en_curso', 'terminado') and jsonb_array_length(fotos) < 8;
  if not found then raise exception 'No se pudo guardar la foto (máximo 8)'; end if;
end $$;
revoke execute on function public.marcar_tarea(uuid, text, boolean) from public, anon;
revoke execute on function public.agregar_foto(uuid, text, text) from public, anon;
grant execute on function public.marcar_tarea(uuid, text, boolean) to authenticated;
grant execute on function public.agregar_foto(uuid, text, text) to authenticated;

-- Bucket privado: fotos del servicio en la carpeta del pedido. Solo cliente, socia y equipo las ven.
insert into storage.buckets (id, name, public) values ('servicios', 'servicios', false) on conflict (id) do nothing;
drop policy if exists "subir fotos de servicio" on storage.objects;
create policy "subir fotos de servicio" on storage.objects for insert to authenticated
  with check (bucket_id = 'servicios' and exists (
    select 1 from public.pedidos p where p.id::text = (storage.foldername(name))[1] and p.socia_id = auth.uid() and p.estado in ('en_curso', 'terminado')));
drop policy if exists "ver fotos de servicio" on storage.objects;
create policy "ver fotos de servicio" on storage.objects for select to authenticated
  using (bucket_id = 'servicios' and (public.es_admin() or exists (
    select 1 from public.pedidos p where p.id::text = (storage.foldername(name))[1] and (p.cliente_id = auth.uid() or p.socia_id = auth.uid()))));
