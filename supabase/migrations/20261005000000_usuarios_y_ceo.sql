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
