-- ============================================
-- BLOQUE 1: tablas base (en español)
-- ============================================

-- Sucursales
create table public.sucursales (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  direccion text not null,
  telefono text,
  hora_apertura time not null,
  hora_cierre time not null,
  zona_horaria text not null default 'America/Mexico_City',
  activa boolean not null default true,
  creada_en timestamptz not null default now(),
  check (hora_cierre > hora_apertura)
);

-- Perfiles de usuario (vinculados a Supabase Auth)
create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre_completo text,
  telefono text,
  rol text not null default 'cliente'
    check (rol in ('cliente', 'admin_sucursal', 'admin_general')),
  sucursal_id uuid references public.sucursales (id) on delete set null,
  creado_en timestamptz not null default now(),
  -- Un administrador de sucursal debe tener sucursal asignada
  check (rol <> 'admin_sucursal' or sucursal_id is not null)
);

-- Categorías
create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  slug text not null unique,
  creada_en timestamptz not null default now()
);

-- Productos (catálogo global, precio único)
create table public.productos (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  nombre text not null,
  descripcion text,
  categoria_id uuid references public.categorias (id) on delete set null,
  precio numeric(10,2) not null check (precio >= 0),
  urls_imagenes text[] not null default '{}',
  publicado boolean not null default false,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- Índices para búsquedas rápidas
create index productos_categoria_id_idx on public.productos (categoria_id);
create index productos_nombre_idx on public.productos (nombre);
create index perfiles_sucursal_id_idx on public.perfiles (sucursal_id);