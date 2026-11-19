"use client";

import { MoreHorizontal, Pause, Pencil, Play, Trash2 } from "lucide-react";
import Link from "next/link";

import type { CSSProperties, FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { desactivarUsuario, eliminarUsuario, reactivarUsuario } from "./acciones";

type Props = {
    usuarioId: string;
    activo: boolean;
    mostrarEliminar?: boolean;
    textoEditar?: string;
};

const EVENTO_MENU = "menu-acciones-usuario";

export default function MenuAccionesUsuario({
    usuarioId,
    activo,
    mostrarEliminar = true,
    textoEditar = "Editar usuario",
}: Props) {
    const [abierto, setAbierto] = useState(false);
    const [montado, setMontado] = useState(false);

    const [posicion, setPosicion] = useState({
        top: 0,
        left: 0,
    });

    const menuRef = useRef<HTMLDivElement>(null);
    const botonRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMontado(true);
    }, []);

    useEffect(() => {
        function escucharOtroMenu(event: Event) {
            const evento = event as CustomEvent<string>;

            if (evento.detail !== usuarioId) {
                setAbierto(false);
            }
        }

        function cerrarAlHacerClickFuera(event: MouseEvent) {
            const objetivo = event.target as Node;

            if (menuRef.current?.contains(objetivo) || panelRef.current?.contains(objetivo)) {
                return;
            }

            setAbierto(false);
        }

        function cerrarConEscape(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setAbierto(false);
            }
        }

        window.addEventListener(EVENTO_MENU, escucharOtroMenu);
        document.addEventListener("mousedown", cerrarAlHacerClickFuera);
        document.addEventListener("keydown", cerrarConEscape);

        return () => {
            window.removeEventListener(EVENTO_MENU, escucharOtroMenu);
            document.removeEventListener("mousedown", cerrarAlHacerClickFuera);
            document.removeEventListener("keydown", cerrarConEscape);
        };
    }, [usuarioId]);

    function actualizarPosicion() {
        const boton = botonRef.current;
        if (!boton) return;

        const rect = boton.getBoundingClientRect();
        const anchoMenu = 230;
        const altoMenu = mostrarEliminar ? 170 : 125;

        const espacioAbajo = window.innerHeight - rect.bottom;

        const top = espacioAbajo < altoMenu && rect.top > altoMenu ? rect.top - altoMenu - 8 : rect.bottom + 8;

        setPosicion({
            top: Math.max(8, Math.min(top, window.innerHeight - altoMenu - 8)),
            left: Math.max(8, Math.min(rect.right - anchoMenu, window.innerWidth - anchoMenu - 8)),
        });
    }

    function alternarMenu() {
        if (abierto) {
            setAbierto(false);
            return;
        }

        window.dispatchEvent(
            new CustomEvent(EVENTO_MENU, {
                detail: usuarioId,
            }),
        );

        actualizarPosicion();
        setAbierto(true);
    }

    useEffect(() => {
        if (!abierto) return;

        function actualizar() {
            actualizarPosicion();
        }

        window.addEventListener("resize", actualizar);
        window.addEventListener("scroll", actualizar, true);

        return () => {
            window.removeEventListener("resize", actualizar);
            window.removeEventListener("scroll", actualizar, true);
        };
    }, [abierto]);

    function confirmarCambioEstado(event: FormEvent<HTMLFormElement>) {
        const mensaje = activo ? "¿Deseas desactivar esta cuenta?" : "¿Deseas reactivar esta cuenta?";

        if (!window.confirm(mensaje)) {
            event.preventDefault();
            return;
        }

        setAbierto(false);
    }

    function confirmarEliminacion(event: FormEvent<HTMLFormElement>) {
        const confirmado = window.confirm(
            "¿Estás seguro de eliminar permanentemente esta cuenta? Esta acción no se puede deshacer.",
        );

        if (!confirmado) {
            event.preventDefault();
            return;
        }

        setAbierto(false);
    }

    const estiloOpcion: CSSProperties = {
        display: "flex",
        alignItems: "center",
        gap: "11px",
        width: "100%",
        padding: "11px 12px",
        color: "#374151",
        backgroundColor: "transparent",
        border: "none",
        borderRadius: "7px",
        fontSize: "13px",
        fontWeight: 500,
        textAlign: "left",
        textDecoration: "none",
        cursor: "pointer",
        boxSizing: "border-box",
        transition: "background-color 0.15s ease",
    };

    const separador: CSSProperties = {
        height: "1px",
        backgroundColor: "#f1f5f9",
        margin: "5px 4px",
    };

    return (
        <div ref={menuRef} style={{ display: "inline-block" }}>
            <button
                ref={botonRef}
                type="button"
                onClick={alternarMenu}
                aria-expanded={abierto}
                aria-haspopup="menu"
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "9px 12px",
                    color: "#374151",
                    backgroundColor: abierto ? "#f9fafb" : "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                }}
            >
                Acciones
                <MoreHorizontal size={17} strokeWidth={1.8} />
            </button>

            {montado &&
                abierto &&
                createPortal(
                    <div
                        ref={panelRef}
                        role="menu"
                        style={{
                            position: "fixed",
                            top: posicion.top,
                            left: posicion.left,
                            zIndex: 999999,
                            width: "230px",
                            padding: "6px",
                            backgroundColor: "#ffffff",
                            color: "#374151",
                            border: "1px solid #e5e7eb",
                            borderRadius: "10px",
                            boxShadow: "0 10px 25px rgba(0,0,0,0.10)",
                        }}
                    >
                        <Link
                            href={`/admin/usuarios/${usuarioId}/editar`}
                            role="menuitem"
                            onClick={() => setAbierto(false)}
                            style={estiloOpcion}
                        >
                            <Pencil size={16} strokeWidth={1.7} color="#6b7280" />
                            {textoEditar}
                        </Link>

                        <form action={activo ? desactivarUsuario : reactivarUsuario} onSubmit={confirmarCambioEstado}>
                            <input type="hidden" name="usuario_id" value={usuarioId} />

                            <button type="submit" role="menuitem" style={estiloOpcion}>
                                {activo ? (
                                    <Pause size={16} strokeWidth={1.7} color="#6b7280" />
                                ) : (
                                    <Play size={16} strokeWidth={1.7} color="#6b7280" />
                                )}

                                {activo ? "Desactivar cuenta" : "Reactivar cuenta"}
                            </button>
                        </form>

                        {mostrarEliminar && (
                            <>
                                <div style={separador} />

                                <form action={eliminarUsuario} onSubmit={confirmarEliminacion}>
                                    <input type="hidden" name="usuario_id" value={usuarioId} />

                                    <button
                                        type="submit"
                                        role="menuitem"
                                        style={{
                                            ...estiloOpcion,
                                            color: "#dc2626",
                                            fontWeight: 500,
                                        }}
                                    >
                                        <Trash2 size={16} strokeWidth={1.7} color="#dc2626" />
                                        Eliminar usuario
                                    </button>
                                </form>
                            </>
                        )}
                    </div>,
                    document.body,
                )}
        </div>
    );
}
