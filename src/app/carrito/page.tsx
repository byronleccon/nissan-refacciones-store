import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cambiarCantidad, quitarDelCarrito, seleccionarSucursal } from "./acciones";

const moneda = (n: number) =>
    n.toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN",
    });

type ProductoFaltante = {
    producto_id: string;
    sku: string;
    nombre: string;
    cantidad_solicitada: number;
    stock_disponible: number;
    motivo: string;
};

type DisponibilidadSucursal = {
    sucursal_id: string;
    sucursal_nombre: string;
    direccion: string;
    productos_en_carrito: number;
    carrito_vacio: boolean;
    disponible: boolean;
    productos_faltantes: ProductoFaltante[];
};

type Props = {
    searchParams: Promise<{
        sucursal?: string;
        error?: string;
    }>;
};

export default async function CarritoPage({ searchParams }: Props) {
    const params = await searchParams;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    // Consultar los productos del carrito.
    const { data: items, error: errorCarrito } = await supabase
        .from("carrito_items")
        .select("producto_id, cantidad, productos(sku, nombre, precio, publicado)")
        .eq("usuario_id", user.id)
        .order("actualizado_en", { ascending: false });

    if (errorCarrito) {
        throw new Error("No se pudo consultar tu carrito.");
    }

    const filas = (items ?? [])
        .map(i => {
            const p = Array.isArray(i.productos) ? i.productos[0] : i.productos;
            return p ? { ...i, p } : null;
        })
        .filter(x => x !== null);

    const total = filas.reduce((suma, f) => suma + Number(f.p.precio) * f.cantidad, 0);

    // Consultar disponibilidad únicamente si hay productos.
    let disponibilidad: DisponibilidadSucursal[] = [];
    let errorDisponibilidad = false;

    if (filas.length > 0) {
        const { data, error } = await supabase.rpc("consultar_disponibilidad_carrito");

        if (error) {
            errorDisponibilidad = true;
        } else {
            disponibilidad = (data ?? []) as unknown as DisponibilidadSucursal[];
        }
    }

    // Solo consideramos seleccionada una sucursal que siga teniendo stock.
    const sucursalActiva = disponibilidad.find(s => s.sucursal_id === params.sucursal && s.disponible);

    return (
        <main className="mx-auto max-w-3xl p-6">
            <h1 className="text-3xl font-bold">Tu carrito</h1>

            {filas.length === 0 ? (
                <p className="mt-6">
                    Tu carrito está vacío.{" "}
                    <Link href="/catalogo" className="underline">
                        Ver catálogo
                    </Link>
                </p>
            ) : (
                <>
                    {/* Productos del carrito */}
                    <div className="mt-6 space-y-3">
                        {filas.map(f => (
                            <div key={f.producto_id} className="rounded-md border p-4">
                                <p className="font-semibold">{f.p.nombre}</p>

                                <p className="text-sm text-gray-600">SKU: {f.p.sku}</p>

                                <p className="text-sm">
                                    {moneda(Number(f.p.precio))} c/u · Subtotal:{" "}
                                    <b>{moneda(Number(f.p.precio) * f.cantidad)}</b>
                                </p>

                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <form action={cambiarCantidad} className="flex gap-2">
                                        <input type="hidden" name="producto_id" value={f.producto_id} />

                                        <input
                                            name="cantidad"
                                            type="number"
                                            min={0}
                                            max={99}
                                            defaultValue={f.cantidad}
                                            className="w-20 rounded-md border px-2 py-1 text-sm"
                                        />

                                        <Button type="submit" size="sm" variant="outline">
                                            Actualizar
                                        </Button>
                                    </form>

                                    <form action={quitarDelCarrito}>
                                        <input type="hidden" name="producto_id" value={f.producto_id} />

                                        <Button type="submit" size="sm" variant="ghost">
                                            Quitar
                                        </Button>
                                    </form>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Total */}
                    <p className="mt-6 text-2xl font-bold">Total: {moneda(total)}</p>

                    <p className="mt-1 text-sm text-gray-600">
                        Pagas al recoger en la sucursal. El stock se reserva al confirmar el pedido.
                    </p>

                    {/* Disponibilidad por sucursal */}
                    <section className="mt-8">
                        <h2 className="text-xl font-bold">Disponibilidad en sucursales</h2>

                        <p className="mt-1 text-sm text-gray-600">
                            Revisa qué sucursales cuentan con todos los productos y cantidades de tu carrito.
                        </p>

                        {params.error === "sucursal-no-disponible" && (
                            <p className="mt-4 rounded-md border border-red-300 p-4 text-sm text-red-700">
                                Esa sucursal ya no tiene existencias suficientes. Consulta nuevamente la disponibilidad.
                            </p>
                        )}

                        {errorDisponibilidad ? (
                            <p className="mt-4 rounded-md border border-red-300 p-4 text-sm text-red-700">
                                No fue posible consultar la disponibilidad. Intenta actualizar la página.
                            </p>
                        ) : disponibilidad.length === 0 ? (
                            <p className="mt-4 rounded-md border p-4 text-sm">
                                No encontramos sucursales activas para consultar.
                            </p>
                        ) : (
                            <>
                                {/* Sucursal seleccionada */}
                                {sucursalActiva && (
                                    <div className="mt-4 rounded-md border border-green-600 p-4">
                                        <p className="font-semibold text-green-700">✓ Sucursal seleccionada</p>

                                        <p className="mt-1 font-medium">{sucursalActiva.sucursal_nombre}</p>

                                        <p className="text-sm text-gray-600">{sucursalActiva.direccion}</p>

                                        <p className="mt-2 text-sm">
                                            Todos los productos están disponibles en esta sucursal.
                                        </p>

                                        <Link
                                            href={`/carrito/confirmar?sucursal=${sucursalActiva.sucursal_id}`}
                                            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                                        >
                                            Continuar con fecha de recogida
                                        </Link>
                                    </div>
                                )}

                                {!sucursalActiva && (
                                    <p className="mt-4 rounded-md border p-4 text-sm">
                                        Selecciona una sucursal que tenga todos los productos disponibles.
                                    </p>
                                )}

                                <div className="mt-4 space-y-4">
                                    {disponibilidad.map(sucursal => {
                                        const seleccionada = sucursalActiva?.sucursal_id === sucursal.sucursal_id;

                                        return (
                                            <div key={sucursal.sucursal_id} className="rounded-md border p-4">
                                                <h3 className="font-semibold">{sucursal.sucursal_nombre}</h3>

                                                <p className="text-sm text-gray-600">{sucursal.direccion}</p>

                                                {sucursal.disponible ? (
                                                    <>
                                                        <p className="mt-3 font-medium text-green-700">
                                                            ✓ Hay existencias de todos los productos.
                                                        </p>

                                                        <form action={seleccionarSucursal} className="mt-3">
                                                            <input
                                                                type="hidden"
                                                                name="sucursal_id"
                                                                value={sucursal.sucursal_id}
                                                            />

                                                            <Button
                                                                type="submit"
                                                                size="sm"
                                                                variant={seleccionada ? "outline" : "default"}
                                                                disabled={seleccionada}
                                                            >
                                                                {seleccionada
                                                                    ? "Sucursal seleccionada"
                                                                    : "Elegir esta sucursal"}
                                                            </Button>
                                                        </form>
                                                    </>
                                                ) : (
                                                    <>
                                                        <p className="mt-3 font-medium text-red-700">
                                                            No hay existencias suficientes de todos los productos.
                                                        </p>

                                                        {sucursal.productos_faltantes?.length > 0 && (
                                                            <div className="mt-3">
                                                                <p className="text-sm font-semibold">
                                                                    Productos faltantes:
                                                                </p>

                                                                <ul className="mt-2 space-y-2">
                                                                    {sucursal.productos_faltantes.map(producto => (
                                                                        <li
                                                                            key={producto.producto_id}
                                                                            className="rounded-md bg-gray-50 p-3 text-sm"
                                                                        >
                                                                            <p className="font-medium">
                                                                                {producto.nombre}
                                                                            </p>

                                                                            <p className="text-gray-600">
                                                                                SKU: {producto.sku}
                                                                            </p>

                                                                            <p>
                                                                                Solicitados:{" "}
                                                                                {producto.cantidad_solicitada}
                                                                            </p>

                                                                            <p>
                                                                                Disponibles: {producto.stock_disponible}
                                                                            </p>

                                                                            {producto.motivo ===
                                                                                "producto_no_publicado" && (
                                                                                <p className="text-red-700">
                                                                                    Este producto ya no está publicado.
                                                                                </p>
                                                                            )}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </section>
                </>
            )}
        </main>
    );
}
