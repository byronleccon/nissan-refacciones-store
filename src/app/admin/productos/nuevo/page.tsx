import { Button } from "@/components/ui/button";
import { exigirRol } from "@/lib/auth/exigir-rol";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { crearProducto } from "../acciones";
import { SelectorCategoriaSku } from "./selector-categoria-sku";
import { SelectorCompatibilidad } from "./selector-compatibilidad";
import { SelectorSucursalesStock } from "./selector-sucursales-stock";

const errores: Record<string, string> = {
    datos: "Revisa los datos del producto (nombre, SKU, categoría y precio).",
    imagen: "Debes elegir una imagen del producto.",
    imagen_grande: "La imagen pesa más de 2 MB. Reduce su tamaño e inténtalo de nuevo.",
    imagen_tipo: "La imagen debe ser JPG, PNG o WebP.",
    vehiculos: "La lista de vehículos compatibles no es válida.",
    vehiculo_nuevo: "Revisa el vehículo nuevo: modelo, versión, motor y años (desde 2015).",
    sucursales: "Selecciona al menos una sucursal y revisa sus existencias.",
    sku_duplicado: "Ya existe un producto con ese SKU.",
    permisos: "No tienes permisos para agregar productos.",
    guardar: "No se pudo guardar el producto. Intenta de nuevo.",
};

const campo = "w-full rounded-lg border bg-white px-4 py-2";

export default async function NuevoProductoPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string; creado?: string }>;
}) {
    const perfil = await exigirRol(["admin_general", "admin_sucursal"]);
    const params = await searchParams;
    const esAdminGeneral = perfil.rol === "admin_general";
    const supabase = await createClient();

    const { data: categorias } = await supabase.from("categorias").select("id, nombre").order("nombre");

    const { data: vehiculos } = await supabase
        .from("vehiculos")
        .select("id, modelo, anio, version, motor")
        .order("modelo")
        .order("anio");

    const { data: sucursales } = esAdminGeneral
        ? await supabase.from("sucursales").select("id, nombre").eq("activa", true).order("nombre")
        : { data: null };

    const volver = esAdminGeneral ? "/admin" : "/sucursal";

    return (
        <main className="mx-auto max-w-3xl space-y-6 p-6">
            <div>
                <Link href={volver} className="text-sm underline">
                    ← Volver
                </Link>

                <h1 className="mt-4 text-3xl font-bold">Agregar producto</h1>

                <p className="mt-1 text-sm text-gray-600">El precio es global para todas las sucursales.</p>
            </div>

            {params.creado === "1" && (
                <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-green-800">
                    Producto creado correctamente.
                </div>
            )}

            {params.creado === "pendiente" && (
                <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-green-800">
                    Producto creado. Quedó pendiente de publicación: el administrador general debe aprobarlo para que
                    aparezca en el catálogo.
                </div>
            )}

            {params.error && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
                    {errores[params.error] ?? "Ocurrió un error inesperado."}
                </div>
            )}

            <form action={crearProducto} className="space-y-5">
                <div>
                    <label htmlFor="nombre" className="mb-1 block text-sm font-medium">
                        Nombre del artículo
                    </label>
                    <input id="nombre" name="nombre" required minLength={3} maxLength={150} className={campo} />
                </div>

                <SelectorCategoriaSku categorias={categorias ?? []} />

                <div>
                    <label htmlFor="precio" className="mb-1 block text-sm font-medium">
                        Precio (MXN)
                    </label>
                    <input id="precio" name="precio" type="number" step="0.01" min={0} required className={campo} />
                </div>

                <div>
                    <label htmlFor="descripcion" className="mb-1 block text-sm font-medium">
                        Descripción
                    </label>
                    <textarea id="descripcion" name="descripcion" rows={4} maxLength={2000} className={campo} />
                </div>

                <div>
                    <label htmlFor="imagen" className="mb-1 block text-sm font-medium">
                        Imagen del producto
                    </label>
                    <input
                        id="imagen"
                        name="imagen"
                        type="file"
                        required
                        accept="image/jpeg,image/png,image/webp"
                        className={campo}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        JPG, PNG o WebP, máximo 2 MB. Se recomienda una foto cuadrada. El archivo se renombra
                        automáticamente según la categoría.
                    </p>
                </div>

                {esAdminGeneral ? (
                    <SelectorSucursalesStock sucursales={sucursales ?? []} />
                ) : (
                    <div>
                        <label htmlFor="stock" className="mb-1 block text-sm font-medium">
                            Existencias iniciales
                        </label>
                        <input
                            id="stock"
                            name="stock"
                            type="number"
                            min={0}
                            max={100000}
                            step={1}
                            defaultValue={0}
                            required
                            className={campo}
                        />
                        <p className="mt-1 text-sm text-gray-600">
                            Las existencias se registran únicamente en tu sucursal.
                        </p>
                    </div>
                )}

                <SelectorCompatibilidad vehiculos={vehiculos ?? []} />

                {esAdminGeneral ? (
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="publicado" />
                        Publicar en el catálogo (si no, queda oculto al público)
                    </label>
                ) : (
                    <p className="text-sm text-gray-600">
                        El producto quedará pendiente de publicación hasta que lo apruebe el administrador general.
                    </p>
                )}

                <Button type="submit">Guardar producto</Button>
            </form>
        </main>
    );
}
