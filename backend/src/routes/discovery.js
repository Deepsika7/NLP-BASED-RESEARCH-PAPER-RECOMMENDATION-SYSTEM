"use strict";
const express = require("express");
const { z } = require("zod");
const nlp = require("../lib/nlp");
const ex = require("../lib/exporters");
const { HttpError } = require("../middleware/error");
const { validate } = require("../middleware/validate");
const { exampleQueries } = require("../db");

const ids = z.string().regex(/^\d+(,\d+){0,3}$/, "ids must be 1–4 comma-separated paper ids")
  .transform((s) => [...new Set(s.split(",").map(Number))]);

module.exports = function discoveryRoutes({ store, auth, userData: ud }) {
  const r = express.Router();

  r.get("/categories", (_q, res) => res.json(store.facets().categories));
  r.get("/topics", (_q, res) => res.json(store.facets().topics));
  r.get("/years", (_q, res) => res.json(store.facets().years));
  r.get("/stats", (_q, res) => {
    const f = store.facets();
    res.json({ papers: store.all().length, categories: f.categories.length, topics: f.topics.length, years: f.years.length });
  });

  // One round-trip for first paint: catalog + facets (+ the user's state when authenticated).
  r.get("/bootstrap", auth.optional, (req, res) => {
    res.json({
      papers: store.all(), ...store.facets(), exampleQueries,
      state: req.user ? ud.state(req.user.id) : null,
    });
  });

  // Personalised recommendations from interests + saved papers + recent searches.
  r.post("/recommendations", auth.required,
    validate(z.object({ interests: z.array(z.string().max(120)).max(40).default([]), limit: z.number().int().min(1).max(30).default(8) })),
    (req, res) => {
      const uid = req.user.id;
      const out = nlp.recommend(store.all(), {
        interests: req.body.interests, savedIds: ud.savedIds(uid), recentQueries: ud.recentQueries(uid), limit: req.body.limit,
      });
      res.json(out);
    });

  // Side-by-side comparison: papers + shared / differentiating topics.
  const compareData = (idList) => {
    const papers = idList.map((id) => store.get(id));
    if (papers.some((p) => !p)) throw new HttpError(404, "One or more papers not found");
    return papers;
  };
  r.get("/compare", validate(z.object({ ids }), "query"), (req, res) => {
    const papers = compareData(req.query.ids);
    res.json({ papers, common: nlp.commonTopics(papers), unique: nlp.uniqueTopics(papers) });
  });
  r.get("/compare/export", validate(z.object({ ids }), "query"), (req, res) => {
    const papers = compareData(req.query.ids);
    res.set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="comparison_matrix_${papers.length}_papers.csv"` });
    res.send(ex.comparisonCsv(papers));
  });

  return r;
};
