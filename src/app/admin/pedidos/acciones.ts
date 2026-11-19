"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const esquemaEstado = z.object({
    pedido_id: z.string().uuid(),
    estado: z.enum(["preparando", "listo", "recogido", "cancelado", "vencido"]),
    nota: z.string().max(500).optional(),
});

const esquemaEliminacion = z.object({
    pedido_id: z.string().uuid(),
});

export async function cambiarEstadoPedido(formData: FormData) {
    const validacion = esquemaEstado.safeParse({
        pedido_id: formData.get("pedido_id"),
        estado: formData.get("estado"),
        nota: formData.get("nota") || undefined,
    });

    if (!validacion.success) {
        redirect("/admin/pedidos?error=datos");
    }

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { pedido_id, estado, nota } = validacion.data;

    const { error } = await supabase.rpc("cambiar_estado_pedido", {
        p_pedido_id: pedido_id,
        p_nuevo_estado: estado,
        p_nota: nota?.trim() || null,
    });

    if (error) {
        console.error("Error al cambiar estado del pedido:", error.message);

        redirect("/admin/pedidos?error=actualizacion");
    }

    revalidatePath("/admin/pedidos");
    revalidatePath("/mis-pedidos");
    revalidatePath(`/mis-pedidos/${pedido_id}`);

    redirect("/admin/pedidos?actualizado=1");
}

export async function eliminarPedidoCancelado(formData: FormData) {
    const validacion = esquemaEliminacion.safeParse({
        pedido_id: formData.get("pedido_id"),
    });

    if (!validacion.success) {
        redirect("/admin/pedidos?error=datos");
    }

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { pedido_id } = validacion.data;

    const { error } = await supabase.rpc("eliminar_pedido_cancelado", {
        p_pedido_id: pedido_id,
    });

    if (error) {
        console.error("Error al eliminar pedido:", error.message);

        redirect("/admin/pedidos?error=eliminacion");
    }

    revalidatePath("/admin/pedidos");
    revalidatePath("/mis-pedidos");

    redirect("/admin/pedidos?eliminado=1");
}
