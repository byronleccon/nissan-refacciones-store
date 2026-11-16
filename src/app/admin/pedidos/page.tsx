import { exigirRol } from "@/lib/auth/exigir-rol";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { cambiarEstadoPedido } from "./acciones";

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
        error?: string;
        orden?: string;
    }>;
}) {
    const perfil = await exigirRol(["admin_general", "admin_sucursal", "empleado"]);

    const supabase = await createClient();
    const parametros = await searchParams;

    const orden = parametros.orden === "antiguos" ? "antiguos" : "recientes";

    const { data: pedidos, error } = await supabase
        .from("pedidos")
        .select(
            `
            id,
            folio,
            cliente_id,
            sucursal_id,
            fecha_recogida,
            fecha_limite,
            estado,
            total,
            creado_en
        `,
        )
        .order("creado_en", {
            ascending: orden === "antiguos",
        });

    if (error) {
        console.error("Error al consultar pedidos:", error.message);
    }

    const sucursalIds = [...new Set((pedidos ?? []).map(pedido => pedido.sucursal_id))];

    const clienteIds = [...new Set((pedidos ?? []).map(pedido => pedido.cliente_id))];

    const [sucursalesResult, clientesResult] = await Promise.all([
        sucursalIds.length
            ? supabase.from("sucursales").select("id, nombre").in("id", sucursalIds)
            : Promise.resolve({
                  data: [] as { id: string; nombre: string }[],
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

    const sucursalesMap = new Map((sucursalesResult.data ?? []).map(s => [s.id, s.nombre]));

    const clientesMap = new Map((clientesResult.data ?? []).map(c => [c.id, c.nombre_completo]));

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

            {parametros.error && (
                <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm">
                    {parametros.error === "datos"
                        ? "Los datos enviados no son válidos."
                        : "No fue posible actualizar el pedido. Comprueba los permisos, el estado actual y las condiciones de recogida."}
                </div>
            )}

            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
                <div>
                    <h2 className="font-semibold">Ordenar pedidos</h2>
                    <p className="text-sm text-muted-foreground">Organiza los pedidos por fecha de creación.</p>
                </div>

                <form method="get" className="flex items-center gap-2">
                    <select
                        name="orden"
                        defaultValue={orden}
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                        aria-label="Ordenar pedidos por fecha"
                    >
                        <option value="recientes">Más recientes primero</option>
                        <option value="antiguos">Más antiguos primero</option>
                    </select>

                    <button
                        type="submit"
                        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                    >
                        Ordenar
                    </button>
                </form>
            </div>

            {error ? (
                <p className="rounded-lg border p-5 text-red-600">No fue posible cargar los pedidos.</p>
            ) : !pedidos || pedidos.length === 0 ? (
                <div className="rounded-xl border p-8 text-center">
                    <h2 className="text-lg font-semibold">No hay pedidos registrados</h2>

                    <p className="mt-2 text-sm text-muted-foreground">Cuando se generen pedidos, aparecerán aquí.</p>
                </div>
            ) : (
                <div className="space-y-5">
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
                        </article>
                    ))}
                </div>
            )}
        </main>
    );
}
