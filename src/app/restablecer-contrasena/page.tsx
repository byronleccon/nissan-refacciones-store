"use client";

import { actualizarContrasena } from "@/app/auth/acciones";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { esquemaNuevaContrasena, type DatosNuevaContrasena } from "@/lib/validaciones/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

export default function RestablecerContrasenaPage() {
    const [errorServidor, setErrorServidor] = useState<string | null>(null);
    const [mensajeServidor, setMensajeServidor] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<DatosNuevaContrasena>({
        resolver: zodResolver(esquemaNuevaContrasena),
    });

    async function alEnviar(datos: DatosNuevaContrasena) {
        setErrorServidor(null);
        setMensajeServidor(null);

        const resultado = await actualizarContrasena(datos);

        if (resultado && "error" in resultado) {
            setErrorServidor(resultado.error);
        }

        if (resultado && "mensaje" in resultado) {
            setMensajeServidor(resultado.mensaje);
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle>Nueva contraseña</CardTitle>
                    <CardDescription>Escribe y confirma tu nueva contraseña.</CardDescription>
                </CardHeader>

                <CardContent>
                    {mensajeServidor ? (
                        <div className="space-y-4">
                            <p className="text-sm text-green-700">{mensajeServidor}</p>
                            <Button asChild className="w-full">
                                <Link href="/login">Iniciar sesión</Link>
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit(alEnviar)} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="contrasena">Nueva contraseña</Label>
                                <Input
                                    id="contrasena"
                                    type="password"
                                    autoComplete="new-password"
                                    {...register("contrasena")}
                                />
                                {errors.contrasena && (
                                    <p className="text-sm text-red-600">{errors.contrasena.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmar_contrasena">Confirmar nueva contraseña</Label>
                                <Input
                                    id="confirmar_contrasena"
                                    type="password"
                                    autoComplete="new-password"
                                    {...register("confirmar_contrasena")}
                                />
                                {errors.confirmar_contrasena && (
                                    <p className="text-sm text-red-600">{errors.confirmar_contrasena.message}</p>
                                )}
                            </div>

                            {errorServidor && <p className="text-sm text-red-600">{errorServidor}</p>}

                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? "Actualizando..." : "Guardar contraseña"}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}
