"use client";

import { enviarRecuperacion } from "@/app/auth/acciones";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { esquemaRecuperacion, type DatosRecuperacion } from "@/lib/validaciones/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

export default function RecuperarContrasenaPage() {
    const [errorServidor, setErrorServidor] = useState<string | null>(null);
    const [mensajeServidor, setMensajeServidor] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<DatosRecuperacion>({
        resolver: zodResolver(esquemaRecuperacion),
    });

    async function alEnviar(datos: DatosRecuperacion) {
        setErrorServidor(null);
        setMensajeServidor(null);

        const resultado = await enviarRecuperacion(datos.correo);

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
                    <CardTitle>Recuperar contraseña</CardTitle>
                    <CardDescription>Escribe el correo con el que registraste tu cuenta.</CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit(alEnviar)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="correo">Correo electrónico</Label>
                            <Input id="correo" type="email" autoComplete="email" {...register("correo")} />
                            {errors.correo && <p className="text-sm text-red-600">{errors.correo.message}</p>}
                        </div>

                        {errorServidor && <p className="text-sm text-red-600">{errorServidor}</p>}

                        {mensajeServidor && <p className="text-sm text-green-700">{mensajeServidor}</p>}

                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? "Enviando..." : "Enviar enlace"}
                        </Button>

                        <p className="text-center text-sm">
                            <Link href="/login" className="underline">
                                Volver a iniciar sesión
                            </Link>
                        </p>
                    </form>
                </CardContent>
            </Card>
        </main>
    );
}
