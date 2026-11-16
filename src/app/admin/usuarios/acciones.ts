"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const esquemaUsuario = z.object({
    nombre_completo: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(254),
    password: z.string().min(8).max(72),
    rol: z.enum(["admin_general", "admin_sucursal", "empleado"]),
    sucursal_id: z.union([z.string().uuid(), z.literal("")]),
});

const esquemaId = z.object({
    usuario_id: z.string().uuid(),
});

// Obtiene y valida al administrador que realiza la operación.
async function obtenerContextoGestion() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const admin = createAdminClient();

    const { data: actor, error } = await admin
        .from("perfiles")
        .select("id, rol, sucursal_id, activo")
        .eq("id", user.id)
        .maybeSingle();

    if (error || !actor || !actor.activo || !["admin_general", "admin_sucursal"].includes(actor.rol)) {
        redirect("/admin/usuarios?error=permisos");
    }

    return { admin, actor };
}

// Comprueba si el administrador puede gestionar al usuario objetivo.
async function obtenerUsuarioGestionable(
    admin: ReturnType<typeof createAdminClient>,
    actor: {
        id: string;
        rol: string;
        sucursal_id: string | null;
        activo: boolean;
    },
    usuarioId: string,
) {
    // Nadie puede gestionarse a sí mismo.
    if (actor.id === usuarioId) {
        redirect("/admin/usuarios?error=propio");
    }

    const { data: objetivo, error } = await admin
        .from("perfiles")
        .select("id, rol, sucursal_id, activo")
        .eq("id", usuarioId)
        .maybeSingle();

    if (error || !objetivo) {
        redirect("/admin/usuarios?error=usuario");
    }

    // No se permite gestionar cuentas de clientes.
    if (!["admin_general", "admin_sucursal", "empleado"].includes(objetivo.rol)) {
        redirect("/admin/usuarios?error=objetivo");
    }

    // El administrador de sucursal solo gestiona empleados propios.
    if (actor.rol === "admin_sucursal") {
        if (objetivo.rol !== "empleado" || !actor.sucursal_id || objetivo.sucursal_id !== actor.sucursal_id) {
            redirect("/admin/usuarios?error=permisos");
        }
    }

    return objetivo;
}

export async function crearUsuario(formData: FormData) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const admin = createAdminClient();

    const { data: perfil, error: errorPerfilActual } = await admin
        .from("perfiles")
        .select("id, rol, sucursal_id, activo")
        .eq("id", user.id)
        .maybeSingle();

    if (errorPerfilActual || !perfil || !perfil.activo || !["admin_general", "admin_sucursal"].includes(perfil.rol)) {
        redirect("/admin/usuarios?error=permisos");
    }

    const validacion = esquemaUsuario.safeParse({
        nombre_completo: formData.get("nombre_completo"),
        email: formData.get("email"),
        password: formData.get("password"),
        rol: formData.get("rol"),
        sucursal_id: formData.get("sucursal_id") || "",
    });

    if (!validacion.success) {
        redirect("/admin/usuarios?error=datos");
    }

    const datos = validacion.data;

    if (perfil.rol === "admin_sucursal" && datos.rol !== "empleado") {
        redirect("/admin/usuarios?error=rol");
    }

    let sucursalId: string | null = null;

    if (perfil.rol === "admin_sucursal") {
        sucursalId = perfil.sucursal_id;

        if (!sucursalId) {
            redirect("/admin/usuarios?error=sucursal");
        }
    } else if (datos.rol !== "admin_general") {
        sucursalId = datos.sucursal_id || null;

        if (!sucursalId) {
            redirect("/admin/usuarios?error=sucursal");
        }
    }

    if (sucursalId) {
        const { data: sucursal, error: errorSucursal } = await admin
            .from("sucursales")
            .select("id")
            .eq("id", sucursalId)
            .eq("activa", true)
            .maybeSingle();

        if (errorSucursal || !sucursal) {
            redirect("/admin/usuarios?error=sucursal");
        }
    }

    const { data: nuevoUsuario, error: errorAuth } = await admin.auth.admin.createUser({
        email: datos.email.toLowerCase(),
        password: datos.password,
        email_confirm: false,
        user_metadata: {
            nombre_completo: datos.nombre_completo,
        },
    });

    if (errorAuth || !nuevoUsuario.user) {
        console.error("Error al crear usuario:", errorAuth?.message);
        redirect("/admin/usuarios?error=creacion");
    }

    const { error: errorActualizarPerfil } = await admin
        .from("perfiles")
        .update({
            nombre_completo: datos.nombre_completo,
            rol: datos.rol,
            sucursal_id: sucursalId,
        })
        .eq("id", nuevoUsuario.user.id);

    if (errorActualizarPerfil) {
        console.error("Error al actualizar perfil:", errorActualizarPerfil.message);

        const { error: errorEliminar } = await admin.auth.admin.deleteUser(nuevoUsuario.user.id);

        if (errorEliminar) {
            console.error("No se pudo eliminar la cuenta incompleta:", errorEliminar.message);
        }

        redirect("/admin/usuarios?error=perfil");
    }

    revalidatePath("/admin");
    revalidatePath("/admin/usuarios");

    redirect("/admin/usuarios?creado=1");
}

// Desactiva el perfil y bloquea el inicio de sesión.
export async function desactivarUsuario(formData: FormData) {
    const validacion = esquemaId.safeParse({
        usuario_id: formData.get("usuario_id"),
    });

    if (!validacion.success) {
        redirect("/admin/usuarios?error=datos");
    }

    const { admin, actor } = await obtenerContextoGestion();

    const objetivo = await obtenerUsuarioGestionable(admin, actor, validacion.data.usuario_id);

    if (!objetivo.activo) {
        redirect("/admin/usuarios?error=estado");
    }

    // Primero se bloquea el acceso a los datos de la aplicación.
    const { error: errorPerfil } = await admin
        .from("perfiles")
        .update({ activo: false })
        .eq("id", objetivo.id)
        .eq("activo", true);

    if (errorPerfil) {
        console.error("Error al desactivar perfil:", errorPerfil.message);
        redirect("/admin/usuarios?error=desactivacion");
    }

    // Después se bloquea el inicio de sesión en Supabase Auth.
    const { error: errorAuth } = await admin.auth.admin.updateUserById(objetivo.id, { ban_duration: "876000h" });

    if (errorAuth) {
        console.error("Error al bloquear cuenta:", errorAuth.message);

        // Intentar restaurar el perfil si Auth no pudo bloquear la cuenta.
        const { error: errorRestaurar } = await admin.from("perfiles").update({ activo: true }).eq("id", objetivo.id);

        if (errorRestaurar) {
            console.error("No se pudo restaurar el perfil:", errorRestaurar.message);
        }

        redirect("/admin/usuarios?error=desactivacion");
    }

    revalidatePath("/admin");
    revalidatePath("/admin/usuarios");

    redirect("/admin/usuarios?desactivado=1");
}

// Reactiva el inicio de sesión y el perfil.
export async function reactivarUsuario(formData: FormData) {
    const validacion = esquemaId.safeParse({
        usuario_id: formData.get("usuario_id"),
    });

    if (!validacion.success) {
        redirect("/admin/usuarios?error=datos");
    }

    const { admin, actor } = await obtenerContextoGestion();

    const objetivo = await obtenerUsuarioGestionable(admin, actor, validacion.data.usuario_id);

    if (objetivo.activo) {
        redirect("/admin/usuarios?error=estado");
    }

    // Primero se quita el bloqueo de Auth.
    const { error: errorAuth } = await admin.auth.admin.updateUserById(objetivo.id, { ban_duration: "none" });

    if (errorAuth) {
        console.error("Error al desbloquear cuenta:", errorAuth.message);
        redirect("/admin/usuarios?error=reactivacion");
    }

    // Después se permite nuevamente el acceso a la aplicación.
    const { error: errorPerfil } = await admin
        .from("perfiles")
        .update({ activo: true })
        .eq("id", objetivo.id)
        .eq("activo", false);

    if (errorPerfil) {
        console.error("Error al reactivar perfil:", errorPerfil.message);

        // Intentar volver a bloquear Auth si falla la actualización del perfil.
        const { error: errorBloqueo } = await admin.auth.admin.updateUserById(objetivo.id, {
            ban_duration: "876000h",
        });

        if (errorBloqueo) {
            console.error("No se pudo volver a bloquear la cuenta:", errorBloqueo.message);
        }

        redirect("/admin/usuarios?error=reactivacion");
    }

    revalidatePath("/admin");
    revalidatePath("/admin/usuarios");

    redirect("/admin/usuarios?reactivado=1");
}
