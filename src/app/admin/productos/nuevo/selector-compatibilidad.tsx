"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type Vehiculo = {
  id: string;
  modelo: string;
  anio: number;
  version: string;
  motor: string;
};

type Nuevo = {
  modelo: string;
  anio_desde: string;
  anio_hasta: string;
  version: string;
  motor: string;
};

const vacio: Nuevo = { modelo: "", anio_desde: "", anio_hasta: "", version: "", motor: "" };
const campo = "w-full rounded-md border bg-white px-3 py-2 text-sm";

export function SelectorCompatibilidad({ vehiculos }: { vehiculos: Vehiculo[] }) {
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [nuevos, setNuevos] = useState<Nuevo[]>([]);
  const [borrador, setBorrador] = useState<Nuevo>(vacio);
  const [aviso, setAviso] = useState("");

  const porModelo = useMemo(() => {
    const mapa = new Map<string, Vehiculo[]>();
    for (const v of vehiculos) {
      mapa.set(v.modelo, [...(mapa.get(v.modelo) ?? []), v]);
    }
    return [...mapa.entries()];
  }, [vehiculos]);

  function alternar(id: string) {
    setElegidos((actual) =>
      actual.includes(id) ? actual.filter((x) => x !== id) : [...actual, id],
    );
  }

  function alternarModelo(lista: Vehiculo[], marcar: boolean) {
    const ids = lista.map((v) => v.id);
    setElegidos((actual) => {
      const resto = actual.filter((x) => !ids.includes(x));
      return marcar ? [...resto, ...ids] : resto;
    });
  }

  function agregarNuevo() {
    const desde = Number(borrador.anio_desde);
    const hasta = Number(borrador.anio_hasta || borrador.anio_desde);
    if (!borrador.modelo.trim() || !borrador.version.trim() || !borrador.motor.trim()) {
      setAviso("Llena modelo, versión y motor.");
      return;
    }
    if (!Number.isInteger(desde) || desde < 2015 || hasta < desde || hasta - desde > 30) {
      setAviso("Indica un rango de años válido (desde 2015).");
      return;
    }
    setNuevos((actual) => [
      ...actual,
      { ...borrador, anio_hasta: String(hasta), anio_desde: String(desde) },
    ]);
    setBorrador(vacio);
    setAviso("");
  }

  const cambiar = (clave: keyof Nuevo) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setBorrador((b) => ({ ...b, [clave]: e.target.value }));

  return (
    <fieldset className="rounded-lg border p-4">
      <legend className="px-1 text-sm font-semibold">Vehículos compatibles</legend>
      <p className="mb-3 text-xs text-gray-600">
        Marca solo compatibilidades que hayas verificado en una fuente confiable.
      </p>

      {/* Campos ocultos que viajan con el formulario */}
      {elegidos.map((id) => (
        <input key={id} type="hidden" name="vehiculos" value={id} />
      ))}
      <input type="hidden" name="nuevos" value={JSON.stringify(nuevos)} />

      {porModelo.length === 0 ? (
        <p className="text-sm text-gray-500">Aún no hay vehículos registrados. Agrega uno abajo.</p>
      ) : (
        <div className="max-h-72 space-y-3 overflow-y-auto rounded-md border p-3">
          {porModelo.map(([modelo, lista]) => {
            const todos = lista.every((v) => elegidos.includes(v.id));
            return (
              <div key={modelo}>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={todos}
                    onChange={(e) => alternarModelo(lista, e.target.checked)}
                  />
                  {modelo} (todos los años y versiones)
                </label>
                <div className="ml-6 mt-1 grid gap-1 sm:grid-cols-2">
                  {lista.map((v) => (
                    <label key={v.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={elegidos.includes(v.id)}
                        onChange={() => alternar(v.id)}
                      />
                      {v.anio} · {v.version} · {v.motor}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-2 text-xs text-gray-600">Seleccionados: {elegidos.length}</p>

      <p className="mb-2 mt-4 text-sm font-medium">¿Falta un vehículo? Agrégalo aquí</p>
      <div
        className="grid gap-2 sm:grid-cols-5"
        onKeyDown={(e) => {
          if (e.key === "Enter") e.preventDefault();
        }}
      >
        <input
          list="modelos-existentes"
          placeholder="Modelo"
          value={borrador.modelo}
          onChange={cambiar("modelo")}
          className={campo}
        />
        <datalist id="modelos-existentes">
          {porModelo.map(([m]) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        <input
          type="number"
          placeholder="Año desde"
          value={borrador.anio_desde}
          onChange={cambiar("anio_desde")}
          className={campo}
        />
        <input
          type="number"
          placeholder="Año hasta"
          value={borrador.anio_hasta}
          onChange={cambiar("anio_hasta")}
          className={campo}
        />
        <input
          placeholder="Versión"
          value={borrador.version}
          onChange={cambiar("version")}
          className={campo}
        />
        <input
          placeholder="Motor"
          value={borrador.motor}
          onChange={cambiar("motor")}
          className={campo}
        />
      </div>
      <div className="mt-2 flex items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={agregarNuevo}>
          Agregar vehículo
        </Button>
        {aviso && <span className="text-sm text-red-600">{aviso}</span>}
      </div>

      {nuevos.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {nuevos.map((n, i) => (
            <li key={i} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-1">
              <span>
                {n.modelo} · {n.anio_desde === n.anio_hasta ? n.anio_desde : `${n.anio_desde} a ${n.anio_hasta}`} ·{" "}
                {n.version} · {n.motor}
              </span>
              <button
                type="button"
                className="text-red-600 hover:underline"
                onClick={() => setNuevos((a) => a.filter((_, j) => j !== i))}
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}
