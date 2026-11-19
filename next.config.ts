import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    allowedDevOrigins: ["192.168.100.11"],
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "tzsugwvsmkkdmxmgrqki.supabase.co",
                pathname: "/storage/v1/object/public/productos/**",
            },
        ],
    },
    experimental: {
        serverActions: {
            bodySizeLimit: "3mb",
        },
    },
    turbopack: {
        rules: {
            "*.css": {
                loaders: ["@tailwindcss/turbopack"],
                as: "*.css",
            },
        },
    },
};

export default nextConfig;
