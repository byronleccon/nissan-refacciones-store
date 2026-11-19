-- ============================================================
-- PARTE 1: categorías nuevas
-- ============================================================
insert into public.categorias (nombre, slug) values
  ('Eléctrico', 'electrico'),
  ('Enfriamiento', 'enfriamiento'),
  ('Transmisión', 'transmision'),
  ('Iluminación', 'iluminacion'),
  ('Accesorios', 'accesorios')
on conflict do nothing;


-- ============================================================
-- PARTE 2: 50 productos (SKU con prefijo RF-)
-- ============================================================
with datos (sku, nombre, descripcion, categoria_slug, precio) as (
  values
  -- Frenos
  ('RF-FRE-001', 'Pastillas de freno delanteras cerámicas', 'Juego de pastillas cerámicas para eje delantero. Frenado silencioso y baja emisión de polvo.', 'frenos', 890.00),
  ('RF-FRE-002', 'Pastillas de freno traseras semimetálicas', 'Juego de pastillas semimetálicas para eje trasero, con testigo de desgaste.', 'frenos', 640.00),
  ('RF-FRE-003', 'Disco de freno delantero ventilado', 'Disco ventilado de hierro fundido, vendido por pieza. Se recomienda cambiar en pares.', 'frenos', 1250.00),
  ('RF-FRE-004', 'Disco de freno trasero sólido', 'Disco sólido de hierro fundido para eje trasero, vendido por pieza.', 'frenos', 980.00),
  ('RF-FRE-005', 'Balatas traseras para tambor', 'Juego de balatas con material de fricción de larga duración.', 'frenos', 720.00),
  ('RF-FRE-006', 'Líquido de frenos DOT 4 (500 ml)', 'Líquido sintético de alto punto de ebullición para sistemas de freno hidráulicos.', 'frenos', 165.00),
  ('RF-FRE-007', 'Caliper delantero reconstruido', 'Caliper remanufacturado con pistón y sellos nuevos, probado a presión.', 'frenos', 2150.00),
  ('RF-FRE-008', 'Manguera de freno flexible delantera', 'Manguera de goma reforzada con conexiones metálicas.', 'frenos', 320.00),

  -- Filtros
  ('RF-FIL-001', 'Filtro de aceite de motor', 'Filtro de aceite de flujo completo con válvula antirretorno.', 'filtros', 145.00),
  ('RF-FIL-002', 'Filtro de aire de motor', 'Elemento filtrante de papel plisado de alta capacidad de retención.', 'filtros', 260.00),
  ('RF-FIL-003', 'Filtro de cabina con carbón activado', 'Filtra polvo, polen y olores del aire que entra al habitáculo.', 'filtros', 310.00),
  ('RF-FIL-004', 'Filtro de combustible', 'Filtro en línea para gasolina con carcasa metálica.', 'filtros', 380.00),
  ('RF-FIL-005', 'Filtro de transmisión automática', 'Filtro interno de cárter con empaque incluido.', 'filtros', 420.00),

  -- Suspensión
  ('RF-SUS-001', 'Amortiguador delantero de gas', 'Amortiguador presurizado con nitrógeno, vendido por pieza.', 'suspension', 1480.00),
  ('RF-SUS-002', 'Amortiguador trasero de gas', 'Amortiguador presurizado para eje trasero, vendido por pieza.', 'suspension', 1190.00),
  ('RF-SUS-003', 'Rótula de suspensión inferior', 'Rótula con cubrepolvo reforzado y grasera sellada.', 'suspension', 540.00),
  ('RF-SUS-004', 'Terminal de dirección exterior', 'Terminal de acero forjado con rótula lubricada de por vida.', 'suspension', 460.00),
  ('RF-SUS-005', 'Buje de barra estabilizadora', 'Par de bujes de poliuretano para barra estabilizadora delantera.', 'suspension', 120.00),
  ('RF-SUS-006', 'Cople de barra estabilizadora', 'Tornillo de enlace con rótulas en ambos extremos.', 'suspension', 380.00),
  ('RF-SUS-007', 'Soporte de amortiguador con balero', 'Base superior con balero integrado y tope de goma.', 'suspension', 690.00),
  ('RF-SUS-008', 'Resorte helicoidal delantero', 'Resorte de acero con recubrimiento anticorrosivo, vendido por pieza.', 'suspension', 1350.00),

  -- Motor
  ('RF-MOT-001', 'Bujía de iridio', 'Electrodo de iridio de larga vida, vendida por pieza.', 'motor', 215.00),
  ('RF-MOT-002', 'Banda de accesorios', 'Banda serpentina de caucho EPDM con refuerzo de fibra.', 'motor', 420.00),
  ('RF-MOT-003', 'Tensor de banda de accesorios', 'Tensor automático con polea de acero y resorte calibrado.', 'motor', 780.00),
  ('RF-MOT-004', 'Junta de tapa de punterías', 'Empaque de hule con sellador integrado.', 'motor', 390.00),
  ('RF-MOT-005', 'Aceite sintético 5W-30 (4 L)', 'Aceite de motor totalmente sintético para gasolina.', 'motor', 640.00),
  ('RF-MOT-006', 'Sensor de oxígeno', 'Sensor de 4 cables con conector de fábrica.', 'motor', 1320.00),
  ('RF-MOT-007', 'Bobina de encendido', 'Bobina individual con aislamiento de alta tensión.', 'motor', 610.00),
  ('RF-MOT-008', 'Soporte de motor', 'Soporte hidráulico con base de aluminio y cojín de goma.', 'motor', 850.00),

  -- Eléctrico
  ('RF-ELE-001', 'Batería 12 V 45 Ah', 'Batería libre de mantenimiento, 400 A de arranque en frío.', 'electrico', 1850.00),
  ('RF-ELE-002', 'Alternador reconstruido', 'Alternador remanufacturado y probado en banco.', 'electrico', 3200.00),
  ('RF-ELE-003', 'Motor de arranque reconstruido', 'Marcha remanufacturada con solenoide nuevo.', 'electrico', 2800.00),
  ('RF-ELE-004', 'Sensor de posición de cigüeñal', 'Sensor magnético con conector sellado.', 'electrico', 540.00),
  ('RF-ELE-005', 'Relevador universal 12 V', 'Relevador de 5 terminales, 30 A.', 'electrico', 85.00),

  -- Enfriamiento
  ('RF-ENF-001', 'Radiador de aluminio', 'Núcleo de aluminio con tanques de plástico de alta resistencia.', 'enfriamiento', 2650.00),
  ('RF-ENF-002', 'Bomba de agua', 'Bomba con impulsor metálico y empaque incluido.', 'enfriamiento', 780.00),
  ('RF-ENF-003', 'Termostato con empaque', 'Termostato de cera con apertura calibrada.', 'enfriamiento', 240.00),
  ('RF-ENF-004', 'Refrigerante 50/50 (1 galón)', 'Anticongelante de larga duración, listo para usarse.', 'enfriamiento', 210.00),
  ('RF-ENF-005', 'Tapón de radiador', 'Tapón con válvula de presión calibrada.', 'enfriamiento', 95.00),
  ('RF-ENF-006', 'Manguera superior de radiador', 'Manguera de caucho reforzado con malla textil.', 'enfriamiento', 280.00),

  -- Transmisión
  ('RF-TRA-001', 'Aceite para transmisión automática (1 L)', 'Fluido formulado para transmisiones automáticas.', 'transmision', 195.00),
  ('RF-TRA-002', 'Kit de clutch de 3 piezas', 'Incluye disco, prensa y collarín.', 'transmision', 2850.00),
  ('RF-TRA-003', 'Flecha homocinética delantera', 'Flecha completa con juntas y fundas nuevas.', 'transmision', 1650.00),
  ('RF-TRA-004', 'Funda de flecha homocinética', 'Cubrepolvo de goma con abrazaderas.', 'transmision', 190.00),

  -- Iluminación
  ('RF-ILU-001', 'Focos LED H11 (par)', 'Par de focos LED de 6000 K con disipador de aluminio.', 'iluminacion', 520.00),
  ('RF-ILU-002', 'Focos halógenos H4 (par)', 'Par de focos halógenos de 60/55 W.', 'iluminacion', 180.00),
  ('RF-ILU-003', 'Focos de freno P21/5W (par)', 'Par de focos de doble filamento para luz de freno y posición.', 'iluminacion', 60.00),

  -- Accesorios
  ('RF-ACC-001', 'Limpiaparabrisas de 24 pulgadas', 'Pluma de silicón con armazón metálico.', 'accesorios', 180.00),
  ('RF-ACC-002', 'Juego de plumas limpiaparabrisas (par)', 'Par de plumas con adaptadores universales.', 'accesorios', 240.00),
  ('RF-ACC-003', 'Tapetes de goma (4 piezas)', 'Juego de tapetes antiderrapantes de uso rudo.', 'accesorios', 420.00)
)
insert into public.productos (sku, nombre, descripcion, categoria_id, precio, publicado)
select d.sku, d.nombre, d.descripcion, c.id, d.precio, true
from datos d
join public.categorias c on c.slug = d.categoria_slug
on conflict (sku) do nothing;


-- ============================================================
-- PARTE 3: inventario en todas las sucursales activas
-- (existencias variadas, sin reservas)
-- ============================================================
insert into public.inventario_sucursal (sucursal_id, producto_id, stock_fisico, stock_reservado)
select s.id, p.id, abs(hashtext(p.sku || s.nombre)) % 36, 0
from public.sucursales s
cross join public.productos p
where p.sku like 'RF-%'
  and s.activa = true
on conflict (sucursal_id, producto_id) do nothing;


-- ============================================================
-- OPCIONAL: marcar 8 productos como destacados para la portada
-- (requiere la columna "destacado")
-- ============================================================
update public.productos
set destacado = true
where sku in (
  'RF-FRE-001', 'RF-FIL-001', 'RF-SUS-001', 'RF-MOT-001',
  'RF-ELE-001', 'RF-ENF-002', 'RF-MOT-005', 'RF-ACC-003'
);
