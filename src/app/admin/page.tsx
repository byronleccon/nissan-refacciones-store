import { exigirRol } from "@/lib/auth/exigir-rol";
import Link from "next/link";

export default async function AdminPage() {
    const perfil = await exigirRol(["admin_general", "admin_sucursal"]);

    const esAdminGeneral = perfil.rol === "admin_general";

    return (
        <main className="mx-auto max-w-5xl p-6">
            <h1 className="text-3xl font-bold">Panel de administración</h1>

            <p className="mt-2">Bienvenido, {perfil.nombre_completo ?? perfil.email}.</p>

            <p className="mt-1 text-sm text-muted-foreground">
                Rol: {esAdminGeneral ? "Administrador general" : "Administrador de sucursal"}
            </p>

            <section className="mt-8 grid gap-5 sm:grid-cols-2">
                <Link href="/admin/pedidos" className="rounded-xl border p-6 transition-colors hover:bg-muted">
                    <h2 className="text-xl font-semibold">Gestión de pedidos</h2>

                    <p className="mt-2 text-sm text-muted-foreground">Consulta los pedidos y revisa su estado.</p>

                    <span className="mt-4 inline-block text-sm font-medium text-primary">Ver pedidos →</span>
                </Link>
            </section>
        </main>
    );
}
