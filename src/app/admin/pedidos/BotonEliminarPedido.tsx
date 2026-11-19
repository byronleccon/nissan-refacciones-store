"use client";

import { eliminarPedidoCancelado } from "./acciones";

export default function BotonEliminarPedido({ pedidoId }: { pedidoId: string }) {
    return (
        <form
            action={eliminarPedidoCancelado}
            onSubmit={event => {
                const confirmar = window.confirm(
                    "¿Estás seguro de eliminar definitivamente este pedido? Esta acción no se puede deshacer.",
                );

                if (!confirmar) {
                    event.preventDefault();
                }
            }}
        >
            <input type="hidden" name="pedido_id" value={pedidoId} />

            <button
                type="submit"
                className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-500/10"
            >
                Eliminar definitivamente
            </button>
        </form>
    );
}
