
-- ============================================
-- ETAPA 13 - BLOQUE 3
-- Consultar disponibilidad del carrito
-- por sucursal
-- ============================================

create or replace function public.consultar_disponibilidad_carrito()
returns table (
    sucursal_id uuid,
    sucursal_nombre text,
    direccion text,
    productos_en_carrito integer,
    carrito_vacio boolean,
    disponible boolean,
    productos_faltantes jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_uid uuid := auth.uid();
begin

    -- Comprobar sesión
    if v_uid is null then
        raise exception 'Debes iniciar sesión';
    end if;

    return query

    with carrito as materialized (
        select
            c.producto_id,
            c.cantidad,
            p.sku,
            p.nombre,
            p.publicado
        from public.carrito_items c
        join public.productos p
            on p.id = c.producto_id
        where c.usuario_id = v_uid
    ),

    resumen as (
        select count(*)::integer as cantidad
        from carrito
    )

    select
        s.id,
        s.nombre,
        s.direccion,
        resumen.cantidad,

        -- Indicar si el carrito está vacío
        (resumen.cantidad = 0),

        -- Una sucursal tiene disponibilidad si puede
        -- surtir todos los productos del carrito
        (
            resumen.cantidad > 0
            and not exists (
                select 1
                from carrito c
                left join public.inventario_sucursal i
                    on i.sucursal_id = s.id
                    and i.producto_id = c.producto_id
                where
                    not c.publicado
                    or (
                        coalesce(i.stock_fisico, 0)
                        - coalesce(i.stock_reservado, 0)
                    ) < c.cantidad
            )
        ),

        -- Devolver los productos que no puede surtir
        coalesce(
            (
                select jsonb_agg(
                    jsonb_build_object(
                        'producto_id', c.producto_id,
                        'sku', c.sku,
                        'nombre', c.nombre,
                        'cantidad_solicitada', c.cantidad,
                        'stock_disponible',
                            greatest(
                                coalesce(i.stock_fisico, 0)
                                - coalesce(i.stock_reservado, 0),
                                0
                            ),
                        'motivo',
                            case
                                when not c.publicado
                                    then 'producto_no_publicado'
                                else 'stock_insuficiente'
                            end
                    )
                    order by c.nombre
                )
                from carrito c
                left join public.inventario_sucursal i
                    on i.sucursal_id = s.id
                    and i.producto_id = c.producto_id
                where
                    not c.publicado
                    or (
                        coalesce(i.stock_fisico, 0)
                        - coalesce(i.stock_reservado, 0)
                    ) < c.cantidad
            ),
            '[]'::jsonb
        )

    from public.sucursales s
    cross join resumen
    where s.activa = true
    order by s.nombre;

end;
$$;

-- ============================================
-- Permisos
-- ============================================

revoke execute
on function public.consultar_disponibilidad_carrito()
from public, anon;

grant execute
on function public.consultar_disponibilidad_carrito()
to authenticated;
