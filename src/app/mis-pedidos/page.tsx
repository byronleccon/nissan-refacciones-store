import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

function formatoFecha(fecha: string) {
    return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-MX", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

function formatoPrecio(cantidad: number) {
    return new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
    }).format(cantidad);
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

export default async function MisPedidosPage({
    searchParams,
}: {
    searchParams: Promise<{
        orden?: string;
    }>;
}) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const parametros = await searchParams;

    const orden = parametros.orden === "antiguos" ? "antiguos" : "recientes";

    const { data: pedidos, error } = await supabase
        .from("pedidos")
        .select("id, folio, sucursal_id, fecha_recogida, fecha_limite, estado, total, creado_en")
        .eq("cliente_id", user.id)
        .order("creado_en", { ascending: orden === "antiguos" });

    if (error) {
        console.error("Error al consultar pedidos:", error.message);
    }

    const sucursalIds = [...new Set((pedidos ?? []).map(pedido => pedido.sucursal_id))];

    let sucursales: {
        id: string;
        nombre: string;
        direccion: string;
    }[] = [];

    if (sucursalIds.length > 0) {
        const { data } = await supabase.from("sucursales").select("id, nombre, direccion").in("id", sucursalIds);

        sucursales = data ?? [];
    }

    const sucursalesMap = new Map(sucursales.map(sucursal => [sucursal.id, sucursal]));

    return (
        <main className="mx-auto max-w-5xl px-4 py-10">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Mis pedidos</h1>

                <p className="mt-2 text-muted-foreground">Consulta tus compras y el estado de tus pedidos.</p>
            </div>

            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
                <div>
                    <h2 className="font-semibold">Ordenar pedidos</h2>
                    <p className="text-sm text-muted-foreground">Organiza tus compras por fecha de creación.</p>
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
                <div className="rounded-lg border border-red-300 p-5 text-red-600">
                    No fue posible cargar tus pedidos. Intenta nuevamente.
                </div>
            ) : !pedidos || pedidos.length === 0 ? (
                <div className="rounded-xl border p-8 text-center">
                    <h2 className="text-xl font-semibold">Todavía no tienes pedidos</h2>

                    <p className="mt-2 text-muted-foreground">Cuando realices una compra, aparecerá aquí.</p>

                    <Link
                        href="/catalogo"
                        className="mt-5 inline-block rounded-md bg-primary px-5 py-2 text-primary-foreground"
                    >
                        Explorar catálogo
                    </Link>
                </div>
            ) : (
                <div className="space-y-5">
                    {pedidos.map(pedido => {
                        const sucursal = sucursalesMap.get(pedido.sucursal_id);

                        return (
                            <article key={pedido.id} className="rounded-xl border p-5 shadow-sm">
                                <div className="flex flex-col justify-between gap-4 sm:flex-row">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Folio del pedido</p>

                                        <h2 className="text-xl font-bold">{pedido.folio}</h2>

                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Realizado el {new Date(pedido.creado_en).toLocaleDateString("es-MX")}
                                        </p>
                                    </div>

                                    <div className="sm:text-right">
                                        <p className="text-sm text-muted-foreground">Estado</p>

                                        <span className="mt-1 inline-block rounded-full bg-primary/10 px-3 py-1 text-sm font-medium">
                                            {estadoLegible(pedido.estado)}
                                        </span>
                                    </div>
                                </div>

                                <div className="my-5 grid gap-4 border-y py-4 sm:grid-cols-2">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Fecha de recogida</p>

                                        <p className="font-medium">{formatoFecha(pedido.fecha_recogida)}</p>
                                    </div>

                                    <div>
                                        <p className="text-sm text-muted-foreground">Sucursal</p>

                                        <p className="font-medium">{sucursal?.nombre ?? "Sucursal no disponible"}</p>

                                        {sucursal?.direccion && (
                                            <p className="text-sm text-muted-foreground">{sucursal.direccion}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total del pedido</p>

                                        <p className="text-xl font-bold">{formatoPrecio(Number(pedido.total))}</p>
                                    </div>

                                    <Link
                                        href={`/mis-pedidos/${pedido.id}`}
                                        className="inline-block rounded-md border px-4 py-2 text-center text-sm font-medium hover:bg-muted"
                                    >
                                        Ver detalles
                                    </Link>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </main>
    );
}
