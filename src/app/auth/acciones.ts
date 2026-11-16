"use server";

import { createClient } from "@/lib/supabase/server";
import { esquemaLogin, esquemaRegistro, type DatosLogin, type DatosRegistro } from "@/lib/validaciones/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ResultadoAccion = { error: string } | undefined;

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
        console.error("Error de Supabase Auth:", {
            code: error.code,
            message: error.message,
            status: error.status,
        });

        return {
            error: `Error de autenticación: ${error.code ?? error.message}`,
        };
    }

    revalidatePath("/", "layout");
    redirect("/");
}

// Registrar cliente.
export async function registrarse(datos: DatosRegistro): Promise<ResultadoAccion> {
    const validado = esquemaRegistro.safeParse(datos);

    if (!validado.success) {
        return { error: "Los datos no son válidos." };
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.signUp({
        email: validado.data.correo.trim().toLowerCase(),
        password: validado.data.contrasena,
        options: {
            data: {
                nombre_completo: validado.data.nombre_completo,
            },
        },
    });

    if (error) {
        console.error("Error al registrar usuario:", error.code, error.message);

        return {
            error: "No se pudo crear la cuenta. Intenta con otro correo.",
        };
    }

    revalidatePath("/", "layout");
    redirect("/");
}

// Cerrar sesión.
export async function cerrarSesion() {
    const supabase = await createClient();

    await supabase.auth.signOut();

    revalidatePath("/", "layout");
    redirect("/");
}
