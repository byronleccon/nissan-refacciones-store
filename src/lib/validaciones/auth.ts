import { z } from "zod";

export const esquemaLogin = z.object({
    correo: z.string().trim().email("Escribe un correo válido"),
    contrasena: z.string().min(1, "Escribe tu contraseña"),
});

export const esquemaRegistro = z
    .object({
        nombre_completo: z
            .string()
            .trim()
            .min(3, "Escribe tu nombre completo")
            .max(100, "El nombre es demasiado largo"),

        telefono: z
            .string()
            .trim()
            .min(8, "Escribe un número de teléfono válido")
            .max(20, "El número es demasiado largo")
            .regex(/^[0-9+\s()-]+$/, "El teléfono contiene caracteres no válidos"),

        correo: z.string().trim().email("Escribe un correo válido"),

        contrasena: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),

        confirmar_contrasena: z.string().min(1, "Confirma tu contraseña"),
    })
    .refine(datos => datos.contrasena === datos.confirmar_contrasena, {
        message: "Las contraseñas no coinciden",
        path: ["confirmar_contrasena"],
    });

export const esquemaRecuperacion = z.object({
    correo: z.string().trim().email("Escribe un correo válido"),
});

export const esquemaNuevaContrasena = z
    .object({
        contrasena: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),

        confirmar_contrasena: z.string().min(1, "Confirma tu contraseña"),
    })
    .refine(datos => datos.contrasena === datos.confirmar_contrasena, {
        message: "Las contraseñas no coinciden",
        path: ["confirmar_contrasena"],
    });

export type DatosLogin = z.infer<typeof esquemaLogin>;
export type DatosRegistro = z.infer<typeof esquemaRegistro>;
export type DatosRecuperacion = z.infer<typeof esquemaRecuperacion>;
export type DatosNuevaContrasena = z.infer<typeof esquemaNuevaContrasena>;
