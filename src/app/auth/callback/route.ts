import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);

    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/";

    // Evitar redirecciones externas.
    const rutaDestino = next.startsWith("/") && !next.startsWith("//") ? next : "/";

    // Crear una respuesta que conservará las cookies de Supabase.
    const response = NextResponse.redirect(new URL("/login?error=confirmacion", origin));

    if (!code) {
        return response;
    }

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => {
                        request.cookies.set(name, value);
                    });

                    cookiesToSet.forEach(({ name, value, options }) => {
                        response.cookies.set(name, value, options);
                    });
                },
            },
        },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
        console.error("Error al intercambiar código de autenticación:", error.code, error.message);

        return response;
    }

    // Conservar las cookies y cambiar únicamente el destino.
    response.headers.set("Location", new URL(rutaDestino, origin).toString());

    return response;
}
