import { createClient } from "@/lib/supabase/server";

export type Rol = "cliente" | "admin_sucursal" | "admin_general" | "empleado";

export type PerfilActual = {
    id: string;
    email: string;
    nombre_completo: string | null;
    rol: Rol;
    sucursal_id: string | null;
};

// Devuelve el perfil del usuario con sesión, o null si no hay sesión
export async function obtenerPerfilActual(): Promise<PerfilActual | null> {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: perfil } = await supabase
        .from("perfiles")
        .select("nombre_completo, rol, sucursal_id")
        .eq("id", user.id)
        .single();

    if (!perfil) return null;

    return {
        id: user.id,
        email: user.email ?? "",
        nombre_completo: perfil.nombre_completo,
        rol: perfil.rol as Rol,
        sucursal_id: perfil.sucursal_id,
    };
}
