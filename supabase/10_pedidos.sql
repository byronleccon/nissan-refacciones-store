-- ============================================
-- Horarios por día de la semana (0 = domingo ... 6 = sábado)
-- ============================================
create table public.horarios_sucursal (
  sucursal_id uuid not null references public.sucursales (id) on delete cascade,
  dia_semana integer not null check (dia_semana between 0 and 6),
  abre time not null,
  cierra time not null,
  primary key (sucursal_id, dia_semana),
  check (cierra > abre)
);

alter table public.horarios_sucursal enable row level security;

create policy "Ver horarios"
  on public.horarios_sucursal for select
  to anon, authenticated
  using (true);

create policy "Admin general administra horarios"
  on public.horarios_sucursal for all
  to authenticated
  using ((select public.rol_actual()) = 'admin_general')
  with check ((select public.rol_actual()) = 'admin_general');

-- Horario inicial: lunes a sábado 9-20, domingo 9-14
insert into public.horarios_sucursal (sucursal_id, dia_semana, abre, cierra)
select s.id, d.dia, '09:00',
  case when d.dia = 0 then '14:00'::time else '20:00'::time end
from public.sucursales s
cross join generate_series(0, 6) as d(dia);

-- ============================================
-- Pedidos
-- ============================================
create sequence public.pedidos_folio_seq;

create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  folio text not null unique
    default ('P-' || lpad(nextval('public.pedidos_folio_seq')::text, 6, '0')),
  cliente_id uuid not null references auth.users (id),
  sucursal_id uuid not null references public.sucursales (id),
  fecha_recogida date not null,
  fecha_limite timestamptz not null,
  estado text not null default 'confirmado'
    check (estado in ('confirmado', 'preparando', 'listo', 'recogido', 'cancelado', 'vencido')),
  total numeric(10,2) not null check (total >= 0),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index pedidos_cliente_idx on public.pedidos (cliente_id, creado_en desc);
create index pedidos_sucursal_estado_idx on public.pedidos (sucursal_id, estado);

-- ============================================
-- Detalle (copia histórica de nombre, SKU y precio)
-- ============================================
create table public.detalle_pedido (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos (id) on delete cascade,
  producto_id uuid not null references public.productos (id),
  sku text not null,
  nombre text not null,
  precio_unitario numeric(10,2) not null check (precio_unitario >= 0),
  cantidad integer not null check (cantidad > 0)
);

create index detalle_pedido_pedido_idx on public.detalle_pedido (pedido_id);

-- ============================================
-- Historial de estados
-- ============================================
create table public.historial_estados_pedido (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos (id) on delete cascade,
  estado text not null,
  usuario_id uuid references auth.users (id),
  nota text,
  creado_en timestamptz not null default now()
);

create index historial_pedido_idx on public.historial_estados_pedido (pedido_id, creado_en);

-- ============================================
-- RLS: solo lectura desde el navegador.
-- Crear y cambiar pedidos se hará únicamente con funciones RPC.
-- ============================================
alter table public.pedidos enable row level security;
alter table public.detalle_pedido enable row level security;
alter table public.historial_estados_pedido enable row level security;

create policy "Ver mis pedidos, los de mi sucursal o todos"
  on public.pedidos for select
  to authenticated
  using (
    cliente_id = (select auth.uid())
    or (select public.rol_actual()) = 'admin_general'
    or (
      (select public.rol_actual()) = 'admin_sucursal'
      and sucursal_id = (select public.sucursal_actual())
    )
  );

create policy "Ver detalle de pedidos visibles"
  on public.detalle_pedido for select
  to authenticated
  using (exists (select 1 from public.pedidos p where p.id = pedido_id));

create policy "Ver historial de pedidos visibles"
  on public.historial_estados_pedido for select
  to authenticated
  using (exists (select 1 from public.pedidos p where p.id = pedido_id));