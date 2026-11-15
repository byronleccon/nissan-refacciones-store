import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { confirmarPedido } from "../acciones";

type Props = {
    searchParams: Promise<{
        sucursal?: string;
        pedido?: string;
        error?: string;
    }>;
};

type Horario = {
    dia_semana: number;
    abre: string;
    cierra: string;
};

const fechaLegible = (fecha: string) =>
    new Intl.DateTimeFormat("es-MX", {
        timeZone: "UTC",
        weekday: "long",
        day: "numeric",
        month: "long",
    }).format(new Date(`${fecha}T12:00:00Z`));

const fechaHoraLegible = (fecha: string) =>
    new Intl.DateTimeFormat("es-MX", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/Mexico_City",
    }).format(new Date(fecha));

export default async function ConfirmarPage({ searchParams }: Props) {
    const params = await searchParams;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    // Si existe un pedido, mostrar su confirmación.
    if (params.pedido) {
        const { data: pedido } = await supabase
            .from("pedidos")
            .select("id, folio, fecha_recogida, fecha_limite, estado, total, sucursal_id")
            .eq("id", params.pedido)
            .eq("cliente_id", user.id)
            .maybeSingle();

        if (pedido) {
            const { data: sucursal } = await supabase
                .from("sucursales")
                .select("nombre, direccion")
                .eq("id", pedido.sucursal_id)
                .maybeSingle();

            return (
                <main className="mx-auto max-w-2xl p-6">
                    <div className="rounded-lg border p-6">
                        <h1 className="text-2xl font-bold text-green-700">¡Pedido confirmado!</h1>

                        <p className="mt-2 text-sm text-gray-600">
                            Tu pedido se registró correctamente y el inventario quedó reservado.
                        </p>

                        <div className="mt-6 space-y-3">
                            <p>
                                <b>Folio:</b> {pedido.folio}
                            </p>
                            <p>
                                <b>Sucursal:</b> {sucursal?.nombre ?? "No disponible"}
                            </p>
                            <p>
                                <b>Dirección:</b> {sucursal?.direccion ?? "No disponible"}
                            </p>
                            <p>
                                <b>Fecha de recogida:</b> {fechaLegible(pedido.fecha_recogida)}
                            </p>
                            <p>
                                <b>Fecha límite:</b> {fechaHoraLegible(pedido.fecha_limite)}
                            </p>
                            <p>
                                <b>Total:</b>{" "}
                                {Number(pedido.total).toLocaleString("es-MX", {
                                    style: "currency",
                                    currency: "MXN",
                                })}
                            </p>
                            <p>
                                <b>Estado:</b> {pedido.estado}
                            </p>
                        </div>

                        <Link
                            href="/catalogo"
                            className="mt-6 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                        >
                            Seguir comprando
                        </Link>
                    </div>
                </main>
            );
        }
    }

    if (!params.sucursal) redirect("/carrito");

    // Consultar sucursal.
    const { data: sucursal, error: errorSucursal } = await supabase
        .from("sucursales")
        .select("id, nombre, direccion, zona_horaria, activa")
        .eq("id", params.sucursal)
        .maybeSingle();

    if (errorSucursal || !sucursal || !sucursal.activa) {
        redirect("/carrito");
    }

    // Volver a comprobar que el carrito siga disponible.
    const { data: disponibilidad, error: errorDisponibilidad } = await supabase.rpc("consultar_disponibilidad_carrito");

    const disponible = (disponibilidad ?? []).some(
        (s: { sucursal_id: string; disponible: boolean }) => s.sucursal_id === sucursal.id && s.disponible,
    );

    if (errorDisponibilidad || !disponible) {
        redirect("/carrito?error=sucursal-no-disponible");
    }

    // Consultar horarios reales de la sucursal.
    const { data: horarios, error: errorHorarios } = await supabase
        .from("horarios_sucursal")
        .select("dia_semana, abre, cierra")
        .eq("sucursal_id", sucursal.id);

    if (errorHorarios) {
        throw new Error("No se pudieron consultar los horarios de la sucursal.");
    }

    const listaHorarios = (horarios ?? []) as Horario[];

    // Obtener la fecha y hora actuales en la zona horaria de la sucursal.
    const ahora = new Date();

    const partesFecha = new Intl.DateTimeFormat("en-US", {
        timeZone: sucursal.zona_horaria,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(ahora);

    const obtenerParte = (tipo: string) => partesFecha.find(p => p.type === tipo)?.value ?? "";

    const hoy = `${obtenerParte("year")}-${obtenerParte("month")}-${obtenerParte("day")}`;

    const ahoraLocal = new Intl.DateTimeFormat("en-GB", {
        timeZone: sucursal.zona_horaria,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).format(ahora);

    // Construir las fechas disponibles: hoy y los siguientes 14 días.
    const fechasDisponibles: {
        fecha: string;
        horario: Horario;
    }[] = [];

    const fechaBase = new Date(`${hoy}T12:00:00Z`);

    for (let i = 0; i <= 14; i++) {
        const fecha = new Date(fechaBase);
        fecha.setUTCDate(fecha.getUTCDate() + i);

        const fechaISO = fecha.toISOString().slice(0, 10);
        const diaSemana = fecha.getUTCDay();

        const horario = listaHorarios.find(h => h.dia_semana === diaSemana);

        if (!horario) continue;

        // Si es hoy, debe estar dentro del horario de atención.
        if (i === 0) {
            if (ahoraLocal < horario.abre || ahoraLocal >= horario.cierra) {
                continue;
            }
        }

        // La función de pedidos también necesita horario para el día extra.
        const fechaExtra = new Date(fecha);
        fechaExtra.setUTCDate(fechaExtra.getUTCDate() + 1);

        const horarioExtra = listaHorarios.find(h => h.dia_semana === fechaExtra.getUTCDay());

        if (!horarioExtra) continue;

        fechasDisponibles.push({
            fecha: fechaISO,
            horario,
        });
    }

    return (
        <main className="mx-auto max-w-2xl p-6">
            <Link href="/carrito" className="text-sm underline">
                ← Volver al carrito
            </Link>

            <h1 className="mt-5 text-3xl font-bold">Fecha de recogida</h1>

            <div className="mt-4 rounded-md border p-4">
                <p className="font-semibold">{sucursal.nombre}</p>
                <p className="text-sm text-gray-600">{sucursal.direccion}</p>
            </div>

            <p className="mt-6 text-sm text-gray-600">
                Selecciona el día en que deseas recoger tu pedido. Puedes elegir entre hoy y los próximos 14 días.
            </p>

            {params.error === "pedido" && (
                <p className="mt-4 rounded-md border border-red-300 p-3 text-sm text-red-700">
                    No fue posible confirmar el pedido. Es posible que el inventario haya cambiado o que la fecha ya no
                    esté disponible. Regresa al carrito y vuelve a consultar.
                </p>
            )}

            {fechasDisponibles.length === 0 ? (
                <p className="mt-5 rounded-md border p-4 text-sm">
                    No hay fechas disponibles para esta sucursal. Regresa al carrito para elegir otra sucursal.
                </p>
            ) : (
                <form action={confirmarPedido} className="mt-5">
                    <input type="hidden" name="sucursal_id" value={sucursal.id} />

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {fechasDisponibles.map((opcion, index) => (
                            <label
                                key={opcion.fecha}
                                className="cursor-pointer rounded-md border p-3 transition hover:border-primary has-[:checked]:border-primary has-[:checked]:bg-primary/10"
                            >
                                <input
                                    type="radio"
                                    name="fecha_recogida"
                                    value={opcion.fecha}
                                    defaultChecked={index === 0}
                                    className="mr-2"
                                />

                                <span className="text-sm font-medium capitalize">{fechaLegible(opcion.fecha)}</span>

                                <p className="mt-2 text-xs text-gray-600">
                                    {opcion.horario.abre.slice(0, 5)} a {opcion.horario.cierra.slice(0, 5)}
                                </p>
                            </label>
                        ))}
                    </div>

                    <p className="mt-5 text-sm text-gray-600">
                        Tendrás el día elegido y un día adicional para recoger tu pedido. Después de ese plazo, el
                        pedido vencerá y se liberará el inventario reservado.
                    </p>

                    <button
                        type="submit"
                        className="mt-5 w-full rounded-md bg-primary px-4 py-3 font-medium text-primary-foreground"
                    >
                        Confirmar pedido
                    </button>
                </form>
            )}
        </main>
    );
}
