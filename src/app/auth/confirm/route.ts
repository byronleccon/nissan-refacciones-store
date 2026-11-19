import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);

    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");
    const next = searchParams.get("next") ?? "/";

    const rutaDestino = next.startsWith("/") && !next.startsWith("//") ? next : "/";

    if (!tokenHash || type !== "recovery") {
        return NextResponse.redirect(new URL("/login?error=confirmacion", origin));
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "recovery",
    });

    if (error) {
        console.error("Error al verificar recuperación:", error.code, error.message);

        return NextResponse.redirect(new URL("/login?error=enlace_invalido", origin));
    }

    return NextResponse.redirect(new URL(rutaDestino, origin));
}
