-- Fecha en que cada usuario aceptó los Términos y la Política de privacidad.
-- La casilla es obligatoria para registrarse, así que se guarda al crear el perfil.
alter table public.perfiles add column if not exists terminos_aceptados_en timestamptz default now();
