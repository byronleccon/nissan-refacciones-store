import { urlFotoProducto } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormularioAgregar } from "./formulario-agregar";

type Props = {
    params: Promise<{ sku: string }>;
};

export default async function DetalleProductoPage({ params }: Props) {
    const { sku } = await params;
    const supabase = await createClient();

    const { data: producto } = await supabase
        .from("productos")
        .select(
            "id, sku, nombre, descripcion, precio, urls_imagenes, categorias(nombre), compatibilidades(vehiculos(modelo, anio, version, motor)), inventario_sucursal(stock_fisico, stock_reservado, sucursales(nombre, activa))",
        )
        .eq("sku", decodeURIComponent(sku))
        .eq("publicado", true)
        .maybeSingle();

    if (!producto) notFound();

    const categoria = Array.isArray(producto.categorias) ? producto.categorias[0] : producto.categorias;

    return (
        <main className="mx-auto max-w-6xl px-6 py-10">
            <Link href="/catalogo" className="text-sm font-medium text-gray-500 transition hover:text-red-600">
                ← Volver al catálogo
            </Link>

            <div className="mt-6 grid gap-10 md:grid-cols-2">
                {/* Imagen del producto */}
                <div className="relative aspect-square w-full overflow-hidden rounded-2xl border bg-gray-50">
                    {producto.urls_imagenes?.[0] ? (
                        <Image
                            src={urlFotoProducto(producto.urls_imagenes[0])}
                            alt={producto.nombre}
                            fill
                            sizes="(max-width: 768px) 100vw, 50vw"
                            className="object-contain p-4"
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center text-gray-400">
                            Sin fotografía disponible
                        </div>
                    )}
                </div>

                {/* Información del producto */}
                <section className="flex flex-col">
                    {categoria && (
                        <span className="w-fit rounded-full bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-600">
                            {categoria.nombre}
                        </span>
                    )}

                    <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{producto.nombre}</h1>

                    <p className="mt-2 text-sm text-gray-500">SKU: {producto.sku}</p>

                    <p className="mt-6 text-3xl font-black text-red-600">
                        {Number(producto.precio).toLocaleString("es-MX", {
                            style: "currency",
                            currency: "MXN",
                        })}
                    </p>

                    {producto.descripcion && <p className="mt-5 leading-7 text-gray-600">{producto.descripcion}</p>}

                    {/* Formulario interactivo */}
                    <div className="mt-7 rounded-xl border bg-white p-5 shadow-sm">
                        <h2 className="font-bold">Agrega este producto a tu carrito</h2>

                        <FormularioAgregar productoId={producto.id} />
                    </div>

                    {/* Compatibilidades */}
                    {producto.compatibilidades && producto.compatibilidades.length > 0 && (
                        <section className="mt-8">
                            <h2 className="text-lg font-bold">Vehículos compatibles</h2>

                            <ul className="mt-3 space-y-2">
                                {producto.compatibilidades.map((c, i) => {
                                    const v = Array.isArray(c.vehiculos) ? c.vehiculos[0] : c.vehiculos;

                                    if (!v) return null;

                                    return (
                                        <li key={i} className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
                                            <span className="font-semibold">
                                                {v.modelo} {v.anio}
                                            </span>
                                            {" · "}
                                            {v.version}
                                            {" · "}
                                            {v.motor}
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    )}

                    {/* Disponibilidad */}
                    <section className="mt-8">
                        <h2 className="text-lg font-bold">Disponibilidad por sucursal</h2>

                        <ul className="mt-3 space-y-2">
                            {producto.inventario_sucursal
                                ?.map(i => {
                                    const suc = Array.isArray(i.sucursales) ? i.sucursales[0] : i.sucursales;

                                    return {
                                        suc,
                                        disponible: i.stock_fisico - i.stock_reservado,
                                    };
                                })
                                .filter(x => x.suc?.activa)
                                .map((x, idx) => (
                                    <li
                                        key={idx}
                                        className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm"
                                    >
                                        <span className="font-medium">{x.suc?.nombre}</span>

                                        {x.disponible > 0 ? (
                                            <span className="font-semibold text-green-700">
                                                {x.disponible} disponibles
                                            </span>
                                        ) : (
                                            <span className="font-semibold text-red-600">Agotado</span>
                                        )}
                                    </li>
                                ))}
                        </ul>
                    </section>
                </section>
            </div>
        </main>
    );
}
