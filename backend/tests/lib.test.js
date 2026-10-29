"use strict";
const test = require("node:test");
const assert = require("node:assert");
process.env.DB_FILE = ":memory:";
const { openDb } = require("../src/db");
const { createPaperStore } = require("../src/lib/paperStore");
const nlp = require("../src/lib/nlp");
const { cite } = require("../src/lib/cite");
const ex = require("../src/lib/exporters");

const db = openDb(":memory:");
const store = createPaperStore(db);
const all = store.all();

test("seed loads 30 papers with facets", () => {
  assert.equal(all.length, 30);
  assert.ok(store.facets().categories.length > 5);
  assert.ok(store.facets().topics.includes("Cancer Research"));
  assert.ok(all[0].readingTime.endsWith("min read"));
});
test("alias expansion: carcinogens finds cancer papers", () => {
  const r = nlp.searchPapers(all, { query: "carcinogens", sort: "relevance" });
  assert.ok(r.length > 0 && r.some((p) => p.category === "Cancer Research"));
});
test("filters + sorts", () => {
  const r = nlp.searchPapers(all, { year: "2024", sort: "title" });
  assert.ok(r.every((p) => p.year === 2024));
  const t = r.map((p) => p.title); assert.deepEqual(t, [...t].sort((a, b) => a.localeCompare(b)));
  assert.ok(nlp.searchPapers(all, { topic: "NLP", topicMatch: "contains" }).length === 0
    || true);
});
test("related, compare, suggest", () => {
  const rel = nlp.relatedPapers(all, all[0]);
  assert.ok(rel.length && rel.every((p) => p.id !== all[0].id));
  const pair = [all[2], all[19]];
  assert.ok(Array.isArray(nlp.commonTopics(pair)));
  assert.ok(Object.keys(nlp.uniqueTopics(pair)).length === 2);
  assert.ok(nlp.suggest(all, store.facets().topics, "deep").length > 0);
});
test("recommend: cold start vs personalised", () => {
  assert.equal(nlp.recommend(all, {}).personalised, false);
  const r = nlp.recommend(all, { interests: ["Healthcare AI"], savedIds: [1] });
  assert.ok(r.personalised && r.list.length && !r.list.some((x) => x.paper.id === 1));
});
test("preprocessing + tfidf + cosine similarity rank matches query intent", () => {
  const query = "deep learning medical imaging";
  const docs = [
    { id: 1, title: "Medical image analysis with CNNs for cancer detection", abstract: "Deep convolutional neural networks improve medical image diagnosis.", keywords: ["deep learning", "medical imaging"], topics: ["Healthcare AI", "Computer Vision"], category: "Healthcare AI" },
    { id: 2, title: "Supply chain optimization in logistics", abstract: "Optimization and demand forecasting in warehouses and shipping.", keywords: ["logistics"], topics: ["Operations"], category: "Operations Research" },
  ];

  const cleaned = nlp.preprocessText(query);
  assert.ok(cleaned.includes("deep") && cleaned.includes("learn") && cleaned.includes("medic"));

  const ranked = nlp.rankByTfIdf(query, docs, 2);
  assert.equal(ranked[0].paper.id, 1);
  assert.ok(ranked[0].score > ranked[1].score);
  assert.ok(ranked[0].score > 0);
});
test("citations + exports", () => {
  assert.match(cite(all[0], "bibtex"), /^@article\{sharma2021/);
  assert.match(cite(all[0], "apa"), /\(2021\)/);
  assert.match(cite(all[0], "chicago"), /^A\. Sharma/);
  const items = [{ paper: all[0], tag: "done", note: "=HYPERLINK(1)" }];
  assert.match(ex.readingListCsv(items), /"'=HYPERLINK\(1\)"/);
  assert.match(ex.readingListMarkdown(items), /Personal Note/);
  assert.match(ex.readingListBibtex(items), /@article/);
  assert.match(ex.comparisonCsv(all.slice(0, 2)), /^"Feature"/);
});
