create table public.vehiculos (
  id uuid primary key default gen_random_uuid(),
  modelo text not null,
  anio integer not null check (anio >= 2015),
  version text not null,
  motor text not null,
  creado_en timestamptz not null default now(),
  unique (modelo, anio, version, motor)
);

create table public.compatibilidades (
  producto_id uuid not null references public.productos (id) on delete cascade,
  vehiculo_id uuid not null references public.vehiculos (id) on delete cascade,
  creado_en timestamptz not null default now(),
  primary key (producto_id, vehiculo_id)
);

create index compatibilidades_vehiculo_id_idx
  on public.compatibilidades (vehiculo_id);

alter table public.vehiculos enable row level security;
alter table public.compatibilidades enable row level security;

create policy "Ver vehiculos"
  on public.vehiculos for select
  to anon, authenticated
  using (true);

create policy "Admin general administra vehiculos"
  on public.vehiculos for all
  to authenticated
  using ((select public.rol_actual()) = 'admin_general')
  with check ((select public.rol_actual()) = 'admin_general');

create policy "Ver compatibilidades de productos publicados"
  on public.compatibilidades for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.productos p
      where p.id = producto_id and p.publicado = true
    )
    or (select public.rol_actual()) = 'admin_general'
  );

create policy "Admin general administra compatibilidades"
  on public.compatibilidades for all
  to authenticated
  using ((select public.rol_actual()) = 'admin_general')
  with check ((select public.rol_actual()) = 'admin_general');

-- Datos de prueba (ficticios)
insert into public.vehiculos (modelo, anio, version, motor) values
  ('Modelo-PRUEBA A', 2018, 'Base (PRUEBA)', '1.6L (PRUEBA)'),
  ('Modelo-PRUEBA A', 2020, 'Base (PRUEBA)', '1.6L (PRUEBA)'),
  ('Modelo-PRUEBA B', 2019, 'Full (PRUEBA)', '2.0L (PRUEBA)');

insert into public.compatibilidades (producto_id, vehiculo_id)
select p.id, v.id
from public.productos p, public.vehiculos v
where p.sku = 'PRUEBA-001'
  and v.modelo = 'Modelo-PRUEBA A';

insert into public.compatibilidades (producto_id, vehiculo_id)
select p.id, v.id
from public.productos p, public.vehiculos v
where p.sku = 'PRUEBA-002'
  and v.modelo = 'Modelo-PRUEBA B';