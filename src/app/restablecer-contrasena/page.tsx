"use client";

import { actualizarContrasena } from "@/app/auth/acciones";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { esquemaNuevaContrasena, type DatosNuevaContrasena } from "@/lib/validaciones/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

export default function RestablecerContrasenaPage() {
    const [errorServidor, setErrorServidor] = useState<string | null>(null);
    const [mensajeServidor, setMensajeServidor] = useState<string | null>(null);

    const [mostrarContrasena, setMostrarContrasena] = useState(false);
    const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

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
                            {/* Nueva contraseña */}
                            <div className="space-y-2">
                                <Label htmlFor="contrasena">Nueva contraseña</Label>

                                <div className="relative">
                                    <Input
                                        id="contrasena"
                                        type={mostrarContrasena ? "text" : "password"}
                                        autoComplete="new-password"
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

                                {errors.contrasena && (
                                    <p className="text-sm text-red-600">{errors.contrasena.message}</p>
                                )}
                            </div>

                            {/* Confirmar contraseña */}
                            <div className="space-y-2">
                                <Label htmlFor="confirmar_contrasena">Confirmar nueva contraseña</Label>

                                <div className="relative">
                                    <Input
                                        id="confirmar_contrasena"
                                        type={mostrarConfirmacion ? "text" : "password"}
                                        autoComplete="new-password"
                                        className="pr-12"
                                        {...register("confirmar_contrasena")}
                                    />

                                    <button
                                        type="button"
                                        onClick={() => setMostrarConfirmacion(!mostrarConfirmacion)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        aria-label={mostrarConfirmacion ? "Ocultar contraseña" : "Mostrar contraseña"}
                                    >
                                        {mostrarConfirmacion ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>

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
