const sendEmail = require('./sendEmail');

const sendVerificationEmail = async ({
  courseName,
  courseEmail,
  verificationCode,
}) => {
  const message = `<p>Doğrulama kodunuz: ${verificationCode}</p>`;

  return sendEmail({
    to: courseEmail,
    subject: 'Kurstanbul Mail Doğrulama',
    html: `<h4> Merhaba, ${courseName}</h4>
    ${message}
    `,
  });
};

module.exports = sendVerificationEmail;
