-- Ejecutar una sola vez en Supabase > SQL Editor.
-- Tabla de interesados de la landing. No contiene datos de pago.
create table if not exists public.inscripciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 2 and 100),
  negocio text not null check (char_length(negocio) between 2 and 120),
  email text not null check (char_length(email) between 5 and 180),
  telefono text not null check (telefono ~ '^\+[1-9][0-9]{7,14}$'),
  ciudad text not null check (char_length(ciudad) between 2 and 80),
  plan text not null check (plan in ('esencial', 'interactivo', 'inmersivo')),
  precio_bs smallint not null,
  consentimiento boolean not null check (consentimiento = true),
  consentimiento_sms boolean not null default false,
  origen text not null default 'landing' check (origen = 'landing'),
  estado text not null default 'nuevo' check (estado in ('nuevo', 'contactado', 'descartado')),
  creado_en timestamptz not null default now(),
  constraint plan_precio_consistente check (
    (plan = 'esencial' and precio_bs = 29) or
    (plan = 'interactivo' and precio_bs = 49) or
    (plan = 'inmersivo' and precio_bs = 99)
  )
);

create unique index if not exists inscripciones_email_unico
  on public.inscripciones (lower(email));
create index if not exists inscripciones_plan_fecha
  on public.inscripciones (plan, creado_en desc);

-- Impide la lectura y escritura pública, incluso si la tabla está publicada en la API.
alter table public.inscripciones enable row level security;
revoke all on table public.inscripciones from anon, authenticated;
grant select, insert, update on table public.inscripciones to service_role;
-- No hay políticas para visitantes: solo la función del servidor usa la clave secreta.
