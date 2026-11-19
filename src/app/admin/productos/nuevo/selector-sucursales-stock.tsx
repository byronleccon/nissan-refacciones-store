"use client";

import { useState } from "react";

type Sucursal = {
    id: string;
    nombre: string;
};

type Props = {
    sucursales: Sucursal[];
};

type InventarioSeleccionado = {
    sucursal_id: string;
    stock: number;
};

export function SelectorSucursalesStock({ sucursales }: Props) {
    const [seleccionadas, setSeleccionadas] = useState<Record<string, { activa: boolean; stock: number }>>({});

    function cambiarSeleccion(id: string, activa: boolean) {
        setSeleccionadas(actuales => ({
            ...actuales,
            [id]: {
                activa,
                stock: actuales[id]?.stock ?? 0,
            },
        }));
    }

    function cambiarStock(id: string, stock: number) {
        setSeleccionadas(actuales => ({
            ...actuales,
            [id]: {
                activa: true,
                stock,
            },
        }));
    }

    const inventarios: InventarioSeleccionado[] = sucursales
        .filter(sucursal => seleccionadas[sucursal.id]?.activa)
        .map(sucursal => ({
            sucursal_id: sucursal.id,
            stock: seleccionadas[sucursal.id].stock,
        }));

    return (
        <div className="space-y-3">
            <div>
                <h3 className="font-medium">Existencias por sucursal</h3>
                <p className="text-sm text-gray-500">
                    Marca las sucursales donde estará disponible el producto e indica cuántas unidades tendrá cada una.
                </p>
            </div>

            <input type="hidden" name="inventarios" value={JSON.stringify(inventarios)} />

            {sucursales.length === 0 ? (
                <p className="text-sm text-red-600">No hay sucursales activas disponibles.</p>
            ) : (
                <div className="space-y-3">
                    {sucursales.map(sucursal => {
                        const activa = seleccionadas[sucursal.id]?.activa ?? false;

                        const stock = seleccionadas[sucursal.id]?.stock ?? 0;

                        return (
                            <div
                                key={sucursal.id}
                                className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <label className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={activa}
                                        onChange={e => cambiarSeleccion(sucursal.id, e.target.checked)}
                                        className="h-4 w-4"
                                    />

                                    <span className="font-medium">{sucursal.nombre}</span>
                                </label>

                                <div className="flex items-center gap-2">
                                    <label htmlFor={`stock-${sucursal.id}`} className="text-sm text-gray-600">
                                        Existencias:
                                    </label>

                                    <input
                                        id={`stock-${sucursal.id}`}
                                        type="number"
                                        min="0"
                                        max="100000"
                                        step="1"
                                        value={stock}
                                        disabled={!activa}
                                        onChange={e => cambiarStock(sucursal.id, Number(e.target.value))}
                                        className="w-24 rounded-md border px-3 py-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <p className="text-sm text-gray-500">Sucursales seleccionadas: {inventarios.length}</p>
        </div>
    );
}
