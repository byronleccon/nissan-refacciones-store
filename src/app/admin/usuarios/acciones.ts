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

const esquemaEditarUsuario = z.object({
    usuario_id: z.string().uuid(),
    nombre_completo: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(254),
    password: z.union([z.literal(""), z.string().min(8).max(72)]),
    rol: z.enum(["admin_general", "admin_sucursal", "empleado"]),
    sucursal_id: z.union([z.string().uuid(), z.literal("")]),
});

const esquemaId = z.object({
    usuario_id: z.string().uuid(),
});

function obtenerRutaGestion(rol: string) {
    return rol === "admin_sucursal" ? "/admin/empleados" : "/admin/usuarios";
}

async function obtenerContextoGestion() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

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

    if (actor.id === usuarioId) {
        redirect(`${rutaGestion}?error=propio`);
    }

    const { data: objetivo, error } = await admin
        .from("perfiles")
        .select("id, nombre_completo, rol, sucursal_id, activo")
        .eq("id", usuarioId)
        .maybeSingle();

    if (error || !objetivo) {
        redirect(`${rutaGestion}?error=usuario`);
    }

    if (!["admin_general", "admin_sucursal", "empleado"].includes(objetivo.rol)) {
        redirect(`${rutaGestion}?error=objetivo`);
    }

    if (actor.rol === "admin_sucursal") {
        if (objetivo.rol !== "empleado" || !actor.sucursal_id || objetivo.sucursal_id !== actor.sucursal_id) {
            redirect(`${rutaGestion}?error=permisos`);
        }
    }

    return objetivo;
}

// Crear usuarios.
export async function crearUsuario(formData: FormData) {
    const { admin, actor } = await obtenerContextoGestion();
    const rutaGestion = obtenerRutaGestion(actor.rol);

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

    if (actor.rol === "admin_sucursal" && datos.rol !== "empleado") {
        redirect(`${rutaGestion}?error=rol`);
    }

    let sucursalId: string | null = null;

    if (actor.rol === "admin_sucursal") {
        sucursalId = actor.sucursal_id;

        if (!sucursalId) {
            redirect(`${rutaGestion}?error=sucursal`);
        }
    } else if (datos.rol !== "admin_general") {
        sucursalId = datos.sucursal_id || null;

        if (!sucursalId) {
            redirect(`${rutaGestion}?error=sucursal`);
        }
    }

    if (sucursalId) {
        const { data: sucursal, error } = await admin
            .from("sucursales")
            .select("id")
            .eq("id", sucursalId)
            .eq("activa", true)
            .maybeSingle();

        if (error || !sucursal) {
            redirect(`${rutaGestion}?error=sucursal`);
        }
    }

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

    if (!validacion.success) redirect("/admin?error=datos");

    const { admin, actor } = await obtenerContextoGestion();
    const rutaGestion = obtenerRutaGestion(actor.rol);

    const objetivo = await obtenerUsuarioGestionable(admin, actor, validacion.data.usuario_id);

    if (!objetivo.activo) {
        redirect(`${rutaGestion}?error=estado`);
    }

    const { error: errorPerfil } = await admin
        .from("perfiles")
        .update({ activo: false })
        .eq("id", objetivo.id)
        .eq("activo", true);

    if (errorPerfil) {
        console.error("Error al desactivar perfil:", errorPerfil.message);
        redirect(`${rutaGestion}?error=desactivacion`);
    }

    const { error: errorAuth } = await admin.auth.admin.updateUserById(objetivo.id, {
        ban_duration: "876000h",
    });

    if (errorAuth) {
        console.error("Error al bloquear cuenta:", errorAuth.message);

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

    if (!validacion.success) redirect("/admin?error=datos");

    const { admin, actor } = await obtenerContextoGestion();
    const rutaGestion = obtenerRutaGestion(actor.rol);

    const objetivo = await obtenerUsuarioGestionable(admin, actor, validacion.data.usuario_id);

    if (objetivo.activo) {
        redirect(`${rutaGestion}?error=estado`);
    }

    const { error: errorAuth } = await admin.auth.admin.updateUserById(objetivo.id, {
        ban_duration: "none",
    });

    if (errorAuth) {
        console.error("Error al desbloquear cuenta:", errorAuth.message);
        redirect(`${rutaGestion}?error=reactivacion`);
    }

    const { error: errorPerfil } = await admin
        .from("perfiles")
        .update({ activo: true })
        .eq("id", objetivo.id)
        .eq("activo", false);

    if (errorPerfil) {
        console.error("Error al reactivar perfil:", errorPerfil.message);

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

// Editar datos y credenciales de un usuario.
export async function actualizarUsuario(formData: FormData) {
    const validacion = esquemaEditarUsuario.safeParse({
        usuario_id: formData.get("usuario_id"),
        nombre_completo: formData.get("nombre_completo"),
        email: formData.get("email"),
        password: formData.get("password") || "",
        rol: formData.get("rol"),
        sucursal_id: formData.get("sucursal_id") || "",
    });

    if (!validacion.success) {
        redirect("/admin?error=datos");
    }

    const { admin, actor } = await obtenerContextoGestion();
    const rutaGestion = obtenerRutaGestion(actor.rol);
    const datos = validacion.data;

    const objetivo = await obtenerUsuarioGestionable(admin, actor, datos.usuario_id);

    if (!objetivo.activo) {
        redirect(`${rutaGestion}?error=editar_inactivo`);
    }

    let nuevoRol = datos.rol;
    let nuevaSucursal: string | null = datos.sucursal_id || null;

    if (actor.rol === "admin_sucursal") {
        if (objetivo.rol !== "empleado" || !actor.sucursal_id || objetivo.sucursal_id !== actor.sucursal_id) {
            redirect(`${rutaGestion}?error=permisos`);
        }

        nuevoRol = "empleado";
        nuevaSucursal = actor.sucursal_id;
    } else {
        if (nuevoRol !== "admin_general" && !nuevaSucursal) {
            redirect(`${rutaGestion}?error=sucursal`);
        }

        if (nuevoRol === "admin_general") {
            nuevaSucursal = null;
        }
    }

    if (nuevaSucursal) {
        const { data: sucursal, error } = await admin
            .from("sucursales")
            .select("id")
            .eq("id", nuevaSucursal)
            .eq("activa", true)
            .maybeSingle();

        if (error || !sucursal) {
            redirect(`${rutaGestion}?error=sucursal`);
        }
    }

    const { data: usuarioAuth, error: errorObtenerAuth } = await admin.auth.admin.getUserById(objetivo.id);

    if (errorObtenerAuth || !usuarioAuth.user) {
        console.error("Error al consultar cuenta Auth:", errorObtenerAuth?.message);
        redirect(`${rutaGestion}?error=usuario`);
    }

    const perfilAnterior = {
        nombre_completo: objetivo.nombre_completo,
        rol: objetivo.rol,
        sucursal_id: objetivo.sucursal_id,
    };

    const { error: errorPerfil } = await admin
        .from("perfiles")
        .update({
            nombre_completo: datos.nombre_completo,
            rol: nuevoRol,
            sucursal_id: nuevaSucursal,
        })
        .eq("id", objetivo.id);

    if (errorPerfil) {
        console.error("Error al actualizar perfil:", errorPerfil.message);
        redirect(`${rutaGestion}?error=edicion`);
    }

    const cambiosAuth: {
        email: string;
        email_confirm: boolean;
        password?: string;
        user_metadata: { nombre_completo: string };
    } = {
        email: datos.email.trim().toLowerCase(),
        email_confirm: true,
        user_metadata: {
            nombre_completo: datos.nombre_completo,
        },
    };

    if (datos.password !== "") {
        cambiosAuth.password = datos.password;
    }

    const { error: errorAuth } = await admin.auth.admin.updateUserById(objetivo.id, cambiosAuth);

    if (errorAuth) {
        console.error("Error al actualizar cuenta Auth:", errorAuth.message);

        const { error: errorRestaurar } = await admin.from("perfiles").update(perfilAnterior).eq("id", objetivo.id);

        if (errorRestaurar) {
            console.error("Error al restaurar perfil:", errorRestaurar.message);
        }

        redirect(`${rutaGestion}?error=credenciales`);
    }

    revalidatePath("/admin");
    revalidatePath("/admin/usuarios");
    revalidatePath("/admin/empleados");

    redirect(`${rutaGestion}?editado=1`);
}

// Eliminar permanentemente una cuenta.
// Solo el administrador general puede ejecutar esta acción.
export async function eliminarUsuario(formData: FormData) {
    const validacion = esquemaId.safeParse({
        usuario_id: formData.get("usuario_id"),
    });

    if (!validacion.success) {
        redirect("/admin/usuarios?error=datos");
    }

    const { admin, actor } = await obtenerContextoGestion();

    if (actor.rol !== "admin_general") {
        redirect("/admin?error=permisos");
    }

    const objetivo = await obtenerUsuarioGestionable(admin, actor, validacion.data.usuario_id);

    // Comprobar referencias en las tablas conocidas del sistema.
    const [pedidos, movimientos, historial, carrito] = await Promise.all([
        admin.from("pedidos").select("id", { count: "exact", head: true }).eq("cliente_id", objetivo.id),

        admin.from("movimientos_inventario").select("id", { count: "exact", head: true }).eq("usuario_id", objetivo.id),

        admin
            .from("historial_estados_pedido")
            .select("id", { count: "exact", head: true })
            .eq("usuario_id", objetivo.id),

        admin.from("carrito_items").select("producto_id", { count: "exact", head: true }).eq("usuario_id", objetivo.id),
    ]);

    if (pedidos.error || movimientos.error || historial.error || carrito.error) {
        console.error("Error al comprobar referencias del usuario:", {
            pedidos: pedidos.error?.message,
            movimientos: movimientos.error?.message,
            historial: historial.error?.message,
            carrito: carrito.error?.message,
        });

        redirect("/admin/usuarios?error=eliminacion");
    }

    const tieneRegistros =
        (pedidos.count ?? 0) > 0 ||
        (movimientos.count ?? 0) > 0 ||
        (historial.count ?? 0) > 0 ||
        (carrito.count ?? 0) > 0;

    if (tieneRegistros) {
        redirect("/admin/usuarios?error=con_historial");
    }

    // Eliminar la cuenta de Supabase Auth.
    const { error: errorEliminar } = await admin.auth.admin.deleteUser(objetivo.id);

    if (errorEliminar) {
        console.error("Error al eliminar usuario:", errorEliminar.message);

        redirect("/admin/usuarios?error=eliminacion");
    }

    revalidatePath("/admin");
    revalidatePath("/admin/usuarios");
    revalidatePath("/admin/empleados");

    redirect("/admin/usuarios?eliminado=1");
}
