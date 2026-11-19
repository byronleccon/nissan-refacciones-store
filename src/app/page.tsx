import Link from "next/link";

export default function Home() {
    return (
        <main className="home-proparts flex-1">
            {/* PORTADA PRINCIPAL */}
            <section className="hero-proparts home-hero text-white">
                <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
                    <div className="relative z-10">
                        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold tracking-widest text-gray-200">
                            <span className="h-2 w-2 rounded-full bg-red-500" />
                            REFACCIONES AUTOMOTRICES
                        </div>

                        <h1 className="home-hero-title text-5xl font-black leading-tight tracking-tight sm:text-6xl lg:text-7xl">
                            POTENCIA
                            <br />
                            PARA TU
                            <br />
                            <span className="text-red-500">NISSAN.</span>
                        </h1>

                        <div className="divisor-deportivo mt-7" />

                        <p className="mt-7 max-w-lg text-base leading-8 text-gray-300 sm:text-lg">
                            Encuentra las refacciones que necesitas, aparta tus productos en línea y recógelos en la
                            sucursal que prefieras.
                        </p>

                        <div className="mt-9 flex flex-wrap items-center gap-4">
                            <Link
                                href="/catalogo"
                                className="boton-proparts home-main-button px-7 py-4 text-sm uppercase tracking-wide"
                            >
                                Explorar catálogo
                                <span aria-hidden="true">→</span>
                            </Link>

                            <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-gray-200">
                                <span className="text-red-500">✓</span>
                                Calidad y confianza
                            </div>
                        </div>
                    </div>

                    {/* BLOQUE VISUAL DE MARCA */}
                    <div className="relative hidden md:block">
                        <div className="absolute -inset-5 rounded-full bg-red-600/10 blur-3xl" />

                        <div className="home-brand-panel relative rounded-3xl border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur-sm">
                            <div className="flex items-center justify-between border-b border-white/10 pb-5">
                                <span className="text-xs font-bold tracking-[0.25em] text-gray-300">
                                    TSURU PROPARTS
                                </span>

                                <span className="rounded-full border border-red-500/20 bg-red-600/20 px-3 py-1 text-xs font-bold text-red-400">
                                    AUTOMOTRIZ
                                </span>
                            </div>

                            <div className="py-14 text-center">
                                <div className="home-brand-emblem mx-auto flex h-40 w-40 items-center justify-center rounded-full border border-red-500/30 bg-gradient-to-br from-red-600/20 to-transparent">
                                    <div className="flex h-28 w-28 items-center justify-center rounded-full border border-white/10 bg-white/5">
                                        <span className="text-5xl font-black tracking-tighter text-white">TP</span>
                                    </div>
                                </div>

                                <h2 className="mt-8 text-3xl font-black tracking-wider">PROPARTS</h2>

                                <p className="mt-2 text-sm tracking-[0.3em] text-gray-400">REFACCIONES NISSAN</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-5">
                                <div>
                                    <p className="text-xs tracking-wider text-gray-400">COMPRA</p>
                                    <p className="mt-1 font-semibold">En línea</p>
                                </div>

                                <div>
                                    <p className="text-xs tracking-wider text-gray-400">ENTREGA</p>
                                    <p className="mt-1 font-semibold">En sucursal</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="h-1 w-full bg-gradient-to-r from-transparent via-red-600 to-transparent" />
            </section>

            {/* VENTAJAS */}
            <section className="home-benefits mx-auto max-w-7xl px-6 py-20">
                <div className="mx-auto mb-12 max-w-2xl text-center">
                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-500">TSURU PROPARTS</p>

                    <h2 className="home-section-title mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                        Refacciones sin complicaciones
                    </h2>

                    <p className="mt-4 leading-7 text-muted-foreground">
                        Una forma sencilla de encontrar, apartar y recoger tus refacciones.
                    </p>

                    <div className="divisor-deportivo mx-auto mt-6" />
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    <article className="tarjeta-proparts home-benefit-card p-7">
                        <div className="home-benefit-number flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-xl font-black text-red-500">
                            01
                        </div>

                        <h3 className="mt-6 text-xl font-bold">Encuentra tu refacción</h3>

                        <p className="mt-3 text-sm leading-7 text-muted-foreground">
                            Explora nuestro catálogo y encuentra los productos que necesitas para tu vehículo.
                        </p>
                    </article>

                    <article className="tarjeta-proparts home-benefit-card p-7">
                        <div className="home-benefit-number flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-xl font-black text-red-500">
                            02
                        </div>

                        <h3 className="mt-6 text-xl font-bold">Aparta en línea</h3>

                        <p className="mt-3 text-sm leading-7 text-muted-foreground">
                            Realiza tu pedido desde la tienda y selecciona la sucursal disponible.
                        </p>
                    </article>

                    <article className="tarjeta-proparts home-benefit-card p-7">
                        <div className="home-benefit-number flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-xl font-black text-red-500">
                            03
                        </div>

                        <h3 className="mt-6 text-xl font-bold">Recoge tu pedido</h3>

                        <p className="mt-3 text-sm leading-7 text-muted-foreground">
                            Acude a la sucursal seleccionada y realiza el pago al recoger.
                        </p>
                    </article>
                </div>
            </section>

            {/* LLAMADA A LA ACCIÓN */}
            <section className="home-cta-section mx-auto max-w-7xl px-6 pb-20">
                <div className="home-cta-panel overflow-hidden rounded-2xl border border-white/10 px-7 py-12 text-center text-white shadow-xl sm:px-12">
                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-500">
                        TU SIGUIENTE REFACCIÓN ESTÁ AQUÍ
                    </p>

                    <h2 className="home-cta-title mt-4 text-3xl font-black sm:text-4xl">
                        Encuentra lo que tu Nissan necesita.
                    </h2>

                    <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-gray-300">
                        Consulta los productos disponibles y realiza tu pedido desde nuestra tienda.
                    </p>

                    <Link href="/catalogo" className="boton-proparts mt-8">
                        Ver catálogo completo
                        <span aria-hidden="true">→</span>
                    </Link>
                </div>
            </section>
        </main>
    );
}
