"use client";

import { registrarse } from "@/app/auth/acciones";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { esquemaRegistro, type DatosRegistro } from "@/lib/validaciones/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

export default function RegistroPage() {
    const [errorServidor, setErrorServidor] = useState<string | null>(null);
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<DatosRegistro>({ resolver: zodResolver(esquemaRegistro) });

    async function alEnviar(datos: DatosRegistro) {
        setErrorServidor(null);
        const resultado = await registrarse(datos);
        if (resultado?.error) setErrorServidor(resultado.error);
    }

    return (
        <main className="flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle>Crear cuenta</CardTitle>
                    <CardDescription>Regístrate para apartar refacciones y recogerlas en sucursal.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(alEnviar)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="nombre_completo">Nombre completo</Label>
                            <Input id="nombre_completo" autoComplete="name" {...register("nombre_completo")} />
                            {errors.nombre_completo && (
                                <p className="text-sm text-red-600">{errors.nombre_completo.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="correo">Correo electrónico</Label>
                            <Input id="correo" type="email" autoComplete="email" {...register("correo")} />
                            {errors.correo && <p className="text-sm text-red-600">{errors.correo.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="contrasena">Contraseña</Label>
                            <Input
                                id="contrasena"
                                type="password"
                                autoComplete="new-password"
                                {...register("contrasena")}
                            />
                            {errors.contrasena && <p className="text-sm text-red-600">{errors.contrasena.message}</p>}
                        </div>

                        {errorServidor && <p className="text-sm text-red-600">{errorServidor}</p>}

                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
                        </Button>

                        <p className="text-center text-sm">
                            ¿Ya tienes cuenta?{" "}
                            <Link href="/login" className="underline">
                                Inicia sesión
                            </Link>
                        </p>
                    </form>
                </CardContent>
            </Card>
        </main>
    );
}
