const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, html }) => {
    if (!process.env.EMAIL_USER) {
        console.log('📧 Email not configured. Would send:', subject, '→', to);
        return;
    }
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
    await transporter.sendMail({
        from: `"EMBER & OAK" <${process.env.EMAIL_USER}>`,
        to, subject, html
    });
};

module.exports = sendEmail;
