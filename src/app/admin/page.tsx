import { exigirRol } from "@/lib/auth/exigir-rol";

export default async function AdminPage() {
    const perfil = await exigirRol(["admin_general"]);

    return (
        <main className="mx-auto max-w-3xl p-6">
            <h1 className="text-3xl font-bold">Panel de administración</h1>
            <p className="mt-2">Bienvenido, {perfil.nombre_completo ?? perfil.email}.</p>
            <p className="mt-1 text-sm text-gray-600">Rol: Administrador general</p>
        </main>
    );
}
