-- Referidos: cada persona tiene un código (8 caracteres de su id). Quien se registra con un enlace de invitación
-- queda vinculada a quien la invitó. El premio lo entrega el equipo desde el panel (por ahora manual).
create table if not exists public.referidos (
  invitado uuid primary key references public.perfiles(id) on delete cascade,
  invitador uuid not null references public.perfiles(id) on delete cascade,
  creado_en timestamptz not null default now(),
  check (invitado <> invitador)
);
alter table public.referidos enable row level security;
drop policy if exists "ver referidos" on public.referidos;
create policy "ver referidos" on public.referidos for select using (invitador = auth.uid() or invitado = auth.uid() or public.es_admin());

create or replace function public.codigo_referido(p_id uuid) returns text
language sql immutable as $$ select upper(left(replace(p_id::text, '-', ''), 8)) $$;

create or replace function public.registrar_referido(p_codigo text) returns boolean
language plpgsql security definer set search_path = public as $$
declare quien uuid;
begin
  if auth.uid() is null or exists (select 1 from referidos where invitado = auth.uid()) then return false; end if;
  -- Solo cuentas nuevas (menos de 7 días) y sin pedidos todavía.
  if not exists (select 1 from perfiles where id = auth.uid() and creado_en > now() - interval '7 days') then return false; end if;
  if exists (select 1 from pedidos where cliente_id = auth.uid()) then return false; end if;
  select id into quien from perfiles where public.codigo_referido(id) = upper(trim(p_codigo)) and id <> auth.uid();
  if quien is null then return false; end if;
  insert into referidos (invitado, invitador) values (auth.uid(), quien);
  return true;
end $$;

create or replace function public.mis_referidos() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'invitados', count(*),
    'con_servicio', count(*) filter (where exists (select 1 from pedidos p where p.cliente_id = r.invitado and p.estado = 'terminado')))
  from referidos r where r.invitador = auth.uid();
$$;
revoke execute on function public.registrar_referido(text) from public, anon;
revoke execute on function public.mis_referidos() from public, anon;
grant execute on function public.registrar_referido(text) to authenticated;
grant execute on function public.mis_referidos() to authenticated;
