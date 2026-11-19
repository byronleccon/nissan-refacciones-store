"use client";

import { agregarAlCarrito } from "@/app/carrito/acciones";
import { Button } from "@/components/ui/button";
import { useActionState } from "react";

type Props = {
    productoId: string;
};

const estadoInicial = {
    estado: "idle" as const,
    mensaje: "",
};

export function FormularioAgregar({ productoId }: Props) {
    const [estado, formAction, pendiente] = useActionState(agregarAlCarrito, estadoInicial);

    return (
        <div className="mt-6">
            <form action={formAction} className="flex flex-wrap items-center gap-3">
                <input type="hidden" name="producto_id" value={productoId} />

                <div>
                    <label htmlFor="cantidad" className="mb-1 block text-sm font-medium">
                        Cantidad
                    </label>

                    <input
                        id="cantidad"
                        name="cantidad"
                        type="number"
                        min={1}
                        max={99}
                        defaultValue={1}
                        required
                        className="w-24 rounded-lg border px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                    />
                </div>

                <Button type="submit" disabled={pendiente} className="mt-6 bg-red-600 text-white hover:bg-red-700">
                    {pendiente ? "Agregando..." : "Añadir al carrito"}
                </Button>
            </form>

            {estado.mensaje && (
                <p
                    role="status"
                    aria-live="polite"
                    className={`mt-3 rounded-lg p-3 text-sm font-medium ${
                        estado.estado === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                    }`}
                >
                    {estado.mensaje}
                </p>
            )}
        </div>
    );
}
