insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'productos',
  'productos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
);

create policy "Admin general sube fotos de productos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'productos'
    and (select public.rol_actual()) = 'admin_general'
  );

create policy "Admin general actualiza fotos de productos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'productos'
    and (select public.rol_actual()) = 'admin_general'
  );

create policy "Admin general borra fotos de productos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'productos'
    and (select public.rol_actual()) = 'admin_general'
  );