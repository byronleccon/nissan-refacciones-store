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

        const resultado = await iniciarSesion(datos);

        if (resultado && "error" in resultado) {
            setErrorServidor(resultado.error);
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle>Iniciar sesión</CardTitle>
                    <CardDescription>Entra para hacer y consultar tus pedidos.</CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit(alEnviar)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="correo">Correo electrónico</Label>
                            <Input id="correo" type="email" autoComplete="email" {...register("correo")} />
                            {errors.correo && <p className="text-sm text-red-600">{errors.correo.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="contrasena">Contraseña</Label>

                            <div className="relative">
                                <Input
                                    id="contrasena"
                                    type={mostrarContrasena ? "text" : "password"}
                                    autoComplete="current-password"
                                    className="pr-12"
                                    {...register("contrasena")}
                                />

                                <button
                                    type="button"
                                    onClick={() => setMostrarContrasena(!mostrarContrasena)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    aria-label={mostrarContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}
                                >
                                    {mostrarContrasena ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>

                            {errors.contrasena && <p className="text-sm text-red-600">{errors.contrasena.message}</p>}
                        </div>

                        {errorServidor && <p className="text-sm text-red-600">{errorServidor}</p>}

                        <p className="text-right text-sm">
                            <Link href="/recuperar-contrasena" className="underline">
                                ¿Has olvidado tu contraseña?
                            </Link>
                        </p>

                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? "Entrando..." : "Entrar"}
                        </Button>

                        <p className="text-center text-sm">
                            ¿No tienes cuenta?{" "}
                            <Link href="/registro" className="underline">
                                Regístrate
                            </Link>
                        </p>
                    </form>
                </CardContent>
            </Card>
        </main>
    );
}
