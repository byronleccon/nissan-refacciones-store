import nodemailer from "nodemailer";

const usuario = process.env.GMAIL_USER;
const contrasena = process.env.GMAIL_APP_PASSWORD;

if (!usuario || !contrasena) {
    throw new Error("Faltan las variables de configuración de Gmail.");
}

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: usuario,
        pass: contrasena,
    },
});

export async function enviarCorreo({
    destinatario,
    asunto,
    html,
}: {
    destinatario: string;
    asunto: string;
    html: string;
}) {
    if (!destinatario) {
        throw new Error("El destinatario del correo es obligatorio.");
    }

    return transporter.sendMail({
        from: `"Tsuru ProParts" <${usuario}>`,
        to: destinatario,
        subject: asunto,
        html,
    });
}
