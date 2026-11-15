create or replace function public.crear_pedido(
  p_sucursal_id uuid,
  p_fecha_recogida date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_tz text;
  v_activa boolean;
  v_hoy date;
  v_ahora_local time;
  v_dia integer;
  v_abre time;
  v_cierra time;
  v_cierra_extra time;
  v_limite timestamptz;
  v_total numeric(10,2) := 0;
  v_faltantes text := '';
  v_pedido_id uuid;
  v_fisico integer;
  v_reservado integer;
  r record;
begin
  if v_uid is null then
    raise exception 'Debes iniciar sesión';
  end if;

  select zona_horaria, activa into v_tz, v_activa
  from public.sucursales where id = p_sucursal_id;

  if not found or not v_activa then
    raise exception 'La sucursal no está disponible';
  end if;

  if p_fecha_recogida is null then
    raise exception 'Elige una fecha de recogida';
  end if;

  v_hoy := (now() at time zone v_tz)::date;
  v_ahora_local := (now() at time zone v_tz)::time;

  if p_fecha_recogida not between v_hoy and v_hoy + 14 then
    raise exception 'La fecha debe estar entre hoy y los próximos 14 días';
  end if;

  v_dia := extract(dow from p_fecha_recogida)::integer;
  select abre, cierra into v_abre, v_cierra
  from public.horarios_sucursal
  where sucursal_id = p_sucursal_id and dia_semana = v_dia;

  if not found then
    raise exception 'La sucursal no abre ese día';
  end if;

  if p_fecha_recogida = v_hoy and v_ahora_local >= v_cierra then
    raise exception 'La sucursal ya cerró hoy, elige otra fecha';
  end if;

  select cierra into v_cierra_extra
  from public.horarios_sucursal
  where sucursal_id = p_sucursal_id
    and dia_semana = extract(dow from (p_fecha_recogida + 1))::integer;

  if not found then
    raise exception 'La sucursal no abre el día siguiente a esa fecha';
  end if;

  v_limite := ((p_fecha_recogida + 1) + v_cierra_extra) at time zone v_tz;

  -- Primera pasada: bloquea inventario y verifica disponibilidad
  for r in
    select c.producto_id, c.cantidad, p.nombre, p.precio, p.publicado
    from public.carrito_items c
    join public.productos p on p.id = c.producto_id
    where c.usuario_id = v_uid
    order by c.producto_id
  loop
    v_total := v_total + (r.precio * r.cantidad);

    if not r.publicado then
      v_faltantes := v_faltantes || r.nombre || ' (ya no está disponible); ';
      continue;
    end if;

    select stock_fisico, stock_reservado into v_fisico, v_reservado
    from public.inventario_sucursal
    where sucursal_id = p_sucursal_id and producto_id = r.producto_id
    for update;

    if not found or not ((v_fisico - v_reservado) >= r.cantidad) then
      v_faltantes := v_faltantes || r.nombre || ' (stock insuficiente); ';
    end if;
  end loop;

  if v_total = 0 and v_faltantes = '' then
    raise exception 'Tu carrito está vacío';
  end if;

  if v_faltantes <> '' then
    raise exception 'No hay stock suficiente en esta sucursal: %', v_faltantes;
  end if;

  insert into public.pedidos
    (cliente_id, sucursal_id, fecha_recogida, fecha_limite, total)
  values
    (v_uid, p_sucursal_id, p_fecha_recogida, v_limite, v_total)
  returning id into v_pedido_id;

  -- Segunda pasada: detalle, reserva y movimientos
  for r in
    select c.producto_id, c.cantidad, p.sku, p.nombre, p.precio
    from public.carrito_items c
    join public.productos p on p.id = c.producto_id
    where c.usuario_id = v_uid
    order by c.producto_id
  loop
    insert into public.detalle_pedido
      (pedido_id, producto_id, sku, nombre, precio_unitario, cantidad)
    values
      (v_pedido_id, r.producto_id, r.sku, r.nombre, r.precio, r.cantidad);

    update public.inventario_sucursal
    set stock_reservado = stock_reservado + r.cantidad,
        actualizado_en = now()
    where sucursal_id = p_sucursal_id and producto_id = r.producto_id;

    insert into public.movimientos_inventario
      (sucursal_id, producto_id, tipo, cantidad, motivo, usuario_id)
    values
      (p_sucursal_id, r.producto_id, 'reserva', r.cantidad,
       'Pedido ' || v_pedido_id::text, v_uid);
  end loop;

  insert into public.historial_estados_pedido (pedido_id, estado, usuario_id, nota)
  values (v_pedido_id, 'confirmado', v_uid, 'Pedido creado');

  delete from public.carrito_items where usuario_id = v_uid;

  return v_pedido_id;
end;
$$;

-- Ejecutar como una query separada después de crear la función.
revoke execute on function public.crear_pedido(uuid, date) from public, anon;
grant execute on function public.crear_pedido(uuid, date) to authenticated;
