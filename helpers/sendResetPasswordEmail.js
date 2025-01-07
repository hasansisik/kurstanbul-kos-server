const sendEmail = require('./sendEmail');

const sendResetPasswordEmail = async ({ courseName, courseEmail, passwordToken }) => {
    const message = `<p>Şifre Sıfırlama Kodunuz: ${passwordToken}</p>`;

    return sendEmail({
        to: courseEmail,
        subject: 'Şifre Sıfırla',
        html: `<h4>Merhaba, ${courseName}</h4>${message}`,
    });
};

module.exports = sendResetPasswordEmail;