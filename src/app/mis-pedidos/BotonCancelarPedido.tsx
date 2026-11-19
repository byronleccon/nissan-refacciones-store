"use client";

import { cancelarPedidoCliente } from "./acciones";

export default function BotonCancelarPedido({ pedidoId }: { pedidoId: string }) {
    return (
        <form
            action={cancelarPedidoCliente}
            onSubmit={event => {
                const confirmar = window.confirm(
                    "¿Estás seguro de que deseas cancelar este pedido? Se liberará el inventario reservado.",
                );

                if (!confirmar) {
                    event.preventDefault();
                }
            }}
        >
            <input type="hidden" name="pedido_id" value={pedidoId} />

            <button
                type="submit"
                className="rounded-md bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
                Cancelar pedido
            </button>
        </form>
    );
}
