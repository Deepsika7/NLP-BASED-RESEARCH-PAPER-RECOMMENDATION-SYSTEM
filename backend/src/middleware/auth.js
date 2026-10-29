"use strict";
const jwt = require("jsonwebtoken");
const crypto = require("node:crypto");
const config = require("../config");
const { HttpError } = require("./error");

const signToken = (user) =>
  jwt.sign({ sub: user.id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

function readToken(req) {
  const h = req.headers.authorization || "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : null;
}

function authMiddleware(db) {
  const getUser = db.prepare("SELECT * FROM users WHERE id = ?");
  const touch = db.prepare("UPDATE users SET last_seen_at = datetime('now') WHERE id = ?");
  const resolve = (req) => {
    const token = readToken(req);
    if (!token) return null;
    try {
      const { sub } = jwt.verify(token, config.jwtSecret);
      return getUser.get(sub) || null;
    } catch { return null; }
  };
  return {
    /** Attaches req.user if a valid token is present; never rejects. */
    optional(req, _res, next) { req.user = resolve(req); next(); },
    /** Rejects with 401 unless a valid token maps to an existing user. */
    required(req, _res, next) {
      const u = resolve(req);
      if (!u) return next(new HttpError(401, "Authentication required"));
      touch.run(u.id);
      req.user = u;
      next();
    },
  };
}

/** Admin routes use a static key (ADMIN_API_KEY). Disabled when unset. */
function requireAdmin(req, _res, next) {
  const key = config.adminApiKey;
  if (!key) return next(new HttpError(403, "Admin API disabled (set ADMIN_API_KEY)"));
  const given = Buffer.from(String(req.headers["x-admin-key"] || ""));
  const want = Buffer.from(key);
  if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) return next(new HttpError(403, "Invalid admin key"));
  next();
}

const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, isGuest: !!u.is_guest });

module.exports = { signToken, authMiddleware, requireAdmin, publicUser };
