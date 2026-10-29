"use strict";
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const ROOT = path.join(__dirname, "..");
const env = process.env;

const dataDir = path.resolve(ROOT, env.DATA_DIR || "storage");
const inMemory = env.DB_FILE === ":memory:";
if (!inMemory) fs.mkdirSync(dataDir, { recursive: true });

// JWT secret: from env, otherwise generated once and persisted so sessions survive restarts.
function resolveJwtSecret() {
  if (env.JWT_SECRET) return env.JWT_SECRET;
  if (inMemory) return crypto.randomBytes(32).toString("hex");
  const file = path.join(dataDir, ".jwt_secret");
  try {
    return fs.readFileSync(file, "utf8").trim();
  } catch {
    const secret = crypto.randomBytes(32).toString("hex");
    fs.writeFileSync(file, secret, { mode: 0o600 });
    return secret;
  }
}

const list = (v, fallback) =>
  (v ? v.split(",") : fallback).map((s) => s.trim()).filter(Boolean);

module.exports = {
  ROOT,
  nodeEnv: env.NODE_ENV || "development",
  port: Number(env.PORT) || 3001,
  dbFile: inMemory ? ":memory:" : path.resolve(ROOT, env.DB_FILE || path.join(dataDir, "app.db")),
  jwtSecret: resolveJwtSecret(),
  jwtExpiresIn: env.JWT_EXPIRES_IN || "365d",
  adminApiKey: env.ADMIN_API_KEY || "",
  corsOrigins: list(env.CORS_ORIGINS, [
    "http://localhost:5173", "http://127.0.0.1:5173",
    "http://localhost:4173", "http://127.0.0.1:4173",
  ]),
  trustProxy: env.TRUST_PROXY ? (env.TRUST_PROXY === "true" ? 1 : env.TRUST_PROXY) : false,
  frontendDist: path.resolve(ROOT, env.FRONTEND_DIST || path.join("..", "frontend", "dist")),
  rateLimit: {
    windowMs: 60_000,
    max: Number(env.RATE_LIMIT_MAX) || 600,
    authMax: Number(env.AUTH_RATE_LIMIT_MAX) || 30,
  },
  bcryptRounds: Number(env.BCRYPT_ROUNDS) || 10,
};
