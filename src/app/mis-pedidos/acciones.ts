"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const esquemaCancelacion = z.object({
    pedido_id: z.string().uuid(),
});

export async function cancelarPedidoCliente(formData: FormData) {
    const validacion = esquemaCancelacion.safeParse({
        pedido_id: formData.get("pedido_id"),
    });

    if (!validacion.success) {
        redirect("/mis-pedidos?error=datos");
    }

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { pedido_id } = validacion.data;

    const { error } = await supabase.rpc("cancelar_pedido_cliente", {
        p_pedido_id: pedido_id,
    });

    if (error) {
        console.error("Error al cancelar pedido:", error.message);

        redirect(`/mis-pedidos/${pedido_id}?error=cancelacion`);
    }

    revalidatePath("/mis-pedidos");
    revalidatePath(`/mis-pedidos/${pedido_id}`);

    redirect(`/mis-pedidos/${pedido_id}?cancelado=1`);
}
