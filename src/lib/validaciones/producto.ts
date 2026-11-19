import { z } from "zod";

export const esquemaProducto = z.object({
    nombre: z.string().trim().min(3, "Nombre muy corto").max(150),
    sku: z
        .string()
        .trim()
        .min(2)
        .max(50)
        .regex(/^[A-Za-z0-9._-]+$/, "El SKU solo admite letras, números, punto, guion y guion bajo"),
    descripcion: z.string().trim().max(2000).optional(),
    categoria_id: z.string().uuid(),
    precio: z.coerce.number().min(0).max(10000000),
    stock: z.coerce.number().int().min(0).max(100000),
    sucursal_id: z.string().uuid().optional(),
});

export const esquemaInventarios = z
    .array(
        z.object({
            sucursal_id: z.string().uuid(),
            stock: z.coerce.number().int().min(0).max(100000),
        }),
    )
    .max(100)
    .refine(
        inventarios => new Set(inventarios.map(item => item.sucursal_id)).size === inventarios.length,
        "No puedes seleccionar una sucursal más de una vez",
    );

export const esquemaVehiculoNuevo = z
    .object({
        modelo: z.string().trim().min(1).max(60),
        anio_desde: z.coerce.number().int().min(2015).max(2100),
        anio_hasta: z.coerce.number().int().min(2015).max(2100),
        version: z.string().trim().min(1).max(60),
        motor: z.string().trim().min(1).max(60),
    })
    .refine(v => v.anio_hasta >= v.anio_desde && v.anio_hasta - v.anio_desde <= 30, {
        message: "Rango de años no válido",
    });

export const esquemaNuevos = z.array(esquemaVehiculoNuevo).max(20);

export const esquemaIdsVehiculos = z.array(z.string().uuid()).max(500);
