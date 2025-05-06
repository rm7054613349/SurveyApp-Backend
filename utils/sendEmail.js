const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, text, html) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text: text || 'Please view this email in an HTML-compatible client.',
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    // Log detailed SMTP error
    console.error('Email sending failed:', {
      message: err.message,
      code: err.code,
      response: err.response,
      responseCode: err.responseCode,
      command: err.command,
    });
    // Throw specific error for authentication issues
    if (err.code === 'EAUTH' || err.responseCode === 535) {
      throw new Error(
        'Failed to send email: Invalid email credentials. Please verify EMAIL_USER and EMAIL_PASS in server configuration.'
      );
    }
    throw new Error(`Failed to send email: ${err.message}`);
  }
};

module.exports = sendEmail;