import { createClient } from "@/lib/supabase/server";

export default async function PruebaSupabasePage() {
    const supabase = await createClient();
    const { error } = await supabase.auth.getSession();

    return (
        <main className="flex min-h-screen items-center justify-center">
            <p className="text-xl">
                {error ? `Error de conexión: ${error.message}` : "✅ Conexión con Supabase correcta"}
            </p>
        </main>
    );
}
