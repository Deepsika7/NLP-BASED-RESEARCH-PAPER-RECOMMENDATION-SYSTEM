"use strict";
const Database = require("better-sqlite3");
const config = require("./config");
const seed = require("./seed/papers.json");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS papers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  abstract    TEXT NOT NULL,
  authors     TEXT NOT NULL,           -- JSON array
  year        INTEGER NOT NULL,
  topics      TEXT NOT NULL,           -- JSON array
  keywords    TEXT NOT NULL,           -- JSON array
  category    TEXT NOT NULL,
  doi         TEXT NOT NULL DEFAULT '',
  url         TEXT NOT NULL DEFAULT '',
  scholar_url TEXT NOT NULL DEFAULT '',
  tldr        TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_papers_year ON papers(year);
CREATE INDEX IF NOT EXISTS idx_papers_category ON papers(category);

CREATE TABLE IF NOT EXISTS users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  email           TEXT UNIQUE COLLATE NOCASE,   -- NULL for guests
  name            TEXT NOT NULL DEFAULT '',
  password_hash   TEXT,
  is_guest        INTEGER NOT NULL DEFAULT 1,
  first_save_done INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS saved_papers (
  user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  paper_id INTEGER NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  tag      TEXT CHECK (tag IN ('to-read','reading','done','important')),
  saved_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, paper_id)
);

CREATE TABLE IF NOT EXISTS notes (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  paper_id   INTEGER NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, paper_id)
);

CREATE TABLE IF NOT EXISTS search_history (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  q       TEXT NOT NULL,
  q_lower TEXT NOT NULL,
  t       INTEGER NOT NULL,
  UNIQUE (user_id, q_lower)
);

CREATE TABLE IF NOT EXISTS recent_views (
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  paper_id  INTEGER NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  viewed_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, paper_id)
);

CREATE TABLE IF NOT EXISTS compare_items (
  user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  paper_id INTEGER NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  PRIMARY KEY (user_id, paper_id)
);
`;

function openDb(file = config.dbFile) {
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  seedPapers(db);
  return db;
}

function seedPapers(db, { reset = false } = {}) {
  if (reset) db.prepare("DELETE FROM papers").run();
  const { n } = db.prepare("SELECT COUNT(*) n FROM papers").get();
  if (n > 0) return 0;
  const ins = db.prepare(`INSERT INTO papers
    (id,title,abstract,authors,year,topics,keywords,category,doi,url,scholar_url,tldr)
    VALUES (@id,@title,@abstract,@authors,@year,@topics,@keywords,@category,@doi,@url,@scholarUrl,@tldr)`);
  db.transaction(() => {
    for (const p of seed.papers) {
      ins.run({
        ...p,
        authors: JSON.stringify(p.authors),
        topics: JSON.stringify(p.topics),
        keywords: JSON.stringify(p.keywords),
        doi: p.doi || "", url: p.url || "", scholarUrl: p.scholarUrl || "", tldr: p.tldr || "",
      });
    }
  })();
  return seed.papers.length;
}

const rowToPaper = (r) => ({
  id: r.id,
  title: r.title,
  abstract: r.abstract,
  authors: JSON.parse(r.authors),
  year: r.year,
  topics: JSON.parse(r.topics),
  keywords: JSON.parse(r.keywords),
  category: r.category,
  doi: r.doi,
  url: r.url,
  scholarUrl: r.scholar_url,
  tldr: r.tldr,
});

module.exports = { openDb, seedPapers, rowToPaper, exampleQueries: seed.exampleQueries };
