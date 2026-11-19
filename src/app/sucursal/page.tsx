import { Button } from "@/components/ui/button";
import { exigirRol } from "@/lib/auth/exigir-rol";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { FormulariosInventario } from "./formularios-inventario";
type Props = {
    searchParams: Promise<{ sucursal?: string; q?: string }>;
};

export default async function SucursalPage({ searchParams }: Props) {
    const perfil = await exigirRol(["admin_sucursal", "admin_general"]);
    const { sucursal: sucursalParam, q } = await searchParams;
    const supabase = await createClient();
    const esAdminGeneral = perfil.rol === "admin_general";

    // El admin general ve todas las sucursales; el de sucursal solo la suya
    const { data: sucursales } = await supabase.from("sucursales").select("id, nombre, activa").order("nombre");

    let sucursalId: string | null = null;
    if (esAdminGeneral) {
        const elegida = sucursales?.find(s => s.id === sucursalParam);
        sucursalId = elegida?.id ?? sucursales?.[0]?.id ?? null;
    } else {
        sucursalId = perfil.sucursal_id;
    }

    if (!sucursalId) {
        return (
            <main className="p-6">
                {esAdminGeneral ? "No hay sucursales registradas." : "Tu cuenta no tiene una sucursal asignada."}
            </main>
        );
    }

    const sucursal = sucursales?.find(s => s.id === sucursalId);

    const { data: inventario } = await supabase
        .from("inventario_sucursal")
        .select("producto_id, stock_fisico, stock_reservado, productos(sku, nombre)")
        .eq("sucursal_id", sucursalId);

    const filas = (inventario ?? [])
        .map(i => {
            const prod = Array.isArray(i.productos) ? i.productos[0] : i.productos;
            return { ...i, prod };
        })
        .filter(f => {
            if (!q) return true;
            const t = q.toLowerCase();
            return f.prod?.nombre.toLowerCase().includes(t) || f.prod?.sku.toLowerCase().includes(t);
        })
        .sort((a, b) => (a.prod?.nombre ?? "").localeCompare(b.prod?.nombre ?? "", "es"));

    const campo = "rounded-md border bg-white px-3 py-2 text-sm";

    return (
        <main className="mx-auto max-w-5xl p-6">
            <h1 className="text-3xl font-bold">Panel de sucursal</h1>
            <p className="mt-1 text-gray-600">{sucursal?.nombre}</p>
            <Link
                href="/admin/productos/nuevo"
                className="mt-3 inline-block rounded-md bg-marca px-4 py-2 text-sm font-semibold text-white hover:bg-marca-oscuro"
            >
                + Agregar producto
            </Link>
            {/* Selector de sucursal (solo admin general) y buscador */}
            <form action="/sucursal" className="mt-5 flex flex-wrap items-end gap-3 rounded-lg border p-4">
                {esAdminGeneral && (
                    <div>
                        <label htmlFor="sucursal" className="mb-1 block text-sm font-medium">
                            Sucursal
                        </label>
                        <select id="sucursal" name="sucursal" defaultValue={sucursalId} className={campo}>
                            {sucursales?.map(s => (
                                <option key={s.id} value={s.id}>
                                    {s.nombre}
                                    {s.activa ? "" : " (inactiva)"}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div>
                    <label htmlFor="q" className="mb-1 block text-sm font-medium">
                        Buscar producto
                    </label>
                    <input id="q" name="q" defaultValue={q} placeholder="Nombre o SKU" className={`${campo} w-56`} />
                </div>

                <Button type="submit">{esAdminGeneral ? "Ver inventario" : "Buscar"}</Button>
            </form>

            <p className="mt-4 text-sm text-gray-600">Productos mostrados: {filas.length}</p>

            <div className="mt-3 space-y-4">
                {filas.map(f => {
                    const disponible = f.stock_fisico - f.stock_reservado;
                    return (
                        <div key={f.producto_id} className="rounded-md border p-4">
                            <p className="font-semibold">{f.prod?.nombre}</p>
                            <p className="text-sm text-gray-600">SKU: {f.prod?.sku}</p>
                            <p className="mt-1 text-sm">
                                Físico: <b>{f.stock_fisico}</b> · Reservado: <b>{f.stock_reservado}</b> · Disponible:{" "}
                                <b>{disponible}</b>
                            </p>
                            <div className="mt-3">
                                <FormulariosInventario
                                    sucursalId={sucursalId}
                                    productoId={f.producto_id}
                                    stockFisico={f.stock_fisico}
                                />
                            </div>
                        </div>
                    );
                })}
                {filas.length === 0 && <p>No hay productos que mostrar en esta sucursal.</p>}
            </div>
        </main>
    );
}
