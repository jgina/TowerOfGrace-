// Verifies the SMTP settings in .env and sends one test email.
// Usage: npm run email:test [recipient]   (defaults to ADMIN_NOTIFY_EMAIL, then EMAIL_USER)
const nodemailer = require('nodemailer');
const config = require('../config');

(async () => {
  const { host, port, user, password, from, adminNotify } = config.email;
  const missing = [['EMAIL_HOST', host], ['EMAIL_USER', user], ['EMAIL_PASSWORD', password]].filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) {
    console.error(`Missing in server/.env: ${missing.join(', ')}`);
    process.exit(1);
  }

  const to = process.argv[2] || adminNotify || user;
  const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass: password } });
  try {
    await transporter.verify();
    console.log(`SMTP login OK (${host}:${port} as ${user})`);
    const info = await transporter.sendMail({
      from,
      to,
      subject: 'Tower of Grace Farms — test email',
      html: '<p>Your website email is working. Order, receipt and payment confirmation emails will be sent from this address.</p>',
    });
    console.log(`Test email sent to ${to} (id ${info.messageId})`);
  } catch (error) {
    console.error(`Email failed: ${error.message}`);
    if (/Invalid login|Username and Password not accepted|535/i.test(error.message)) {
      console.error('Gmail rejected the login. Use a 16-character App Password (not your normal password).');
    }
    process.exit(1);
  }
})();
