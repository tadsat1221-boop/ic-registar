const fs = require('fs');
const path = require('path');

// DATA_DIR should point at a persistent disk mount in production (e.g. Render),
// since the platform's regular filesystem is wiped on every deploy/restart.
const DATA_DIR = process.env.DATA_DIR || __dirname;
const DB_FILE = path.join(DATA_DIR, 'data.json');

function load() {
  if (!fs.existsSync(DB_FILE)) {
    return { users: [] };
  }
  const raw = fs.readFileSync(DB_FILE, 'utf-8').trim();
  return raw ? JSON.parse(raw) : { users: [] };
}

function save(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function findUserByEmail(email) {
  return load().users.find((u) => u.email === email);
}

function findUserByToken(token) {
  return load().users.find((u) => u.verifyToken === token);
}

function upsertUser(user) {
  const data = load();
  const existing = data.users.find((u) => u.email === user.email);
  if (existing) {
    Object.assign(existing, user);
  } else {
    data.users.push({ id: data.users.length + 1, ...user });
  }
  save(data);
}

function markVerified(userId) {
  const data = load();
  const user = data.users.find((u) => u.id === userId);
  if (!user) return;
  user.isVerified = true;
  user.verifyToken = null;
  user.tokenExpiresAt = null;
  save(data);
}

module.exports = { findUserByEmail, findUserByToken, upsertUser, markVerified };
