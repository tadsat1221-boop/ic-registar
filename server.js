require('dotenv').config();

const express = require('express');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

const { findUserByEmail, findUserByToken, upsertUser, markVerified } = require('./db');
const { sendVerificationMail } = require('./mailer');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// IC card number format, no separators: alphanumeric x5, alphanumeric x4, alphanumeric x4, alphanumeric x4
const icCardPattern = /^[0-9A-Za-z]{5}[0-9A-Za-z]{4}[0-9A-Za-z]{4}[0-9A-Za-z]{4}$/;

app.post(
  '/api/register',
  [
    body('email').isEmail().withMessage('メールアドレスの形式が正しくありません。'),
    body('password').isLength({ min: 8 }).withMessage('パスワードは8文字以上で入力してください。'),
    body('icCardNumber')
      .matches(icCardPattern)
      .withMessage('ICカード番号の形式が正しくありません（例: A1B2C3456789012）。'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array().map((e) => e.msg) });
    }

    const { email, password, icCardNumber } = req.body;

    const existing = findUserByEmail(email);
    if (existing && existing.isVerified) {
      return res.status(409).json({ errors: ['このメールアドレスは既に登録済みです。'] });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiresAt = Date.now() + TOKEN_TTL_MS;

    upsertUser({
      email,
      passwordHash,
      icCardNumber,
      verifyToken,
      tokenExpiresAt,
      isVerified: false,
      createdAt: existing ? existing.createdAt : Date.now(),
    });

    const verifyUrl = `${BASE_URL}/verify/${verifyToken}`;

    try {
      await sendVerificationMail({ to: email, icCardNumber, verifyUrl });
    } catch (err) {
      console.error('メール送信に失敗しました:', err);
      return res.status(500).json({ errors: ['確認メールの送信に失敗しました。時間を置いて再度お試しください。'] });
    }

    res.json({ message: '確認メールを送信しました。メール内のURLをクリックして登録を完了してください。' });
  }
);

app.get('/verify/:token', (req, res) => {
  const { token } = req.params;
  const user = findUserByToken(token);

  if (!user) {
    return res.status(400).sendFile(path.join(__dirname, 'views', 'verify-invalid.html'));
  }

  if (user.tokenExpiresAt < Date.now()) {
    return res.status(400).sendFile(path.join(__dirname, 'views', 'verify-expired.html'));
  }

  markVerified(user.id);

  res.sendFile(path.join(__dirname, 'views', 'verify-success.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at ${BASE_URL}`);
});
