-- ============================================================
-- PARTE 1: el admin de sucursal también puede subir fotos
-- (no puede actualizarlas ni borrarlas)
-- ============================================================
create policy "Admin de sucursal sube fotos de productos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'productos'
    and (select public.rol_actual()) = 'admin_sucursal'
  );


-- ============================================================
-- PARTE 2: función que crea el producto completo en una sola
-- transacción (producto, compatibilidades, vehículos nuevos
-- e inventario inicial). O se guarda todo, o no se guarda nada.
-- ============================================================
create or replace function public.crear_producto(
  p_sku text,
  p_nombre text,
  p_descripcion text,
  p_categoria_id uuid,
  p_precio numeric,
  p_imagen text,
  p_publicado boolean,
  p_vehiculos_ids uuid[],
  p_nuevos jsonb,
  p_sucursal_id uuid,
  p_stock integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rol text := public.rol_actual();
  v_uid uuid := auth.uid();
  v_producto uuid;
  v_publicado boolean := false;
  v_sucursal uuid;
  v_veh uuid;
  v_item jsonb;
  v_anio integer;
  v_desde integer;
  v_hasta integer;
begin
  if v_rol is null or v_rol not in ('admin_general', 'admin_sucursal') then
    raise exception 'No tienes permisos para agregar productos';
  end if;

  if p_sku is null or length(trim(p_sku)) = 0 then
    raise exception 'El SKU es obligatorio';
  end if;

  if p_nombre is null or length(trim(p_nombre)) = 0 then
    raise exception 'El nombre es obligatorio';
  end if;

  if p_precio is null or not (p_precio >= 0) then
    raise exception 'El precio no es válido';
  end if;

  if p_imagen is null or length(trim(p_imagen)) = 0 then
    raise exception 'La imagen es obligatoria';
  end if;

  if p_stock is not null and not (p_stock >= 0) then
    raise exception 'Las existencias no pueden ser negativas';
  end if;

  if v_rol = 'admin_general' then
    -- El admin general decide si se publica y en qué sucursal entra
    v_publicado := coalesce(p_publicado, false);
    v_sucursal := p_sucursal_id;
  else
    -- El admin de sucursal: el producto queda SIN publicar (lo revisa el
    -- admin general) y el inventario solo entra a su propia sucursal
    v_publicado := false;
    v_sucursal := public.sucursal_actual();
    if v_sucursal is null then
      raise exception 'Tu cuenta no tiene sucursal asignada';
    end if;
  end if;

  insert into public.productos
    (sku, nombre, descripcion, categoria_id, precio, urls_imagenes, publicado)
  values
    (trim(p_sku), trim(p_nombre), nullif(trim(coalesce(p_descripcion, '')), ''),
     p_categoria_id, p_precio, array[p_imagen], v_publicado)
  returning id into v_producto;

  -- Compatibilidad con vehículos ya registrados
  if p_vehiculos_ids is not null then
    insert into public.compatibilidades (producto_id, vehiculo_id)
    select v_producto, x
    from unnest(p_vehiculos_ids) as x
    on conflict do nothing;
  end if;

  -- Vehículos nuevos: uno por cada año del rango indicado
  if p_nuevos is not null and jsonb_typeof(p_nuevos) = 'array' then
    for v_item in select * from jsonb_array_elements(p_nuevos)
    loop
      v_desde := (v_item ->> 'anio_desde')::integer;
      v_hasta := (v_item ->> 'anio_hasta')::integer;

      if not (v_desde >= 2015) or not (v_hasta - v_desde between 0 and 30) then
        raise exception 'El rango de años del vehículo no es válido';
      end if;

      for v_anio in v_desde .. v_hasta
      loop
        insert into public.vehiculos (modelo, anio, version, motor)
        values (
          trim(v_item ->> 'modelo'),
          v_anio,
          trim(v_item ->> 'version'),
          trim(v_item ->> 'motor')
        )
        on conflict (modelo, anio, version, motor)
        do update set modelo = excluded.modelo
        returning id into v_veh;

        insert into public.compatibilidades (producto_id, vehiculo_id)
        values (v_producto, v_veh)
        on conflict do nothing;
      end loop;
    end loop;
  end if;

  -- Inventario inicial (aunque sea 0, para que aparezca en el panel de sucursal)
  if v_sucursal is not null then
    insert into public.inventario_sucursal
      (sucursal_id, producto_id, stock_fisico, stock_reservado)
    values
      (v_sucursal, v_producto, coalesce(p_stock, 0), 0);

    if coalesce(p_stock, 0) > 0 then
      insert into public.movimientos_inventario
        (sucursal_id, producto_id, tipo, cantidad, motivo, usuario_id)
      values
        (v_sucursal, v_producto, 'entrada', p_stock, 'Alta de producto', v_uid);
    end if;
  end if;

  return v_producto;
end;
$$;

revoke execute on function public.crear_producto(text, text, text, uuid, numeric, text, boolean, uuid[], jsonb, uuid, integer) from public, anon;
grant execute on function public.crear_producto(text, text, text, uuid, numeric, text, boolean, uuid[], jsonb, uuid, integer) to authenticated;
