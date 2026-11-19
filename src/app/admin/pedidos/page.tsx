import { exigirRol } from "@/lib/auth/exigir-rol";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { cambiarEstadoPedido } from "./acciones";
import BotonEliminarPedido from "./BotonEliminarPedido";

const estadosDisponibles = ["confirmado", "preparando", "listo", "recogido", "cancelado", "vencido"] as const;

function formatoPrecio(cantidad: number) {
    return new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
    }).format(cantidad);
}

function formatoFecha(fecha: string) {
    return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-MX", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

function formatoFechaHora(fecha: string) {
    return new Date(fecha).toLocaleString("es-MX", {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

function estadoLegible(estado: string) {
    const estados: Record<string, string> = {
        confirmado: "Confirmado",
        preparando: "En preparación",
        listo: "Listo para recoger",
        recogido: "Recogido",
        vencido: "Vencido",
        cancelado: "Cancelado",
    };

    return estados[estado] ?? estado;
}

function FormularioEstado({
    pedidoId,
    estado,
    etiqueta,
    peligro = false,
}: {
    pedidoId: string;
    estado: string;
    etiqueta: string;
    peligro?: boolean;
}) {
    return (
        <form action={cambiarEstadoPedido} className="flex flex-col gap-2">
            <input type="hidden" name="pedido_id" value={pedidoId} />
            <input type="hidden" name="estado" value={estado} />

            <input
                type="text"
                name="nota"
                maxLength={500}
                placeholder="Nota opcional"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />

            <button
                type="submit"
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    peligro
                        ? "border border-red-500/40 text-red-600 hover:bg-red-500/10"
                        : "bg-primary text-primary-foreground hover:opacity-90"
                }`}
            >
                {etiqueta}
            </button>
        </form>
    );
}

function AccionesPedido({
    pedido,
}: {
    pedido: {
        id: string;
        estado: string;
        fecha_limite: string;
    };
}) {
    const estadosActivos = ["confirmado", "preparando", "listo"];
    const activo = estadosActivos.includes(pedido.estado);
    const plazoTerminado = new Date(pedido.fecha_limite).getTime() <= Date.now();

    if (!activo) {
        return <span className="text-sm text-muted-foreground">Sin acciones disponibles</span>;
    }

    return (
        <div className="flex min-w-52 flex-col gap-3">
            {pedido.estado === "confirmado" && (
                <FormularioEstado pedidoId={pedido.id} estado="preparando" etiqueta="Iniciar preparación" />
            )}

            {pedido.estado === "preparando" && (
                <FormularioEstado pedidoId={pedido.id} estado="listo" etiqueta="Marcar como listo" />
            )}

            {pedido.estado === "listo" && !plazoTerminado && (
                <FormularioEstado pedidoId={pedido.id} estado="recogido" etiqueta="Confirmar entrega" />
            )}

            {plazoTerminado && (
                <FormularioEstado pedidoId={pedido.id} estado="vencido" etiqueta="Marcar como vencido" peligro />
            )}

            <FormularioEstado pedidoId={pedido.id} estado="cancelado" etiqueta="Cancelar pedido" peligro />
        </div>
    );
}

export default async function AdminPedidosPage({
    searchParams,
}: {
    searchParams: Promise<{
        actualizado?: string;
        eliminado?: string;
        error?: string;
        orden?: string;
        q?: string;
        estado?: string;
        sucursal?: string;
    }>;
}) {
    const perfil = await exigirRol(["admin_general", "admin_sucursal", "empleado"]);

    const supabase = await createClient();
    const parametros = await searchParams;

    const orden = parametros.orden === "antiguos" ? "antiguos" : "recientes";

    const busqueda = (parametros.q ?? "").trim().slice(0, 80);

    const estadoFiltro = estadosDisponibles.find(estado => estado === parametros.estado) ?? "";

    const puedeEliminar = perfil.rol === "admin_general" || perfil.rol === "admin_sucursal";

    const sucursalFiltro = perfil.rol === "admin_general" ? (parametros.sucursal ?? "").trim() : "";

    if (perfil.rol !== "admin_general" && !perfil.sucursal_id) {
        return (
            <main className="mx-auto max-w-7xl p-6">
                <h1 className="text-2xl font-bold">Gestión de pedidos</h1>

                <p className="mt-4 rounded-lg border p-4 text-red-600">
                    Tu usuario no tiene una sucursal asignada. Contacta con el administrador general.
                </p>
            </main>
        );
    }

    // Obtener las sucursales para el filtro del administrador general.
    const { data: todasLasSucursales } =
        perfil.rol === "admin_general"
            ? await supabase.from("sucursales").select("id, nombre").order("nombre")
            : { data: [] as { id: string; nombre: string }[] };

    // Consultar pedidos.
    let consulta = supabase.from("pedidos").select(`
        id,
        folio,
        cliente_id,
        sucursal_id,
        fecha_recogida,
        fecha_limite,
        estado,
        total,
        creado_en
    `);

    // Admin de sucursal y empleado: únicamente su sucursal.
    if (perfil.rol === "admin_sucursal" || perfil.rol === "empleado") {
        consulta = consulta.eq("sucursal_id", perfil.sucursal_id!);
    }

    // Admin general: puede seleccionar una sucursal o ver todas.
    if (perfil.rol === "admin_general" && sucursalFiltro) {
        consulta = consulta.eq("sucursal_id", sucursalFiltro);
    }

    if (busqueda) {
        consulta = consulta.ilike("folio", `%${busqueda}%`);
    }

    if (estadoFiltro) {
        consulta = consulta.eq("estado", estadoFiltro);
    }

    const { data: pedidos, error } = await consulta
        .order("creado_en", {
            ascending: orden === "antiguos",
        })
        .limit(100);

    if (error) {
        console.error("Error al consultar pedidos:", error.message);
    }

    const sucursalIds = [...new Set((pedidos ?? []).map(pedido => pedido.sucursal_id))];

    const clienteIds = [...new Set((pedidos ?? []).map(pedido => pedido.cliente_id))];

    const [sucursalesResult, clientesResult] = await Promise.all([
        sucursalIds.length
            ? supabase.from("sucursales").select("id, nombre").in("id", sucursalIds)
            : Promise.resolve({
                  data: [] as {
                      id: string;
                      nombre: string;
                  }[],
              }),

        clienteIds.length
            ? supabase.from("perfiles").select("id, nombre_completo").in("id", clienteIds)
            : Promise.resolve({
                  data: [] as {
                      id: string;
                      nombre_completo: string | null;
                  }[],
              }),
    ]);

    const sucursalesMap = new Map((sucursalesResult.data ?? []).map(sucursal => [sucursal.id, sucursal.nombre]));

    const clientesMap = new Map((clientesResult.data ?? []).map(cliente => [cliente.id, cliente.nombre_completo]));

    return (
        <main className="mx-auto max-w-7xl p-6">
            <Link
                href={perfil.rol === "empleado" ? "/empleado" : "/admin"}
                className="text-sm text-muted-foreground hover:underline"
            >
                ← Volver al panel
            </Link>

            <div className="mb-8 mt-5">
                <h1 className="text-3xl font-bold">Gestión de pedidos</h1>

                <p className="mt-2 text-muted-foreground">
                    {perfil.rol === "admin_general"
                        ? "Consulta y administra los pedidos de todas las sucursales."
                        : perfil.rol === "admin_sucursal"
                          ? "Consulta y administra los pedidos de tu sucursal."
                          : "Consulta, prepara, cancela y entrega los pedidos de tu sucursal."}
                </p>
            </div>

            {parametros.actualizado === "1" && (
                <div className="mb-6 rounded-lg border border-green-500/40 bg-green-500/10 p-4 text-sm">
                    El estado del pedido se actualizó correctamente.
                </div>
            )}

            {parametros.eliminado === "1" && (
                <div className="mb-6 rounded-lg border border-green-500/40 bg-green-500/10 p-4 text-sm">
                    El pedido cancelado se eliminó correctamente.
                </div>
            )}

            {parametros.error && (
                <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm">
                    {parametros.error === "datos"
                        ? "Los datos enviados no son válidos."
                        : parametros.error === "eliminacion"
                          ? "No fue posible eliminar el pedido. Comprueba que esté cancelado y que tengas permisos sobre su sucursal."
                          : "No fue posible actualizar el pedido. Comprueba los permisos, el estado actual y las condiciones de recogida."}
                </div>
            )}

            <div className="mb-6 rounded-xl border p-4">
                <h2 className="mb-4 font-semibold">Buscar y filtrar pedidos</h2>

                <form method="get" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                        <label htmlFor="q" className="mb-2 block text-sm font-medium">
                            Buscar por folio
                        </label>

                        <input
                            id="q"
                            name="q"
                            type="text"
                            maxLength={80}
                            defaultValue={busqueda}
                            placeholder="Ej. TP-000123"
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        />
                    </div>

                    <div>
                        <label htmlFor="estado" className="mb-2 block text-sm font-medium">
                            Filtrar por estado
                        </label>

                        <select
                            id="estado"
                            name="estado"
                            defaultValue={estadoFiltro}
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        >
                            <option value="">Todos los estados</option>

                            {estadosDisponibles.map(estado => (
                                <option key={estado} value={estado}>
                                    {estadoLegible(estado)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {perfil.rol === "admin_general" && (
                        <div>
                            <label htmlFor="sucursal" className="mb-2 block text-sm font-medium">
                                Filtrar por sucursal
                            </label>

                            <select
                                id="sucursal"
                                name="sucursal"
                                defaultValue={sucursalFiltro}
                                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                            >
                                <option value="">Todas las sucursales</option>

                                {(todasLasSucursales ?? []).map(sucursal => (
                                    <option key={sucursal.id} value={sucursal.id}>
                                        {sucursal.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label htmlFor="orden" className="mb-2 block text-sm font-medium">
                            Ordenar por fecha
                        </label>

                        <select
                            id="orden"
                            name="orden"
                            defaultValue={orden}
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        >
                            <option value="recientes">Más recientes primero</option>

                            <option value="antiguos">Más antiguos primero</option>
                        </select>
                    </div>

                    <div className="flex items-end gap-2">
                        <button
                            type="submit"
                            className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                        >
                            Aplicar filtros
                        </button>

                        <Link
                            href="/admin/pedidos"
                            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
                        >
                            Limpiar
                        </Link>
                    </div>
                </form>
            </div>

            {error ? (
                <p className="rounded-lg border p-5 text-red-600">No fue posible cargar los pedidos.</p>
            ) : !pedidos || pedidos.length === 0 ? (
                <div className="rounded-xl border p-8 text-center">
                    <h2 className="text-lg font-semibold">No se encontraron pedidos</h2>

                    <p className="mt-2 text-sm text-muted-foreground">
                        No hay pedidos que coincidan con los filtros seleccionados.
                    </p>
                </div>
            ) : (
                <div className="space-y-5">
                    <p className="text-sm text-muted-foreground">
                        Se encontraron {pedidos.length} pedidos
                        {pedidos.length === 100 ? " (mostrando hasta 100)" : ""}.
                    </p>

                    {pedidos.map(pedido => (
                        <article key={pedido.id} className="rounded-xl border p-5">
                            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-bold">Pedido {pedido.folio}</h2>

                                    <Link
                                        href={`/admin/pedidos/${pedido.id}`}
                                        className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
                                    >
                                        Ver detalle del pedido →
                                    </Link>

                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Creado: {formatoFechaHora(pedido.creado_en)}
                                    </p>
                                </div>

                                <span className="rounded-full border px-3 py-1 text-sm font-medium">
                                    {estadoLegible(pedido.estado)}
                                </span>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <div>
                                    <p className="text-xs text-muted-foreground">Cliente</p>

                                    <p className="mt-1 font-medium">
                                        {clientesMap.get(pedido.cliente_id) ?? "Cliente"}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-muted-foreground">Sucursal</p>

                                    <p className="mt-1 font-medium">
                                        {sucursalesMap.get(pedido.sucursal_id) ?? "Sucursal"}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-muted-foreground">Fecha de recogida</p>

                                    <p className="mt-1 font-medium">{formatoFecha(pedido.fecha_recogida)}</p>
                                </div>

                                <div>
                                    <p className="text-xs text-muted-foreground">Total</p>

                                    <p className="mt-1 font-bold">{formatoPrecio(Number(pedido.total))}</p>
                                </div>
                            </div>

                            <div className="mt-4 border-t pt-4">
                                <p className="text-xs text-muted-foreground">Fecha límite de recogida</p>

                                <p className="mt-1 text-sm">{formatoFechaHora(pedido.fecha_limite)}</p>
                            </div>

                            <div className="mt-5 border-t pt-5">
                                <h3 className="mb-3 font-semibold">Actualizar estado</h3>

                                <AccionesPedido
                                    pedido={{
                                        id: pedido.id,
                                        estado: pedido.estado,
                                        fecha_limite: pedido.fecha_limite,
                                    }}
                                />
                            </div>

                            {puedeEliminar && pedido.estado === "cancelado" && (
                                <div className="mt-5 border-t border-red-500/20 pt-5">
                                    <h3 className="font-semibold text-red-600">Eliminar pedido</h3>

                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Esta acción es permanente. Se eliminarán el pedido, sus detalles y su historial.
                                        Los movimientos de inventario se conservarán.
                                    </p>

                                    <div className="mt-3">
                                        <BotonEliminarPedido pedidoId={pedido.id} />
                                    </div>
                                </div>
                            )}
                        </article>
                    ))}
                </div>
            )}
        </main>
    );
}
