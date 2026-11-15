-- Categorías
insert into public.categorias (nombre, slug) values
  ('Frenos', 'frenos'),
  ('Filtros', 'filtros'),
  ('Suspensión', 'suspension'),
  ('Motor', 'motor');

-- Productos de prueba
insert into public.productos (sku, nombre, descripcion, categoria_id, precio, publicado)
values
  ('PRUEBA-001', 'Pastillas de freno delanteras (PRUEBA)', 'Producto ficticio de prueba.',
    (select id from public.categorias where slug = 'frenos'), 850.00, true),
  ('PRUEBA-002', 'Filtro de aceite (PRUEBA)', 'Producto ficticio de prueba.',
    (select id from public.categorias where slug = 'filtros'), 180.00, true),
  ('PRUEBA-003', 'Amortiguador delantero (PRUEBA)', 'Producto ficticio de prueba.',
    (select id from public.categorias where slug = 'suspension'), 1450.00, true),
  ('PRUEBA-004', 'Bujía (PRUEBA)', 'Producto ficticio de prueba.',
    (select id from public.categorias where slug = 'motor'), 120.00, false);

-- Sucursales de prueba
insert into public.sucursales (nombre, direccion, telefono, hora_apertura, hora_cierre, zona_horaria)
values
  ('Sucursal Centro (PRUEBA)', 'Dirección de prueba 1', '0000000001', '09:00', '18:00', 'America/Mexico_City'),
  ('Sucursal Norte (PRUEBA)', 'Dirección de prueba 2', '0000000002', '09:00', '19:00', 'America/Mexico_City');

-- Inventario de prueba
insert into public.inventario_sucursal (sucursal_id,