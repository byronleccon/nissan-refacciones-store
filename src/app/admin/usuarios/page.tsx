import { exigirRol } from "@/lib/auth/exigir-rol";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { crearUsuario, desactivarUsuario, reactivarUsuario } from "./acciones";

type Sucursal = {
    id: string;
    nombre: string;
};

type Usuario = {
    id: string;
    nombre_completo: string | null;
    rol: string;
    sucursal_id: string | null;
    activo: boolean;
    email: string;
};

const nombresRoles: Record<string, string> = {
    admin_general: "Administrador general",
    admin_sucursal: "Administrador de sucursal",
    empleado: "Empleado",
};

export default async function UsuariosPage({
    searchParams,
}: {
    searchParams: Promise<{
        error?: string;
        creado?: string;
        desactivado?: string;
        reactivado?: string;
        sucursal?: string;
        estado?: string;
    }>;
}) {
    const perfil = await exigirRol(["admin_general"]);

    const supabase = await createClient();
    const admin = createAdminClient();

    const params = await searchParams;
    const esAdminGeneral = perfil.rol === "admin_general";

    // Consultar sucursales para mostrar sus nombres.
    const { data: sucursalesData } = await admin.from("sucursales").select("id, nombre").order("nombre");

    const sucursales = (sucursalesData ?? []) as Sucursal[];

    const nombresSucursales = new Map(sucursales.map(sucursal => [sucursal.id, sucursal.nombre]));

    // Solo las sucursales activas pueden asignarse al crear usuarios.
    const { data: sucursalesActivas } = await supabase
        .from("sucursales")
        .select("id, nombre")
        .eq("activa", true)
        .order("nombre");

    // Obtener filtros.
    const estado = ["todos", "activos", "inactivos"].includes(params.estado ?? "") ? params.estado! : "todos";

    const sucursalSeleccionada =
        esAdminGeneral && sucursales.some(s => s.id === params.sucursal) ? params.sucursal! : "";

    // Consultar perfiles de trabajadores.
    let consulta = admin
        .from("perfiles")
        .select("id, nombre_completo, rol, sucursal_id, activo")
        .in("rol", ["admin_general", "admin_sucursal", "empleado"])
        .order("nombre_completo");

    // El administrador de sucursal solo consulta empleados propios.
    if (perfil.rol === "admin_sucursal") {
        consulta = consulta.eq("rol", "empleado").eq("sucursal_id", perfil.sucursal_id ?? "");
    } else if (sucursalSeleccionada) {
        consulta = consulta.eq("sucursal_id", sucursalSeleccionada);
    }

    if (estado === "activos") {
        consulta = consulta.eq("activo", true);
    } else if (estado === "inactivos") {
        consulta = consulta.eq("activo", false);
    }

    const { data: perfiles, error: errorPerfiles } = await consulta;

    // Obtener los correos desde Supabase Auth.
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
            console.error("Error al consultar usuarios de Auth:", error.message);
            break;
        }

        usuariosAuth.push(
            ...data.users.map(usuario => ({
                id: usuario.id,
                email: usuario.email,
            })),
        );

        if (data.users.length < 1000) {
            break;
        }

        pagina++;
    }

    if (errorPerfiles || errorAuth) {
        console.error("Error al consultar la lista de usuarios:", errorPerfiles?.message);
    }

    const correos = new Map(usuariosAuth.map(usuario => [usuario.id, usuario.email ?? "Sin correo"]));

    const usuarios: Usuario[] = (perfiles ?? []).map(usuario => ({
        ...usuario,
        email: correos.get(usuario.id) ?? "Sin correo",
    }));

    const errores: Record<string, string> = {
        permisos: "No tienes permisos para realizar esta operación.",
        datos: "Revisa los datos ingresados.",
        rol: "No puedes asignar ese tipo de usuario.",
        sucursal: "Selecciona una sucursal válida y activa.",
        creacion: "No se pudo crear la cuenta. Comprueba que el correo no esté registrado.",
        perfil: "No se pudo configurar el perfil del usuario.",
        propio: "No puedes desactivar ni modificar tu propia cuenta.",
        usuario: "No se encontró el usuario seleccionado.",
        objetivo: "No puedes gestionar este tipo de cuenta.",
        estado: "La cuenta ya tiene ese estado.",
        desactivacion: "No se pudo desactivar la cuenta.",
        reactivacion: "No se pudo reactivar la cuenta.",
        lista: "No se pudo cargar la lista de usuarios.",
    };

    return (
        <main className="mx-auto max-w-6xl space-y-8 p-6">
            <div>
                <Link href="/admin" className="text-sm text-blue-600 hover:underline">
                    ← Volver al panel
                </Link>

                <h1 className="mt-4 text-3xl font-bold">Gestión de usuarios</h1>

                <p className="mt-2 text-gray-500">
                    Crea cuentas, consulta sus permisos y administra su acceso al sistema.
                </p>
            </div>

            {params.creado === "1" && (
                <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-green-800">
                    Usuario creado y configurado correctamente.
                </div>
            )}

            {params.desactivado === "1" && (
                <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-green-800">
                    Usuario desactivado correctamente.
                </div>
            )}

            {params.reactivado === "1" && (
                <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-green-800">
                    Usuario reactivado correctamente.
                </div>
            )}

            {params.error && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
                    {errores[params.error] ?? "Ocurrió un error inesperado."}
                </div>
            )}

            {errorPerfiles || errorAuth ? (
                <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">{errores.lista}</div>
            ) : null}

            {/* FORMULARIO DE CREACIÓN */}
            <section className="rounded-xl border p-6 shadow-sm">
                <h2 className="text-xl font-semibold">Registrar nuevo usuario</h2>

                <p className="mt-1 text-sm text-gray-500">
                    {esAdminGeneral
                        ? "Puedes crear administradores generales, administradores de sucursal y empleados."
                        : `Puedes crear empleados para la sucursal ${
                              nombresSucursales.get(perfil.sucursal_id ?? "") ?? ""
                          }.`}
                </p>

                <form action={crearUsuario} className="mt-6 space-y-5">
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
                            placeholder="Nombre del usuario"
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
                            placeholder="usuario@correo.com"
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
                        <label htmlFor="rol" className="mb-2 block text-sm font-medium">
                            Tipo de usuario
                        </label>

                        <select
                            id="rol"
                            name="rol"
                            required
                            defaultValue=""
                            className="w-full rounded-lg border bg-white px-4 py-3"
                        >
                            <option value="" disabled>
                                Selecciona un rol
                            </option>

                            {esAdminGeneral && (
                                <>
                                    <option value="admin_general">Administrador general</option>

                                    <option value="admin_sucursal">Administrador de sucursal</option>
                                </>
                            )}

                            <option value="empleado">Empleado</option>
                        </select>
                    </div>

                    {esAdminGeneral ? (
                        <div>
                            <label htmlFor="sucursal_id" className="mb-2 block text-sm font-medium">
                                Sucursal asignada
                            </label>

                            <select
                                id="sucursal_id"
                                name="sucursal_id"
                                defaultValue=""
                                className="w-full rounded-lg border bg-white px-4 py-3"
                            >
                                <option value="">Sin sucursal (solo administrador general)</option>

                                {((sucursalesActivas as Sucursal[]) ?? []).map(sucursal => (
                                    <option key={sucursal.id} value={sucursal.id}>
                                        {sucursal.nombre}
                                    </option>
                                ))}
                            </select>

                            <p className="mt-2 text-xs text-gray-500">
                                Los administradores generales no necesitan sucursal. Los demás roles sí.
                            </p>
                        </div>
                    ) : (
                        <div>
                            <label className="mb-2 block text-sm font-medium">Sucursal asignada</label>

                            <input
                                type="text"
                                disabled
                                value={nombresSucursales.get(perfil.sucursal_id ?? "") ?? "Tu sucursal asignada"}
                                className="w-full rounded-lg border bg-gray-100 px-4 py-3"
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
                    >
                        Crear usuario
                    </button>
                </form>
            </section>

            {/* LISTA Y ADMINISTRACIÓN DE CUENTAS */}
            <section className="space-y-5 rounded-xl border p-6 shadow-sm">
                <div>
                    <h2 className="text-xl font-semibold">Usuarios registrados</h2>

                    <p className="mt-1 text-sm text-gray-500">
                        {esAdminGeneral
                            ? "Consulta y administra las cuentas de todas las sucursales."
                            : "Consulta y administra los empleados de tu sucursal."}
                    </p>
                </div>

                {/* FILTROS */}
                <form method="GET" className="grid gap-4 sm:grid-cols-3">
                    {esAdminGeneral ? (
                        <div>
                            <label htmlFor="filtro-sucursal" className="mb-2 block text-sm font-medium">
                                Sucursal
                            </label>

                            <select
                                id="filtro-sucursal"
                                name="sucursal"
                                defaultValue={sucursalSeleccionada}
                                className="w-full rounded-lg border bg-white px-3 py-2"
                            >
                                <option value="">Todas las sucursales</option>

                                {sucursales.map(sucursal => (
                                    <option key={sucursal.id} value={sucursal.id}>
                                        {sucursal.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div>
                            <label className="mb-2 block text-sm font-medium">Sucursal</label>

                            <input
                                disabled
                                value={nombresSucursales.get(perfil.sucursal_id ?? "") ?? "Tu sucursal"}
                                className="w-full rounded-lg border bg-gray-100 px-3 py-2"
                            />
                        </div>
                    )}

                    <div>
                        <label htmlFor="filtro-estado" className="mb-2 block text-sm font-medium">
                            Estado de la cuenta
                        </label>

                        <select
                            id="filtro-estado"
                            name="estado"
                            defaultValue={estado}
                            className="w-full rounded-lg border bg-white px-3 py-2"
                        >
                            <option value="todos">Todos</option>
                            <option value="activos">Activos</option>
                            <option value="inactivos">Inactivos</option>
                        </select>
                    </div>

                    <div className="flex items-end">
                        <button
                            type="submit"
                            className="w-full rounded-lg border px-4 py-2 font-medium transition hover:bg-gray-100"
                        >
                            Aplicar filtros
                        </button>
                    </div>
                </form>

                {/* TABLA */}
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[850px] border-collapse text-left text-sm">
                        <thead>
                            <tr className="border-b bg-gray-50">
                                <th className="px-4 py-3 font-semibold">Usuario</th>
                                <th className="px-4 py-3 font-semibold">Rol</th>
                                <th className="px-4 py-3 font-semibold">Sucursal</th>
                                <th className="px-4 py-3 font-semibold">Estado</th>
                                <th className="px-4 py-3 font-semibold">Acciones</th>
                            </tr>
                        </thead>

                        <tbody>
                            {usuarios.map(usuario => (
                                <tr key={usuario.id} className="border-b last:border-0">
                                    <td className="px-4 py-4">
                                        <p className="font-medium">{usuario.nombre_completo ?? "Sin nombre"}</p>
                                        <p className="mt-1 text-xs text-gray-500">{usuario.email}</p>
                                    </td>

                                    <td className="px-4 py-4">{nombresRoles[usuario.rol] ?? usuario.rol}</td>

                                    <td className="px-4 py-4">
                                        {usuario.sucursal_id
                                            ? (nombresSucursales.get(usuario.sucursal_id) ?? "Sucursal no disponible")
                                            : "Sin sucursal"}
                                    </td>

                                    <td className="px-4 py-4">
                                        {usuario.activo ? (
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
                                        {usuario.id === perfil.id ? (
                                            <span className="text-xs text-gray-500">Tu cuenta</span>
                                        ) : usuario.activo ? (
                                            <form action={desactivarUsuario}>
                                                <input type="hidden" name="usuario_id" value={usuario.id} />

                                                <button
                                                    type="submit"
                                                    className="rounded-lg border border-red-300 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50"
                                                >
                                                    Desactivar
                                                </button>
                                            </form>
                                        ) : (
                                            <form action={reactivarUsuario}>
                                                <input type="hidden" name="usuario_id" value={usuario.id} />

                                                <button
                                                    type="submit"
                                                    className="rounded-lg border border-green-300 px-3 py-2 text-xs font-medium text-green-700 transition hover:bg-green-50"
                                                >
                                                    Reactivar
                                                </button>
                                            </form>
                                        )}
                                    </td>
                                </tr>
                            ))}

                            {usuarios.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                        No se encontraron usuarios con esos filtros.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <p className="text-xs text-gray-500">Usuarios encontrados: {usuarios.length}</p>
            </section>
        </main>
    );
}
