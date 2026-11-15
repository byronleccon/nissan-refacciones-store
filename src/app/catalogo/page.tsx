import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { urlFotoProducto } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";

type Props = {
    searchParams: Promise<{
        q?: string;
        categoria?: string;
        modelo?: string;
        anio?: string;
        version?: string;
        motor?: string;
    }>;
};

export default async function CatalogoPage({ searchParams }: Props) {
    const { q, categoria, modelo, anio, version, motor } = await searchParams;
    const supabase = await createClient();

    const { data: categorias } = await supabase.from("categorias").select("id, nombre, slug").order("nombre");

    // Lista de vehículos para armar las opciones del filtro
    const { data: vehiculos } = await supabase
        .from("vehiculos")
        .select("id, modelo, anio, version, motor")
        .order("modelo")
        .order("anio");

    const modelos = [...new Set(vehiculos?.map(v => v.modelo))];
    const anios = [...new Set(vehiculos?.filter(v => !modelo || v.modelo === modelo).map(v => v.anio))];
    const versiones = [
        ...new Set(
            vehiculos
                ?.filter(v => (!modelo || v.modelo === modelo) && (!anio || v.anio === Number(anio)))
                .map(v => v.version),
        ),
    ];
    const motores = [
        ...new Set(
            vehiculos
                ?.filter(
                    v =>
                        (!modelo || v.modelo === modelo) &&
                        (!anio || v.anio === Number(anio)) &&
                        (!version || v.version === version),
                )
                .map(v => v.motor),
        ),
    ];

    // IDs de vehículos que cumplen el filtro elegido
    const hayFiltroVehiculo = Boolean(modelo || anio || version || motor);
    let idsVehiculos: string[] = [];
    if (hayFiltroVehiculo) {
        idsVehiculos =
            vehiculos
                ?.filter(
                    v =>
                        (!modelo || v.modelo === modelo) &&
                        (!anio || v.anio === Number(anio)) &&
                        (!version || v.version === version) &&
                        (!motor || v.motor === motor),
                )
                .map(v => v.id) ?? [];
    }

    // Productos compatibles con esos vehículos
    let idsProductos: string[] | null = null;
    if (hayFiltroVehiculo) {
        if (idsVehiculos.length === 0) {
            idsProductos = [];
        } else {
            const { data: compat } = await supabase
                .from("compatibilidades")
                .select("producto_id")
                .in("vehiculo_id", idsVehiculos);
            idsProductos = [...new Set(compat?.map(c => c.producto_id))];
        }
    }

    let consulta = supabase
        .from("productos")
        .select("id, sku, nombre, precio, urls_imagenes, categorias(nombre, slug)")
        .eq("publicado", true)
        .order("nombre");

    if (idsProductos !== null) {
        // Si no hay ninguno, se usa un UUID imposible para devolver 0 resultados
        consulta = consulta.in("id", idsProductos.length > 0 ? idsProductos : ["00000000-0000-0000-0000-000000000000"]);
    }

    if (categoria) {
        const cat = categorias?.find(c => c.slug === categoria);
        if (cat) consulta = consulta.eq("categoria_id", cat.id);
    }

    if (q) {
        const texto = q.replace(/[,()%]/g, " ").trim();
        if (texto) {
            consulta = consulta.or(`nombre.ilike.%${texto}%,sku.ilike.%${texto}%`);
        }
    }

    const { data: productos, error } = await consulta;
    if (error) console.error("ERROR CATALOGO:", error.message);

    // Conserva el texto y la categoría al cambiar el vehículo
    const claseSelect = "rounded-md border px-3 py-2 text-sm";

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
                {modelo && <input type="hidden" name="modelo" value={modelo} />}
                {anio && <input type="hidden" name="anio" value={anio} />}
                {version && <input type="hidden" name="version" value={version} />}
                {motor && <input type="hidden" name="motor" value={motor} />}
                <button className="rounded-md bg-marca px-4 py-2 text-white">Buscar</button>
            </form>

            {/* Filtro por vehículo */}
            <form action="/catalogo" className="mt-4 flex flex-wrap items-end gap-2 rounded-md border p-3">
                <p className="w-full text-sm font-semibold">Filtrar por tu vehículo</p>
                {q && <input type="hidden" name="q" value={q} />}
                {categoria && <input type="hidden" name="categoria" value={categoria} />}

                <select name="modelo" defaultValue={modelo ?? ""} className={claseSelect}>
                    <option value="">Modelo</option>
                    {modelos.map(m => (
                        <option key={m} value={m}>
                            {m}
                        </option>
                    ))}
                </select>

                <select name="anio" defaultValue={anio ?? ""} className={claseSelect}>
                    <option value="">Año</option>
                    {anios.map(a => (
                        <option key={a} value={a}>
                            {a}
                        </option>
                    ))}
                </select>

                <select name="version" defaultValue={version ?? ""} className={claseSelect}>
                    <option value="">Versión</option>
                    {versiones.map(v => (
                        <option key={v} value={v}>
                            {v}
                        </option>
                    ))}
                </select>

                <select name="motor" defaultValue={motor ?? ""} className={claseSelect}>
                    <option value="">Motor</option>
                    {motores.map(m => (
                        <option key={m} value={m}>
                            {m}
                        </option>
                    ))}
                </select>

                <button className="rounded-md bg-marca px-4 py-2 text-sm text-white">Filtrar</button>
                {hayFiltroVehiculo && (
                    <Link href="/catalogo" className="text-sm underline">
                        Quitar filtro
                    </Link>
                )}
            </form>

            <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/catalogo" className="rounded-full border px-3 py-1 text-sm">
                    Todas
                </Link>
                {categorias?.map(c => (
                    <Link
                        key={c.id}
                        href={`/catalogo?categoria=${c.slug}`}
                        className={`rounded-full border px-3 py-1 text-sm ${
                            categoria === c.slug ? "bg-marca text-white" : ""
                        }`}
                    >
                        {c.nombre}
                    </Link>
                ))}
            </div>

            {error && <p className="mt-6 text-red-600">No se pudo cargar el catálogo.</p>}

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {productos?.map(p => (
                    <Link key={p.id} href={`/catalogo/${encodeURIComponent(p.sku)}`}>
                        <Card className="h-full transition hover:shadow-md">
                            <div className="relative aspect-square w-full overflow-hidden rounded-t-xl bg-gray-100">
                                {p.urls_imagenes?.[0] ? (
                                    <Image
                                        src={urlFotoProducto(p.urls_imagenes[0])}
                                        alt={p.nombre}
                                        fill
                                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full items-center justify-center text-sm text-gray-400">
                                        Sin foto
                                    </div>
                                )}
                            </div>
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
