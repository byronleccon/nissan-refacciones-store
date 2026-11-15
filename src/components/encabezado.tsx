import { cerrarSesion } from "@/app/auth/acciones";
import { Button } from "@/components/ui/button";
import { obtenerPerfilActual } from "@/lib/auth/perfil";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";

export async function Encabezado() {
    const perfil = await obtenerPerfilActual();

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

                    {perfil?.rol === "admin_general" && (
                        <Link href="/admin" className="hover:underline">
                            Administración
                        </Link>
                    )}

                    <Link href="/catalogo" aria-label="Carrito" className="hover:opacity-80">
                        <ShoppingCart className="size-5" />
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
