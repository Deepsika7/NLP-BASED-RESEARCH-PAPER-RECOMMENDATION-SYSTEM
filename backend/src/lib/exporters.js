"use strict";
const { toBibtex } = require("./cite");

// Escape for CSV and neutralise spreadsheet formula injection (=, +, -, @ at cell start).
function cell(v) {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}
const csv = (rows) => rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";

function readingListCsv(items) {
  const header = ["Title", "Authors", "Year", "Category", "DOI", "URL", "TL;DR", "Tag", "Note"];
  return csv([header, ...items.map(({ paper: p, tag, note }) => [
    p.title, p.authors.join("; "), p.year, p.category, p.doi, p.url, p.tldr, tag || "", note || "",
  ])]);
}

function readingListMarkdown(items, date = new Date()) {
  let md = `# Research Index — Curated Reading List\n\nGenerated: ${date.toISOString().slice(0, 10)}  |  Total: ${items.length} papers\n\n---\n\n`;
  items.forEach(({ paper: p, tag, note }, i) => {
    md += `### ${i + 1}. ${p.title}\n`;
    if (tag) md += `**Status:** ${tag}  `;
    md += `**Authors:** ${p.authors.join(", ")} (${p.year})  **Category:** ${p.category}\n`;
    if (p.doi) md += `**DOI:** \`${p.doi}\`  `;
    if (p.url) md += `**Link:** [${p.url}](${p.url})\n`;
    if (p.tldr) md += `\n> **TL;DR:** ${p.tldr}\n`;
    md += `\n${p.abstract}\n\n`;
    if (note) md += `> **Personal Note:** ${note}\n\n`;
    md += `---\n\n`;
  });
  return md;
}

const readingListBibtex = (items) => items.map((i) => toBibtex(i.paper)).join("\n\n") + "\n";

function comparisonCsv(papers) {
  return csv([
    ["Feature", ...papers.map((p) => p.title)],
    ["Authors", ...papers.map((p) => p.authors.join(", "))],
    ["Year", ...papers.map((p) => p.year)],
    ["Category", ...papers.map((p) => p.category)],
    ["Topics", ...papers.map((p) => p.topics.join("; "))],
    ["Keywords", ...papers.map((p) => p.keywords.join("; "))],
    ["DOI", ...papers.map((p) => p.doi || "N/A")],
    ["Abstract", ...papers.map((p) => p.abstract)],
  ]);
}

module.exports = { readingListCsv, readingListMarkdown, readingListBibtex, comparisonCsv };
