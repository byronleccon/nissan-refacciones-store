import { exigirRol } from "@/lib/auth/exigir-rol";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cambiarEstadoPedido } from "../acciones";

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
        timeZone: "America/Mexico_City",
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
                className={`rounded-lg px-4 py-2 text-sm font-medium ${
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

function AccionesPedido({ id, estado, fechaLimite }: { id: string; estado: string; fechaLimite: string }) {
    const activos = ["confirmado", "preparando", "listo"];
    const activo = activos.includes(estado);

    const plazoTerminado = new Date(fechaLimite).getTime() <= Date.now();

    if (!activo) {
        return <p className="text-sm text-muted-foreground">Este pedido ya no admite cambios de estado.</p>;
    }

    return (
        <div className="flex max-w-sm flex-col gap-3">
            {estado === "confirmado" && (
                <FormularioEstado pedidoId={id} estado="preparando" etiqueta="Iniciar preparación" />
            )}

            {estado === "preparando" && <FormularioEstado pedidoId={id} estado="listo" etiqueta="Marcar como listo" />}

            {estado === "listo" && !plazoTerminado && (
                <FormularioEstado pedidoId={id} estado="recogido" etiqueta="Confirmar recogida" />
            )}

            {plazoTerminado && (
                <FormularioEstado pedidoId={id} estado="vencido" etiqueta="Marcar como vencido" peligro />
            )}

            <FormularioEstado pedidoId={id} estado="cancelado" etiqueta="Cancelar pedido" peligro />
        </div>
    );
}

export default async function AdminPedidoDetallePage({ params }: { params: Promise<{ id: string }> }) {
    await exigirRol(["admin_general", "admin_sucursal"]);

    const { id } = await params;
    const supabase = await createClient();

    // Consultar pedido.
    const { data: pedido, error: errorPedido } = await supabase
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
        .eq("id", id)
        .maybeSingle();

    if (errorPedido) {
        console.error("Error al consultar pedido:", errorPedido.message);
        throw new Error("No fue posible consultar el pedido.");
    }

    if (!pedido) {
        notFound();
    }

    // Consultar productos e historial.
    const [detalleResult, historialResult, sucursalResult, clienteResult] = await Promise.all([
        supabase
            .from("detalle_pedido")
            .select(
                `
                    id,
                    producto_id,
                    sku,
                    nombre,
                    precio_unitario,
                    cantidad
                `,
            )
            .eq("pedido_id", id),

        supabase
            .from("historial_estados_pedido")
            .select(
                `
                    id,
                    estado,
                    usuario_id,
                    nota,
                    creado_en
                `,
            )
            .eq("pedido_id", id)
            .order("creado_en", { ascending: true }),

        supabase.from("sucursales").select("id, nombre, direccion").eq("id", pedido.sucursal_id).maybeSingle(),

        supabase.from("perfiles").select("id, nombre_completo").eq("id", pedido.cliente_id).maybeSingle(),
    ]);

    if (detalleResult.error || historialResult.error || sucursalResult.error || clienteResult.error) {
        console.error(
            "Error al cargar información del pedido:",
            detalleResult.error?.message,
            historialResult.error?.message,
            sucursalResult.error?.message,
            clienteResult.error?.message,
        );

        throw new Error("No fue posible cargar toda la información del pedido.");
    }

    const productos = detalleResult.data ?? [];
    const historial = historialResult.data ?? [];
    const sucursal = sucursalResult.data;
    const cliente = clienteResult.data;

    // Consultar los nombres de los usuarios que realizaron cambios.
    const usuarioIds = [
        ...new Set(
            historial
                .map(registro => registro.usuario_id)
                .filter((usuarioId): usuarioId is string => usuarioId !== null),
        ),
    ];

    const { data: usuarios, error: errorUsuarios } = usuarioIds.length
        ? await supabase.from("perfiles").select("id, nombre_completo").in("id", usuarioIds)
        : { data: [], error: null };

    if (errorUsuarios) {
        console.error("Error al consultar usuarios:", errorUsuarios.message);
    }

    const usuariosMap = new Map((usuarios ?? []).map(usuario => [usuario.id, usuario.nombre_completo]));

    return (
        <main className="mx-auto max-w-6xl p-6">
            <Link href="/admin/pedidos" className="text-sm text-muted-foreground hover:underline">
                ← Volver a gestión de pedidos
            </Link>

            {/* Encabezado */}
            <header className="mb-8 mt-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-sm text-muted-foreground">Detalle del pedido</p>

                        <h1 className="mt-1 text-3xl font-bold">{pedido.folio}</h1>
                    </div>

                    <span className="rounded-full border px-4 py-2 text-sm font-semibold">
                        {estadoLegible(pedido.estado)}
                    </span>
                </div>

                <p className="mt-3 text-sm text-muted-foreground">Creado el {formatoFechaHora(pedido.creado_en)}</p>
            </header>

            {/* Información general */}
            <section className="mb-6 grid gap-5 md:grid-cols-2">
                <article className="rounded-xl border p-5">
                    <h2 className="mb-4 text-lg font-semibold">Información del cliente</h2>

                    <p className="text-sm text-muted-foreground">Nombre completo</p>

                    <p className="mt-1 font-medium">{cliente?.nombre_completo ?? "Cliente no disponible"}</p>

                    <p className="mt-4 text-sm text-muted-foreground">Identificador de cliente</p>

                    <p className="mt-1 break-all text-sm">{pedido.cliente_id}</p>
                </article>

                <article className="rounded-xl border p-5">
                    <h2 className="mb-4 text-lg font-semibold">Información de recogida</h2>

                    <p className="text-sm text-muted-foreground">Sucursal</p>

                    <p className="mt-1 font-medium">{sucursal?.nombre ?? "Sucursal no disponible"}</p>

                    <p className="mt-1 text-sm text-muted-foreground">
                        {sucursal?.direccion ?? "Dirección no disponible"}
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div>
                            <p className="text-sm text-muted-foreground">Fecha de recogida</p>
                            <p className="mt-1 font-medium">{formatoFecha(pedido.fecha_recogida)}</p>
                        </div>

                        <div>
                            <p className="text-sm text-muted-foreground">Fecha límite</p>
                            <p className="mt-1 font-medium">{formatoFechaHora(pedido.fecha_limite)}</p>
                        </div>
                    </div>
                </article>
            </section>

            {/* Productos */}
            <section className="mb-6 rounded-xl border p-5">
                <h2 className="mb-5 text-lg font-semibold">Productos del pedido</h2>

                {productos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No se encontraron productos para este pedido.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[600px] text-sm">
                            <thead>
                                <tr className="border-b text-left text-muted-foreground">
                                    <th className="pb-3 pr-4">Producto</th>
                                    <th className="pb-3 pr-4">SKU</th>
                                    <th className="pb-3 pr-4 text-right">Precio</th>
                                    <th className="pb-3 pr-4 text-center">Cantidad</th>
                                    <th className="pb-3 text-right">Subtotal</th>
                                </tr>
                            </thead>

                            <tbody>
                                {productos.map(producto => (
                                    <tr key={producto.id} className="border-b last:border-0">
                                        <td className="py-4 pr-4 font-medium">{producto.nombre}</td>

                                        <td className="py-4 pr-4">{producto.sku}</td>

                                        <td className="py-4 pr-4 text-right">
                                            {formatoPrecio(Number(producto.precio_unitario))}
                                        </td>

                                        <td className="py-4 pr-4 text-center">{producto.cantidad}</td>

                                        <td className="py-4 text-right font-medium">
                                            {formatoPrecio(Number(producto.precio_unitario) * producto.cantidad)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="mt-5 flex justify-end border-t pt-5">
                    <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total del pedido</p>

                        <p className="mt-1 text-2xl font-bold">{formatoPrecio(Number(pedido.total))}</p>
                    </div>
                </div>
            </section>

            {/* Cambiar estado */}
            <section className="mb-6 rounded-xl border p-5">
                <h2 className="mb-2 text-lg font-semibold">Administración del pedido</h2>

                <p className="mb-5 text-sm text-muted-foreground">Desde aquí puedes actualizar el estado del pedido.</p>

                <AccionesPedido id={pedido.id} estado={pedido.estado} fechaLimite={pedido.fecha_limite} />
            </section>

            {/* Historial */}
            <section className="rounded-xl border p-5">
                <h2 className="mb-5 text-lg font-semibold">Historial de estados</h2>

                {historial.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        Este pedido todavía no tiene registros de historial.
                    </p>
                ) : (
                    <div className="space-y-5">
                        {historial.map(registro => (
                            <article key={registro.id} className="border-l-2 pl-4">
                                <h3 className="font-semibold">{estadoLegible(registro.estado)}</h3>

                                <p className="mt-1 text-sm text-muted-foreground">
                                    {formatoFechaHora(registro.creado_en)}
                                </p>

                                <p className="mt-1 text-sm">
                                    Usuario:{" "}
                                    {registro.usuario_id
                                        ? (usuariosMap.get(registro.usuario_id) ?? "Usuario no disponible")
                                        : "Sistema"}
                                </p>

                                {registro.nota && (
                                    <p className="mt-2 rounded-lg bg-muted p-3 text-sm">{registro.nota}</p>
                                )}
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}
