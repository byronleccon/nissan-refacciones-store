import { cerrarSesion } from "@/app/auth/acciones";
import { Button } from "@/components/ui/button";
import { obtenerPerfilActual } from "@/lib/auth/perfil";
import { createClient } from "@/lib/supabase/server";
import {
    ClipboardList,
    LayoutDashboard,
    LogIn,
    LogOut,
    ShoppingCart,
    Store,
    UserPlus,
    Users,
    Wrench,
} from "lucide-react";
import Link from "next/link";

const estiloEnlace =
    "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/90 transition-all duration-200 hover:bg-white/15 hover:text-white";

const estiloBoton =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200";

export async function Encabezado() {
    const perfil = await obtenerPerfilActual();

    let cantidadCarrito = 0;

    if (perfil) {
        const supabase = await createClient();

        const { data } = await supabase.from("carrito_items").select("cantidad").eq("usuario_id", perfil.id);

        cantidadCarrito = data?.reduce((s, i) => s + i.cantidad, 0) ?? 0;
    }

    return (
        <header className="sticky top-0 z-50 border-b border-white/10 bg-marca text-white shadow-lg">
            <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                {/* LOGO Y MARCA */}
                <Link href="/" className="group flex items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-marca shadow-md transition-transform duration-200 group-hover:scale-105">
                        <Wrench className="size-6" />
                    </div>

                    <div>
                        <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
                            Tsuru <span className="text-white/75">ProParts</span>
                        </h1>
                        <p className="text-xs font-medium tracking-wider text-white/65">
                            REFACCIONES PARA NISSAN TSURU
                        </p>
                    </div>
                </Link>

                {/* NAVEGACIÓN */}
                <nav className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <Link href="/catalogo" className={estiloEnlace}>
                        <Store className="size-4" />
                        Catálogo
                    </Link>

                    {perfil?.rol === "cliente" && (
                        <Link href="/mis-pedidos" className={estiloEnlace}>
                            <ClipboardList className="size-4" />
                            Mis pedidos
                        </Link>
                    )}

                    {perfil?.rol === "empleado" && (
                        <Link href="/empleado" className={estiloEnlace}>
                            <LayoutDashboard className="size-4" />
                            Panel de empleado
                        </Link>
                    )}

                    {perfil?.rol === "admin_general" && (
                        <Link href="/admin" className={estiloEnlace}>
                            <LayoutDashboard className="size-4" />
                            Administración
                        </Link>
                    )}

                    {perfil?.rol === "admin_sucursal" && (
                        <Link href="/admin/empleados" className={estiloEnlace}>
                            <Users className="size-4" />
                            Gestionar empleados
                        </Link>
                    )}

                    {(perfil?.rol === "admin_sucursal" || perfil?.rol === "admin_general") && (
                        <Link href="/sucursal" className={estiloEnlace}>
                            <Store className="size-4" />
                            Sucursal
                        </Link>
                    )}

                    {/* CARRITO */}
                    <Link
                        href="/carrito"
                        aria-label={`Carrito, ${cantidadCarrito} productos`}
                        className={`${estiloEnlace} relative border border-white/20 bg-white/10 hover:bg-white/20`}
                    >
                        <ShoppingCart className="size-5" />

                        <span>Carrito</span>

                        {cantidadCarrito > 0 && (
                            <span className="flex min-w-5 items-center justify-center rounded-full bg-white px-1.5 py-0.5 text-xs font-bold text-marca">
                                {cantidadCarrito}
                            </span>
                        )}
                    </Link>

                    {/* USUARIO AUTENTICADO */}
                    {perfil ? (
                        <form action={cerrarSesion}>
                            <Button
                                type="submit"
                                size="sm"
                                className={`${estiloBoton} border border-white/25 bg-white text-marca shadow-sm hover:bg-white/85`}
                            >
                                <LogOut className="size-4" />
                                Cerrar sesión
                            </Button>
                        </form>
                    ) : (
                        <>
                            <Link
                                href="/login"
                                className={`${estiloBoton} border border-white/30 text-white hover:bg-white/15`}
                            >
                                <LogIn className="size-4" />
                                Iniciar sesión
                            </Link>

                            <Link
                                href="/registro"
                                className={`${estiloBoton} bg-white text-marca shadow-md hover:bg-white/85`}
                            >
                                <UserPlus className="size-4" />
                                Crear cuenta
                            </Link>
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
}
