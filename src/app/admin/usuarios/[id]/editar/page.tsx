import { exigirRol } from "@/lib/auth/exigir-rol";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { redirect } from "next/navigation";
import { actualizarUsuario } from "../../acciones";

type Sucursal = {
    id: string;
    nombre: string;
};

const nombresRoles: Record<string, string> = {
    admin_general: "Administrador general",
    admin_sucursal: "Administrador de sucursal",
    empleado: "Empleado",
};

export default async function EditarUsuarioPage({ params }: { params: Promise<{ id: string }> }) {
    const actor = await exigirRol(["admin_general", "admin_sucursal"]);
    const { id } = await params;
    const admin = createAdminClient();

    const rutaGestion = actor.rol === "admin_sucursal" ? "/admin/empleados" : "/admin/usuarios";

    if (actor.id === id) {
        redirect(`${rutaGestion}?error=propio`);
    }

    const { data: usuario, error } = await admin
        .from("perfiles")
        .select("id, nombre_completo, rol, sucursal_id, activo")
        .eq("id", id)
        .maybeSingle();

    if (error || !usuario) {
        redirect(`${rutaGestion}?error=usuario`);
    }

    if (!usuario.activo) {
        redirect(`${rutaGestion}?error=editar_inactivo`);
    }

    if (!["admin_general", "admin_sucursal", "empleado"].includes(usuario.rol)) {
        redirect(`${rutaGestion}?error=objetivo`);
    }

    if (actor.rol === "admin_sucursal") {
        if (usuario.rol !== "empleado" || !actor.sucursal_id || usuario.sucursal_id !== actor.sucursal_id) {
            redirect(`${rutaGestion}?error=permisos`);
        }
    }

    const { data: usuarioAuth, error: errorAuth } = await admin.auth.admin.getUserById(id);

    if (errorAuth || !usuarioAuth.user) {
        redirect(`${rutaGestion}?error=usuario`);
    }

    const { data: sucursalesData } = await admin
        .from("sucursales")
        .select("id, nombre")
        .eq("activa", true)
        .order("nombre");

    const sucursales = (sucursalesData ?? []) as Sucursal[];

    const sucursalActual = sucursales.find(sucursal => sucursal.id === usuario.sucursal_id);

    const esAdminGeneral = actor.rol === "admin_general";

    return (
        <main className="mx-auto max-w-3xl space-y-8 p-6">
            <div>
                <Link href={rutaGestion} className="text-sm text-blue-600 hover:underline">
                    ← Volver a gestión de usuarios
                </Link>

                <h1 className="mt-4 text-3xl font-bold">Editar usuario</h1>

                <p className="mt-2 text-gray-500">Modifica los datos y las credenciales de esta cuenta.</p>
            </div>

            <section className="rounded-xl border p-6 shadow-sm">
                <div className="mb-6">
                    <p className="text-sm text-gray-500">Rol actual</p>
                    <p className="font-semibold">{nombresRoles[usuario.rol] ?? usuario.rol}</p>
                </div>

                <form action={actualizarUsuario} className="space-y-5">
                    <input type="hidden" name="usuario_id" value={usuario.id} />

                    <div>
                        <label htmlFor="nombre_completo" className="mb-2 block text-sm font-medium">
                            Nombre completo
                        </label>

                        <input
                            id="nombre_completo"
                            name="nombre_completo"
                            type="text"
                            required
                            minLength={2}
                            maxLength={100}
                            defaultValue={usuario.nombre_completo ?? ""}
                            className="w-full rounded-lg border px-4 py-3"
                        />
                    </div>

                    <div>
                        <label htmlFor="email" className="mb-2 block text-sm font-medium">
                            Correo electrónico
                        </label>

                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            maxLength={254}
                            defaultValue={usuarioAuth.user.email ?? ""}
                            className="w-full rounded-lg border px-4 py-3"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="mb-2 block text-sm font-medium">
                            Nueva contraseña
                        </label>

                        <input
                            id="password"
                            name="password"
                            type="password"
                            minLength={8}
                            maxLength={72}
                            autoComplete="new-password"
                            className="w-full rounded-lg border px-4 py-3"
                            placeholder="Dejar vacío para conservar la actual"
                        />

                        <p className="mt-2 text-xs text-gray-500">
                            Si deseas cambiarla, escribe una contraseña de entre 8 y 72 caracteres.
                        </p>
                    </div>

                    {esAdminGeneral ? (
                        <>
                            <div>
                                <label htmlFor="rol" className="mb-2 block text-sm font-medium">
                                    Tipo de usuario
                                </label>

                                <select
                                    id="rol"
                                    name="rol"
                                    required
                                    defaultValue={usuario.rol}
                                    className="w-full rounded-lg border bg-white px-4 py-3"
                                >
                                    <option value="admin_general">Administrador general</option>
                                    <option value="admin_sucursal">Administrador de sucursal</option>
                                    <option value="empleado">Empleado</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="sucursal_id" className="mb-2 block text-sm font-medium">
                                    Sucursal asignada
                                </label>

                                <select
                                    id="sucursal_id"
                                    name="sucursal_id"
                                    defaultValue={usuario.sucursal_id ?? ""}
                                    className="w-full rounded-lg border bg-white px-4 py-3"
                                >
                                    <option value="">Sin sucursal (administrador general)</option>

                                    {sucursales.map(sucursal => (
                                        <option key={sucursal.id} value={sucursal.id}>
                                            {sucursal.nombre}
                                        </option>
                                    ))}
                                </select>

                                <p className="mt-2 text-xs text-gray-500">
                                    Los administradores generales no necesitan sucursal. Los demás roles sí.
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <input type="hidden" name="rol" value="empleado" />

                            <input type="hidden" name="sucursal_id" value={usuario.sucursal_id ?? ""} />

                            <div>
                                <label className="mb-2 block text-sm font-medium">Rol</label>

                                <input
                                    type="text"
                                    disabled
                                    value="Empleado"
                                    className="w-full rounded-lg border bg-gray-100 px-4 py-3"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium">Sucursal asignada</label>

                                <input
                                    type="text"
                                    disabled
                                    value={sucursalActual?.nombre ?? "Sucursal asignada"}
                                    className="w-full rounded-lg border bg-gray-100 px-4 py-3"
                                />

                                <p className="mt-2 text-xs text-gray-500">
                                    No puedes cambiar el rol ni la sucursal de los empleados.
                                </p>
                            </div>
                        </>
                    )}

                    <div className="flex flex-wrap gap-3 pt-3">
                        <button
                            type="submit"
                            className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
                        >
                            Guardar cambios
                        </button>

                        <Link
                            href={rutaGestion}
                            className="rounded-lg border px-5 py-3 font-medium transition hover:bg-gray-100"
                        >
                            Cancelar
                        </Link>
                    </div>
                </form>
            </section>
        </main>
    );
}
