"use strict";
const express = require("express");
const { z } = require("zod");
const { HttpError } = require("../middleware/error");
const { validate } = require("../middleware/validate");
const ex = require("../lib/exporters");

const idParam = z.object({ id: z.coerce.number().int().positive() });
const TAGS = ["to-read", "reading", "done", "important"];

module.exports = function meRoutes({ store, auth, userData: ud }) {
  const r = express.Router();
  r.use(auth.required);
  const need = (id) => { if (!store.get(id)) throw new HttpError(404, "Paper not found"); return Number(id); };

  r.get("/state", (req, res) => res.json(ud.state(req.user.id)));

  // ── Saved papers + tags ──
  r.put("/saved/:id", validate(idParam, "params"), (req, res) => res.json(ud.save(req.user.id, need(req.params.id))));
  r.delete("/saved/:id", validate(idParam, "params"), (req, res) => res.json(ud.unsave(req.user.id, Number(req.params.id))));
  r.put("/saved/:id/tag", validate(idParam, "params"),
    validate(z.object({ tag: z.enum(TAGS).nullable() })), (req, res) => {
      if (!ud.setTag(req.user.id, need(req.params.id), req.body.tag)) throw new HttpError(404, "Paper is not in your saved list");
      res.json({ tags: ud.state(req.user.id).tags });
    });

  r.get("/saved/export", validate(z.object({ format: z.enum(["csv", "md", "bib"]).default("csv") }), "query"), (req, res) => {
    const st = ud.state(req.user.id);
    const items = st.saved.map((id) => ({ paper: store.get(id), tag: st.tags[id], note: st.notes[id] })).filter((i) => i.paper);
    const date = new Date().toISOString().slice(0, 10);
    const f = {
      csv: [ex.readingListCsv(items), "text/csv"],
      md: [ex.readingListMarkdown(items), "text/markdown"],
      bib: [ex.readingListBibtex(items), "text/plain"],
    }[req.query.format];
    res.set({ "Content-Type": `${f[1]}; charset=utf-8`, "Content-Disposition": `attachment; filename="reading_list_${date}.${req.query.format}"` });
    res.send(f[0]);
  });

  // ── Notes ──
  r.put("/notes/:id", validate(idParam, "params"), validate(z.object({ text: z.string().max(5000) })),
    (req, res) => res.json({ notes: ud.setNote(req.user.id, need(req.params.id), req.body.text) }));
  r.delete("/notes/:id", validate(idParam, "params"),
    (req, res) => res.json({ notes: ud.setNote(req.user.id, Number(req.params.id), "") }));

  // ── Search history ──
  r.get("/history", (req, res) => res.json({ history: ud.state(req.user.id).history }));
  r.post("/history", validate(z.object({ q: z.string().trim().min(1).max(300) })),
    (req, res) => res.status(201).json({ history: ud.addHistory(req.user.id, req.body.q) }));
  r.delete("/history", (req, res) => { ud.clearHistory(req.user.id); res.json({ history: [] }); });
  r.delete("/history/:id", validate(idParam, "params"), (req, res) => {
    ud.deleteHistoryItem(req.user.id, Number(req.params.id));
    res.json({ history: ud.state(req.user.id).history });
  });

  // ── Compare list (max 4) ──
  r.put("/compare/:id", validate(idParam, "params"), (req, res) => {
    const out = ud.addCompare(req.user.id, need(req.params.id));
    if (!out.ok) return res.status(409).json({ error: `Comparison limit reached: up to ${ud.MAX_COMPARE} papers allowed.`, compare: out.compare });
    res.json({ compare: out.compare });
  });
  r.delete("/compare/:id", validate(idParam, "params"), (req, res) => res.json({ compare: ud.removeCompare(req.user.id, Number(req.params.id)) }));
  r.delete("/compare", (req, res) => res.json({ compare: ud.clearCompare(req.user.id) }));

  return r;
};
