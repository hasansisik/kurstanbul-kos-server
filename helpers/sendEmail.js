const nodemailer = require('nodemailer');

const sendEmail = async ({to,subject,html}) => {

    let transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: { 
            user: process.env.SMTP_USER, 
            pass: process.env.SMTP_PASS 
        }
    });

    return transporter.sendMail({
        from : process.env.SMTP_USER,
        to,
        subject,
        html
    });
};


module.exports = sendEmail;