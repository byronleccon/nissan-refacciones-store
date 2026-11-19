"use server";

import { createClient } from "@/lib/supabase/server";
import {
    esquemaLogin,
    esquemaNuevaContrasena,
    esquemaRecuperacion,
    esquemaRegistro,
    type DatosLogin,
    type DatosRegistro,
} from "@/lib/validaciones/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ResultadoAccion = { error: string } | { mensaje: string } | undefined;

function obtenerUrlSitio() {
    return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

// Iniciar sesión.
export async function iniciarSesion(datos: DatosLogin): Promise<ResultadoAccion> {
    const validado = esquemaLogin.safeParse(datos);

    if (!validado.success) {
        return { error: "Los datos no son válidos." };
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
        email: validado.data.correo.trim().toLowerCase(),
        password: validado.data.contrasena,
    });

    if (error) {
        console.error("Error de Supabase Auth:", error.code, error.message);

        return {
            error: "No se pudo iniciar sesión. Comprueba tu correo y contraseña y verifica que tu cuenta esté confirmada.",
        };
    }

    revalidatePath("/", "layout");
    redirect("/");
}

// Registrar cliente.
export async function registrarse(datos: DatosRegistro): Promise<ResultadoAccion> {
    const validado = esquemaRegistro.safeParse(datos);

    if (!validado.success) {
        return { error: "Revisa los datos del formulario." };
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.signUp({
        email: validado.data.correo.trim().toLowerCase(),
        password: validado.data.contrasena,
        options: {
            emailRedirectTo: `${obtenerUrlSitio()}/auth/callback?next=/login`,
            data: {
                nombre_completo: validado.data.nombre_completo,
                telefono: validado.data.telefono,
            },
        },
    });

    if (error) {
        console.error("Error al registrar usuario:", error.code, error.message);

        return {
            error: "No se pudo crear la cuenta. Comprueba el correo e inténtalo de nuevo.",
        };
    }

    return {
        mensaje:
            "Tu cuenta se creó correctamente. Revisa tu correo electrónico y pulsa el enlace de confirmación para activarla.",
    };
}

// Enviar correo de recuperación.

export async function enviarRecuperacion(correo: string): Promise<ResultadoAccion> {
    const validado = esquemaRecuperacion.safeParse({ correo });

    if (!validado.success) {
        return { error: "Escribe un correo electrónico válido." };
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(validado.data.correo.trim().toLowerCase(), {
        redirectTo: `${obtenerUrlSitio()}/auth/confirm?next=/restablecer-contrasena`,
    });

    if (error) {
        console.error("Error al solicitar recuperación:", error.code, error.message);

        return {
            error: "No se pudo procesar la solicitud. Inténtalo más tarde.",
        };
    }

    return {
        mensaje:
            "Si existe una cuenta asociada a ese correo, recibirás un enlace para restablecer tu contraseña. Revisa también el correo no deseado.",
    };
}

// Guardar la nueva contraseña.
export async function actualizarContrasena(datos: {
    contrasena: string;
    confirmar_contrasena: string;
}): Promise<ResultadoAccion> {
    const validado = esquemaNuevaContrasena.safeParse(datos);

    if (!validado.success) {
        return { error: "Las contraseñas no son válidas o no coinciden." };
    }

    const supabase = await createClient();

    const {
        data: { user },
        error: errorUsuario,
    } = await supabase.auth.getUser();

    if (errorUsuario || !user) {
        return {
            error: "El enlace de recuperación no es válido o ha caducado. Solicita uno nuevo.",
        };
    }

    const { error } = await supabase.auth.updateUser({
        password: validado.data.contrasena,
    });

    if (error) {
        console.error("Error al actualizar contraseña:", error.code, error.message);

        return {
            error: "No se pudo actualizar la contraseña. Solicita un nuevo enlace.",
        };
    }

    revalidatePath("/", "layout");
    redirect("/login?contrasena=actualizada");
}

// Cerrar sesión.
export async function cerrarSesion() {
    const supabase = await createClient();

    await supabase.auth.signOut();

    revalidatePath("/", "layout");
    redirect("/");
}
