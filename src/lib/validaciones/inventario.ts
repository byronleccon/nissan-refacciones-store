import { z } from "zod";

export const esquemaEntrada = z.object({
    sucursal_id: z.string().uuid(),
    producto_id: z.string().uuid(),
    cantidad: z.coerce.number().int().min(1, "Mínimo 1").max(10000),
    motivo: z.string().trim().max(200).optional(),
});

export const esquemaAjuste = z.object({
    sucursal_id: z.string().uuid(),
    producto_id: z.string().uuid(),
    nuevo_stock: z.coerce.number().int().min(0, "No puede ser negativo").max(100000),
    motivo: z.string().trim().min(3, "Indica el motivo").max(200),
});
