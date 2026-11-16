import { exigirRol } from "@/lib/auth/exigir-rol";
import Link from "next/link";

export default async function EmpleadoPage() {
    const perfil = await exigirRol(["empleado"]);

    return (
        <main className="mx-auto max-w-5xl p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Panel de empleado</h1>

                <p className="mt-2 text-muted-foreground">
                    Bienvenido. Desde aquí puedes gestionar los pedidos de tu sucursal y registrar las entregas a los
                    clientes.
                </p>
            </div>

            <section className="grid gap-5 sm:grid-cols-2">
                <Link
                    href="/admin/pedidos"
                    className="group rounded-xl border p-6 transition hover:border-primary hover:bg-accent/50"
                >
                    <h2 className="text-xl font-semibold group-hover:text-primary">Gestión de pedidos</h2>

                    <p className="mt-2 text-sm text-muted-foreground">
                        Consulta los pedidos de tu sucursal, inicia su preparación, márcalos como listos y confirma las
                        entregas a los clientes.
                    </p>

                    <p className="mt-5 text-sm font-medium text-primary">Administrar pedidos →</p>
                </Link>

                <div className="rounded-xl border p-6">
                    <h2 className="text-xl font-semibold">Mi sucursal</h2>

                    <p className="mt-2 text-sm text-muted-foreground">
                        Estás asignado a una sucursal. Los pedidos que puedes consultar y gestionar corresponden
                        exclusivamente a ella.
                    </p>

                    <p className="mt-5 text-sm font-medium">Acceso limitado por permisos</p>
                </div>
            </section>
        </main>
    );
}
