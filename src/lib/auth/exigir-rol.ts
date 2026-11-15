import { obtenerPerfilActual, type Rol } from "@/lib/auth/perfil";
import { redirect } from "next/navigation";

// Úsala al inicio de páginas protegidas.
// Si no hay sesión, manda a /login. Si el rol no alcanza, manda a /.
export async function exigirRol(rolesPermitidos: Rol[]) {
    const perfil = await obtenerPerfilActual();

    if (!perfil) redirect("/login");
    if (!rolesPermitidos.includes(perfil.rol)) redirect("/");

    return perfil;
}
