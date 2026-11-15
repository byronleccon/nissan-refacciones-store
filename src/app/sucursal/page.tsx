import { exigirRol } from "@/lib/auth/exigir-rol";
import { createClient } from "@/lib/supabase/server";
import { FormulariosInventario } from "./formularios-inventario";

export default async function SucursalPage() {
    const perfil = await exigirRol(["admin_sucursal", "admin_general"]);
    const supabase = await createClient();

    // El admin general elige sucursal con ?sucursal=...; por ahora usamos la primera
    let sucursalId = perfil.sucursal_id;
    if (!sucursalId) {
        const { data: primera } = await supabase.from("sucursales").select("id").order("nombre").limit(1).maybeSingle();
        sucursalId = primera?.id ?? null;
    }

    if (!sucursalId) {
        return <main className="p-6">No hay sucursales registradas.</main>;
    }

    const { data: sucursal } = await supabase.from("sucursales").select("nombre").eq("id", sucursalId).single();

    const { data: inventario } = await supabase
        .from("inventario_sucursal")
        .select("producto_id, stock_fisico, stock_reservado, productos(sku, nombre)")
        .eq("sucursal_id", sucursalId)
        .order("producto_id");

    return (
        <main className="mx-auto max-w-5xl p-6">
            <h1 className="text-3xl font-bold">Panel de sucursal</h1>
            <p className="mt-1 text-gray-600">{sucursal?.nombre}</p>

            <div className="mt-6 space-y-4">
                {inventario?.map(i => {
                    const prod = Array.isArray(i.productos) ? i.productos[0] : i.productos;
                    const disponible = i.stock_fisico - i.stock_reservado;
                    return (
                        <div key={i.producto_id} className="rounded-md border p-4">
                            <p className="font-semibold">{prod?.nombre}</p>
                            <p className="text-sm text-gray-600">SKU: {prod?.sku}</p>
                            <p className="mt-1 text-sm">
                                Físico: <b>{i.stock_fisico}</b> · Reservado: <b>{i.stock_reservado}</b> · Disponible:{" "}
                                <b>{disponible}</b>
                            </p>
                            <div className="mt-3">
                                <FormulariosInventario
                                    sucursalId={sucursalId}
                                    productoId={i.producto_id}
                                    stockFisico={i.stock_fisico}
                                />
                            </div>
                        </div>
                    );
                })}
                {inventario?.length === 0 && <p>Esta sucursal no tiene inventario.</p>}
            </div>
        </main>
    );
}
