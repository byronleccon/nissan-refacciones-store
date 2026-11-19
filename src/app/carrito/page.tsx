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

    const totalProductos = filas.reduce((suma, f) => suma + f.cantidad, 0);

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

    const sucursalActiva = disponibilidad.find(s => s.sucursal_id === params.sucursal && s.disponible);

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {/* ENCABEZADO */}
                <div className="mb-8">
                    <Link
                        href="/catalogo"
                        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-primary"
                    >
                        ← Seguir comprando
                    </Link>

                    <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
                                Tsuru ProParts
                            </p>

                            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                                Mi carrito
                            </h1>

                            <p className="mt-2 text-slate-500">
                                Revisa tus refacciones antes de continuar con tu pedido.
                            </p>
                        </div>

                        {filas.length > 0 && (
                            <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                    Productos en tu carrito
                                </p>
                                <p className="mt-1 text-2xl font-bold text-slate-900">
                                    {totalProductos}
                                    <span className="ml-2 text-sm font-normal text-slate-500">unidades</span>
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* PASOS DE COMPRA */}
                <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="grid grid-cols-3 gap-2">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                                1
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900">Carrito</p>
                                <p className="hidden text-xs text-slate-500 sm:block">Tus productos</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500">
                                2
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-500">Sucursal</p>
                                <p className="hidden text-xs text-slate-400 sm:block">Disponibilidad</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500">
                                3
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-500">Recogida</p>
                                <p className="hidden text-xs text-slate-400 sm:block">Fecha y confirmación</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-2">
                        <div className="h-1.5 rounded-full bg-primary" />
                        <div className="h-1.5 rounded-full bg-slate-100" />
                        <div className="h-1.5 rounded-full bg-slate-100" />
                    </div>
                </div>

                {filas.length === 0 ? (
                    /* CARRITO VACÍO */
                    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-4xl">
                            🛒
                        </div>

                        <h2 className="mt-6 text-2xl font-bold text-slate-900">Tu carrito está vacío</h2>

                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                            Todavía no has agregado refacciones. Explora nuestro catálogo y encuentra lo que necesita tu
                            Nissan Tsuru.
                        </p>

                        <Button asChild className="mt-7">
                            <Link href="/catalogo">Explorar catálogo</Link>
                        </Button>
                    </div>
                ) : (
                    <div className="grid items-start gap-8 lg:grid-cols-[1fr_350px]">
                        {/* COLUMNA DE PRODUCTOS */}
                        <div className="space-y-6">
                            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                                <div className="mb-5 flex items-center justify-between gap-3">
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900">Tus refacciones</h2>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Modifica las cantidades o elimina productos.
                                        </p>
                                    </div>

                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                        {filas.length} {filas.length === 1 ? "producto" : "productos"}
                                    </span>
                                </div>

                                <div className="space-y-4">
                                    {filas.map(f => (
                                        <article
                                            key={f.producto_id}
                                            className="rounded-xl border border-slate-200 p-4 transition hover:border-slate-300 sm:p-5"
                                        >
                                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                                        {f.p.sku}
                                                    </p>

                                                    <h3 className="mt-1 text-base font-bold text-slate-900">
                                                        {f.p.nombre}
                                                    </h3>

                                                    <p className="mt-2 text-sm text-slate-500">
                                                        {moneda(Number(f.p.precio))} por unidad
                                                    </p>
                                                </div>

                                                <div className="flex items-center justify-between gap-4 sm:justify-end">
                                                    <div className="text-left sm:text-right">
                                                        <p className="text-xs text-slate-500">Subtotal</p>
                                                        <p className="text-lg font-bold text-slate-900">
                                                            {moneda(Number(f.p.precio) * f.cantidad)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                                                <form action={cambiarCantidad} className="flex items-center gap-2">
                                                    <input type="hidden" name="producto_id" value={f.producto_id} />

                                                    <label
                                                        htmlFor={`cantidad-${f.producto_id}`}
                                                        className="text-sm text-slate-500"
                                                    >
                                                        Cantidad
                                                    </label>

                                                    <input
                                                        id={`cantidad-${f.producto_id}`}
                                                        name="cantidad"
                                                        type="number"
                                                        min={0}
                                                        max={99}
                                                        defaultValue={f.cantidad}
                                                        className="h-9 w-20 rounded-lg border border-slate-300 bg-white px-2 text-center text-sm font-semibold text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                                                    />

                                                    <Button type="submit" size="sm" variant="outline">
                                                        Actualizar
                                                    </Button>
                                                </form>

                                                <form action={quitarDelCarrito}>
                                                    <input type="hidden" name="producto_id" value={f.producto_id} />

                                                    <Button
                                                        type="submit"
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                                    >
                                                        Quitar producto
                                                    </Button>
                                                </form>
                                            </div>
                                        </article>
                                    ))}
                                </div>

                                <div className="mt-5 border-t border-slate-100 pt-5 text-right">
                                    <Link
                                        href="/catalogo"
                                        className="text-sm font-semibold text-primary transition hover:underline"
                                    >
                                        + Agregar más refacciones
                                    </Link>
                                </div>
                            </section>

                            {/* DISPONIBILIDAD */}
                            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-primary">
                                        Paso 2 de 3
                                    </p>

                                    <h2 className="mt-2 text-xl font-bold text-slate-900">
                                        Elige dónde recoger tu pedido
                                    </h2>

                                    <p className="mt-2 text-sm leading-6 text-slate-500">
                                        Comprueba qué sucursal tiene disponibles todos los productos y cantidades de tu
                                        carrito.
                                    </p>
                                </div>

                                {params.error === "sucursal-no-disponible" && (
                                    <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                        <p className="font-bold">
                                            La sucursal seleccionada ya no tiene existencias suficientes.
                                        </p>
                                        <p className="mt-1">
                                            Consulta nuevamente la disponibilidad antes de continuar.
                                        </p>
                                    </div>
                                )}

                                {errorDisponibilidad ? (
                                    <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                        No fue posible consultar la disponibilidad. Intenta actualizar la página.
                                    </div>
                                ) : disponibilidad.length === 0 ? (
                                    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                                        No encontramos sucursales activas para consultar.
                                    </div>
                                ) : (
                                    <>
                                        {sucursalActiva && (
                                            <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-5">
                                                <div className="flex items-center gap-2">
                                                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 font-bold text-green-700">
                                                        ✓
                                                    </span>

                                                    <p className="font-bold text-green-800">Sucursal seleccionada</p>
                                                </div>

                                                <h3 className="mt-3 font-bold text-slate-900">
                                                    {sucursalActiva.sucursal_nombre}
                                                </h3>

                                                <p className="mt-1 text-sm text-slate-600">
                                                    {sucursalActiva.direccion}
                                                </p>

                                                <p className="mt-3 text-sm text-green-800">
                                                    Todos los productos están disponibles en esta sucursal.
                                                </p>

                                                <Link
                                                    href={`/carrito/confirmar?sucursal=${sucursalActiva.sucursal_id}`}
                                                    className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 sm:w-auto"
                                                >
                                                    Continuar con fecha de recogida →
                                                </Link>
                                            </div>
                                        )}

                                        {!sucursalActiva && (
                                            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                                                Selecciona una sucursal que tenga todos los productos disponibles para
                                                continuar.
                                            </div>
                                        )}

                                        <div className="mt-5 space-y-4">
                                            {disponibilidad.map(sucursal => {
                                                const seleccionada =
                                                    sucursalActiva?.sucursal_id === sucursal.sucursal_id;

                                                return (
                                                    <article
                                                        key={sucursal.sucursal_id}
                                                        className={`rounded-xl border p-5 transition ${
                                                            seleccionada
                                                                ? "border-green-300 bg-green-50/40"
                                                                : "border-slate-200 bg-white"
                                                        }`}
                                                    >
                                                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                                                            <div>
                                                                <h3 className="font-bold text-slate-900">
                                                                    {sucursal.sucursal_nombre}
                                                                </h3>

                                                                <p className="mt-1 text-sm text-slate-500">
                                                                    {sucursal.direccion}
                                                                </p>
                                                            </div>

                                                            {sucursal.disponible ? (
                                                                <span className="w-fit rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                                                                    Disponible
                                                                </span>
                                                            ) : (
                                                                <span className="w-fit rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                                                                    Stock insuficiente
                                                                </span>
                                                            )}
                                                        </div>

                                                        {sucursal.disponible ? (
                                                            <>
                                                                <p className="mt-4 text-sm text-green-700">
                                                                    ✓ Hay existencias de todos los productos y
                                                                    cantidades.
                                                                </p>

                                                                <form action={seleccionarSucursal} className="mt-4">
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
                                                                <p className="mt-4 text-sm text-red-700">
                                                                    No hay existencias suficientes de todos los
                                                                    productos.
                                                                </p>

                                                                {sucursal.productos_faltantes?.length > 0 && (
                                                                    <div className="mt-4 space-y-3">
                                                                        <p className="text-sm font-bold text-slate-800">
                                                                            Productos que no alcanzan:
                                                                        </p>

                                                                        {sucursal.productos_faltantes.map(producto => (
                                                                            <div
                                                                                key={producto.producto_id}
                                                                                className="rounded-lg border border-red-100 bg-red-50/70 p-4"
                                                                            >
                                                                                <p className="font-semibold text-slate-900">
                                                                                    {producto.nombre}
                                                                                </p>

                                                                                <p className="mt-1 text-xs text-slate-500">
                                                                                    SKU: {producto.sku}
                                                                                </p>

                                                                                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                                                                                    <p>
                                                                                        Solicitados:{" "}
                                                                                        <b>
                                                                                            {
                                                                                                producto.cantidad_solicitada
                                                                                            }
                                                                                        </b>
                                                                                    </p>

                                                                                    <p>
                                                                                        Disponibles:{" "}
                                                                                        <b>
                                                                                            {producto.stock_disponible}
                                                                                        </b>
                                                                                    </p>
                                                                                </div>

                                                                                {producto.motivo ===
                                                                                    "producto_no_publicado" && (
                                                                                    <p className="mt-2 text-xs font-medium text-red-700">
                                                                                        Este producto ya no está
                                                                                        publicado.
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                    </article>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </section>
                        </div>

                        {/* RESUMEN DEL PEDIDO */}
                        <aside className="lg:sticky lg:top-24">
                            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                <h2 className="text-lg font-bold text-slate-900">Resumen del pedido</h2>

                                <div className="mt-5 space-y-3 text-sm">
                                    <div className="flex justify-between gap-3 text-slate-500">
                                        <span>Productos</span>
                                        <span>{filas.length}</span>
                                    </div>

                                    <div className="flex justify-between gap-3 text-slate-500">
                                        <span>Unidades</span>
                                        <span>{totalProductos}</span>
                                    </div>

                                    <div className="border-t border-slate-100 pt-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="font-semibold text-slate-900">Total</span>

                                            <span className="text-2xl font-extrabold text-slate-900">
                                                {moneda(total)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 rounded-xl bg-slate-50 p-4">
                                    <p className="text-sm font-semibold text-slate-800">Información importante</p>

                                    <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-500">
                                        <li>• El pago se realiza al recoger tu pedido.</li>
                                        <li>• El inventario se reserva al confirmar el pedido.</li>
                                        <li>• Debes seleccionar una sucursal con existencias suficientes.</li>
                                    </ul>
                                </div>

                                <div className="mt-5 flex items-center gap-2 text-xs text-slate-400">
                                    <span>🔒</span>
                                    <span>Tu pedido se procesa de forma segura.</span>
                                </div>
                            </div>

                            <Link
                                href="/catalogo"
                                className="mt-4 flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                            >
                                Seguir comprando
                            </Link>
                        </aside>
                    </div>
                )}
            </div>
        </main>
    );
}
