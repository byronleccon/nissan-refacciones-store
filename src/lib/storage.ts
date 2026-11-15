// Construye la URL pública de una foto guardada en el bucket "productos"
export function urlFotoProducto(nombreArchivo: string): string {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/productos/${encodeURIComponent(nombreArchivo)}`;
}
