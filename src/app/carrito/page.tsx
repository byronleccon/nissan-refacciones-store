import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cambiarCantidad, quitarDelCarrito } from "./acciones";

const moneda = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

export default async function CarritoPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: items } = await supabase
        .from("carrito_items")
        .select("producto_id, cantidad, productos(sku, nombre, precio, publicado)")
        .eq("usuario_id", user.id)
        .order("actualizado_en", { ascending: false });

    const filas = (items ?? [])
        .map(i => {
            const p = Array.isArray(i.productos) ? i.productos[0] : i.productos;
            return p ? { ...i, p } : null;
        })
        .filter(x => x !== null);

    const total = filas.reduce((suma, f) => suma + Number(f.p.precio) * f.cantidad, 0);

    return (
        <main className="mx-auto max-w-3xl p-6">
            <h1 className="text-3xl font-bold">Tu carrito</h1>

            {filas.length === 0 ? (
                <p className="mt-6">
                    Tu carrito está vacío.{" "}
                    <Link href="/catalogo" className="underline">
                        Ver catálogo
                    </Link>
                </p>
            ) : (
                <>
                    <div className="mt-6 space-y-3">
                        {filas.map(f => (
                            <div key={f.producto_id} className="rounded-md border p-4">
                                <p className="font-semibold">{f.p.nombre}</p>
                                <p className="text-sm text-gray-600">SKU: {f.p.sku}</p>
                                <p className="text-sm">
                                    {moneda(Number(f.p.precio))} c/u · Subtotal:{" "}
                                    <b>{moneda(Number(f.p.precio) * f.cantidad)}</b>
                                </p>

                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <form action={cambiarCantidad} className="flex gap-2">
                                        <input type="hidden" name="producto_id" value={f.producto_id} />
                                        <input
                                            name="cantidad"
                                            type="number"
                                            min={0}
                                            max={99}
                                            defaultValue={f.cantidad}
                                            className="w-20 rounded-md border px-2 py-1 text-sm"
                                        />
                                        <Button type="submit" size="sm" variant="outline">
                                            Actualizar
                                        </Button>
                                    </form>
                                    <form action={quitarDelCarrito}>
                                        <input type="hidden" name="producto_id" value={f.producto_id} />
                                        <Button type="submit" size="sm" variant="ghost">
                                            Quitar
                                        </Button>
                                    </form>
                                </div>
                            </div>
                        ))}
                    </div>

                    <p className="mt-6 text-2xl font-bold">Total: {moneda(total)}</p>
                    <p className="mt-1 text-sm text-gray-600">
                        Pagas al recoger en la sucursal. El stock se reserva al confirmar el pedido.
                    </p>
                </>
            )}
        </main>
    );
}
