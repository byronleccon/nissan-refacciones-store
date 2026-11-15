create or replace function public.registrar_entrada_inventario(
  p_sucursal_id uuid,
  p_producto_id uuid,
  p_cantidad integer,
  p_motivo text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rol text := public.rol_actual();
begin
  if v_rol is null or v_rol not in ('admin_general', 'admin_sucursal') then
    raise exception 'No tienes permisos para modificar el inventario';
  end if;

  if v_rol = 'admin_sucursal' and p_sucursal_id is distinct from public.sucursal_actual() then
    raise exception 'Solo puedes modificar el inventario de tu sucursal';
  end if;

  if p_cantidad is null or not (p_cantidad > 0) then
    raise exception 'La cantidad debe ser mayor a cero';
  end if;

  insert into public.inventario_sucursal (sucursal_id, producto_id, stock_fisico)
  values (p_sucursal_id, p_producto_id, p_cantidad)
  on conflict (sucursal_id, producto_id)
  do update set
    stock_fisico = public.inventario_sucursal.stock_fisico + excluded.stock_fisico,
    actualizado_en = now();

  insert into public.movimientos_inventario
    (sucursal_id, producto_id, tipo, cantidad, motivo, usuario_id)
  values
    (p_sucursal_id, p_producto_id, 'entrada', p_cantidad, p_motivo, auth.uid());
end;
$$;

create or replace function public.ajustar_inventario(
  p_sucursal_id uuid,
  p_producto_id uuid,
  p_nuevo_stock integer,
  p_motivo text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rol text := public.rol_actual();
  v_actual integer;
  v_reservado integer;
begin
  if v_rol is null or v_rol not in ('admin_general', 'admin_sucursal') then
    raise exception 'No tienes permisos para modificar el inventario';
  end if;

  if v_rol = 'admin_sucursal' and p_sucursal_id is distinct from public.sucursal_actual() then
    raise exception 'Solo puedes modificar el inventario de tu sucursal';
  end if;

  if p_nuevo_stock is null or not (p_nuevo_stock >= 0) then
    raise exception 'El stock no puede ser negativo';
  end if;

  if p_motivo is null or length(trim(p_motivo)) = 0 then
    raise exception 'Debes indicar el motivo del ajuste';
  end if;

  select stock_fisico, stock_reservado
    into v_actual, v_reservado
  from public.inventario_sucursal
  where sucursal_id = p_sucursal_id and producto_id = p_producto_id
  for update;

  if not found then
    raise exception 'Ese producto no tiene inventario en la sucursal';
  end if;

  if not (p_nuevo_stock >= v_reservado) then
    raise exception 'El stock no puede ser menor a las unidades reservadas (%)', v_reservado;
  end if;

  if p_nuevo_stock = v_actual then
    return;
  end if;

  update public.inventario_sucursal
  set stock_fisico = p_nuevo_stock, actualizado_en = now()
  where sucursal_id = p_sucursal_id and producto_id = p_producto_id;

  insert into public.movimientos_inventario
    (sucursal_id, producto_id, tipo, cantidad, motivo, usuario_id)
  values
    (p_sucursal_id, p_producto_id, 'ajuste', p_nuevo_stock - v_actual, p_motivo, auth.uid());
end;
$$;

revoke execute on function public.registrar_entrada_inventario(uuid, uuid, integer, text) from public, anon;
revoke execute on function public.ajustar_inventario(uuid, uuid, integer, text) from public, anon;
grant execute on function public.registrar_entrada_inventario(uuid, uuid, integer, text) to authenticated;
grant execute on function public.ajustar_inventario(uuid, uuid, integer, text) to authenticated;