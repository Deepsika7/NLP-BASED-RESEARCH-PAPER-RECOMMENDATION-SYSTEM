"use strict";
const { rowToPaper } = require("../db");
const { readingTime } = require("./nlp");

/** In-memory cache of the (small, read-mostly) papers table. Call refresh() after writes. */
function createPaperStore(db) {
  let list = [];
  let byId = new Map();
  let facets = { categories: [], topics: [], years: [] };

  function refresh() {
    list = db.prepare("SELECT * FROM papers ORDER BY id").all().map((r) => {
      const p = rowToPaper(r);
      p.readingTime = readingTime(p);
      return p;
    });
    byId = new Map(list.map((p) => [p.id, p]));
    facets = {
      categories: [...new Set(list.map((p) => p.category))].sort(),
      topics: [...new Set(list.flatMap((p) => p.topics))].sort(),
      years: [...new Set(list.map((p) => p.year))].sort((a, b) => b - a),
    };
  }
  refresh();

  return {
    refresh,
    all: () => list,
    get: (id) => byId.get(Number(id)),
    facets: () => facets,
  };
}

module.exports = { createPaperStore };
