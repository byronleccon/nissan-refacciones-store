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

const campo =
    "w-full rounded-lg border border-[#343a40] bg-[#20232a] px-4 py-3 text-sm text-[#f5f5f5] placeholder:text-[#aeb4be] focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/20";

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
        <main className="mx-auto max-w-3xl space-y-6 p-6 text-[#f5f5f5]">
            <div>
                <Link
                    href={volver}
                    className="text-sm text-[#aeb4be] underline underline-offset-4 transition-colors hover:text-white"
                >
                    ← Volver
                </Link>

                <h1 className="mt-4 text-3xl font-bold text-white">Agregar producto</h1>

                <p className="mt-1 text-sm text-[#aeb4be]">El precio es global para todas las sucursales.</p>
            </div>

            {params.creado === "1" && (
                <div className="rounded-lg border border-green-500/40 bg-green-500/10 p-4 text-sm text-green-300">
                    Producto creado correctamente.
                </div>
            )}

            {params.creado === "pendiente" && (
                <div className="rounded-lg border border-green-500/40 bg-green-500/10 p-4 text-sm text-green-300">
                    Producto creado. Quedó pendiente de publicación: el administrador general debe aprobarlo para que
                    aparezca en el catálogo.
                </div>
            )}

            {params.error && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
                    {errores[params.error] ?? "Ocurrió un error inesperado."}
                </div>
            )}

            <form
                action={crearProducto}
                className="space-y-6 rounded-xl border border-[#343a40] bg-[#20232a] p-5 shadow-lg sm:p-7"
            >
                <div>
                    <label htmlFor="nombre" className="mb-2 block text-sm font-medium text-[#f5f5f5]">
                        Nombre del artículo
                    </label>

                    <input
                        id="nombre"
                        name="nombre"
                        required
                        minLength={3}
                        maxLength={150}
                        placeholder="Ej. Filtro de aceite Nissan Tsuru"
                        className={campo}
                    />
                </div>

                <div className="rounded-lg border border-[#343a40] bg-[#292d34]/50 p-4">
                    <SelectorCategoriaSku categorias={categorias ?? []} />
                </div>

                <div>
                    <label htmlFor="precio" className="mb-2 block text-sm font-medium text-[#f5f5f5]">
                        Precio (MXN)
                    </label>

                    <input
                        id="precio"
                        name="precio"
                        type="number"
                        step="0.01"
                        min={0}
                        required
                        placeholder="0.00"
                        className={campo}
                    />
                </div>

                <div>
                    <label htmlFor="descripcion" className="mb-2 block text-sm font-medium text-[#f5f5f5]">
                        Descripción
                    </label>

                    <textarea
                        id="descripcion"
                        name="descripcion"
                        rows={4}
                        maxLength={2000}
                        placeholder="Describe las características del producto..."
                        className={`${campo} resize-y`}
                    />
                </div>

                <div>
                    <label htmlFor="imagen" className="mb-2 block text-sm font-medium text-[#f5f5f5]">
                        Imagen del producto
                    </label>

                    <input
                        id="imagen"
                        name="imagen"
                        type="file"
                        required
                        accept="image/jpeg,image/png,image/webp"
                        className={`${campo} file:mr-4 file:rounded-md file:border-0 file:bg-red-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-red-700`}
                    />

                    <p className="mt-2 text-xs leading-relaxed text-[#aeb4be]">
                        JPG, PNG o WebP, máximo 2 MB. Se recomienda una foto cuadrada. El archivo se renombra
                        automáticamente según la categoría.
                    </p>
                </div>

                {esAdminGeneral ? (
                    <div className="rounded-lg border border-[#343a40] bg-[#292d34]/50 p-4">
                        <SelectorSucursalesStock sucursales={sucursales ?? []} />
                    </div>
                ) : (
                    <div>
                        <label htmlFor="stock" className="mb-2 block text-sm font-medium text-[#f5f5f5]">
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

                        <p className="mt-2 text-sm text-[#aeb4be]">
                            Las existencias se registran únicamente en tu sucursal.
                        </p>
                    </div>
                )}

                <div className="rounded-lg border border-[#343a40] bg-[#292d34]/50 p-4">
                    <SelectorCompatibilidad vehiculos={vehiculos ?? []} />
                </div>

                {esAdminGeneral ? (
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#343a40] bg-[#292d34]/50 p-4 text-sm text-[#f5f5f5]">
                        <input type="checkbox" name="publicado" className="h-4 w-4 accent-red-600" />
                        <span>Publicar en el catálogo (si no, queda oculto al público)</span>
                    </label>
                ) : (
                    <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
                        El producto quedará pendiente de publicación hasta que lo apruebe el administrador general.
                    </p>
                )}

                <div className="border-t border-[#343a40] pt-5">
                    <Button
                        type="submit"
                        className="w-full bg-red-600 font-semibold text-white hover:bg-red-700 sm:w-auto"
                    >
                        Guardar producto
                    </Button>
                </div>
            </form>
        </main>
    );
}
