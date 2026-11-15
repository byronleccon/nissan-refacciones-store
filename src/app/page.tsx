import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-red-700">
            <h1 className="text-4xl font-bold text-white">Tienda de Refacciones Nissan</h1>
            <Button variant="secondary" asChild>
                <Link href="/catalogo">
                    <ShoppingCart />
                    Ver catálogo
                </Link>
            </Button>
        </main>
    );
}
