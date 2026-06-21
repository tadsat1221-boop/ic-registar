const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const tls = require('tls');

// NODE_EXTRA_CA_CERTS in .env is loaded after process start, so Node's TLS
// module won't pick it up. Pass the extra CA (e.g. Norton's HTTPS-scanning
// root, when present) directly to nodemailer instead.
function getExtraCaCerts() {
  const certPath = process.env.NODE_EXTRA_CA_CERTS
    ? path.resolve(__dirname, process.env.NODE_EXTRA_CA_CERTS)
    : null;
  if (!certPath || !fs.existsSync(certPath)) {
    return [];
  }
  return [fs.readFileSync(certPath)];
}

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
      tls: {
        ca: [...tls.rootCertificates.map((c) => Buffer.from(c)), ...getExtraCaCerts()],
      },
    });
  }
  return transporter;
}

async function sendVerificationMail({ to, icCardNumber, verifyUrl }) {
  await getTransporter().sendMail({
    from: `"登録確認" <${process.env.GMAIL_USER}>`,
    to,
    subject: '【登録確認】ICカード番号のご確認とメール認証のお願い',
    text: [
      'ご登録ありがとうございます。',
      '',
      `登録されたICカード番号: ${icCardNumber}`,
      '',
      '以下のURLをクリックして、登録を完了してください（24時間以内に有効です）。',
      verifyUrl,
      '',
      'このメールに心当たりがない場合は、破棄してください。',
    ].join('\n'),
    html: `
      <div style="font-family: sans-serif; line-height: 1.6;">
        <p>ご登録ありがとうございます。</p>
        <p>登録されたICカード番号: <strong>${icCardNumber}</strong></p>
        <p>以下のボタンをクリックして、登録を完了してください（24時間以内に有効です）。</p>
        <p>
          <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;">
            登録を完了する
          </a>
        </p>
        <p style="color:#666;font-size:12px;">URLが開けない場合は次のリンクをコピーしてください: ${verifyUrl}</p>
        <p style="color:#999;font-size:12px;">このメールに心当たりがない場合は、破棄してください。</p>
      </div>
    `,
  });
}

module.exports = { sendVerificationMail };
