alter table public.productos
  add column if not exists destacado boolean not null default false;