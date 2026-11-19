"use client";

import { eliminarSucursal } from "./acciones";

export default function BotonEliminarSucursal({ id }: { id: string }) {
    return (
        <form
            action={eliminarSucursal}
            onSubmit={evento => {
                const confirmar = window.confirm(
                    "¿Estás seguro de que deseas eliminar esta sucursal? Esta operación no se puede deshacer.",
                );

                if (!confirmar) {
                    evento.preventDefault();
                }
            }}
        >
            <input type="hidden" name="id" value={id} />

            <button
                type="submit"
                className="rounded-lg border border-red-500 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-500/10"
            >
                Eliminar sucursal
            </button>
        </form>
    );
}
