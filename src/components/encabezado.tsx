import { cerrarSesion } from "@/app/auth/acciones";
import { Button } from "@/components/ui/button";
import { obtenerPerfilActual } from "@/lib/auth/perfil";
import { createClient } from "@/lib/supabase/server";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";

export async function Encabezado() {
    const perfil = await obtenerPerfilActual();

    let cantidadCarrito = 0;

    if (perfil) {
        const supabase = await createClient();

        const { data } = await supabase.from("carrito_items").select("cantidad").eq("usuario_id", perfil.id);

        cantidadCarrito = data?.reduce((s, i) => s + i.cantidad, 0) ?? 0;
    }

    return (
        <header className="bg-marca text-white">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 p-4">
                <Link href="/" className="text-xl font-bold">
                    Refacciones Nissan
                </Link>

                <nav className="flex items-center gap-3 text-sm">
                    <Link href="/catalogo" className="hover:underline">
                        Catálogo
                    </Link>

                    {perfil?.rol === "cliente" && (
                        <Link href="/mis-pedidos" className="hover:underline">
                            Mis pedidos
                        </Link>
                    )}

                    {perfil?.rol === "empleado" && (
                        <Link href="/empleado" className="hover:underline">
                            Panel de empleado
                        </Link>
                    )}

                    {perfil?.rol === "admin_general" && (
                        <Link href="/admin" className="hover:underline">
                            Administración
                        </Link>
                    )}

                    {perfil?.rol === "admin_sucursal" && (
                        <Link href="/admin/empleados" className="hover:underline">
                            Gestionar empleados
                        </Link>
                    )}

                    {(perfil?.rol === "admin_sucursal" || perfil?.rol === "admin_general") && (
                        <Link href="/sucursal" className="hover:underline">
                            Sucursal
                        </Link>
                    )}

                    <Link href="/carrito" aria-label="Carrito" className="relative hover:opacity-80">
                        <ShoppingCart className="size-5" />

                        {cantidadCarrito > 0 && (
                            <span className="absolute -right-2 -top-2 rounded-full bg-white px-1.5 text-xs font-bold text-marca">
                                {cantidadCarrito}
                            </span>
                        )}
                    </Link>

                    {perfil ? (
                        <form action={cerrarSesion}>
                            <Button type="submit" size="sm" variant="secondary">
                                Cerrar sesión
                            </Button>
                        </form>
                    ) : (
                        <>
                            <Link href="/login" className="hover:underline">
                                Iniciar sesión
                            </Link>

                            <Link href="/registro" className="rounded-md bg-white px-3 py-1 text-marca">
                                Crear cuenta
                            </Link>
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
}
