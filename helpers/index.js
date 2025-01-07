const sendEmail = require('./sendEmail');
const sendResetPasswordEmail = require('./sendResetPasswordEmail');
const sendVerificationEmail = require('./sendVerficationEmail');

module.exports = {
    sendEmail,
    sendVerificationEmail,
    sendResetPasswordEmail,
};
