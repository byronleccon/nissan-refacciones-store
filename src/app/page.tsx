import { cerrarSesion } from "@/app/auth/acciones";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";

export default async function Home() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-red-700 p-4">
            <h1 className="text-4xl font-bold text-white">Tienda de Refacciones Nissan</h1>

            <Button variant="secondary" asChild>
                <Link href="/catalogo">
                    <ShoppingCart />
                    Ver catálogo
                </Link>
            </Button>

            {user ? (
                <div className="flex flex-col items-center gap-3 text-white">
                    <p>Sesión iniciada como {user.email}</p>
                    <form action={cerrarSesion}>
                        <Button type="submit" variant="secondary">
                            Cerrar sesión
                        </Button>
                    </form>
                </div>
            ) : (
                <div className="flex gap-3">
                    <Button variant="secondary" asChild>
                        <Link href="/login">Iniciar sesión</Link>
                    </Button>
                    <Button variant="secondary" asChild>
                        <Link href="/registro">Crear cuenta</Link>
                    </Button>
                </div>
            )}
        </main>
    );
}
