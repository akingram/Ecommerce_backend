const nodemailer = require("nodemailer");

const host = process.env.SMTP_HOST || "sandbox.smtp.mailtrap.io";
const port = process.env.SMTP_PORT || 587;
const user = process.env.SMTP_USER || "7fa7156ed2baee";
const password = process.env.SMTP_PASS || "5b40b03c5d0dcc";

const mailSending = async (options) => {
    try {
        const transporter = nodemailer.createTransport({
            host: host,
            port: port,
            secure: false,
            auth: {
                user: user,
                pass: password
            },

            tls: { 
                rejectUnauthorized: false  // ✅ Allow self-signed certificates
            }
        });

        const mailOptions = {
            from: "mayowahq@gmail.com",
            to: options.email,
            subject: options.subject,
            text: options.text // Fix: Use 'text' instead of 'message'
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent: " + info.response);
        return true;
    } catch (error) {
        console.log("Error occurred:", error.message);
        return false;
    }
};

module.exports = mailSending;
