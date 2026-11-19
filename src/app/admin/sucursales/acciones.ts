"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const esquemaSucursal = z.object({
    nombre: z.string().trim().min(2).max(100),
    direccion: z.string().trim().min(5).max(250),
    telefono: z.string().trim().max(30),
    hora_apertura: z.string().regex(/^\d{2}:\d{2}$/),
    hora_cierre: z.string().regex(/^\d{2}:\d{2}$/),
    zona_horaria: z.string().trim().min(3).max(80),
});

const esquemaId = z.string().uuid();

async function obtenerClienteAutorizado() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: perfil, error } = await supabase.from("perfiles").select("rol, activo").eq("id", user.id).single();

    if (error || !perfil || !perfil.activo || perfil.rol !== "admin_general") {
        redirect("/admin?error=permisos");
    }

    return supabase;
}

export async function crearSucursal(formData: FormData) {
    const validacion = esquemaSucursal.safeParse({
        nombre: formData.get("nombre"),
        direccion: formData.get("direccion"),
        telefono: formData.get("telefono") ?? "",
        hora_apertura: formData.get("hora_apertura"),
        hora_cierre: formData.get("hora_cierre"),
        zona_horaria: formData.get("zona_horaria"),
    });

    if (!validacion.success) {
        redirect("/admin/sucursales?error=datos");
    }

    const supabase = await obtenerClienteAutorizado();
    const datos = validacion.data;

    const { error } = await supabase.rpc("crear_sucursal", {
        p_nombre: datos.nombre,
        p_direccion: datos.direccion,
        p_telefono: datos.telefono || null,
        p_hora_apertura: datos.hora_apertura,
        p_hora_cierre: datos.hora_cierre,
        p_zona_horaria: datos.zona_horaria,
    });

    if (error) {
        console.error("Error al crear sucursal:", error.message);
        redirect("/admin/sucursales?error=creacion");
    }

    revalidatePath("/admin/sucursales");
    revalidatePath("/admin/pedidos");
    revalidatePath("/admin");

    redirect("/admin/sucursales?creada=1");
}

export async function actualizarSucursal(formData: FormData) {
    const id = esquemaId.safeParse(formData.get("id"));

    const validacion = esquemaSucursal.safeParse({
        nombre: formData.get("nombre"),
        direccion: formData.get("direccion"),
        telefono: formData.get("telefono") ?? "",
        hora_apertura: formData.get("hora_apertura"),
        hora_cierre: formData.get("hora_cierre"),
        zona_horaria: formData.get("zona_horaria"),
    });

    const activa = formData.get("activa");

    if (!id.success || !validacion.success || (activa !== "true" && activa !== "false")) {
        redirect("/admin/sucursales?error=datos");
    }

    const supabase = await obtenerClienteAutorizado();
    const datos = validacion.data;

    const { error } = await supabase.rpc("actualizar_sucursal", {
        p_id: id.data,
        p_nombre: datos.nombre,
        p_direccion: datos.direccion,
        p_telefono: datos.telefono || null,
        p_hora_apertura: datos.hora_apertura,
        p_hora_cierre: datos.hora_cierre,
        p_zona_horaria: datos.zona_horaria,
        p_activa: activa === "true",
    });

    if (error) {
        console.error("Error al actualizar sucursal:", error.message);
        redirect("/admin/sucursales?error=actualizacion");
    }

    revalidatePath("/admin/sucursales");
    revalidatePath("/admin/pedidos");
    revalidatePath("/admin");
    revalidatePath("/sucursal");

    redirect("/admin/sucursales?actualizada=1");
}

export async function eliminarSucursal(formData: FormData) {
    const validacion = esquemaId.safeParse(formData.get("id"));

    if (!validacion.success) {
        redirect("/admin/sucursales?error=datos");
    }

    const supabase = await obtenerClienteAutorizado();

    const { error } = await supabase.rpc("eliminar_sucursal", {
        p_id: validacion.data,
    });

    if (error) {
        console.error("Error al eliminar sucursal:", error.message);
        redirect("/admin/sucursales?error=eliminacion");
    }

    revalidatePath("/admin/sucursales");
    revalidatePath("/admin/pedidos");
    revalidatePath("/admin");

    redirect("/admin/sucursales?eliminada=1");
}
