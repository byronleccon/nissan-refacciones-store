"use client";

import { iniciarSesion } from "@/app/auth/acciones";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { esquemaLogin, type DatosLogin } from "@/lib/validaciones/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

export default function LoginPage() {
    const [errorServidor, setErrorServidor] = useState<string | null>(null);
    const [mostrarContrasena, setMostrarContrasena] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<DatosLogin>({
        resolver: zodResolver(esquemaLogin),
    });

    async function alEnviar(datos: DatosLogin) {
        setErrorServidor(null);

        try {
            const resultado = await iniciarSesion(datos);

            if (resultado && "error" in resultado) {
                setErrorServidor(resultado.error);
            }
        } catch (error) {
            console.error("Error al iniciar sesión:", error);

            setErrorServidor("No se pudo completar el inicio de sesión. Inténtalo de nuevo.");
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#111318] p-4 text-[#f5f5f5]">
            <Card className="w-full max-w-sm border-[#343a40] bg-[#20232a] text-[#f5f5f5] shadow-xl">
                <CardHeader>
                    <CardTitle className="text-white">Iniciar sesión</CardTitle>

                    <CardDescription className="text-[#aeb4be]">
                        Entra para hacer y consultar tus pedidos.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit(alEnviar)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="correo">Correo electrónico</Label>

                            <Input
                                id="correo"
                                type="email"
                                autoComplete="email"
                                className="border-[#343a40] bg-[#292d34] text-white"
                                {...register("correo")}
                            />

                            {errors.correo && <p className="text-sm text-red-400">{errors.correo.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="contrasena">Contraseña</Label>

                            <div className="relative">
                                <Input
                                    id="contrasena"
                                    type={mostrarContrasena ? "text" : "password"}
                                    autoComplete="current-password"
                                    className="border-[#343a40] bg-[#292d34] pr-12 text-white"
                                    {...register("contrasena")}
                                />

                                <button
                                    type="button"
                                    onClick={() => setMostrarContrasena(!mostrarContrasena)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aeb4be] hover:text-white"
                                    aria-label={mostrarContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}
                                >
                                    {mostrarContrasena ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>

                            {errors.contrasena && <p className="text-sm text-red-400">{errors.contrasena.message}</p>}
                        </div>

                        {errorServidor && (
                            <div
                                role="alert"
                                className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300"
                            >
                                {errorServidor}
                            </div>
                        )}

                        <p className="text-right text-sm">
                            <Link href="/recuperar-contrasena" className="text-[#aeb4be] underline hover:text-white">
                                ¿Has olvidado tu contraseña?
                            </Link>
                        </p>

                        <Button
                            type="submit"
                            className="w-full bg-red-600 text-white hover:bg-red-700"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Entrando..." : "Entrar"}
                        </Button>

                        <p className="text-center text-sm text-[#aeb4be]">
                            ¿No tienes cuenta?{" "}
                            <Link href="/registro" className="underline hover:text-white">
                                Regístrate
                            </Link>
                        </p>
                    </form>
                </CardContent>
            </Card>
        </main>
    );
}
