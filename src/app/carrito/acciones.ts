"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const esquemaAgregar = z.object({
    producto_id: z.string().uuid(),
    cantidad: z.coerce.number().int().min(1).max(99),
});

const esquemaCambiar = z.object({
    producto_id: z.string().uuid(),
    cantidad: z.coerce.number().int().min(0).max(99),
});

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
