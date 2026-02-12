const nodemailer = require('nodemailer');

const useEthereal = String(process.env.USE_ETHEREAL || '').toLowerCase() === 'true';

let transporterPromise;
let etherealAccount;

function getSmtpConfig() {
  return {
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT) || 587,
    secure: Number(process.env.MAIL_PORT) === 465,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    }
  };
}

async function getTransporter() {
  if (transporterPromise) return transporterPromise;

  transporterPromise = (async () => {
    if (useEthereal) {
      etherealAccount = await nodemailer.createTestAccount();
      return nodemailer.createTransport({
        host: etherealAccount.smtp.host,
        port: etherealAccount.smtp.port,
        secure: etherealAccount.smtp.secure,
        auth: {
          user: etherealAccount.user,
          pass: etherealAccount.pass
        }
      });
    }

    const smtp = getSmtpConfig();
    if (!smtp.host || !smtp.auth.user || !smtp.auth.pass) {
      throw new Error('SMTP is not configured. Set MAIL_HOST, MAIL_USER, MAIL_PASS or enable USE_ETHEREAL=true');
    }

    return nodemailer.createTransport(smtp);
  })();

  return transporterPromise;
}

function getFromAddress() {
  if (useEthereal && etherealAccount) {
    return `"Smart Farm" <${etherealAccount.user}>`;
  }

  const from = process.env.MAIL_FROM || process.env.MAIL_USER;
  if (!from) throw new Error('MAIL_FROM or MAIL_USER is required');
  return `"Smart Farm" <${from}>`;
}

async function sendMail({ to, subject, html, text }) {
  if (!to) throw new Error('Recipient (to) is required');
  if (!subject) throw new Error('Subject is required');

  const transporter = await getTransporter();
  const info = await transporter.sendMail({
    from: getFromAddress(),
    to,
    subject,
    html,
    text
  });

  const previewUrl = useEthereal ? nodemailer.getTestMessageUrl(info) : null;
  return {
    messageId: info.messageId,
    previewUrl
  };
}

async function sendVerifyEmail(to, verifyLink) {
  const subject = 'Verify your Smart Farm account';
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;">
      <h2>Confirm your email</h2>
      <p>Welcome to Smart Farm. Please verify your account by clicking the button below.</p>
      <p>
        <a href="${verifyLink}" style="background:#15803d;color:#fff;padding:10px 16px;text-decoration:none;border-radius:6px;display:inline-block;">
          Verify Email
        </a>
      </p>
      <p>If the button does not work, use this link:</p>
      <p><a href="${verifyLink}">${verifyLink}</a></p>
    </div>
  `;
  const text = `Verify your account: ${verifyLink}`;

  return sendMail({ to, subject, html, text });
}

module.exports = {
  sendMail,
  sendVerifyEmail,
  getTransporter
};
