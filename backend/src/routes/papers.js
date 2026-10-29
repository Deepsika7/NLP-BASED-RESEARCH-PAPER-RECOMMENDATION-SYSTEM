"use strict";
const express = require("express");
const { z } = require("zod");
const nlp = require("../lib/nlp");
const { cite, FORMATS } = require("../lib/cite");
const { HttpError } = require("../middleware/error");
const { validate } = require("../middleware/validate");
const { requireAdmin } = require("../middleware/auth");

const str = (max) => z.string().trim().max(max);
const strList = (maxItems) => z.array(z.string().trim().min(1).max(200)).min(1).max(maxItems);

const listQuery = z.object({
  q: str(300).default(""),
  category: str(120).default(""),
  topic: str(120).default(""),
  topicMatch: z.enum(["exact", "contains"]).default("exact"),
  year: z.union([z.literal(""), z.coerce.number().int().min(1800).max(2200)]).default(""),
  sort: z.enum(["relevance", "newest", "oldest", "title"]).default("relevance"),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

const paperBody = z.object({
  title: str(500).min(1),
  abstract: str(5000).min(1),
  authors: strList(50),
  year: z.coerce.number().int().min(1800).max(2200),
  topics: strList(20),
  keywords: strList(30),
  category: str(120).min(1),
  doi: str(200).default(""),
  url: str(1000).default(""),
  scholarUrl: str(1000).optional(),
  tldr: str(600).default(""),
});

const idParam = z.object({ id: z.coerce.number().int().positive() });
const scholar = (p) => p.scholarUrl || `https://scholar.google.com/scholar?q=${encodeURIComponent(p.title).replace(/%20/g, "+")}`;

module.exports = function paperRoutes({ db, store, auth, userData }) {
  const r = express.Router();
  const need = (id) => { const p = store.get(id); if (!p) throw new HttpError(404, "Paper not found"); return p; };

  r.get("/", validate(listQuery, "query"), (req, res) => {
    const { limit, offset, ...f } = req.query;
    const results = nlp.searchPapers(store.all(), { query: f.q, ...f });
    res.json({ total: results.length, count: Math.min(limit, Math.max(0, results.length - offset)), offset, papers: results.slice(offset, offset + limit) });
  });

  r.get("/suggest", validate(z.object({ q: str(100).default("") }), "query"), (req, res) => {
    res.json({ suggestions: nlp.suggest(store.all(), store.facets().topics, req.query.q) });
  });

  r.get("/:id", validate(idParam, "params"), (req, res) => res.json(need(req.params.id)));

  r.get("/:id/related", validate(idParam, "params"),
    validate(z.object({ limit: z.coerce.number().int().min(1).max(20).default(3) }), "query"),
    (req, res) => {
      const related = nlp.relatedPapers(store.all(), need(req.params.id), req.query.limit);
      res.json({ total: related.length, papers: related });
    });

  r.get("/:id/cite", validate(idParam, "params"),
    validate(z.object({ format: z.enum(FORMATS).default("bibtex"), download: z.coerce.boolean().default(false) }), "query"),
    (req, res) => {
      const p = need(req.params.id);
      const text = cite(p, req.query.format);
      if (req.query.download) {
        const name = `${(p.authors[0] || "citation").replace(/[^a-zA-Z]/g, "")}_${p.year}.bib`;
        res.set({ "Content-Type": "text/plain; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"` });
        return res.send(cite(p, "bibtex"));
      }
      res.json({ id: p.id, format: req.query.format, citation: text });
    });

  // Record that the signed-in user opened a paper ("Continue reading").
  r.post("/:id/view", auth.required, validate(idParam, "params"), (req, res) => {
    need(req.params.id);
    res.json({ recent: userData.addRecent(req.user.id, req.params.id) });
  });

  // ── Admin CRUD (x-admin-key header) ──
  const write = (id, b) => {
    const params = {
      title: b.title, abstract: b.abstract, authors: JSON.stringify(b.authors), year: b.year,
      topics: JSON.stringify(b.topics), keywords: JSON.stringify(b.keywords), category: b.category,
      doi: b.doi, url: b.url, scholarUrl: scholar(b), tldr: b.tldr,
    };
    if (id) db.prepare(`UPDATE papers SET title=@title,abstract=@abstract,authors=@authors,year=@year,topics=@topics,
      keywords=@keywords,category=@category,doi=@doi,url=@url,scholar_url=@scholarUrl,tldr=@tldr,updated_at=datetime('now') WHERE id=@id`).run({ ...params, id });
    else id = db.prepare(`INSERT INTO papers (title,abstract,authors,year,topics,keywords,category,doi,url,scholar_url,tldr)
      VALUES (@title,@abstract,@authors,@year,@topics,@keywords,@category,@doi,@url,@scholarUrl,@tldr)`).run(params).lastInsertRowid;
    store.refresh();
    return store.get(id);
  };

  r.post("/", requireAdmin, validate(paperBody), (req, res) => res.status(201).json(write(null, req.body)));
  r.put("/:id", requireAdmin, validate(idParam, "params"), validate(paperBody), (req, res) => {
    need(req.params.id);
    res.json(write(req.params.id, req.body));
  });
  r.delete("/:id", requireAdmin, validate(idParam, "params"), (req, res) => {
    need(req.params.id);
    db.prepare("DELETE FROM papers WHERE id=?").run(req.params.id);
    store.refresh();
    res.status(204).end();
  });

  return r;
};
