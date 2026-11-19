import { z } from "zod";

// Dominios con errores de escritura frecuentes.
const dominiosSugeridos: Record<string, string> = {
    "gmial.com": "gmail.com",
    "gmai.com": "gmail.com",
    "gmal.com": "gmail.com",
    "hotnail.com": "hotmail.com",
    "outllok.com": "outlook.com",
    "yaho.com": "yahoo.com",
    "yahooo.com": "yahoo.com",
};

// Correo normalizado y con mensajes específicos.
const esquemaCorreo = z
    .string()
    .trim()
    .toLowerCase()
    .superRefine((correo, ctx) => {
        if (!correo) {
            ctx.addIssue({
                code: "custom",
                message: "Escribe tu correo electrónico.",
            });
            return;
        }

        if (!correo.includes("@")) {
            ctx.addIssue({
                code: "custom",
                message: "Falta el símbolo @ en el correo electrónico.",
            });
            return;
        }

        const partes = correo.split("@");

        if (partes.length !== 2 || !partes[0] || !partes[1]) {
            ctx.addIssue({
                code: "custom",
                message: "Revisa la parte del correo anterior y posterior al símbolo @.",
            });
            return;
        }

        const dominio = partes[1];

        if (dominiosSugeridos[dominio]) {
            ctx.addIssue({
                code: "custom",
                message: `¿Quisiste escribir ${dominiosSugeridos[dominio]}? Revisa el dominio.`,
            });
            return;
        }

        if (!/^[^\s@]+\.[^\s@]{2,}$/.test(dominio)) {
            ctx.addIssue({
                code: "custom",
                message: "El dominio del correo no parece válido. Ejemplo: gmail.com.",
            });
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) {
            ctx.addIssue({
                code: "custom",
                message: "El formato del correo no es válido. Ejemplo: usuario@gmail.com.",
            });
        }
    });

// Lista básica de contraseñas demasiado comunes.
const contrasenasComunes = new Set([
    "1234567890",
    "123456789",
    "12345678",
    "qwerty123",
    "qwertyuiop",
    "password",
    "password123",
    "admin123",
    "contraseña",
    "contrasena",
    "iloveyou",
    "abc123456",
    "123123123",
    "1111111111",
]);

const esquemaContrasena = z
    .string()
    .min(10, "Usa al menos 10 caracteres en tu contraseña.")
    .max(128, "La contraseña no puede superar los 128 caracteres.")
    .refine(
        valor => !contrasenasComunes.has(valor.toLowerCase()),
        "Esta contraseña es demasiado común. Elige una diferente.",
    );

// Inicio de sesión.
export const esquemaLogin = z.object({
    correo: esquemaCorreo,
    contrasena: z.string().min(1, "Escribe tu contraseña."),
});

// Registro.
export const esquemaRegistro = z
    .object({
        nombre_completo: z
            .string()
            .trim()
            .min(1, "Escribe tu nombre completo.")
            .max(100, "El nombre no puede superar los 100 caracteres.")
            .regex(
                /^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u,
                "Usa letras, espacios, apóstrofes o guiones. No incluyas números.",
            ),

        telefono: z
            .string()
            .trim()
            .min(8, "El teléfono debe tener al menos 8 caracteres.")
            .max(20, "El teléfono no puede superar los 20 caracteres.")
            .regex(/^[0-9+\s()-]+$/, "El teléfono solo puede contener números, espacios y los símbolos + ( ) -."),

        correo: esquemaCorreo,

        contrasena: esquemaContrasena,

        confirmar_contrasena: z.string().min(1, "Confirma tu contraseña."),
    })
    .refine(datos => datos.contrasena === datos.confirmar_contrasena, {
        message: "Las contraseñas no coinciden. Revísalas.",
        path: ["confirmar_contrasena"],
    });

// Recuperación.
export const esquemaRecuperacion = z.object({
    correo: esquemaCorreo,
});

// Nueva contraseña.
export const esquemaNuevaContrasena = z
    .object({
        contrasena: esquemaContrasena,
        confirmar_contrasena: z.string().min(1, "Confirma tu contraseña."),
    })
    .refine(datos => datos.contrasena === datos.confirmar_contrasena, {
        message: "Las contraseñas no coinciden.",
        path: ["confirmar_contrasena"],
    });

export type DatosLogin = z.infer<typeof esquemaLogin>;
export type DatosRegistro = z.infer<typeof esquemaRegistro>;
export type DatosRecuperacion = z.infer<typeof esquemaRecuperacion>;
export type DatosNuevaContrasena = z.infer<typeof esquemaNuevaContrasena>;
