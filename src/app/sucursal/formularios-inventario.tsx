"use client";

import { Button } from "@/components/ui/button";
import { useActionState } from "react";
import { ajustarStock, registrarEntrada } from "./acciones";

type Props = {
    sucursalId: string;
    productoId: string;
    stockFisico: number;
};

export function FormulariosInventario({ sucursalId, productoId, stockFisico }: Props) {
    const [estadoEntrada, accionEntrada, pendienteEntrada] = useActionState(registrarEntrada, null);
    const [estadoAjuste, accionAjuste, pendienteAjuste] = useActionState(ajustarStock, null);

    const campo = "rounded-md border px-2 py-1 text-sm";

    return (
        <div className="flex flex-col gap-2">
            <form action={accionEntrada} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="sucursal_id" value={sucursalId} />
                <input type="hidden" name="producto_id" value={productoId} />
                <input name="cantidad" type="number" min={1} placeholder="Cant." required className={`${campo} w-20`} />
                <input name="motivo" placeholder="Motivo (opcional)" className={campo} />
                <Button type="submit" size="sm" disabled={pendienteEntrada}>
                    Registrar entrada
                </Button>
                {estadoEntrada && (
                    <span className={estadoEntrada.ok ? "text-green-700" : "text-red-600"}>
                        {estadoEntrada.mensaje}
                    </span>
                )}
            </form>

            <form action={accionAjuste} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="sucursal_id" value={sucursalId} />
                <input type="hidden" name="producto_id" value={productoId} />
                <input
                    name="nuevo_stock"
                    type="number"
                    min={0}
                    defaultValue={stockFisico}
                    required
                    className={`${campo} w-20`}
                />
                <input name="motivo" placeholder="Motivo del ajuste" required className={campo} />
                <Button type="submit" size="sm" variant="outline" disabled={pendienteAjuste}>
                    Ajustar stock
                </Button>
                {estadoAjuste && (
                    <span className={estadoAjuste.ok ? "text-green-700" : "text-red-600"}>{estadoAjuste.mensaje}</span>
                )}
            </form>
        </div>
    );
}
