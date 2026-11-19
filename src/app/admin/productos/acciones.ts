"use server";

import { exigirRol } from "@/lib/auth/exigir-rol";
import { createClient } from "@/lib/supabase/server";
import { esquemaIdsVehiculos, esquemaInventarios, esquemaNuevos, esquemaProducto } from "@/lib/validaciones/producto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";

const RUTA = "/admin/productos/nuevo";
const MAX_BYTES = 2 * 1024 * 1024;

function texto(valor: FormDataEntryValue | null): string | undefined {
    if (typeof valor !== "string") return undefined;

    const limpio = valor.trim();
    return limpio === "" ? undefined : limpio;
}

export async function obtenerSkuPreview(categoriaId: string): Promise<string | null> {
    await exigirRol(["admin_general", "admin_sucursal"]);

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoriaId)) {
        return null;
    }

    const supabase = await createClient();

    const { data, error } = await supabase.rpc("previsualizar_sku", {
        p_categoria_id: categoriaId,
    });

    if (error) {
        console.error("Error al consultar SKU:", error.message);
        return null;
    }

    return data;
}

function leerJson(valor: string): unknown {
    try {
        return JSON.parse(valor);
    } catch {
        return null;
    }
}

function detectarImagen(b: Uint8Array): { ext: string; mime: string } | null {
    if (b.length > 12) {
        if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
            return { ext: "jpg", mime: "image/jpeg" };
        }

        if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
            return { ext: "png", mime: "image/png" };
        }

        const riff = String.fromCharCode(b[0], b[1], b[2], b[3]);
        const webp = String.fromCharCode(b[8], b[9], b[10], b[11]);

        if (riff === "RIFF" && webp === "WEBP") {
            return { ext: "webp", mime: "image/webp" };
        }
    }

    return null;
}

export async function crearProducto(formData: FormData) {
    const perfil = await exigirRol(["admin_general", "admin_sucursal"]);

    const esAdminGeneral = perfil.rol === "admin_general";

    const producto = esquemaProducto.safeParse({
        nombre: formData.get("nombre"),
        sku: formData.get("sku"),
        descripcion: texto(formData.get("descripcion")),
        categoria_id: formData.get("categoria_id"),
        precio: formData.get("precio"),
        stock: esAdminGeneral ? 0 : formData.get("stock"),
        sucursal_id: undefined,
    });

    if (!producto.success) {
        console.error("Error de validación del producto:", producto.error.flatten());
        redirect(`${RUTA}?error=datos`);
    }

    const ids = esquemaIdsVehiculos.safeParse(formData.getAll("vehiculos"));

    if (!ids.success) {
        redirect(`${RUTA}?error=vehiculos`);
    }

    let nuevos: unknown[] = [];

    const crudoNuevos = texto(formData.get("nuevos"));

    if (crudoNuevos) {
        const resultado = esquemaNuevos.safeParse(leerJson(crudoNuevos));

        if (!resultado.success) {
            redirect(`${RUTA}?error=vehiculo_nuevo`);
        }

        nuevos = resultado.data;
    }

    // Inventarios individuales del administrador general
    let inventarios: {
        sucursal_id: string;
        stock: number;
    }[] = [];

    if (esAdminGeneral) {
        const crudoInventarios = texto(formData.get("inventarios"));

        const resultado = esquemaInventarios.safeParse(crudoInventarios ? leerJson(crudoInventarios) : null);

        if (!resultado.success || resultado.data.length === 0) {
            redirect(`${RUTA}?error=sucursales`);
        }

        inventarios = resultado.data;
    }

    // Validar imagen
    const archivo = formData.get("imagen");

    if (!(archivo instanceof File) || archivo.size === 0) {
        redirect(`${RUTA}?error=imagen`);
    }

    if (archivo.size > MAX_BYTES) {
        redirect(`${RUTA}?error=imagen_grande`);
    }

    const bytes = new Uint8Array(await archivo.arrayBuffer());
    const tipo = detectarImagen(bytes);

    if (!tipo) {
        redirect(`${RUTA}?error=imagen_tipo`);
    }

    const supabase = await createClient();

    // Obtener categoría
    const { data: categoria, error: errorCategoria } = await supabase
        .from("categorias")
        .select("slug")
        .eq("id", producto.data.categoria_id)
        .maybeSingle();

    if (errorCategoria || !categoria) {
        redirect(`${RUTA}?error=datos`);
    }

    const nombreArchivo = `${categoria.slug}-${randomUUID().slice(0, 8)}.${tipo.ext}`;

    // Subir imagen
    const { error: errorSubida } = await supabase.storage.from("productos").upload(nombreArchivo, archivo, {
        contentType: tipo.mime,
        upsert: false,
    });

    if (errorSubida) {
        console.error("Error al subir imagen:", errorSubida.message);
        redirect(`${RUTA}?error=guardar`);
    }

    // Crear producto e inventarios
    const { error } = await supabase.rpc("crear_producto", {
        p_sku: producto.data.sku,
        p_nombre: producto.data.nombre,
        p_descripcion: producto.data.descripcion ?? null,
        p_categoria_id: producto.data.categoria_id,
        p_precio: producto.data.precio,
        p_imagen: nombreArchivo,
        p_publicado: esAdminGeneral && formData.get("publicado") === "on",
        p_vehiculos_ids: ids.data,
        p_nuevos: nuevos,
        p_inventarios: esAdminGeneral ? inventarios : [],
        p_stock: esAdminGeneral ? null : producto.data.stock,
    });

    if (error) {
        console.error("Error al crear producto:", error.message);

        // Eliminar imagen si no se pudo crear el producto
        await supabase.storage.from("productos").remove([nombreArchivo]);

        if (error.code === "23505") {
            redirect(`${RUTA}?error=sku_duplicado`);
        }

        if (error.message.toLowerCase().includes("permisos")) {
            redirect(`${RUTA}?error=permisos`);
        }

        if (error.message.toLowerCase().includes("sucursal")) {
            redirect(`${RUTA}?error=sucursales`);
        }

        redirect(`${RUTA}?error=guardar`);
    }

    revalidatePath("/");
    revalidatePath("/catalogo");
    revalidatePath("/sucursal");
    revalidatePath("/admin/productos");

    redirect(`${RUTA}?creado=${esAdminGeneral ? "1" : "pendiente"}`);
}
