import { urlFotoProducto } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = {
    params: Promise<{ sku: string }>;
};

export default async function DetalleProductoPage({ params }: Props) {
    const { sku } = await params;
    const supabase = await createClient();

    const { data: producto } = await supabase
        .from("productos")
        .select("sku, nombre, descripcion, precio, urls_imagenes, categorias(nombre)")
        .eq("sku", decodeURIComponent(sku))
        .eq("publicado", true)
        .maybeSingle();

    if (!producto) notFound();

    const categoria = Array.isArray(producto.categorias) ? producto.categorias[0] : producto.categorias;

    return (
        <main className="mx-auto max-w-3xl p-6">
            <Link href="/catalogo" className="text-sm underline">
                ← Volver al catálogo
            </Link>

            {producto.urls_imagenes?.[0] && (
                <div className="relative mt-4 aspect-square w-full max-w-md overflow-hidden rounded-lg bg-gray-100">
                    <Image
                        src={urlFotoProducto(producto.urls_imagenes[0])}
                        alt={producto.nombre}
                        fill
                        sizes="(max-width: 768px) 100vw, 448px"
                        className="object-cover"
                    />
                </div>
            )}

            <h1 className="mt-4 text-3xl font-bold">{producto.nombre}</h1>
            <p className="mt-1 text-sm text-gray-600">SKU: {producto.sku}</p>
            {categoria && <p className="text-sm text-gray-600">Categoría: {categoria.nombre}</p>}

            <p className="mt-4 text-3xl font-bold">
                {Number(producto.precio).toLocaleString("es-MX", {
                    style: "currency",
                    currency: "MXN",
                })}
            </p>

            {producto.descripcion && <p className="mt-4">{producto.descripcion}</p>}
        </main>
    );
}
