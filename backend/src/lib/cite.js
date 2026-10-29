"use strict";

const FORMATS = ["bibtex", "apa", "chicago"];

function toBibtex(p) {
  const last = p.authors[0] ? p.authors[0].split(" ").pop().toLowerCase().replace(/[^a-z0-9]/g, "") : "author";
  return `@article{${last}${p.year},
  title = {${p.title}},
  author = {${p.authors.join(" and ")}},
  year = {${p.year}},
  doi = {${p.doi || ""}},
  url = {${p.url || ""}}
}`;
}

function toApa(p) {
  return `${p.authors.join(", ")} (${p.year}). ${p.title}. ${p.url || p.doi ? `https://doi.org/${p.doi}` : ""}`;
}

function toChicago(p) {
  return `${p.authors.join(", ")}. "${p.title}." (${p.year}). ${p.url || (p.doi ? `https://doi.org/${p.doi}` : "")}`;
}

function cite(p, format) {
  return format === "apa" ? toApa(p) : format === "chicago" ? toChicago(p) : toBibtex(p);
}

module.exports = { FORMATS, toBibtex, toApa, toChicago, cite };
