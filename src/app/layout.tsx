import { Encabezado } from "@/components/encabezado";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: {
        default: "Tsuru ProParts | Refacciones automotrices",
        template: "%s | Tsuru ProParts",
    },
    description: "Encuentra refacciones Nissan, aparta en línea y recoge tus productos en la sucursal que prefieras.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
    return (
        <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
            <body className="flex min-h-full flex-col">
                <Encabezado />
                {children}
            </body>
        </html>
    );
}
