"use client";

import { registrarse } from "@/app/auth/acciones";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { esquemaRegistro, type DatosRegistro } from "@/lib/validaciones/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

export default function RegistroPage() {
    const [errorServidor, setErrorServidor] = useState<string | null>(null);
    const [mensajeServidor, setMensajeServidor] = useState<string | null>(null);

    const [mostrarContrasena, setMostrarContrasena] = useState(false);
    const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<DatosRegistro>({
        resolver: zodResolver(esquemaRegistro),
    });

    async function alEnviar(datos: DatosRegistro) {
        setErrorServidor(null);
        setMensajeServidor(null);

        const resultado = await registrarse(datos);

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
                    <CardTitle>Crear cuenta</CardTitle>
                    <CardDescription>Regístrate para apartar refacciones y recogerlas en sucursal.</CardDescription>
                </CardHeader>

                <CardContent>
                    {mensajeServidor ? (
                        <div className="space-y-4">
                            <p className="text-sm text-green-700">{mensajeServidor}</p>

                            <Button asChild className="w-full">
                                <Link href="/login">Ir a iniciar sesión</Link>
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit(alEnviar)} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="nombre_completo">Nombre completo</Label>
                                <Input id="nombre_completo" autoComplete="name" {...register("nombre_completo")} />
                                {errors.nombre_completo && (
                                    <p className="text-sm text-red-600">{errors.nombre_completo.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="telefono">Número de teléfono</Label>
                                <Input
                                    id="telefono"
                                    type="tel"
                                    autoComplete="tel"
                                    placeholder="Ej. 55 1234 5678"
                                    {...register("telefono")}
                                />
                                {errors.telefono && <p className="text-sm text-red-600">{errors.telefono.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="correo">Correo electrónico</Label>
                                <Input id="correo" type="email" autoComplete="email" {...register("correo")} />
                                {errors.correo && <p className="text-sm text-red-600">{errors.correo.message}</p>}
                            </div>

                            {/* Contraseña */}
                            <div className="space-y-2">
                                <Label htmlFor="contrasena">Contraseña</Label>

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
                                <Label htmlFor="confirmar_contrasena">Confirmar contraseña</Label>

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
                                {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
                            </Button>

                            <p className="text-center text-sm">
                                ¿Ya tienes cuenta?{" "}
                                <Link href="/login" className="underline">
                                    Inicia sesión
                                </Link>
                            </p>
                        </form>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}
