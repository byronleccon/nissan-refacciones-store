create table public.carrito_items (
  usuario_id uuid not null references auth.users (id) on delete cascade,
  producto_id uuid not null references public.productos (id) on delete cascade,
  cantidad integer not null check (cantidad between 1 and 99),
  actualizado_en timestamptz not null default now(),
  primary key (usuario_id, producto_id)
);

alter table public.carrito_items enable row level security;

create policy "Ver mi carrito"
  on public.carrito_items for select
  to authenticated
  using (usuario_id = (select auth.uid()));

create policy "Agregar a mi carrito"
  on public.carrito_items for insert
  to authenticated
  with check (
    usuario_id = (select auth.uid())
    and exists (
      select 1 from public.productos p
      where p.id = producto_id and p.publicado = true
    )
  );

create policy "Cambiar mi carrito"
  on public.carrito_items for update
  to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

create policy "Quitar de mi carrito"
  on public.carrito_items for delete
  to authenticated
  using (usuario_id = (select auth.uid()));