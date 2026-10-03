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
