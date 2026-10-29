"use strict";
const express = require("express");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const config = require("../config");
const { HttpError, wrap } = require("../middleware/error");
const { validate } = require("../middleware/validate");
const { signToken, publicUser } = require("../middleware/auth");

const creds = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});
const registerBody = creds.extend({ name: z.string().trim().max(80).optional() });

module.exports = function authRoutes({ db, auth, userData, limiter }) {
  const r = express.Router();
  r.use(limiter);

  const byEmail = db.prepare("SELECT * FROM users WHERE email = ?");
  const byId = db.prepare("SELECT * FROM users WHERE id = ?");

  // Anonymous device account: lets the app work with zero sign-up friction.
  r.post("/guest", wrap(async (_req, res) => {
    const { lastInsertRowid } = db.prepare("INSERT INTO users (name, is_guest) VALUES ('Guest', 1)").run();
    const user = byId.get(lastInsertRowid);
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  }));

  // Register a new account. If called with a guest token, that guest is upgraded in place (data kept).
  r.post("/register", auth.optional, validate(registerBody), wrap(async (req, res) => {
    const { email, password, name } = req.body;
    if (byEmail.get(email)) throw new HttpError(409, "An account with this email already exists");
    const hash = await bcrypt.hash(password, config.bcryptRounds);
    let user;
    if (req.user && req.user.is_guest) {
      db.prepare("UPDATE users SET email=?, name=?, password_hash=?, is_guest=0 WHERE id=?")
        .run(email, name || email.split("@")[0], hash, req.user.id);
      user = byId.get(req.user.id);
    } else {
      const { lastInsertRowid } = db.prepare("INSERT INTO users (email,name,password_hash,is_guest) VALUES (?,?,?,0)")
        .run(email, name || email.split("@")[0], hash);
      user = byId.get(lastInsertRowid);
    }
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  }));

  // Login. If called with a guest token, the guest's saved papers/notes/history are merged in.
  r.post("/login", auth.optional, validate(creds), wrap(async (req, res) => {
    const { email, password } = req.body;
    const user = byEmail.get(email);
    const ok = user && user.password_hash && (await bcrypt.compare(password, user.password_hash));
    if (!ok) throw new HttpError(401, "Invalid email or password");
    if (req.user && req.user.is_guest && req.user.id !== user.id) userData.merge(req.user.id, user.id);
    res.json({ token: signToken(user), user: publicUser(user) });
  }));

  r.get("/me", auth.required, (req, res) => res.json({ user: publicUser(req.user) }));

  r.patch("/me", auth.required, validate(z.object({ name: z.string().trim().min(1).max(80) })), (req, res) => {
    db.prepare("UPDATE users SET name=? WHERE id=?").run(req.body.name, req.user.id);
    res.json({ user: publicUser(byId.get(req.user.id)) });
  });

  r.post("/change-password", auth.required, validate(z.object({
    currentPassword: z.string().max(128), newPassword: z.string().min(8).max(128),
  })), wrap(async (req, res) => {
    if (req.user.is_guest) throw new HttpError(400, "Guest accounts have no password; register first");
    if (!(await bcrypt.compare(req.body.currentPassword, req.user.password_hash))) throw new HttpError(401, "Current password is incorrect");
    db.prepare("UPDATE users SET password_hash=? WHERE id=?").run(await bcrypt.hash(req.body.newPassword, config.bcryptRounds), req.user.id);
    res.json({ ok: true });
  }));

  r.delete("/me", auth.required, (req, res) => {
    db.prepare("DELETE FROM users WHERE id=?").run(req.user.id); // cascades to all user data
    res.status(204).end();
  });

  return r;
};
