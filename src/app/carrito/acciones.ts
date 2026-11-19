"use server";

import { enviarCorreo } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

// Estado que devuelve el formulario de agregar al carrito.
type EstadoAgregar = {
    estado: "idle" | "success" | "error";
    mensaje: string;
};

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

// Agregar un producto al carrito sin abandonar la página.
export async function agregarAlCarrito(_estado: EstadoAgregar, formData: FormData): Promise<EstadoAgregar> {
    const v = esquemaAgregar.safeParse({
        producto_id: formData.get("producto_id"),
        cantidad: formData.get("cantidad"),
    });

    if (!v.success) {
        return {
            estado: "error",
            mensaje: "Verifica la cantidad seleccionada.",
        };
    }

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: existente, error: errorConsulta } = await supabase
        .from("carrito_items")
        .select("cantidad")
        .eq("usuario_id", user.id)
        .eq("producto_id", v.data.producto_id)
        .maybeSingle();

    if (errorConsulta) {
        return {
            estado: "error",
            mensaje: "No se pudo consultar tu carrito. Intenta nuevamente.",
        };
    }

    const nueva = Math.min(99, (existente?.cantidad ?? 0) + v.data.cantidad);

    const { error } = await supabase.from("carrito_items").upsert(
        {
            usuario_id: user.id,
            producto_id: v.data.producto_id,
            cantidad: nueva,
            actualizado_en: new Date().toISOString(),
        },
        { onConflict: "usuario_id,producto_id" },
    );

    if (error) {
        return {
            estado: "error",
            mensaje: "No se pudo agregar el producto. Intenta nuevamente.",
        };
    }

    // Actualizar el contador del carrito.
    revalidatePath("/", "layout");

    return {
        estado: "success",
        mensaje: "¡Producto agregado al carrito correctamente!",
    };
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
    revalidatePath("/carrito");
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
    revalidatePath("/carrito");
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

// Confirmar el pedido y enviar correo al cliente.
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

    // El pedido ya fue creado. Los errores de correo no lo cancelan.
    try {
        if (!user.email) {
            throw new Error("El cliente no tiene correo registrado.");
        }

        const { data: pedido, error: errorPedido } = await supabase
            .from("pedidos")
            .select("id, folio, total, fecha_recogida, sucursal_id")
            .eq("id", pedidoId)
            .eq("cliente_id", user.id)
            .single();

        if (errorPedido || !pedido) {
            throw new Error("No se pudieron consultar los datos del pedido.");
        }

        const [{ data: detalles, error: errorDetalles }, { data: sucursal, error: errorSucursal }] = await Promise.all([
            supabase.from("detalle_pedido").select("sku, nombre, precio_unitario, cantidad").eq("pedido_id", pedidoId),

            supabase.from("sucursales").select("nombre, direccion").eq("id", pedido.sucursal_id).single(),
        ]);

        if (errorDetalles || !detalles || errorSucursal || !sucursal) {
            throw new Error("No se pudieron consultar los detalles del pedido.");
        }

        const formatoPrecio = (cantidad: number) =>
            new Intl.NumberFormat("es-MX", {
                style: "currency",
                currency: "MXN",
            }).format(cantidad);

        const filasProductos = detalles
            .map(
                producto => `
            <tr>
                <td style="padding:10px;border-bottom:1px solid #eee;">
                    ${producto.nombre} (${producto.sku})
                </td>
                <td style="padding:10px;text-align:center;border-bottom:1px solid #eee;">
                    ${producto.cantidad}
                </td>
                <td style="padding:10px;text-align:right;border-bottom:1px solid #eee;">
                    ${formatoPrecio(Number(producto.precio_unitario))}
                </td>
            </tr>
        `,
            )
            .join("");

        const fecha = new Date(`${pedido.fecha_recogida}T12:00:00`).toLocaleDateString("es-MX", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });

        await enviarCorreo({
            destinatario: user.email,
            asunto: `Confirmación de pedido ${pedido.folio} - Tsuru ProParts`,
            html: `
                <div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;color:#222;">
                    <h1 style="color:#222;">Tsuru ProParts</h1>
                    <h2>¡Tu pedido ha sido confirmado!</h2>

                    <p>Hemos registrado correctamente tu pedido.</p>

                    <p><strong>Folio:</strong> ${pedido.folio}</p>
                    <p><strong>Sucursal:</strong> ${sucursal.nombre}</p>
                    <p><strong>Dirección:</strong> ${sucursal.direccion}</p>
                    <p><strong>Fecha de recogida:</strong> ${fecha}</p>

                    <h3>Productos de tu pedido</h3>

                    <table style="width:100%;border-collapse:collapse;">
                        <thead>
                            <tr>
                                <th style="text-align:left;padding:10px;">Producto</th>
                                <th style="padding:10px;">Cantidad</th>
                                <th style="text-align:right;padding:10px;">Precio</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filasProductos}
                        </tbody>
                    </table>

                    <h2 style="text-align:right;">
                        Total: ${formatoPrecio(Number(pedido.total))}
                    </h2>

                    <p>Gracias por comprar en Tsuru ProParts.</p>
                </div>
            `,
        });
    } catch (errorCorreo) {
        console.error("El pedido se creó, pero no se pudo enviar el correo:", errorCorreo);
    }

    revalidatePath("/carrito");
    revalidatePath("/");

    redirect(`/carrito/confirmar?pedido=${pedidoId}`);
}
