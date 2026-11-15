import { z } from "zod";

export const esquemaLogin = z.object({
    correo: z.string().email("Escribe un correo válido"),
    contrasena: z.string().min(1, "Escribe tu contraseña"),
});

export const esquemaRegistro = z.object({
    nombre_completo: z.string().trim().min(3, "Escribe tu nombre completo").max(100, "El nombre es demasiado largo"),
    correo: z.string().email("Escribe un correo válido"),
    contrasena: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export type DatosLogin = z.infer<typeof esquemaLogin>;
export type DatosRegistro = z.infer<typeof esquemaRegistro>;
