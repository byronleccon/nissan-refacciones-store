import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
type Props = {
    searchParams: Promise<{ q?: string; categoria?: string }>;
};

export default async function CatalogoPage({ searchParams }: Props) {
    const { q, categoria } = await searchParams;
    const supabase = await createClient();

    const { data: categorias } = await supabase.from("categorias").select("id, nombre, slug").order("nombre");

    let consulta = supabase
        .from("productos")
        .select("id, sku, nombre, precio,urls_imagenes, categorias(nombre, slug)")
        .eq("publicado", true)
        .order("nombre");

    if (categoria) {
        const cat = categorias?.find(c => c.slug === categoria);
        if (cat) consulta = consulta.eq("categoria_id", cat.id);
    }

    if (q) {
        // Se quitan caracteres que rompen el filtro
        const texto = q.replace(/[,()%]/g, " ").trim();
        if (texto) {
            consulta = consulta.or(`nombre.ilike.%${texto}%,sku.ilike.%${texto}%`);
        }
    }

    const { data: productos, error } = await consulta;

    return (
        <main className="mx-auto max-w-6xl p-6">
            <h1 className="text-3xl font-bold">Catálogo de refacciones</h1>

            <form className="mt-4 flex gap-2" action="/catalogo">
                <input
                    name="q"
                    defaultValue={q}
                    placeholder="Buscar por nombre o SKU"
                    className="w-full max-w-md rounded-md border px-3 py-2"
                />
                {categoria && <input type="hidden" name="categoria" value={categoria} />}
                <button className="rounded-md bg-red-700 px-4 py-2 text-white">Buscar</button>
            </form>

            <div className="mt-4 flex flex-wrap gap-2">
                <a href="/catalogo" className="rounded-full border px-3 py-1 text-sm">
                    Todas
                </a>
                {categorias?.map(c => (
                    <a
                        key={c.id}
                        href={`/catalogo?categoria=${c.slug}`}
                        className={`rounded-full border px-3 py-1 text-sm ${
                            categoria === c.slug ? "bg-red-700 text-white" : ""
                        }`}
                    >
                        {c.nombre}
                    </a>
                ))}
            </div>

            {error && <p className="mt-6 text-red-600">No se pudo cargar el catálogo.</p>}

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {productos?.map(p => (
                    <Link key={p.id} href={`/catalogo/${encodeURIComponent(p.sku)}`}>
                        <Card className="h-full transition hover:shadow-md">
                            <CardHeader>
                                <CardTitle className="text-base">{p.nombre}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-gray-600">SKU: {p.sku}</p>
                                <p className="mt-2 text-xl font-bold">
                                    {Number(p.precio).toLocaleString("es-MX", {
                                        style: "currency",
                                        currency: "MXN",
                                    })}
                                </p>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            {productos?.length === 0 && <p className="mt-6">No se encontraron productos.</p>}
        </main>
    );
}
