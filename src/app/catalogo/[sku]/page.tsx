import { createClient } from "@/lib/supabase/server";
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
        .select("sku, nombre, descripcion, precio, categorias(nombre)")
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
