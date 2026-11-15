"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

// Validación para agregar productos.
const esquemaAgregar = z.object({
    producto_id: z.string().uuid(),
    cantidad: z.coerce.number().int().min(1).max(99),
});

// Validación para modificar cantidades.
const esquemaCambiar = z.object({
    producto_id: z.string().uuid(),
    cantidad: z.coerce.number().int().min(0).max(99),
});

// Validación para confirmar un pedido.
const esquemaConfirmar = z.object({
    sucursal_id: z.string().uuid(),
    fecha_recogida: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// Agregar un producto al carrito.
export async function agregarAlCarrito(formData: FormData) {
    const v = esquemaAgregar.safeParse({
        producto_id: formData.get("producto_id"),
        cantidad: formData.get("cantidad"),
    });

    if (!v.success) return;

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: existente } = await supabase
        .from("carrito_items")
        .select("cantidad")
        .eq("usuario_id", user.id)
        .eq("producto_id", v.data.producto_id)
        .maybeSingle();

    const nueva = Math.min(99, (existente?.cantidad ?? 0) + v.data.cantidad);

    await supabase.from("carrito_items").upsert(
        {
            usuario_id: user.id,
            producto_id: v.data.producto_id,
            cantidad: nueva,
            actualizado_en: new Date().toISOString(),
        },
        { onConflict: "usuario_id,producto_id" },
    );

    revalidatePath("/", "layout");
    redirect("/carrito");
}

// Cambiar la cantidad de un producto.
export async function cambiarCantidad(formData: FormData) {
    const v = esquemaCambiar.safeParse({
        producto_id: formData.get("producto_id"),
        cantidad: formData.get("cantidad"),
    });

    if (!v.success) return;

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    if (v.data.cantidad === 0) {
        await supabase.from("carrito_items").delete().eq("usuario_id", user.id).eq("producto_id", v.data.producto_id);
    } else {
        await supabase
            .from("carrito_items")
            .update({
                cantidad: v.data.cantidad,
                actualizado_en: new Date().toISOString(),
            })
            .eq("usuario_id", user.id)
            .eq("producto_id", v.data.producto_id);
    }

    revalidatePath("/", "layout");
}

// Eliminar un producto del carrito.
export async function quitarDelCarrito(formData: FormData) {
    const id = z.string().uuid().safeParse(formData.get("producto_id"));

    if (!id.success) return;

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    await supabase.from("carrito_items").delete().eq("usuario_id", user.id).eq("producto_id", id.data);

    revalidatePath("/", "layout");
}

// Seleccionar una sucursal que tenga todo el carrito disponible.
export async function seleccionarSucursal(formData: FormData) {
    const id = z.string().uuid().safeParse(formData.get("sucursal_id"));

    if (!id.success) return;

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    // Comprobar nuevamente la disponibilidad.
    const { data, error } = await supabase.rpc("consultar_disponibilidad_carrito");

    if (error) {
        redirect("/carrito");
    }

    const sucursalDisponible = (data ?? []).some(
        (s: { sucursal_id: string; disponible: boolean }) => s.sucursal_id === id.data && s.disponible,
    );

    if (!sucursalDisponible) {
        redirect("/carrito?error=sucursal-no-disponible");
    }

    revalidatePath("/carrito");
    redirect(`/carrito?sucursal=${id.data}`);
}

// Confirmar el pedido y reservar el inventario.
export async function confirmarPedido(formData: FormData) {
    const validacion = esquemaConfirmar.safeParse({
        sucursal_id: formData.get("sucursal_id"),
        fecha_recogida: formData.get("fecha_recogida"),
    });

    if (!validacion.success) {
        redirect("/carrito");
    }

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: pedidoId, error } = await supabase.rpc("crear_pedido", {
        p_sucursal_id: validacion.data.sucursal_id,
        p_fecha_recogida: validacion.data.fecha_recogida,
    });

    if (error || !pedidoId) {
        redirect(`/carrito/confirmar?sucursal=${validacion.data.sucursal_id}&error=pedido`);
    }

    revalidatePath("/carrito");
    revalidatePath("/");

    redirect(`/carrito/confirmar?pedido=${pedidoId}`);
}
