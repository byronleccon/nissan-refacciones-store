create table public.inventario_sucursal (
  sucursal_id uuid not null references public.sucursales (id) on delete cascade,
  producto_id uuid not null references public.productos (id) on delete cascade,
  stock_fisico integer not null default 0 check (stock_fisico >= 0),
  stock_reservado integer not null default 0 check (stock_reservado >= 0),
  actualizado_en timestamptz not null default now(),
  primary key (sucursal_id, producto_id),
  check (stock_reservado <= stock_fisico)
);

create index inventario_producto_id_idx
  on public.inventario_sucursal (producto_id);

create table public.movimientos_inventario (
  id uuid primary key default gen_random_uuid(),
  sucursal_id uuid not null references public.sucursales (id),
  producto_id uuid not null references public.productos (id),
  tipo text not null check (
    tipo in ('entrada', 'ajuste', 'reserva', 'liberacion', 'salida')
  ),
  cantidad integer not null check (cantidad <> 0),
  motivo text,
  usuario_id uuid references auth.users (id),
  creado_en timestamptz not null default now()
);

create index movimientos_sucursal_producto_idx
  on public.movimientos_inventario (sucursal_id, producto_id, creado_en desc);

alter table public.inventario_sucursal enable row level security;
alter table public.movimientos_inventario enable row level security;

create policy "Ver inventario de productos publicados"
  on public.inventario_sucursal for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.productos p
      where p.id = producto_id and p.publicado = true
    )
    or (select public.rol_actual()) = 'admin_general'
    or (
      (select public.rol_actual()) = 'admin_sucursal'
      and sucursal_id = (select public.sucursal_actual())
    )
  );

create policy "Ver movimientos de mi sucursal o todos si soy admin general"
  on public.movimientos_inventario for select
  to authenticated
  using (
    (select public.rol_actual()) = 'admin_general'
    or (
      (select public.rol_actual()) = 'admin_sucursal'
      and sucursal_id = (select public.sucursal_actual())
    )
  );