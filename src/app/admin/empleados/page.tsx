import { exigirRol } from "@/lib/auth/exigir-rol";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { crearUsuario, desactivarUsuario, reactivarUsuario } from "../usuarios/acciones";

type Empleado = {
    id: string;
    nombre_completo: string | null;
    rol: string;
    sucursal_id: string | null;
    activo: boolean;
    email: string;
};

export default async function EmpleadosPage({
    searchParams,
}: {
    searchParams: Promise<{
        error?: string;
        creado?: string;
        desactivado?: string;
        reactivado?: string;
        editado?: string;
        estado?: string;
    }>;
}) {
    const perfil = await exigirRol(["admin_sucursal"]);
    const admin = createAdminClient();
    const params = await searchParams;

    const { data: sucursal } = await admin
        .from("sucursales")
        .select("id, nombre")
        .eq("id", perfil.sucursal_id ?? "")
        .maybeSingle();

    const estado = ["todos", "activos", "inactivos"].includes(params.estado ?? "") ? params.estado! : "todos";

    let consulta = admin
        .from("perfiles")
        .select("id, nombre_completo, rol, sucursal_id, activo")
        .eq("rol", "empleado")
        .eq("sucursal_id", perfil.sucursal_id ?? "")
        .order("nombre_completo");

    if (estado === "activos") {
        consulta = consulta.eq("activo", true);
    } else if (estado === "inactivos") {
        consulta = consulta.eq("activo", false);
    }

    const { data: perfiles, error: errorPerfiles } = await consulta;

    const usuariosAuth: {
        id: string;
        email?: string;
    }[] = [];

    let pagina = 1;
    let errorAuth = false;

    while (true) {
        const { data, error } = await admin.auth.admin.listUsers({
            page: pagina,
            perPage: 1000,
        });

        if (error) {
            errorAuth = true;
            console.error("Error al consultar usuarios:", error.message);
            break;
        }

        usuariosAuth.push(
            ...data.users.map(usuario => ({
                id: usuario.id,
                email: usuario.email,
            })),
        );

        if (data.users.length < 1000) break;

        pagina++;
    }

    const correos = new Map(usuariosAuth.map(usuario => [usuario.id, usuario.email ?? "Sin correo"]));

    const empleados: Empleado[] = (perfiles ?? []).map(empleado => ({
        ...empleado,
        email: correos.get(empleado.id) ?? "Sin correo",
    }));

    const errores: Record<string, string> = {
        permisos: "No tienes permisos para realizar esta operación.",
        datos: "Revisa los datos ingresados.",
        rol: "Solo puedes crear empleados.",
        sucursal: "No se pudo validar tu sucursal.",
        creacion: "No se pudo crear la cuenta. Comprueba que el correo no esté registrado.",
        perfil: "No se pudo configurar el perfil del empleado.",
        propio: "No puedes modificar tu propia cuenta.",
        usuario: "No se encontró el empleado seleccionado.",
        objetivo: "Solo puedes gestionar empleados.",
        estado: "La cuenta ya tiene ese estado.",
        desactivacion: "No se pudo desactivar la cuenta.",
        reactivacion: "No se pudo reactivar la cuenta.",
        editar_inactivo: "No puedes editar una cuenta desactivada.",
        edicion: "No se pudo actualizar el perfil del empleado.",
        credenciales: "No se pudieron actualizar las credenciales del empleado.",
    };

    return (
        <main className="mx-auto max-w-6xl space-y-8 p-6">
            <div>
                <Link href="/admin" className="text-sm text-blue-600 hover:underline">
                    ← Volver al panel
                </Link>

                <h1 className="mt-4 text-3xl font-bold">Gestión de empleados</h1>

                <p className="mt-2 text-gray-500">
                    Administra los empleados de tu sucursal: <strong>{sucursal?.nombre ?? "Sucursal asignada"}</strong>.
                </p>
            </div>

            {params.creado === "1" && (
                <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-green-800">
                    Empleado creado correctamente.
                </div>
            )}

            {params.editado === "1" && (
                <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-green-800">
                    Empleado actualizado correctamente.
                </div>
            )}

            {params.desactivado === "1" && (
                <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-green-800">
                    Empleado desactivado correctamente.
                </div>
            )}

            {params.reactivado === "1" && (
                <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-green-800">
                    Empleado reactivado correctamente.
                </div>
            )}

            {params.error && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
                    {errores[params.error] ?? "Ocurrió un error inesperado."}
                </div>
            )}

            {(errorPerfiles || errorAuth) && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
                    No se pudo cargar la lista completa de empleados.
                </div>
            )}

            {/* CREAR EMPLEADO */}
            <section className="rounded-xl border p-6 shadow-sm">
                <h2 className="text-xl font-semibold">Registrar empleado</h2>

                <p className="mt-1 text-sm text-gray-500">La cuenta tendrá permisos únicamente en tu sucursal.</p>

                <form action={crearUsuario} className="mt-6 space-y-5">
                    <input type="hidden" name="rol" value="empleado" />

                    <input type="hidden" name="sucursal_id" value="" />

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
                            className="w-full rounded-lg border px-4 py-3"
                            placeholder="Nombre del empleado"
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
                            className="w-full rounded-lg border px-4 py-3"
                            placeholder="empleado@correo.com"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="mb-2 block text-sm font-medium">
                            Contraseña temporal
                        </label>

                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            minLength={8}
                            maxLength={72}
                            autoComplete="new-password"
                            className="w-full rounded-lg border px-4 py-3"
                            placeholder="Mínimo 8 caracteres"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium">Sucursal asignada</label>

                        <input
                            type="text"
                            disabled
                            value={sucursal?.nombre ?? "Tu sucursal"}
                            className="w-full rounded-lg border bg-gray-100 px-4 py-3"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
                    >
                        Crear empleado
                    </button>
                </form>
            </section>

            {/* LISTA DE EMPLEADOS */}
            <section className="space-y-5 rounded-xl border p-6 shadow-sm">
                <div>
                    <h2 className="text-xl font-semibold">Empleados de mi sucursal</h2>

                    <p className="mt-1 text-sm text-gray-500">Consulta sus cuentas y administra su acceso.</p>
                </div>

                <form method="GET" className="flex flex-wrap gap-3">
                    <select
                        name="estado"
                        defaultValue={estado}
                        className="min-w-48 rounded-lg border bg-white px-3 py-2"
                    >
                        <option value="todos">Todos los empleados</option>
                        <option value="activos">Solo activos</option>
                        <option value="inactivos">Solo inactivos</option>
                    </select>

                    <button
                        type="submit"
                        className="rounded-lg border px-4 py-2 font-medium transition hover:bg-gray-100"
                    >
                        Aplicar filtro
                    </button>
                </form>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] border-collapse text-left text-sm">
                        <thead>
                            <tr className="border-b bg-gray-50">
                                <th className="px-4 py-3 font-semibold">Empleado</th>
                                <th className="px-4 py-3 font-semibold">Estado</th>
                                <th className="px-4 py-3 font-semibold">Acciones</th>
                            </tr>
                        </thead>

                        <tbody>
                            {empleados.map(empleado => (
                                <tr key={empleado.id} className="border-b last:border-0">
                                    <td className="px-4 py-4">
                                        <p className="font-medium">{empleado.nombre_completo ?? "Sin nombre"}</p>

                                        <p className="mt-1 text-xs text-gray-500">{empleado.email}</p>
                                    </td>

                                    <td className="px-4 py-4">
                                        {empleado.activo ? (
                                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                                                Activo
                                            </span>
                                        ) : (
                                            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800">
                                                Inactivo
                                            </span>
                                        )}
                                    </td>

                                    <td className="px-4 py-4">
                                        <div className="flex flex-wrap gap-2">
                                            {empleado.activo ? (
                                                <>
                                                    <Link
                                                        href={`/admin/usuarios/${empleado.id}/editar`}
                                                        className="rounded-lg border border-blue-300 px-3 py-2 text-xs font-medium text-blue-700 transition hover:bg-blue-50"
                                                    >
                                                        Editar
                                                    </Link>

                                                    <form action={desactivarUsuario}>
                                                        <input type="hidden" name="usuario_id" value={empleado.id} />

                                                        <button
                                                            type="submit"
                                                            className="rounded-lg border border-red-300 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50"
                                                        >
                                                            Desactivar
                                                        </button>
                                                    </form>
                                                </>
                                            ) : (
                                                <form action={reactivarUsuario}>
                                                    <input type="hidden" name="usuario_id" value={empleado.id} />

                                                    <button
                                                        type="submit"
                                                        className="rounded-lg border border-green-300 px-3 py-2 text-xs font-medium text-green-700 transition hover:bg-green-50"
                                                    >
                                                        Reactivar
                                                    </button>
                                                </form>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {empleados.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                                        No hay empleados para este filtro.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <p className="text-xs text-gray-500">Empleados encontrados: {empleados.length}</p>
            </section>
        </main>
    );
}
