"use client";

import { useEffect, useState } from "react";
import { obtenerSkuPreview } from "../acciones";

type Categoria = {
    id: string;
    nombre: string;
};

export function SelectorCategoriaSku({ categorias }: { categorias: Categoria[] }) {
    const [categoriaId, setCategoriaId] = useState("");
    const [sku, setSku] = useState("");
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelado = false;

        setSku("");
        setError("");

        if (!categoriaId) {
            setCargando(false);
            return;
        }

        async function consultarSku() {
            setCargando(true);

            try {
                const resultado = await obtenerSkuPreview(categoriaId);

                if (cancelado) return;

                if (!resultado) {
                    setError("No se pudo generar el SKU. Intenta nuevamente.");
                    return;
                }

                setSku(resultado);
            } catch {
                if (!cancelado) {
                    setError("Error al consultar el SKU.");
                }
            } finally {
                if (!cancelado) {
                    setCargando(false);
                }
            }
        }

        consultarSku();

        return () => {
            cancelado = true;
        };
    }, [categoriaId]);

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <div>
                <label htmlFor="categoria_id" className="mb-1 block text-sm font-medium">
                    Categoría
                </label>

                <select
                    id="categoria_id"
                    name="categoria_id"
                    required
                    value={categoriaId}
                    onChange={e => setCategoriaId(e.target.value)}
                    className="w-full rounded-lg border bg-white px-4 py-2"
                >
                    <option value="" disabled>
                        Selecciona una categoría
                    </option>

                    {categorias.map(categoria => (
                        <option key={categoria.id} value={categoria.id}>
                            {categoria.nombre}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label htmlFor="sku" className="mb-1 block text-sm font-medium">
                    SKU (generado automáticamente)
                </label>

                <input
                    id="sku"
                    name="sku"
                    type="text"
                    value={sku}
                    readOnly
                    required
                    placeholder={cargando ? "Generando SKU..." : "Selecciona una categoría"}
                    className="w-full rounded-lg border bg-gray-100 px-4 py-2 font-mono font-semibold"
                />

                {cargando && <p className="mt-1 text-xs text-gray-500">Consultando consecutivo...</p>}

                {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

                {!cargando && sku && <p className="mt-1 text-xs text-green-700">SKU generado correctamente.</p>}
            </div>
        </div>
    );
}
