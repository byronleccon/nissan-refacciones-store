import Link from "next/link";

export default function Home() {
    return (
        <main className="mx-auto max-w-6xl p-6">
            <section className="rounded-lg bg-marca p-10 text-white">
                <h1 className="text-4xl font-bold">Refacciones Nissan</h1>
                <p className="mt-3 max-w-xl">
                    Aparta tus refacciones en línea y recógelas en la sucursal que prefieras. Pagas al recoger.
                </p>
                <Link
                    href="/catalogo"
                    className="mt-6 inline-block rounded-md bg-white px-5 py-2 font-medium text-marca"
                >
                    Ver catálogo
                </Link>
            </section>
        </main>
    );
}
