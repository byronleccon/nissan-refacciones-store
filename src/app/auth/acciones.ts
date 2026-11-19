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
import { resolveMx } from "node:dns/promises";

export type ResultadoAccion = { error: string } | { mensaje: string } | undefined;

function obtenerUrlSitio() {
    return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

// Comprueba que el dominio tenga servidores de correo configurados.
async function comprobarDominioCorreo(correo: string): Promise<string | null> {
    const dominio = correo.split("@")[1];

    try {
        const registros = await resolveMx(dominio);

        if (!registros || registros.length === 0) {
            return "Este dominio no tiene servidores de correo configurados. Revisa la dirección.";
        }

        return null;
    } catch (error) {
        const codigo = (error as NodeJS.ErrnoException).code;

        if (codigo === "ENOTFOUND" || codigo === "ENODATA") {
            return "No encontramos servidores de correo para este dominio. Comprueba si lo escribiste correctamente.";
        }

        console.error("Error temporal al comprobar el dominio:", codigo);

        return "No pudimos verificar el dominio en este momento. Inténtalo nuevamente.";
    }
}

// Iniciar sesión.
export async function iniciarSesion(datos: DatosLogin): Promise<ResultadoAccion> {
    const validado = esquemaLogin.safeParse(datos);

    if (!validado.success) {
        return {
            error: validado.error.issues[0]?.message || "Revisa los datos.",
        };
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
        email: validado.data.correo,
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
        return {
            error: validado.error.issues[0]?.message || "Revisa los datos.",
        };
    }

    const { correo, contrasena, nombre_completo, telefono } = validado.data;

    // Comprobar registros MX del correo.
    const errorDominio = await comprobarDominioCorreo(correo);

    if (errorDominio) {
        return {
            error: errorDominio,
        };
    }

    // Crear cuenta en Supabase.
    // La contraseña se valida mediante Zod.
    // No se consulta ningún servicio de contraseñas filtradas.
    const supabase = await createClient();

    const { error } = await supabase.auth.signUp({
        email: correo,
        password: contrasena,
        options: {
            emailRedirectTo: `${obtenerUrlSitio()}/auth/callback?next=/login`,
            data: {
                nombre_completo,
                telefono,
            },
        },
    });

    if (error) {
        console.error("Error al registrar usuario:", error.code, error.message);

        if (error.code === "user_already_exists" || error.code === "email_exists") {
            return {
                error: "Este correo electrónico ya está en uso. Prueba con otro correo o inicia sesión.",
            };
        }

        return {
            error: "No se pudo crear la cuenta. Comprueba los datos e inténtalo nuevamente.",
        };
    }

    return {
        mensaje:
            "Tu cuenta se creó correctamente. Revisa tu correo electrónico y pulsa el enlace de confirmación para activarla.",
    };
}

// Enviar correo de recuperación.
export async function enviarRecuperacion(correo: string): Promise<ResultadoAccion> {
    const validado = esquemaRecuperacion.safeParse({
        correo,
    });

    if (!validado.success) {
        return {
            error: validado.error.issues[0]?.message || "Escribe un correo válido.",
        };
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(validado.data.correo, {
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
        return {
            error: validado.error.issues[0]?.message || "Revisa las contraseñas.",
        };
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
