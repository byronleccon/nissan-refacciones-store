-- ============================================
-- BLOQUE 2: funciones auxiliares, RLS, políticas y trigger
-- ============================================

-- ===== 1. FUNCIONES AUXILIARES =====

-- Devuelve el rol del usuario actual
create or replace function public.rol_actual()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select rol from public.perfiles where id = (select auth.uid());
$$;

-- Devuelve la sucursal del usuario actual
create or replace function public.sucursal_actual()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select sucursal_id from public.perfiles where id = (select auth.uid());
$$;

-- Solo usuarios con sesión pueden usarlas
revoke execute on function public.rol_actual() from public, anon;
revoke execute on function public.sucursal_actual() from public, anon;
grant execute on function public.rol_actual() to authenticated;
grant execute on function public.sucursal_actual() to authenticated;

-- ===== 2. ACTIVAR RLS =====

alter table public.sucursales enable row level security;
alter table public.perfiles   enable row level security;
alter table public.categorias enable row level security;
alter table public.productos  enable row level security;

-- ===== 3. POLÍTICAS =====

-- Sucursales
create policy "Ver sucursales activas"
  on public.sucursales for select
  to anon, authenticated
  using (activa = true or (select public.rol_actual()) = 'admin_general');

create policy "Admin general administra sucursales"
  on public.sucursales for all
  to authenticated
  using ((select public.rol_actual()) = 'admin_general')
  with check ((select public.rol_actual()) = 'admin_general');

-- Categorías
create policy "Ver categorias"
  on public.categorias for select
  to anon, authenticated
  using (true);

create policy "Admin general administra categorias"
  on public.categorias for all
  to authenticated
  using ((select public.rol_actual()) = 'admin_general')
  with check ((select public.rol_actual()) = 'admin_general');

-- Productos
create policy "Ver productos publicados"
  on public.productos for select
  to anon, authenticated
  using (publicado = true or (select public.rol_actual()) = 'admin_general');

create policy "Admin general administra productos"
  on public.productos for all
  to authenticated
  using ((select public.rol_actual()) = 'admin_general')
  with check ((select public.rol_actual()) = 'admin_general');

-- Perfiles
create policy "Ver mi perfil o todos si soy admin general"
  on public.perfiles for select
  to authenticated
  using (id = (select auth.uid()) or (select public.rol_actual()) = 'admin_general');

create policy "Admin general administra perfiles"
  on public.perfiles for all
  to authenticated
  using ((select public.rol_actual()) = 'admin_general')
  with check ((select public.rol_actual()) = 'admin_general');

-- ===== 4. TRIGGER: crear perfil al registrarse =====

create or replace function public.crear_perfil_nuevo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre_completo)
  values (new.id, new.raw_user_meta_data ->> 'nombre_completo');
  return new;
end;
$$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil_nuevo_usuario();