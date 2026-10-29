"use strict";
const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const config = require("./config");
const { openDb } = require("./db");
const { createPaperStore } = require("./lib/paperStore");
const { createUserData } = require("./services/userData");
const { authMiddleware } = require("./middleware/auth");
const { notFound, errorHandler } = require("./middleware/error");

function createApp({ db = openDb() } = {}) {
  const app = express();
  app.disable("x-powered-by");
  if (config.trustProxy) app.set("trust proxy", config.trustProxy);

  const store = createPaperStore(db);
  const userData = createUserData(db);
  const auth = authMiddleware(db);
  const limiter = (max) => rateLimit({ windowMs: config.rateLimit.windowMs, max, standardHeaders: true, legacyHeaders: false, message: { error: "Too many requests, slow down." } });
  const deps = { db, store, auth, userData, limiter: limiter(config.rateLimit.authMax) };

  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "same-site" } }));
  app.use(cors({ origin: config.corsOrigins, exposedHeaders: ["Content-Disposition"] }));
  app.use(express.json({ limit: "100kb" }));

  const healthResponse = (_req, res) => {
    db.prepare("SELECT 1").get();
    res.json({ status: "ok", timestamp: new Date().toISOString(), totalPapers: store.all().length });
  };

  app.get("/api", (_req, res) => {
    res.json({ service: "ResearchAI API", status: "ok", health: "/api/health" });
  });
  app.get("/api/health", healthResponse);
  app.get("/health", healthResponse);

  const api = express.Router();
  api.use(limiter(config.rateLimit.max));
  api.use("/auth", require("./routes/auth")(deps));
  api.use("/papers", require("./routes/papers")(deps));
  api.use("/me", require("./routes/me")(deps));
  api.use("/", require("./routes/discovery")(deps));
  api.use(notFound);
  app.use("/api", api);

  // Serve the built React app (production)
  const dist = config.frontendDist;
  if (fs.existsSync(path.join(dist, "index.html"))) {
    app.use(express.static(dist));
    app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
  } else {
    app.get("/", (_req, res) => {
      res.json({ service: "ResearchAI API", status: "ok", health: "/api/health" });
    });
  }

  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
