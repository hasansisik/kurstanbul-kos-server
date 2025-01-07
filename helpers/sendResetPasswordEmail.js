const sendEmail = require('./sendEmail');

const sendResetPasswordEmail = async ({ name, email, passwordToken }) => {
    const message = `<p>Şifre Sıfırlama Kodunuz: ${passwordToken}</p>`;

    return sendEmail({
        to: email,
        subject: 'Şifre Sıfırla',
        html: `<h4>Merhaba, ${name}</h4>${message}`,
    });
};

module.exports = sendResetPasswordEmail;