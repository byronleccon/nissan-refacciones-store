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

// Determina la ruta de gestión según el administrador.
function obtenerRutaGestion(rol: string) {
    return rol === "admin_sucursal" ? "/admin/empleados" : "/admin/usuarios";
}

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
        redirect("/admin?error=permisos");
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
    const rutaGestion = obtenerRutaGestion(actor.rol);

    // Nadie puede gestionarse a sí mismo.
    if (actor.id === usuarioId) {
        redirect(`${rutaGestion}?error=propio`);
    }

    const { data: objetivo, error } = await admin
        .from("perfiles")
        .select("id, rol, sucursal_id, activo")
        .eq("id", usuarioId)
        .maybeSingle();

    if (error || !objetivo) {
        redirect(`${rutaGestion}?error=usuario`);
    }

    // No se permite gestionar cuentas de clientes.
    if (!["admin_general", "admin_sucursal", "empleado"].includes(objetivo.rol)) {
        redirect(`${rutaGestion}?error=objetivo`);
    }

    // El administrador de sucursal solo gestiona empleados propios.
    if (actor.rol === "admin_sucursal") {
        if (objetivo.rol !== "empleado" || !actor.sucursal_id || objetivo.sucursal_id !== actor.sucursal_id) {
            redirect(`${rutaGestion}?error=permisos`);
        }
    }

    return objetivo;
}

// Crear usuarios.
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
        redirect("/admin?error=permisos");
    }

    const rutaGestion = obtenerRutaGestion(perfil.rol);

    // Validar los datos recibidos.
    const validacion = esquemaUsuario.safeParse({
        nombre_completo: formData.get("nombre_completo"),
        email: formData.get("email"),
        password: formData.get("password"),
        rol: formData.get("rol"),
        sucursal_id: formData.get("sucursal_id") || "",
    });

    if (!validacion.success) {
        redirect(`${rutaGestion}?error=datos`);
    }

    const datos = validacion.data;

    // Validar jerarquía de permisos.
    if (perfil.rol === "admin_sucursal" && datos.rol !== "empleado") {
        redirect(`${rutaGestion}?error=rol`);
    }

    // Determinar la sucursal que tendrá el nuevo usuario.
    let sucursalId: string | null = null;

    if (perfil.rol === "admin_sucursal") {
        sucursalId = perfil.sucursal_id;

        if (!sucursalId) {
            redirect(`${rutaGestion}?error=sucursal`);
        }
    } else if (datos.rol !== "admin_general") {
        sucursalId = datos.sucursal_id || null;

        if (!sucursalId) {
            redirect(`${rutaGestion}?error=sucursal`);
        }
    }

    // Comprobar que la sucursal exista y esté activa.
    if (sucursalId) {
        const { data: sucursal, error: errorSucursal } = await admin
            .from("sucursales")
            .select("id")
            .eq("id", sucursalId)
            .eq("activa", true)
            .maybeSingle();

        if (errorSucursal || !sucursal) {
            redirect(`${rutaGestion}?error=sucursal`);
        }
    }

    // Crear cuenta en Supabase Auth.
    const { data: nuevoUsuario, error: errorAuth } = await admin.auth.admin.createUser({
        email: datos.email.toLowerCase(),
        password: datos.password,
        email_confirm: true,
        user_metadata: {
            nombre_completo: datos.nombre_completo,
        },
    });

    if (errorAuth || !nuevoUsuario.user) {
        console.error("Error al crear usuario:", errorAuth?.message);

        redirect(`${rutaGestion}?error=creacion`);
    }

    // El trigger ya creó el perfil.
    // Actualizar nombre, rol y sucursal.
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

        // Evitar dejar una cuenta creada con permisos incorrectos.
        const { error: errorEliminar } = await admin.auth.admin.deleteUser(nuevoUsuario.user.id);

        if (errorEliminar) {
            console.error("No se pudo eliminar la cuenta incompleta:", errorEliminar.message);
        }

        redirect(`${rutaGestion}?error=perfil`);
    }

    revalidatePath("/admin");
    revalidatePath("/admin/usuarios");
    revalidatePath("/admin/empleados");

    redirect(`${rutaGestion}?creado=1`);
}

// Desactivar usuario.
export async function desactivarUsuario(formData: FormData) {
    const validacion = esquemaId.safeParse({
        usuario_id: formData.get("usuario_id"),
    });

    if (!validacion.success) {
        redirect("/admin?error=datos");
    }

    const { admin, actor } = await obtenerContextoGestion();

    const rutaGestion = obtenerRutaGestion(actor.rol);

    const objetivo = await obtenerUsuarioGestionable(admin, actor, validacion.data.usuario_id);

    if (!objetivo.activo) {
        redirect(`${rutaGestion}?error=estado`);
    }

    // Primero bloquear el acceso a la aplicación.
    const { error: errorPerfil } = await admin
        .from("perfiles")
        .update({ activo: false })
        .eq("id", objetivo.id)
        .eq("activo", true);

    if (errorPerfil) {
        console.error("Error al desactivar perfil:", errorPerfil.message);

        redirect(`${rutaGestion}?error=desactivacion`);
    }

    // Después bloquear el inicio de sesión en Supabase Auth.
    const { error: errorAuth } = await admin.auth.admin.updateUserById(objetivo.id, {
        ban_duration: "876000h",
    });

    if (errorAuth) {
        console.error("Error al bloquear cuenta:", errorAuth.message);

        // Intentar restaurar el perfil si Auth falla.
        const { error: errorRestaurar } = await admin.from("perfiles").update({ activo: true }).eq("id", objetivo.id);

        if (errorRestaurar) {
            console.error("No se pudo restaurar el perfil:", errorRestaurar.message);
        }

        redirect(`${rutaGestion}?error=desactivacion`);
    }

    revalidatePath("/admin");
    revalidatePath("/admin/usuarios");
    revalidatePath("/admin/empleados");

    redirect(`${rutaGestion}?desactivado=1`);
}

// Reactivar usuario.
export async function reactivarUsuario(formData: FormData) {
    const validacion = esquemaId.safeParse({
        usuario_id: formData.get("usuario_id"),
    });

    if (!validacion.success) {
        redirect("/admin?error=datos");
    }

    const { admin, actor } = await obtenerContextoGestion();

    const rutaGestion = obtenerRutaGestion(actor.rol);

    const objetivo = await obtenerUsuarioGestionable(admin, actor, validacion.data.usuario_id);

    if (objetivo.activo) {
        redirect(`${rutaGestion}?error=estado`);
    }

    // Primero quitar el bloqueo de Auth.
    const { error: errorAuth } = await admin.auth.admin.updateUserById(objetivo.id, {
        ban_duration: "none",
    });

    if (errorAuth) {
        console.error("Error al desbloquear cuenta:", errorAuth.message);

        redirect(`${rutaGestion}?error=reactivacion`);
    }

    // Después permitir nuevamente el acceso a la aplicación.
    const { error: errorPerfil } = await admin
        .from("perfiles")
        .update({ activo: true })
        .eq("id", objetivo.id)
        .eq("activo", false);

    if (errorPerfil) {
        console.error("Error al reactivar perfil:", errorPerfil.message);

        // Intentar volver a bloquear Auth si falla la actualización.
        const { error: errorBloqueo } = await admin.auth.admin.updateUserById(objetivo.id, {
            ban_duration: "876000h",
        });

        if (errorBloqueo) {
            console.error("No se pudo volver a bloquear la cuenta:", errorBloqueo.message);
        }

        redirect(`${rutaGestion}?error=reactivacion`);
    }

    revalidatePath("/admin");
    revalidatePath("/admin/usuarios");
    revalidatePath("/admin/empleados");

    redirect(`${rutaGestion}?reactivado=1`);
}
