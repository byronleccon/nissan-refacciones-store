"use server";

import { obtenerPerfilActual } from "@/lib/auth/perfil";
import { createClient } from "@/lib/supabase/server";
import { esquemaAjuste, esquemaEntrada } from "@/lib/validaciones/inventario";
import { revalidatePath } from "next/cache";

export type Resultado = { ok: boolean; mensaje: string };

async function validarPermiso(sucursalId: string): Promise<string | null> {
    const perfil = await obtenerPerfilActual();
    if (!perfil) return "Debes iniciar sesión";
    if (perfil.rol === "admin_general") return null;
    if (perfil.rol === "admin_sucursal" && perfil.sucursal_id === sucursalId) return null;
    return "No tienes permisos para esta sucursal";
}

export async function registrarEntrada(_anterior: Resultado | null, formData: FormData): Promise<Resultado> {
    const validado = esquemaEntrada.safeParse({
        sucursal_id: formData.get("sucursal_id"),
        producto_id: formData.get("producto_id"),
        cantidad: formData.get("cantidad"),
        motivo: formData.get("motivo") || undefined,
    });
    if (!validado.success) {
        return { ok: false, mensaje: validado.error.issues[0].message };
    }

    const sinPermiso = await validarPermiso(validado.data.sucursal_id);
    if (sinPermiso) return { ok: false, mensaje: sinPermiso };

    const supabase = await createClient();
    const { error } = await supabase.rpc("registrar_entrada_inventario", {
        p_sucursal_id: validado.data.sucursal_id,
        p_producto_id: validado.data.producto_id,
        p_cantidad: validado.data.cantidad,
        p_motivo: validado.data.motivo ?? null,
    });
    if (error) return { ok: false, mensaje: error.message };

    revalidatePath("/sucursal");
    return { ok: true, mensaje: "Entrada registrada" };
}

export async function ajustarStock(_anterior: Resultado | null, formData: FormData): Promise<Resultado> {
    const validado = esquemaAjuste.safeParse({
        sucursal_id: formData.get("sucursal_id"),
        producto_id: formData.get("producto_id"),
        nuevo_stock: formData.get("nuevo_stock"),
        motivo: formData.get("motivo"),
    });
    if (!validado.success) {
        return { ok: false, mensaje: validado.error.issues[0].message };
    }

    const sinPermiso = await validarPermiso(validado.data.sucursal_id);
    if (sinPermiso) return { ok: false, mensaje: sinPermiso };

    const supabase = await createClient();
    const { error } = await supabase.rpc("ajustar_inventario", {
        p_sucursal_id: validado.data.sucursal_id,
        p_producto_id: validado.data.producto_id,
        p_nuevo_stock: validado.data.nuevo_stock,
        p_motivo: validado.data.motivo,
    });
    if (error) return { ok: false, mensaje: error.message };

    revalidatePath("/sucursal");
    return { ok: true, mensaje: "Stock ajustado" };
}
