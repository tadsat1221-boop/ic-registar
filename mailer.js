// Render's free plan blocks outbound SMTP ports, so mail is sent over
// Resend's HTTPS API instead of connecting to an SMTP server directly.
// node-fetch is only needed on Node <18 (global fetch exists from Node 18+).
const fetch = globalThis.fetch || require('node-fetch');
const https = require('https');
const fs = require('fs');
const path = require('path');
const tls = require('tls');

const RESEND_API_URL = 'https://api.resend.com/emails';

// NODE_EXTRA_CA_CERTS in .env is loaded after process start, so Node's TLS
// module won't pick it up. Build an agent with the extra CA (e.g. Norton's
// HTTPS-scanning root, when present) instead, for local dev environments.
function getHttpsAgent() {
  const certPath = process.env.NODE_EXTRA_CA_CERTS
    ? path.resolve(__dirname, process.env.NODE_EXTRA_CA_CERTS)
    : null;
  if (!certPath || !fs.existsSync(certPath)) {
    return undefined;
  }
  return new https.Agent({
    ca: [...tls.rootCertificates.map((c) => Buffer.from(c)), fs.readFileSync(certPath)],
  });
}

async function sendVerificationMail({ to, icCardNumber, verifyUrl }) {
  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    agent: getHttpsAgent(),
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
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
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error (${res.status}): ${body}`);
  }
}

module.exports = { sendVerificationMail };
