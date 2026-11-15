import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

interface Props {
    params: Promise<{ id: string }>;
}

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
        dateStyle: "long",
        timeStyle: "short",
    });
}

function estadoLegible(estado: string) {
    const estados: Record<string, string> = {
        confirmado: "Confirmado",
        preparado: "Preparado",
        entregado: "Entregado",
        vencido: "Vencido",
        cancelado: "Cancelado",
    };

    return estados[estado] ?? estado;
}

export default async function DetallePedidoPage({ params }: Props) {
    const { id } = await params;

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    // Consultar el pedido únicamente si pertenece al cliente.
    const { data: pedido, error } = await supabase
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
        .eq("cliente_id", user.id)
        .maybeSingle();

    if (error) {
        console.error("Error al consultar el pedido:", error.message);
    }

    if (!pedido) notFound();

    // Consultar productos, historial y sucursal.
    const [detalleResult, historialResult, sucursalResult] = await Promise.all([
        supabase.from("detalle_pedido").select("id, sku, nombre, precio_unitario, cantidad").eq("pedido_id", pedido.id),

        supabase
            .from("historial_estados_pedido")
            .select("id, estado, nota, creado_en")
            .eq("pedido_id", pedido.id)
            .order("creado_en", { ascending: true }),

        supabase.from("sucursales").select("nombre, direccion").eq("id", pedido.sucursal_id).maybeSingle(),
    ]);

    if (detalleResult.error || historialResult.error || sucursalResult.error) {
        console.error(
            "Error al consultar los detalles:",
            detalleResult.error?.message,
            historialResult.error?.message,
            sucursalResult.error?.message,
        );
    }

    const productos = detalleResult.data ?? [];
    const historial = historialResult.data ?? [];
    const sucursal = sucursalResult.data;

    return (
        <main className="mx-auto max-w-5xl px-4 py-10">
            <Link href="/mis-pedidos" className="text-sm text-muted-foreground hover:underline">
                ← Volver a mis pedidos
            </Link>

            <div className="mb-8 mt-5">
                <p className="text-sm text-muted-foreground">Detalles del pedido</p>

                <h1 className="text-3xl font-bold">{pedido.folio}</h1>

                <span className="mt-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-sm font-medium">
                    {estadoLegible(pedido.estado)}
                </span>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <section className="rounded-xl border p-5">
                    <h2 className="mb-4 text-lg font-semibold">Información del pedido</h2>

                    <div className="space-y-3 text-sm">
                        <div>
                            <p className="text-muted-foreground">Fecha de compra</p>
                            <p className="font-medium">{formatoFechaHora(pedido.creado_en)}</p>
                        </div>

                        <div>
                            <p className="text-muted-foreground">Fecha de recogida</p>
                            <p className="font-medium">{formatoFecha(pedido.fecha_recogida)}</p>
                        </div>

                        <div>
                            <p className="text-muted-foreground">Fecha límite de recogida</p>
                            <p className="font-medium">{formatoFechaHora(pedido.fecha_limite)}</p>
                        </div>
                    </div>
                </section>

                <section className="rounded-xl border p-5">
                    <h2 className="mb-4 text-lg font-semibold">Sucursal de recogida</h2>

                    {sucursal ? (
                        <>
                            <p className="font-medium">{sucursal.nombre}</p>

                            <p className="mt-2 text-sm text-muted-foreground">{sucursal.direccion}</p>
                        </>
                    ) : (
                        <p className="text-sm text-muted-foreground">No se encontró la información de la sucursal.</p>
                    )}
                </section>
            </div>

            <section className="mt-6 rounded-xl border p-5">
                <h2 className="mb-5 text-lg font-semibold">Productos del pedido</h2>

                {productos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No se encontraron productos.</p>
                ) : (
                    <div className="space-y-4">
                        {productos.map(producto => (
                            <div
                                key={producto.id}
                                className="flex flex-col justify-between gap-2 border-b pb-4 last:border-0 sm:flex-row sm:items-center"
                            >
                                <div>
                                    <p className="font-medium">{producto.nombre}</p>

                                    <p className="text-sm text-muted-foreground">SKU: {producto.sku}</p>

                                    <p className="text-sm text-muted-foreground">Cantidad: {producto.cantidad}</p>
                                </div>

                                <div className="sm:text-right">
                                    <p className="text-sm text-muted-foreground">
                                        Precio unitario: {formatoPrecio(Number(producto.precio_unitario))}
                                    </p>

                                    <p className="font-semibold">
                                        {formatoPrecio(Number(producto.precio_unitario) * producto.cantidad)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-5 flex justify-between border-t pt-5">
                    <span className="font-semibold">Total del pedido</span>

                    <span className="text-xl font-bold">{formatoPrecio(Number(pedido.total))}</span>
                </div>
            </section>

            <section className="mt-6 rounded-xl border p-5">
                <h2 className="mb-5 text-lg font-semibold">Historial del pedido</h2>

                {historial.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Todavía no hay movimientos registrados.</p>
                ) : (
                    <div className="space-y-5">
                        {historial.map(movimiento => (
                            <div key={movimiento.id} className="border-l-2 border-primary pl-4">
                                <p className="font-medium">{estadoLegible(movimiento.estado)}</p>

                                <p className="text-sm text-muted-foreground">
                                    {formatoFechaHora(movimiento.creado_en)}
                                </p>

                                {movimiento.nota && <p className="mt-1 text-sm">{movimiento.nota}</p>}
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}
