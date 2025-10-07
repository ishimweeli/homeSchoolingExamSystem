import nodemailer from "nodemailer";

const mailer = nodemailer.createTransport({
    service: "gmail",
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    secure: true,
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
});

export default mailer