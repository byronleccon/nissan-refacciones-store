import { exigirRol } from "@/lib/auth/exigir-rol";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { actualizarSucursal, crearSucursal } from "./acciones";
import BotonEliminarSucursal from "./BotonEliminarSucursal";

export default async function SucursalesPage({
    searchParams,
}: {
    searchParams: Promise<{
        creada?: string;
        actualizada?: string;
        eliminada?: string;
        error?: string;
    }>;
}) {
    await exigirRol(["admin_general"]);

    const supabase = await createClient();
    const parametros = await searchParams;

    const { data: sucursales, error } = await supabase
        .from("sucursales")
        .select(
            `
            id,
            nombre,
            direccion,
            telefono,
            hora_apertura,
            hora_cierre,
            zona_horaria,
            activa,
            creada_en
        `,
        )
        .order("nombre");

    const zonasHorarias = [
        { valor: "America/Mexico_City", nombre: "Ciudad de México" },
        { valor: "America/Cancun", nombre: "Cancún" },
        { valor: "America/Monterrey", nombre: "Monterrey" },
        { valor: "America/Chihuahua", nombre: "Chihuahua" },
        { valor: "America/Tijuana", nombre: "Tijuana" },
        { valor: "America/Hermosillo", nombre: "Hermosillo" },
    ];

    return (
        <main className="mx-auto max-w-6xl p-6">
            <Link href="/admin" className="text-sm text-muted-foreground hover:underline">
                ← Volver al panel
            </Link>

            <div className="mb-8 mt-5">
                <h1 className="text-3xl font-bold">Administrar sucursales</h1>

                <p className="mt-2 text-muted-foreground">
                    Crea, consulta, edita, desactiva y elimina sucursales de Tsuru ProParts.
                </p>
            </div>

            {parametros.creada === "1" && (
                <div className="mb-6 rounded-lg border border-green-500/40 bg-green-500/10 p-4 text-sm">
                    La sucursal se creó correctamente.
                </div>
            )}

            {parametros.actualizada === "1" && (
                <div className="mb-6 rounded-lg border border-green-500/40 bg-green-500/10 p-4 text-sm">
                    La sucursal se actualizó correctamente.
                </div>
            )}

            {parametros.eliminada === "1" && (
                <div className="mb-6 rounded-lg border border-green-500/40 bg-green-500/10 p-4 text-sm">
                    La sucursal se eliminó correctamente.
                </div>
            )}

            {parametros.error && (
                <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm">
                    {parametros.error === "datos"
                        ? "Revisa los datos. Hay campos incompletos o inválidos."
                        : parametros.error === "eliminacion"
                          ? "No se pudo eliminar la sucursal. Es posible que tenga empleados, pedidos, inventario u otros registros relacionados. Puedes desactivarla."
                          : parametros.error === "actualizacion"
                            ? "No fue posible actualizar la sucursal. Comprueba los datos."
                            : parametros.error === "creacion"
                              ? "No fue posible crear la sucursal."
                              : "Ocurrió un error. Comprueba los datos y tus permisos."}
                </div>
            )}

            <section className="mb-8 rounded-xl border p-5">
                <h2 className="mb-5 text-xl font-semibold">Agregar nueva sucursal</h2>

                <form action={crearSucursal} className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor="nombre" className="mb-2 block text-sm font-medium">
                            Nombre de la sucursal
                        </label>
                        <input
                            id="nombre"
                            name="nombre"
                            type="text"
                            required
                            minLength={2}
                            maxLength={100}
                            placeholder="Ej. Tsuru ProParts Puebla"
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        />
                    </div>

                    <div>
                        <label htmlFor="telefono" className="mb-2 block text-sm font-medium">
                            Teléfono
                        </label>
                        <input
                            id="telefono"
                            name="telefono"
                            type="tel"
                            maxLength={30}
                            placeholder="Teléfono de contacto"
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        />
                    </div>

                    <div className="sm:col-span-2">
                        <label htmlFor="direccion" className="mb-2 block text-sm font-medium">
                            Dirección
                        </label>
                        <input
                            id="direccion"
                            name="direccion"
                            type="text"
                            required
                            minLength={5}
                            maxLength={250}
                            placeholder="Dirección completa de la sucursal"
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        />
                    </div>

                    <div>
                        <label htmlFor="hora_apertura" className="mb-2 block text-sm font-medium">
                            Hora de apertura
                        </label>
                        <input
                            id="hora_apertura"
                            name="hora_apertura"
                            type="time"
                            required
                            defaultValue="09:00"
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        />
                    </div>

                    <div>
                        <label htmlFor="hora_cierre" className="mb-2 block text-sm font-medium">
                            Hora de cierre
                        </label>
                        <input
                            id="hora_cierre"
                            name="hora_cierre"
                            type="time"
                            required
                            defaultValue="18:00"
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        />
                    </div>

                    <div className="sm:col-span-2">
                        <label htmlFor="zona_horaria" className="mb-2 block text-sm font-medium">
                            Zona horaria
                        </label>
                        <select
                            id="zona_horaria"
                            name="zona_horaria"
                            required
                            defaultValue="America/Mexico_City"
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        >
                            {zonasHorarias.map(zona => (
                                <option key={zona.valor} value={zona.valor}>
                                    {zona.nombre}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="sm:col-span-2">
                        <button
                            type="submit"
                            className="w-full rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 sm:w-auto"
                        >
                            + Crear sucursal
                        </button>
                    </div>
                </form>
            </section>

            <section className="rounded-xl border p-5">
                <h2 className="mb-5 text-xl font-semibold">Sucursales registradas</h2>

                {error ? (
                    <p className="text-red-600">No fue posible consultar las sucursales.</p>
                ) : !sucursales || sucursales.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Todavía no hay sucursales registradas.</p>
                ) : (
                    <div className="space-y-5">
                        {sucursales.map(sucursal => (
                            <article key={sucursal.id} className="rounded-lg border p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <h3 className="text-lg font-semibold">{sucursal.nombre}</h3>

                                    <span
                                        className={`rounded-full border px-3 py-1 text-xs ${
                                            sucursal.activa
                                                ? "border-green-500/40 text-green-600"
                                                : "border-gray-500/40 text-muted-foreground"
                                        }`}
                                    >
                                        {sucursal.activa ? "Activa" : "Inactiva"}
                                    </span>
                                </div>

                                <p className="mt-2 text-sm text-muted-foreground">{sucursal.direccion}</p>

                                {sucursal.telefono && <p className="mt-1 text-sm">Teléfono: {sucursal.telefono}</p>}

                                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                                    <p>
                                        <span className="text-muted-foreground">Horario:</span>{" "}
                                        {sucursal.hora_apertura.slice(0, 5)}
                                        {" - "}
                                        {sucursal.hora_cierre.slice(0, 5)}
                                    </p>

                                    <p>
                                        <span className="text-muted-foreground">Zona horaria:</span>{" "}
                                        {sucursal.zona_horaria}
                                    </p>
                                </div>

                                <details className="mt-5 rounded-lg border p-4">
                                    <summary className="cursor-pointer font-medium">
                                        Editar información de esta sucursal
                                    </summary>

                                    <form action={actualizarSucursal} className="mt-5 grid gap-4 sm:grid-cols-2">
                                        <input type="hidden" name="id" value={sucursal.id} />

                                        <div>
                                            <label className="mb-2 block text-sm font-medium">Nombre</label>
                                            <input
                                                name="nombre"
                                                type="text"
                                                required
                                                minLength={2}
                                                maxLength={100}
                                                defaultValue={sucursal.nombre}
                                                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-medium">Teléfono</label>
                                            <input
                                                name="telefono"
                                                type="tel"
                                                maxLength={30}
                                                defaultValue={sucursal.telefono ?? ""}
                                                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                            />
                                        </div>

                                        <div className="sm:col-span-2">
                                            <label className="mb-2 block text-sm font-medium">Dirección</label>
                                            <input
                                                name="direccion"
                                                type="text"
                                                required
                                                minLength={5}
                                                maxLength={250}
                                                defaultValue={sucursal.direccion}
                                                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-medium">Hora de apertura</label>
                                            <input
                                                name="hora_apertura"
                                                type="time"
                                                required
                                                defaultValue={sucursal.hora_apertura.slice(0, 5)}
                                                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-medium">Hora de cierre</label>
                                            <input
                                                name="hora_cierre"
                                                type="time"
                                                required
                                                defaultValue={sucursal.hora_cierre.slice(0, 5)}
                                                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-medium">Zona horaria</label>
                                            <select
                                                name="zona_horaria"
                                                required
                                                defaultValue={sucursal.zona_horaria}
                                                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                            >
                                                {zonasHorarias.map(zona => (
                                                    <option key={zona.valor} value={zona.valor}>
                                                        {zona.nombre}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-medium">
                                                Estado de la sucursal
                                            </label>
                                            <select
                                                name="activa"
                                                required
                                                defaultValue={String(sucursal.activa)}
                                                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                            >
                                                <option value="true">Activa</option>
                                                <option value="false">Inactiva</option>
                                            </select>
                                        </div>

                                        <div className="sm:col-span-2">
                                            <button
                                                type="submit"
                                                className="w-full rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 sm:w-auto"
                                            >
                                                Guardar cambios
                                            </button>
                                        </div>
                                    </form>
                                </details>

                                <div className="mt-4 border-t pt-4">
                                    <BotonEliminarSucursal id={sucursal.id} />
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        Solo se podrá eliminar si no existen registros relacionados.
                                    </p>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}
