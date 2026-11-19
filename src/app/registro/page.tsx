"use client";

import { registrarse } from "@/app/auth/acciones";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { esquemaRegistro, type DatosRegistro } from "@/lib/validaciones/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    ArrowRight,
    CarFront,
    CheckCircle2,
    Eye,
    EyeOff,
    LockKeyhole,
    Mail,
    Phone,
    ShieldCheck,
    User,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

const dominiosSugeridos: Record<string, string> = {
    "gmail.co": "gmail.com",
    "gmail.con": "gmail.com",
    "gmai.com": "gmail.com",
    "gmial.com": "gmail.com",
    "gmal.com": "gmail.com",
    "hotmial.com": "hotmail.com",
    "hotmai.com": "hotmail.com",
    "hotmil.com": "hotmail.com",
    "outlok.com": "outlook.com",
    "outloo.com": "outlook.com",
    "outllok.com": "outlook.com",
    "yahoo.con": "yahoo.com",
    "yaho.com": "yahoo.com",
    "yahoo.es.com": "yahoo.es",
    "icloud.co": "icloud.com",
};

export default function RegistroPage() {
    const [errorServidor, setErrorServidor] = useState<string | null>(null);
    const [mensajeServidor, setMensajeServidor] = useState<string | null>(null);
    const [mostrarContrasena, setMostrarContrasena] = useState(false);
    const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
    const [conservarCorreo, setConservarCorreo] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        control,
        formState: { errors, isSubmitting },
    } = useForm<DatosRegistro>({
        resolver: zodResolver(esquemaRegistro),
        mode: "onBlur",
        reValidateMode: "onChange",
        shouldFocusError: true,
    });

    const correoActual = useWatch({
        control,
        name: "correo",
    });

    const correoNormalizado = (correoActual || "").trim().toLowerCase();
    const partesCorreo = correoNormalizado.split("@");
    const dominio = partesCorreo.length === 2 ? partesCorreo[1] : "";
    const dominioCorrecto = dominiosSugeridos[dominio];

    const correoSugerido = partesCorreo.length === 2 && dominioCorrecto ? `${partesCorreo[0]}@${dominioCorrecto}` : "";

    useEffect(() => {
        setConservarCorreo(false);
    }, [correoActual]);

    function aceptarSugerencia() {
        if (!correoSugerido) return;

        setValue("correo", correoSugerido, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
        });

        setConservarCorreo(false);
        setErrorServidor(null);
    }

    async function alEnviar(datos: DatosRegistro) {
        setErrorServidor(null);
        setMensajeServidor(null);

        try {
            const resultado = await registrarse(datos);

            if (resultado && "error" in resultado) {
                setErrorServidor(resultado.error);
                return;
            }

            if (resultado && "mensaje" in resultado) {
                setMensajeServidor(resultado.mensaje);
            }
        } catch {
            setErrorServidor("Ocurrió un problema al crear tu cuenta. Inténtalo nuevamente.");
        }
    }

    return (
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
            {/* Decoración de fondo */}
            <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-red-600/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-red-600/10 blur-3xl" />

            <div className="relative z-10 w-full max-w-lg">
                {/* Marca */}
                <div className="mb-6 flex items-center justify-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-600 shadow-lg shadow-red-600/20">
                        <CarFront className="h-7 w-7 text-white" />
                    </div>

                    <div>
                        <p className="text-xl font-black tracking-wider text-white">
                            TSURU <span className="text-red-500">PROPARTS</span>
                        </p>
                        <p className="text-[10px] font-medium tracking-[0.25em] text-slate-400">
                            REFACCIONES AUTOMOTRICES
                        </p>
                    </div>
                </div>

                <Card className="overflow-hidden border border-slate-800 bg-slate-900/95 text-white shadow-2xl shadow-black/30">
                    <div className="h-1.5 bg-gradient-to-r from-red-800 via-red-500 to-red-800" />

                    <CardHeader className="space-y-2 px-6 pb-4 pt-7 sm:px-8">
                        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10">
                            <User className="h-6 w-6 text-red-500" />
                        </div>

                        <CardTitle className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                            Crear cuenta
                        </CardTitle>

                        <CardDescription className="text-sm leading-relaxed text-slate-400">
                            Regístrate en Tsuru ProParts para apartar tus refacciones y recogerlas en tu sucursal.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="px-6 pb-7 sm:px-8">
                        {mensajeServidor ? (
                            <div className="space-y-5 py-4 text-center">
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                                    <CheckCircle2 className="h-9 w-9 text-green-500" />
                                </div>

                                <div className="space-y-2">
                                    <h2 className="text-xl font-bold text-white">¡Registro exitoso!</h2>
                                    <p className="text-sm leading-relaxed text-slate-300">{mensajeServidor}</p>
                                </div>

                                <Button asChild className="h-11 w-full bg-red-600 font-semibold hover:bg-red-700">
                                    <Link href="/login">
                                        Ir a iniciar sesión
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit(alEnviar)} className="space-y-5" noValidate>
                                {/* Nombre */}
                                <div className="space-y-2">
                                    <Label htmlFor="nombre_completo" className="text-slate-200">
                                        Nombre completo
                                    </Label>

                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

                                        <Input
                                            id="nombre_completo"
                                            autoComplete="name"
                                            placeholder="Escribe tu nombre completo"
                                            aria-invalid={!!errors.nombre_completo}
                                            aria-describedby={errors.nombre_completo ? "error-nombre" : undefined}
                                            className="h-11 border-slate-700 bg-slate-800 pl-10 text-white placeholder:text-slate-500 focus-visible:ring-red-500"
                                            {...register("nombre_completo")}
                                        />
                                    </div>

                                    {errors.nombre_completo && (
                                        <p id="error-nombre" role="alert" className="text-xs text-red-400">
                                            {errors.nombre_completo.message}
                                        </p>
                                    )}
                                </div>

                                {/* Teléfono */}
                                <div className="space-y-2">
                                    <Label htmlFor="telefono" className="text-slate-200">
                                        Número de teléfono
                                    </Label>

                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

                                        <Input
                                            id="telefono"
                                            type="tel"
                                            inputMode="tel"
                                            autoComplete="tel"
                                            placeholder="Ej. 55 1234 5678"
                                            aria-invalid={!!errors.telefono}
                                            aria-describedby={errors.telefono ? "error-telefono" : undefined}
                                            className="h-11 border-slate-700 bg-slate-800 pl-10 text-white placeholder:text-slate-500 focus-visible:ring-red-500"
                                            {...register("telefono")}
                                        />
                                    </div>

                                    {errors.telefono && (
                                        <p id="error-telefono" role="alert" className="text-xs text-red-400">
                                            {errors.telefono.message}
                                        </p>
                                    )}
                                </div>

                                {/* Correo */}
                                <div className="space-y-2">
                                    <Label htmlFor="correo" className="text-slate-200">
                                        Correo electrónico
                                    </Label>

                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

                                        <Input
                                            id="correo"
                                            type="text"
                                            inputMode="email"
                                            autoComplete="email"
                                            autoCapitalize="none"
                                            spellCheck={false}
                                            placeholder="correo@ejemplo.com"
                                            aria-invalid={!!errors.correo}
                                            aria-describedby={
                                                errors.correo
                                                    ? "error-correo"
                                                    : correoSugerido && !conservarCorreo
                                                      ? "sugerencia-correo"
                                                      : undefined
                                            }
                                            className="h-11 border-slate-700 bg-slate-800 pl-10 text-white placeholder:text-slate-500 focus-visible:ring-red-500"
                                            {...register("correo")}
                                        />
                                    </div>

                                    {errors.correo && (
                                        <p id="error-correo" role="alert" className="text-xs text-red-400">
                                            {errors.correo.message}
                                        </p>
                                    )}

                                    {correoSugerido && !conservarCorreo && (
                                        <div
                                            id="sugerencia-correo"
                                            className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3"
                                        >
                                            <p className="text-sm text-amber-200">¿Quisiste decir esta dirección?</p>

                                            <p className="break-all text-sm font-semibold text-white">
                                                {correoSugerido}
                                            </p>

                                            <div className="flex flex-wrap gap-2">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={aceptarSugerencia}
                                                    className="bg-red-600 text-white hover:bg-red-700"
                                                >
                                                    Corregir correo
                                                </Button>

                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setConservarCorreo(true)}
                                                    className="border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
                                                >
                                                    Mantener mi correo
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Contraseña */}
                                <div className="space-y-2">
                                    <Label htmlFor="contrasena" className="text-slate-200">
                                        Contraseña
                                    </Label>

                                    <div className="relative">
                                        <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

                                        <Input
                                            id="contrasena"
                                            type={mostrarContrasena ? "text" : "password"}
                                            autoComplete="new-password"
                                            placeholder="Escribe tu contraseña"
                                            aria-invalid={!!errors.contrasena}
                                            aria-describedby={
                                                errors.contrasena ? "error-contrasena" : "ayuda-contrasena"
                                            }
                                            className="h-11 border-slate-700 bg-slate-800 pl-10 pr-12 text-white placeholder:text-slate-500 focus-visible:ring-red-500"
                                            {...register("contrasena")}
                                        />

                                        <button
                                            type="button"
                                            onClick={() => setMostrarContrasena(!mostrarContrasena)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-white"
                                            aria-label={mostrarContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}
                                        >
                                            {mostrarContrasena ? (
                                                <EyeOff className="h-5 w-5" />
                                            ) : (
                                                <Eye className="h-5 w-5" />
                                            )}
                                        </button>
                                    </div>

                                    <p id="ayuda-contrasena" className="text-xs leading-relaxed text-slate-500">
                                        Usa al menos 10 caracteres. Evita contraseñas comunes y no reutilices una
                                        contraseña que uses en otro sitio.
                                    </p>

                                    {errors.contrasena && (
                                        <p id="error-contrasena" role="alert" className="text-xs text-red-400">
                                            {errors.contrasena.message}
                                        </p>
                                    )}
                                </div>

                                {/* Confirmar contraseña */}
                                <div className="space-y-2">
                                    <Label htmlFor="confirmar_contrasena" className="text-slate-200">
                                        Confirmar contraseña
                                    </Label>

                                    <div className="relative">
                                        <ShieldCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

                                        <Input
                                            id="confirmar_contrasena"
                                            type={mostrarConfirmacion ? "text" : "password"}
                                            autoComplete="new-password"
                                            placeholder="Repite tu contraseña"
                                            aria-invalid={!!errors.confirmar_contrasena}
                                            aria-describedby={
                                                errors.confirmar_contrasena ? "error-confirmacion" : undefined
                                            }
                                            className="h-11 border-slate-700 bg-slate-800 pl-10 pr-12 text-white placeholder:text-slate-500 focus-visible:ring-red-500"
                                            {...register("confirmar_contrasena")}
                                        />

                                        <button
                                            type="button"
                                            onClick={() => setMostrarConfirmacion(!mostrarConfirmacion)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-white"
                                            aria-label={
                                                mostrarConfirmacion ? "Ocultar contraseña" : "Mostrar contraseña"
                                            }
                                        >
                                            {mostrarConfirmacion ? (
                                                <EyeOff className="h-5 w-5" />
                                            ) : (
                                                <Eye className="h-5 w-5" />
                                            )}
                                        </button>
                                    </div>

                                    {errors.confirmar_contrasena && (
                                        <p id="error-confirmacion" role="alert" className="text-xs text-red-400">
                                            {errors.confirmar_contrasena.message}
                                        </p>
                                    )}
                                </div>

                                {/* Error del servidor */}
                                {errorServidor && (
                                    <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                                        <p className="text-sm text-red-300">{errorServidor}</p>
                                    </div>
                                )}

                                {/* Botón */}
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="h-12 w-full bg-red-600 text-base font-bold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 disabled:opacity-60"
                                >
                                    {isSubmitting ? (
                                        "Creando cuenta..."
                                    ) : (
                                        <>
                                            Crear mi cuenta
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </>
                                    )}
                                </Button>

                                <div className="relative py-2">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-slate-800" />
                                    </div>

                                    <div className="relative flex justify-center">
                                        <span className="bg-slate-900 px-3 text-xs text-slate-500">
                                            ¿Ya formas parte de Tsuru ProParts?
                                        </span>
                                    </div>
                                </div>

                                <p className="text-center text-sm text-slate-400">
                                    ¿Ya tienes cuenta?{" "}
                                    <Link
                                        href="/login"
                                        className="font-semibold text-red-400 underline-offset-4 transition hover:text-red-300 hover:underline"
                                    >
                                        Inicia sesión
                                    </Link>
                                </p>
                            </form>
                        )}
                    </CardContent>
                </Card>

                <p className="mt-6 text-center text-xs text-slate-500">
                    © {new Date().getFullYear()} Tsuru ProParts. Todos los derechos reservados.
                </p>
            </div>
        </main>
    );
}
