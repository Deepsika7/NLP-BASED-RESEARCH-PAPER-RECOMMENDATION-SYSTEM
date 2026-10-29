"use strict";
// Usage: npm run seed            -> seeds only when the papers table is empty
//        npm run seed -- --reset -> wipes papers (and dependent user data) and re-seeds
const { openDb, seedPapers } = require("../db");
const db = openDb();
const reset = process.argv.includes("--reset");
const n = seedPapers(db, { reset });
console.log(n ? `Seeded ${n} papers.` : "Papers table already populated (use --reset to re-seed).");
