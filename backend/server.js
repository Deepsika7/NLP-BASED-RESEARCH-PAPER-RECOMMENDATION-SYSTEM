"use strict";
/**
 * ResearchAI — Express + SQLite API.
 * Run:  npm install && npm start      (default http://localhost:3001)
 * Docs: see README.md for the endpoint reference.
 */
const config = require("./src/config");
const { createApp } = require("./src/app");

const app = createApp();
const server = app.listen(config.port, () => {
  console.log(`\n  ✦  ResearchAI API running on http://localhost:${config.port}`);
  console.log(`  ✦  Database: ${config.dbFile}`);
  if (!config.adminApiKey) console.log("  ✦  Admin paper CRUD disabled (set ADMIN_API_KEY to enable)");
  console.log();
});

const shutdown = () => server.close(() => process.exit(0));
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
